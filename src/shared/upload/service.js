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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const uploadProductMediaFromRequest = async (req, res) => {
  validateS3Env();
  await runUploadMiddleware(
    req,
    res,
    upload.fields([
      { name: "images", maxCount: 9 },
      { name: "video", maxCount: 1 },
    ])
  );

  const images = req.files?.images || [];
  const video = req.files?.video?.[0] || null;
  const uploadedFiles = [...images, ...(video ? [video] : [])];
  const hasOversizedImage = images.some(
    (file) => Number(file.size) > MAX_IMAGE_BYTES
  );

  if (hasOversizedImage) {
    await deleteFilesFromS3(uploadedFiles.map((file) => file.key));
    throw new AppError("Each image must be 5MB or smaller", 400);
  }

  return { images, video };
};

export const deleteFilesFromS3 = async (keys = []) => {
  const validKeys = keys.filter(Boolean);

  if (validKeys.length === 0) {
    return;
  }

  await Promise.all(validKeys.map((key) => deleteFromS3(key)));
};
