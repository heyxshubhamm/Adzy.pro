import boto3, os, uuid, mimetypes
from botocore.config import Config

# Layer 6: Binary Telemetry (AWS S3)
s3_client = boto3.client(
    "s3",
    region_name          = os.getenv("AWS_REGION", "ap-south-1"),
    aws_access_key_id    = os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key= os.getenv("AWS_SECRET_ACCESS_KEY"),
    config               = Config(signature_version="s3v4"),
)

BUCKET      = os.getenv("S3_BUCKET_NAME")
CDN_BASE    = os.getenv("CDN_BASE_URL", "https://cdn.adzy.pro")
ALLOWED_IMG = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VID = {"video/mp4", "video/quicktime"}
MAX_IMG_MB  = 10
MAX_VID_MB  = 100

def generate_presigned_upload(
    seller_id:    str,
    gig_id:       str,
    filename:     str,
    content_type: str,
    media_type:   str,
) -> dict:
    """Generates an authorized presigned URL for direct binary transmission to S3."""
    allowed = ALLOWED_IMG if media_type == "image" else ALLOWED_VID
    if content_type not in allowed:
        raise ValueError(f"Content type {content_type} not authorized for {media_type} telemetry.")

    ext       = mimetypes.guess_extension(content_type) or ".bin"
    s3_key    = f"gigs/{seller_id}/{gig_id}/{uuid.uuid4()}{ext}"

    upload_url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket":      BUCKET,
            "Key":         s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=300,
    )

    return {
        "upload_url": upload_url,
        "s3_key":     s3_key,
        "public_url": f"{CDN_BASE}/{s3_key}",
    }

def delete_s3_object(s3_key: str) -> None:
    """Terminates a binary object in the S3 authority."""
    s3_client.delete_object(Bucket=BUCKET, Key=s3_key)
