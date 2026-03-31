import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, upload, validateS3Env } from "../../config/s3.js";
import AppError from "../errors/app-error.js";

const deleteFromS3 = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    })
  );
};

export const runUploadMiddleware = async (req, res, middleware) => {
  await new Promise((resolve, reject) => {
    middleware(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

export const uploadSingleFileFromRequest = async (
  req,
  res,
  fieldName = "file"
) => {
  validateS3Env();
  await runUploadMiddleware(req, res, upload.single(fieldName));

  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }

  return req.file;
};

export const uploadMultipleFilesFromRequest = async (
  req,
  res,
  fieldName = "files",
  maxCount = 5,
  options = {}
) => {
  const { required = true } = options;

  validateS3Env();
  await runUploadMiddleware(req, res, upload.array(fieldName, maxCount));

  if (required && (!req.files || req.files.length === 0)) {
    throw new AppError("No files uploaded", 400);
  }

  return req.files || [];
};

export const deleteFilesFromS3 = async (keys = []) => {
  const validKeys = keys.filter(Boolean);

  if (validKeys.length === 0) {
    return;
  }

  await Promise.all(validKeys.map((key) => deleteFromS3(key)));
};
