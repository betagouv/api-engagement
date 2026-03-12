import { Readable } from "stream";

import { CompleteMultipartUploadCommandOutput, DeleteObjectCommand, GetObjectCommand, ObjectCannedACL, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import { BUCKET_NAME, REGION, SCW_ACCESS_KEY, SCW_HOST, SCW_SECRET_KEY } from "@/config";

if (!SCW_HOST || !BUCKET_NAME || !REGION || !SCW_ACCESS_KEY || !SCW_SECRET_KEY) {
  throw new Error("Missing Scaleway credentials");
}

const bucket = new S3Client({
  endpoint: SCW_HOST,
  region: REGION,
  credentials: {
    accessKeyId: SCW_ACCESS_KEY,
    secretAccessKey: SCW_SECRET_KEY,
  },
  forcePathStyle: false,
});

export const BUCKET_URL = `https://${BUCKET_NAME}.${SCW_HOST.replace("https://", "")}`;

export const OBJECT_ACL: Record<string, ObjectCannedACL> = {
  PRIVATE: "private",
  PUBLIC_READ: "public-read",
  PUBLIC_READ_WRITE: "public-read-write",
  AUTHENTICATED_READ: "authenticated-read",
  AWS_EXEC_READ: "aws-exec-read",
  BUCKET_OWNER_READ: "bucket-owner-read",
  BUCKET_OWNER_FULL_CONTROL: "bucket-owner-full-control",
};

const DEFAULT_OPTIONS = {
  Bucket: BUCKET_NAME,
  ACL: OBJECT_ACL.PRIVATE,
};

export const putObject = async (objectName: string, objectContent: string | Buffer, options = {}): Promise<CompleteMultipartUploadCommandOutput> => {
  const params = {
    ...DEFAULT_OPTIONS,
    ...options,
    Key: objectName,
    Body: objectContent,
  };
  const upload = new Upload({ client: bucket, params });
  return upload.done();
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const getObject = async (objectName: string, bucketName = BUCKET_NAME): Promise<{ Body: Buffer }> => {
  const response = await bucket.send(new GetObjectCommand({ Bucket: bucketName, Key: objectName }));
  const body = await streamToBuffer(response.Body as Readable);
  return { Body: body };
};

export const deleteObject = async (objectName: string, bucketName = BUCKET_NAME): Promise<void> => {
  await bucket.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectName }));
};
