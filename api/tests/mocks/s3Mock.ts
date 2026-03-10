import { vi } from "vitest";

const s3Mock = {
  BUCKET_URL: "https://mock-bucket.example.com",
  OBJECT_ACL: {
    PRIVATE: "private",
    PUBLIC_READ: "public-read",
    PUBLIC_READ_WRITE: "public-read-write",
    AUTHENTICATED_READ: "authenticated-read",
    AWS_EXEC_READ: "aws-exec-read",
    BUCKET_OWNER_READ: "bucket-owner-read",
    BUCKET_OWNER_FULL_CONTROL: "bucket-owner-full-control",
  },
  putObject: vi.fn().mockResolvedValue({}),
  getObject: vi.fn().mockResolvedValue({}),
  deleteObject: vi.fn().mockResolvedValue({}),
};

export default s3Mock;
