import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

/**
 * Initialize and return S3Client instance with credentials from environment variables
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing AWS credentials. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables."
      );
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Generate presigned PUT URL for direct client uploads
 * @param key - S3 object key
 * @param contentType - MIME type (should be 'application/pdf')
 * @returns Object with url, key, and bucket
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ url: string; key: string; bucket: string }> {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes

    return { url, key, bucket };
  } catch (error) {
    throw new Error(
      `Failed to generate presigned upload URL: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate presigned GET URL for PDF viewing
 * @param key - S3 object key
 * @returns Signed URL string
 */
export async function generatePresignedDownloadUrl(key: string): Promise<string> {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour

    return url;
  } catch (error) {
    throw new Error(
      `Failed to generate presigned download URL: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upload file buffer to S3 (fallback for server-side uploads)
 * @param key - S3 object key
 * @param body - File buffer
 * @param contentType - MIME type
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await client.send(command);
  } catch (error) {
    throw new Error(
      `Failed to upload file to S3: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete file from S3 (cleanup after text extraction)
 * @param key - S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
  } catch (error) {
    throw new Error(
      `Failed to delete file from S3: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

