"""
Celery tasks for async media processing.
Images: resize to multiple sizes, convert to WebP.
Videos: extract thumbnail frame at 2s via FFmpeg.
"""
import os
import io
import tempfile
import subprocess

import boto3
from botocore.config import Config
from celery import Celery
from PIL import Image, ImageOps

celery_app = Celery(
    "adzy_media",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379"),
)

s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=Config(signature_version="s3v4"),
)

BUCKET = os.getenv("S3_BUCKET_NAME")
CDN_BASE = os.getenv("CDN_BASE_URL", "")

IMAGE_SIZES = {
    "cover": (1280, 720),
    "thumbnail": (400, 300),
    "small": (160, 120),
}


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_image(self, raw_key: str, processed_key: str, gig_media_id: str):
    """Download raw upload, resize to multiple sizes, convert to WebP, upload back."""
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=raw_key)
        data = obj["Body"].read()
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)  # fix phone rotation
        img = img.convert("RGBA") if img.mode == "RGBA" else img.convert("RGB")

        results = {}
        for size_name, (w, h) in IMAGE_SIZES.items():
            resized = img.copy()
            resized.thumbnail((w, h), Image.LANCZOS)

            buf = io.BytesIO()
            resized.save(buf, format="WEBP", quality=85, method=6)
            buf.seek(0)

            size_key = processed_key.replace(".webp", f"_{size_name}.webp")
            s3.put_object(
                Bucket=BUCKET,
                Key=size_key,
                Body=buf,
                ContentType="image/webp",
                CacheControl="public, max-age=31536000",
            )
            results[size_name] = f"{CDN_BASE}/{size_key}"

        # Delete raw to save storage
        s3.delete_object(Bucket=BUCKET, Key=raw_key)

        _update_media_record(gig_media_id, results, status="ready")
        return results

    except Exception as exc:
        _update_media_record(gig_media_id, {}, status="error")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_video(self, raw_key: str, processed_key: str, gig_media_id: str):
    """Download raw video, extract thumbnail frame at 2s, upload thumbnail."""
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=raw_key)
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_in:
            tmp_in.write(obj["Body"].read())
            tmp_path = tmp_in.name

        thumb_path = tmp_path.replace(".mp4", "_thumb.jpg")

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", "00:00:02",
                "-i", tmp_path,
                "-vframes", "1",
                "-vf", "scale=1280:720:force_original_aspect_ratio=decrease",
                "-q:v", "2",
                thumb_path,
            ],
            check=True,
            capture_output=True,
        )

        thumb_key = (
            processed_key.replace(".mp4", "_thumb.jpg").replace(".mov", "_thumb.jpg")
        )
        with open(thumb_path, "rb") as f:
            s3.put_object(
                Bucket=BUCKET,
                Key=thumb_key,
                Body=f,
                ContentType="image/jpeg",
                CacheControl="public, max-age=31536000",
            )

        os.unlink(tmp_path)
        os.unlink(thumb_path)

        results = {
            "video_url": f"{CDN_BASE}/{raw_key}",
            "thumbnail_url": f"{CDN_BASE}/{thumb_key}",
        }
        _update_media_record(gig_media_id, results, status="ready")
        return results

    except Exception as exc:
        _update_media_record(gig_media_id, {}, status="error")
        raise self.retry(exc=exc)


def _update_media_record(media_id: str, urls: dict, status: str):
    """Synchronous DB update — runs inside the Celery worker process."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.models.models import GigMedia

    db_url = os.getenv("DATABASE_URL", "").replace(
        "postgresql+asyncpg", "postgresql"
    )
    engine = create_engine(db_url)
    with Session(engine) as db:
        media = db.get(GigMedia, media_id)
        if media:
            media.status = status
            media.processed_urls = urls
            db.commit()
