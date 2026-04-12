import boto3
import logging
from typing import Optional
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        # Initialize boto3 client for Cloudflare R2
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_url = settings.R2_PUBLIC_URL.rstrip('/')
        
        # Only initialize the client if we have the necessary credentials
        if settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                service_name='s3',
                endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name='auto'  # R2 requires 'auto' or 'us-east-1' depending on SDK version
            )
        else:
            logger.warning("R2 credentials not fully provided in settings. Uploads to R2 will fail.")
            self.s3_client = None

    def upload_file(self, file_path: str, object_name: str) -> Optional[str]:
        """
        Uploads a file to Cloudflare R2 and returns its public URL.
        
        :param file_path: Local path to the file to upload
        :param object_name: Name of the object in the R2 bucket
        :return: Public URL of the uploaded file or None if it fails
        """
        if not self.s3_client:
            logger.error("S3 client not initialized. Cannot upload to R2.")
            return None
            
        try:
            self.s3_client.upload_file(file_path, self.bucket_name, object_name)
            logger.info(f"Successfully uploaded {file_path} to R2 as {object_name}")
            
            # Construct and return the public URL
            if self.public_url:
                return f"{self.public_url}/{object_name}"
            else:
                logger.warning("R2_PUBLIC_URL is not set. Cannot return a public link.")
                return None
                
        except ClientError as e:
            logger.error(f"Failed to upload file to R2: {e}")
            return None

    def upload_fileobj(self, file_obj, object_name: str) -> Optional[str]:
        """
        Uploads a file-like object (e.g. BytesIO) to Cloudflare R2.
        
        :param file_obj: File-like object to upload
        :param object_name: Name of the object in the R2 bucket
        :return: Public URL of the uploaded file or None if it fails
        """
        if not self.s3_client:
            logger.error("S3 client not initialized. Cannot upload to R2.")
            return None
            
        try:
            # Important: fileobj must be at start
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
                
            self.s3_client.upload_fileobj(file_obj, self.bucket_name, object_name)
            logger.info(f"Successfully uploaded fileobj to R2 as {object_name}")
            
            if self.public_url:
                return f"{self.public_url}/{object_name}"
            return None
                
        except ClientError as e:
            logger.error(f"Failed to upload fileobj to R2: {e}")
            return None

    def get_file(self, object_name: str):
        """
        Retrieves a file body from Cloudflare R2.
        
        :param object_name: Name of the object in the R2 bucket
        :return: StreamingBody of the object or None if it fails
        """
        if not self.s3_client:
            logger.error("S3 client not initialized. Cannot get from R2.")
            return None
            
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=object_name)
            return response['Body']
        except ClientError as e:
            logger.error(f"Failed to get object from R2: {e}")
            return None
