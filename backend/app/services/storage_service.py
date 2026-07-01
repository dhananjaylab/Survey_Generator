import boto3
import logging
from typing import Optional
from pathlib import PurePosixPath

from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.core.logging import get_logger

logger = logging.getLogger(__name__)
structured_logger = get_logger(__name__)


class StorageService:
    def __init__(self):
        # Initialize boto3 client for Cloudflare R2.
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_url = settings.R2_PUBLIC_URL.rstrip('/')
        self.endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

        structured_logger.info(
            "r2_runtime_check",
            bucket_name=self.bucket_name,
            public_url_present=bool(self.public_url),
            endpoint_url=self.endpoint_url,
            account_id_present=bool(settings.R2_ACCOUNT_ID),
            access_key_present=bool(settings.R2_ACCESS_KEY_ID),
            secret_key_present=bool(settings.R2_SECRET_ACCESS_KEY),
            ready=bool(settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY and self.bucket_name),
        )

        # Only initialize the client if we have the necessary credentials.
        if settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                service_name='s3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name='auto',
                config=Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'},
                ),
            )
        else:
            structured_logger.warning("r2_storage_not_initialized", bucket_name=self.bucket_name)
            self.s3_client = None

    def _normalize_object_name(self, object_name: str) -> str:
        """
        Normalize object names to forward-slash paths so uploads behave the same
        on Windows and Linux workers.
        """
        return PurePosixPath(object_name).as_posix().lstrip("/")

    def _upload_extra_args(self, object_name: str) -> dict[str, str]:
        filename = object_name.split("/")[-1].lower()
        extra_args = {
            "ContentType": "application/octet-stream",
        }

        if filename.endswith(".docx"):
            extra_args["ContentType"] = (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            extra_args["ContentDisposition"] = f'attachment; filename="{object_name.split("/")[-1]}"'

        return extra_args

    def upload_file(self, file_path: str, object_name: str) -> Optional[str]:
        """
        Uploads a file to Cloudflare R2 and returns its public URL.

        :param file_path: Local path to the file to upload
        :param object_name: Name of the object in the R2 bucket
        :return: Public URL of the uploaded file or None if it fails
        """
        if not self.s3_client:
            structured_logger.error("r2_upload_skipped_no_client", bucket_name=self.bucket_name, object_name=object_name)
            return None

        try:
            object_name = self._normalize_object_name(object_name)
            structured_logger.info("r2_upload_started", bucket_name=self.bucket_name, object_name=object_name, endpoint_url=self.endpoint_url)
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                object_name,
                ExtraArgs=self._upload_extra_args(object_name),
            )
            structured_logger.info("r2_upload_success", bucket_name=self.bucket_name, object_name=object_name, file_path=file_path, endpoint_url=self.endpoint_url)

            # Prefer the public bucket URL when configured. Otherwise the app
            # can still stream the object back from R2 via the API download route.
            if self.public_url:
                structured_logger.info("r2_returning_public_url", bucket_name=self.bucket_name, object_name=object_name, public_url=self.public_url)
                return f"{self.public_url}/{object_name}"
            filename = object_name.split("/")[-1]
            structured_logger.warning("r2_public_url_missing_using_api_download", bucket_name=self.bucket_name, object_name=object_name, fallback_path=f"/api/v1/files/download/{filename}")
            return f"/api/v1/files/download/{filename}"

        except (ClientError, BotoCoreError) as e:
            error_code = None
            error_message = str(e)
            if isinstance(e, ClientError):
                error_code = e.response.get("Error", {}).get("Code")
                error_message = e.response.get("Error", {}).get("Message", error_message)
            structured_logger.error(
                "Failed to upload file to R2",
                bucket=self.bucket_name,
                object_name=object_name,
                endpoint_url=self.endpoint_url,
                error_code=error_code,
                error=error_message,
            )
            return None

    def upload_fileobj(self, file_obj, object_name: str) -> Optional[str]:
        """
        Uploads a file-like object (e.g. BytesIO) to Cloudflare R2.

        :param file_obj: File-like object to upload
        :param object_name: Name of the object in the R2 bucket
        :return: Public URL of the uploaded file or None if it fails
        """
        if not self.s3_client:
            structured_logger.error("r2_upload_skipped_no_client", bucket_name=self.bucket_name, object_name=object_name)
            return None

        try:
            object_name = self._normalize_object_name(object_name)
            structured_logger.info("r2_upload_started", bucket_name=self.bucket_name, object_name=object_name, endpoint_url=self.endpoint_url)
            # Important: fileobj must be at start.
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                object_name,
                ExtraArgs=self._upload_extra_args(object_name),
            )
            structured_logger.info("r2_upload_success", bucket_name=self.bucket_name, object_name=object_name, endpoint_url=self.endpoint_url)

            if self.public_url:
                structured_logger.info("r2_returning_public_url", bucket_name=self.bucket_name, object_name=object_name, public_url=self.public_url)
                return f"{self.public_url}/{object_name}"
            filename = object_name.split("/")[-1]
            structured_logger.warning("r2_public_url_missing_using_api_download", bucket_name=self.bucket_name, object_name=object_name, fallback_path=f"/api/v1/files/download/{filename}")
            return f"/api/v1/files/download/{filename}"

        except (ClientError, BotoCoreError) as e:
            error_code = None
            error_message = str(e)
            if isinstance(e, ClientError):
                error_code = e.response.get("Error", {}).get("Code")
                error_message = e.response.get("Error", {}).get("Message", error_message)
            structured_logger.error(
                "Failed to upload fileobj to R2",
                bucket=self.bucket_name,
                object_name=object_name,
                endpoint_url=self.endpoint_url,
                error_code=error_code,
                error=error_message,
            )
            return None

    def get_file(self, object_name: str):
        """
        Retrieves a file body from Cloudflare R2.

        :param object_name: Name of the object in the R2 bucket
        :return: StreamingBody of the object or None if it fails
        """
        if not self.s3_client:
            structured_logger.error("r2_get_skipped_no_client", bucket_name=self.bucket_name, object_name=object_name)
            return None

        try:
            structured_logger.info("r2_get_started", bucket_name=self.bucket_name, object_name=object_name, endpoint_url=self.endpoint_url)
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=object_name)
            structured_logger.info("r2_get_success", bucket_name=self.bucket_name, object_name=object_name)
            return response['Body']
        except ClientError as e:
            logger.error(f"Failed to get object from R2: {e}")
            return None
