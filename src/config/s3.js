import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import AppError from "../shared/errors/app-error.js";

const allowedMimeTypes = ["image/jpeg","image/webp", "image/png", "video/mp4"];
const fileExtensionsByType = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
]);

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const validateS3Env = () => {
  const requiredEnvVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET_NAME",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (variableName) => !process.env[variableName]
  );

  if (missingEnvVars.length > 0) {
    throw new AppError(
      `Missing required AWS environment variables: ${missingEnvVars.join(", ")}`,
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
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new AppError(
          "Invalid file type. Only JPEG, PNG, and MP4 files are allowed",
          400
        )
      );
    }

    return cb(null, true);
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
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});
