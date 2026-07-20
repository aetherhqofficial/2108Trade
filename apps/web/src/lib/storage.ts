import { Client as MinioClient } from "minio";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "localhost";
const MINIO_PORT = Number(process.env.MINIO_PORT ?? "9000");
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER ?? "minioadmin";
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD ?? "minioadmin";
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";

/** Predefined bucket names — use these constants throughout the app */
export const Buckets = {
  USER_UPLOADS: "user-uploads",
  REPORTS: "reports",
  MODEL_ARTIFACTS: "model-artifacts",
} as const;

export type BucketName = (typeof Buckets)[keyof typeof Buckets];

const ALL_BUCKETS: BucketName[] = [
  Buckets.USER_UPLOADS,
  Buckets.REPORTS,
  Buckets.MODEL_ARTIFACTS,
];

let client: MinioClient | null = null;

/**
 * Get or create the MinIO/S3-compatible client instance.
 * Uses lazy initialization — the client is created once and cached.
 */
export function getStorageClient(): MinioClient {
  if (client) return client;

  client = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  return client;
}

/**
 * Ensure a bucket exists, creating it if it doesn't.
 * Safe to call multiple times — idempotent.
 */
export async function ensureBucket(bucket: BucketName): Promise<void> {
  const c = getStorageClient();
  const exists = await c.bucketExists(bucket);
  if (!exists) {
    await c.makeBucket(bucket);
  }
}

/**
 * Ensure all predefined buckets exist.
 * Call this during app startup.
 */
export async function ensureAllBuckets(): Promise<void> {
  await Promise.all(ALL_BUCKETS.map(ensureBucket));
}

/**
 * Upload a file buffer to a bucket.
 * Returns the object key (path within the bucket).
 */
export async function uploadFile(
  bucket: BucketName,
  key: string,
  buffer: Buffer,
  contentType: string = "application/octet-stream",
): Promise<string> {
  const c = getStorageClient();
  await ensureBucket(bucket);
  await c.putObject(bucket, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return key;
}

/**
 * Generate a presigned GET URL for a file.
 * Default expiry is 1 hour. Returns the full URL for direct access.
 */
export async function getFileUrl(
  bucket: BucketName,
  key: string,
  expirySeconds: number = 3600,
): Promise<string> {
  const c = getStorageClient();
  return c.presignedGetObject(bucket, key, expirySeconds);
}

/**
 * Delete a file from a bucket.
 */
export async function deleteFile(
  bucket: BucketName,
  key: string,
): Promise<void> {
  const c = getStorageClient();
  await c.removeObject(bucket, key);
}

/**
 * List all objects in a bucket with an optional prefix.
 */
export async function listFiles(
  bucket: BucketName,
  prefix?: string,
): Promise<string[]> {
  const c = getStorageClient();
  const objects: string[] = [];
  const stream = c.listObjects(bucket, prefix, true);
  return new Promise<string[]>((resolve, reject) => {
    stream.on("data", (obj) => {
      if (obj.name) objects.push(obj.name);
    });
    stream.on("end", () => resolve(objects));
    stream.on("error", reject);
  });
}

/**
 * Get the storage client configuration (no secrets exposed).
 */
export function getStorageConfig() {
  return {
    endpoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
  };
}
