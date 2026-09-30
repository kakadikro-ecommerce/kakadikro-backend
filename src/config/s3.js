import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import AppError from "../shared/errors/app-error.js";

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const videoMimeTypes = ["video/mp4"];
const fileExtensionsByType = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
]);

const buildS3ClientConfig = () => {
  const config = {
    region: process.env.AWS_REGION || "ap-south-1",
  };

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  return config;
};

export const s3 = new S3Client(buildS3ClientConfig());

export const getS3BucketName = () => process.env.AWS_S3_BUCKET_NAME || "";

export const getPresignedUrlExpiresIn = () => {
  const parsed = Number.parseInt(
    process.env.S3_PRESIGNED_URL_EXPIRES_IN || "3600",
    10
  );

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 3600;
  }

  return Math.min(parsed, 604800);
};

export const validateS3Env = () => {
  const requiredEnvVars = ["AWS_S3_BUCKET_NAME"];
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Local/.env deploys use explicit keys. IAM-role deploys may omit both.
  if (accessKeyId || secretAccessKey) {
    requiredEnvVars.push("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY");
  }

  const missingEnvVars = requiredEnvVars.filter(
    (variableName) => !process.env[variableName]
  );

  if (missingEnvVars.length > 0) {
    throw new AppError(
      "File storage is not configured correctly. Please contact support.",
      500
    );
  }
};

const createFileKey = (file) => {
  const fileExtension =
    fileExtensionsByType.get(file.mimetype) ||
    path.extname(file.originalname).toLowerCase();

  return `uploads/${uuidv4()}${fileExtension}`;
};

const fileFilter = (req, file, cb) => {
  try {
    if (file.fieldname === "images") {
      if (!imageMimeTypes.includes(file.mimetype)) {
        return cb(
          new AppError(
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed",
            400
          )
        );
      }

      return cb(null, true);
    }

    if (file.fieldname === "video") {
      if (!videoMimeTypes.includes(file.mimetype)) {
        return cb(
          new AppError("Invalid file type. Only MP4 video is allowed", 400)
        );
      }

      return cb(null, true);
    }

    return cb(
      new AppError(
        "Upload images on the images field and the video on the video field.",
        400
      )
    );
  } catch (error) {
    return cb(error);
  }
};

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      try {
        return cb(null, {
          fieldName: file.fieldname,
          originalName: file.originalname,
        });
      } catch (error) {
        return cb(error);
      }
    },
    key: (req, file, cb) => {
      try {
        return cb(null, createFileKey(file));
      } catch (error) {
        return cb(error);
      }
    },
  }),
  limits: {
    // Video ceiling. Images are rejected above 5MB after the upload.
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter,
});
