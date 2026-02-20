import AWS from "aws-sdk";

import { BUCKET_NAME, REGION, SCW_ACCESS_KEY, SCW_HOST, SCW_SECRET_KEY } from "@/config";

if (!SCW_HOST || !BUCKET_NAME || !REGION || !SCW_ACCESS_KEY || !SCW_SECRET_KEY) {
  throw new Error("Missing Scaleway credentials");
}

const bucket = new AWS.S3({
  endpoint: SCW_HOST,
  accessKeyId: SCW_ACCESS_KEY,
  secretAccessKey: SCW_SECRET_KEY,
});

export const BUCKET_URL = `https://${BUCKET_NAME}.${SCW_HOST.replace("https://", "")}`;

export const OBJECT_ACL = {
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

export const putObject = async (objectName: string, objectContent: string | Buffer, options = {}): Promise<AWS.S3.ManagedUpload.SendData> => {
  return new Promise((resolve, reject) => {
    const params = {
      ...DEFAULT_OPTIONS,
      ...options,
      Key: objectName,
      Body: objectContent,
    };
    bucket.upload(params, (err: any, data: AWS.S3.ManagedUpload.SendData) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
};

export const getObject = async (objectName: string, bucketName = BUCKET_NAME): Promise<AWS.S3.GetObjectOutput> => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucketName,
      Key: objectName,
    };
    bucket.getObject(params, (err: any, data: AWS.S3.GetObjectOutput) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
};

export const deleteObject = async (objectName: string, bucketName = BUCKET_NAME): Promise<AWS.S3.DeleteObjectOutput> => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucketName,
      Key: objectName,
    };
    bucket.deleteObject(params, (err: any, data: AWS.S3.DeleteObjectOutput) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
};
