import boto3
import uuid
from botocore.config import Config
from botocore.exceptions import ClientError
from app.core.config import settings

s3 = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
)

BUCKET = settings.S3_BUCKET_NAME
RAW_PREFIX = settings.S3_RAW_PREFIX
PROCESSED_PREFIX = settings.S3_PROCESSED_PREFIX
CDN_BASE = settings.CDN_BASE_URL
PRESIGN_EXPIRY = settings.PRESIGN_EXPIRY_SECONDS
MAX_IMAGE_BYTES = settings.MAX_IMAGE_MB * 1024 * 1024
MAX_VIDEO_BYTES = settings.MAX_VIDEO_MB * 1024 * 1024

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}

EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}


def validate_upload(content_type: str, file_size: int, media_type: str) -> None:
    """Raise ValueError with a user-facing message if validation fails."""
    if media_type == "image":
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError(f"Images must be JPEG, PNG, WebP, or GIF. Got: {content_type}")
        if file_size > MAX_IMAGE_BYTES:
            raise ValueError(f"Image must be under {settings.MAX_IMAGE_MB} MB")
    elif media_type == "video":
        if content_type not in ALLOWED_VIDEO_TYPES:
            raise ValueError(f"Videos must be MP4, MOV, or WebM. Got: {content_type}")
        if file_size > MAX_VIDEO_BYTES:
            raise ValueError(f"Video must be under {settings.MAX_VIDEO_MB} MB")
    else:
        raise ValueError("media_type must be 'image' or 'video'")


def _build_key(seller_id: str, gig_id: str, content_type: str, prefix: str) -> str:
    ext = EXTENSION_MAP.get(content_type, ".bin")
    uid = str(uuid.uuid4())
    return f"{prefix}{seller_id}/{gig_id}/{uid}{ext}"


def generate_presigned_put(
    seller_id: str,
    gig_id: str,
    content_type: str,
    file_size: int,
    media_type: str,
) -> dict:
    validate_upload(content_type, file_size, media_type)

    raw_key = _build_key(seller_id, gig_id, content_type, RAW_PREFIX)

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": BUCKET,
            "Key": raw_key,
            "ContentType": content_type,
            "ContentLength": file_size,  # enforces exact size — prevents oversized uploads
        },
        ExpiresIn=PRESIGN_EXPIRY,
    )

    # Derive processed key (Celery worker writes WebP here for images)
    processed_ct = "image/webp" if media_type == "image" else content_type
    processed_key = _build_key(seller_id, gig_id, processed_ct, PROCESSED_PREFIX)

    return {
        "upload_url": upload_url,
        "raw_key": raw_key,
        "processed_key": processed_key,
        "public_url": f"{CDN_BASE}/{processed_key}",
    }


def delete_object(key: str) -> None:
    try:
        s3.delete_object(Bucket=BUCKET, Key=key)
    except ClientError:
        pass  # best-effort


def object_exists(key: str) -> bool:
    """Verify S3 actually received the upload before saving the DB record."""
    try:
        s3.head_object(Bucket=BUCKET, Key=key)
        return True
    except ClientError:
        return False
