import multer from "multer";
import AppError from "../shared/errors/app-error.js";

const getErrorMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "File size exceeds the 5MB limit";
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return "Unexpected file field received";
    }

    return error.message;
  }

  if (error.name === "ValidationError") {
    return "MongoDB validation failed";
  }

  return error.message || "Internal server error";
};

const getStatusCode = (error) => {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error instanceof multer.MulterError) {
    return 400;
  }

  if (error.name === "ValidationError") {
    return 400;
  }

  return error.statusCode || 500;
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = getStatusCode(error);
  const message = getErrorMessage(error);

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null,
  });
};

export default errorHandler;
