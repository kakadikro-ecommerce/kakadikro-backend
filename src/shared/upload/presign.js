import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getPresignedUrlExpiresIn,
  getS3BucketName,
  s3,
  validateS3Env,
} from "../../config/s3.js";
import AppError from "../errors/app-error.js";

const MAX_OBJECT_KEY_LENGTH = 1024;

export const isValidS3ObjectKey = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  const key = value.trim();

  if (!key || key.length > MAX_OBJECT_KEY_LENGTH) {
    return false;
  }

  if (/^https?:\/\//i.test(key)) {
    return false;
  }

  if (key.includes("..") || key.includes("\\") || key.startsWith("/")) {
    return false;
  }

  return true;
};

const normalizeObjectKey = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const key = value.trim().replace(/^\/+/, "");
  return isValidS3ObjectKey(key) ? key : null;
};

const createPresignedGetUrl = async (objectKey) => {
  const bucket = getS3BucketName();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });

  return getSignedUrl(s3, command, {
    expiresIn: getPresignedUrlExpiresIn(),
  });
};

const toSafePresignError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  const name = error?.name || "";

  if (name === "CredentialsProviderError" || name === "InvalidAccessKeyId") {
    return new AppError("File storage is not configured correctly", 500);
  }

  return new AppError("Unable to generate file access URL", 500);
};

export const getPresignedGetUrl = async (objectKey) => {
  const key = normalizeObjectKey(objectKey);

  if (!key) {
    return null;
  }

  try {
    validateS3Env();
    return await createPresignedGetUrl(key);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to generate presigned URL", error?.name || "");
    }

    throw toSafePresignError(error);
  }
};

export const getPresignedGetUrls = async (objectKeys = []) => {
  const uniqueKeys = [
    ...new Set(objectKeys.map(normalizeObjectKey).filter(Boolean)),
  ];
  const urlMap = new Map();

  if (uniqueKeys.length === 0) {
    return urlMap;
  }

  validateS3Env();

  const signedEntries = await Promise.all(
    uniqueKeys.map(async (key) => {
      try {
        const url = await createPresignedGetUrl(key);
        return [key, url];
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          console.error("Failed to generate presigned URL", error?.name || "");
        }

        if (error instanceof AppError) {
          throw error;
        }

        if (
          error?.name === "CredentialsProviderError" ||
          error?.name === "InvalidAccessKeyId"
        ) {
          throw new AppError("File storage is not configured correctly", 500);
        }

        return [key, null];
      }
    })
  );

  for (const [key, url] of signedEntries) {
    urlMap.set(key, url);
  }

  return urlMap;
};
