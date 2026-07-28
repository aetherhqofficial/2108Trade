import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStorageClient,
  ensureBucket,
  ensureAllBuckets,
  uploadFile,
  getFileUrl,
  deleteFile,
  Buckets,
  getStorageConfig,
} from "@/lib/storage";

// Mock minio so we don't need a real MinIO server in tests
vi.mock("minio", () => {
  const mockClient = {
    bucketExists: vi.fn().mockResolvedValue(false),
    makeBucket: vi.fn().mockResolvedValue(undefined),
    putObject: vi.fn().mockResolvedValue({ etag: "mock-etag" }),
    presignedGetObject: vi
      .fn()
      .mockResolvedValue("https://localhost:9000/bucket/key?signature=mock"),
    removeObject: vi.fn().mockResolvedValue(undefined),
    listObjects: vi.fn().mockReturnValue({
      on: vi.fn((event: string, cb: Function) => {
        if (event === "data") {
          cb({ name: "file1.txt" });
          cb({ name: "file2.txt" });
        }
        if (event === "end") cb();
        return { on: vi.fn() };
      }),
    }),
  };
  return {
    Client: vi.fn().mockImplementation(() => mockClient),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("storage module", () => {
  describe("Buckets", () => {
    it("should define all three bucket names", () => {
      expect(Buckets.USER_UPLOADS).toBe("user-uploads");
      expect(Buckets.REPORTS).toBe("reports");
      expect(Buckets.MODEL_ARTIFACTS).toBe("model-artifacts");
    });
  });

  describe("getStorageClient", () => {
    it("should return a MinIO client instance", () => {
      const client = getStorageClient();
      expect(client).toBeDefined();
      expect(client.bucketExists).toBeDefined();
    });

    it("should return the same client instance (singleton)", () => {
      const c1 = getStorageClient();
      const c2 = getStorageClient();
      expect(c1).toBe(c2);
    });
  });

  describe("ensureBucket", () => {
    it("should create bucket if it does not exist", async () => {
      const client = getStorageClient();
      await ensureBucket(Buckets.USER_UPLOADS);
      expect(client.bucketExists).toHaveBeenCalledWith(Buckets.USER_UPLOADS);
      expect(client.makeBucket).toHaveBeenCalledWith(Buckets.USER_UPLOADS);
    });

    it("should not create bucket if it already exists", async () => {
      const client = getStorageClient();
      // Override for this test: bucket already exists
      client.bucketExists = vi.fn().mockResolvedValue(true);

      await ensureBucket(Buckets.REPORTS);
      expect(client.bucketExists).toHaveBeenCalledWith(Buckets.REPORTS);
      expect(client.makeBucket).not.toHaveBeenCalled();
    });
  });

  describe("uploadFile and getFileUrl", () => {
    it("should upload a file and return its key", async () => {
      const buffer = Buffer.from("hello world");
      const key = await uploadFile(
        Buckets.USER_UPLOADS,
        "test/hello.txt",
        buffer,
        "text/plain",
      );
      expect(key).toBe("test/hello.txt");
    });

    it("should generate a presigned URL for a file", async () => {
      const url = await getFileUrl(Buckets.REPORTS, "report.pdf");
      expect(url).toContain("https://");
      expect(url).toContain("report.pdf");
    });
  });

  describe("deleteFile", () => {
    it("should delete a file from a bucket", async () => {
      const client = getStorageClient();
      await deleteFile(Buckets.USER_UPLOADS, "delete-me.txt");
      expect(client.removeObject).toHaveBeenCalledWith(
        Buckets.USER_UPLOADS,
        "delete-me.txt",
      );
    });
  });

  describe("getStorageConfig", () => {
    it("should return config without secrets", () => {
      const config = getStorageConfig();
      expect(config.endpoint).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.useSSL).toBe(false);
    });
  });
});
