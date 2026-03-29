import boto3, os, uuid, mimetypes
from botocore.config import Config
from app.core.config import settings

s3_client = boto3.client(
    "s3",
    region_name = settings.AWS_REGION,
    aws_access_key_id = settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY,
    config = Config(signature_version="s3v4"),
)

BUCKET = settings.S3_BUCKET_NAME
CDN_BASE = settings.CDN_BASE_URL
ALLOWED_IMG = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VID = {"video/mp4", "video/quicktime"}
MAX_IMG_MB = 10
MAX_VID_MB = 100

def generate_presigned_upload(
    seller_id: str,
    gig_id: str,
    filename: str,
    content_type: str,
    media_type: str, # "image" | "video"
) -> dict:
    allowed = ALLOWED_IMG if media_type == "image" else ALLOWED_VID
    if content_type not in allowed:
        raise ValueError(f"Content type {content_type} not allowed for {media_type}")

    ext = mimetypes.guess_extension(content_type) or ".bin"
    s3_key = f"gigs/{seller_id}/{gig_id}/{uuid.uuid4()}{ext}"

    upload_url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": BUCKET,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=300, # 5-minute window
    )

    return {
        "upload_url": upload_url,
        "s3_key": s3_key,
        "public_url": f"{CDN_BASE}/{s3_key}",
    }

def delete_s3_object(s3_key: str) -> None:
    try:
        s3_client.delete_object(Bucket=BUCKET, Key=s3_key)
    except Exception:
        pass # Best effort deletion
