import multer from "multer";
import AppError from "../shared/errors/app-error.js";

const isProduction = () => process.env.NODE_ENV === "production";

const looksTechnical = (message = "") => {
  const text = String(message);
  return (
    /E11000|Cast to ObjectId|MongoServerError|ValidationError|at\s+\S+\s+\(|\bstack\b|ENOENT|ECONNREFUSED|ETIMEDOUT|EAUTH|ESOCKET|\bsmtp\b|\bnodemailer\b|\baws\b|\bs3\b|mongoose|jwt malformed|buffer|undefined is not|cannot read prop/i.test(
      text
    )
  );
};

const getMongooseValidationMessage = (error) => {
  const messages = Object.values(error.errors || {})
    .map((item) => item?.message)
    .filter(Boolean);

  if (messages.length === 1) {
    return messages[0];
  }

  if (messages.length > 1) {
    return "Please check the form and fix the highlighted fields";
  }

  return "Some fields are invalid. Please review and try again.";
};

const getDuplicateKeyMessage = (error) => {
  const key = Object.keys(error.keyPattern || error.keyValue || {})[0];

  if (key === "email") {
    return "An account with this email already exists";
  }

  if (key === "slug") {
    return "A product with this name or slug already exists";
  }

  if (key === "razorpayOrderId") {
    return "This payment order already exists";
  }

  if (key === "phone") {
    return "An account with this phone number already exists";
  }

  return "This record already exists. Please use different details.";
};

const sanitizeDetails = (details) => {
  if (details == null) {
    return null;
  }

  if (typeof details === "string") {
    return looksTechnical(details) ? null : details;
  }

  if (Array.isArray(details)) {
    const cleaned = details
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const message = String(item.message || "").trim();
        if (!message || looksTechnical(message)) {
          return null;
        }

        return {
          message: message.replace(/["']/g, ""),
          path: item.path || "",
        };
      })
      .filter(Boolean);

    return cleaned.length > 0 ? cleaned : null;
  }

  return null;
};

const getErrorMessage = (error) => {
  if (error instanceof AppError) {
    if (looksTechnical(error.message)) {
      return "Something went wrong. Please try again.";
    }
    return error.message;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Each image must be 5MB or smaller and the video must be 50MB or smaller";
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return "You can upload up to 9 images and 1 video";
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return "Upload images on the images field and the video on the video field.";
    }

    return "File upload failed. Please try again.";
  }

  // Express body-parser / proxy payload too large
  if (
    error.status === 413 ||
    error.statusCode === 413 ||
    error.type === "entity.too.large"
  ) {
    return "Upload is too large. Use up to 9 images at 5MB each and one video at 50MB or smaller.";
  }

  if (error.name === "ValidationError") {
    return getMongooseValidationMessage(error);
  }

  if (error.name === "CastError") {
    return "Invalid id provided";
  }

  if (error.code === 11000 || error.name === "MongoServerError") {
    return getDuplicateKeyMessage(error);
  }

  if (error.name === "JsonWebTokenError") {
    return "Your session is invalid. Please log in again.";
  }

  if (error.name === "TokenExpiredError") {
    return "Your session has expired. Please log in again.";
  }

  if (error.statusCode === 400 && error.message && !looksTechnical(error.message)) {
    return error.message;
  }

  if (error.statusCode && error.statusCode < 500 && error.message) {
    if (!looksTechnical(error.message)) {
      return error.message;
    }
  }

  // Never expose internal / stack / vendor errors to the UI
  if (isProduction() || looksTechnical(error.message) || !error.message) {
    return "Something went wrong. Please try again.";
  }

  return error.message;
};

const getStatusCode = (error) => {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error instanceof multer.MulterError) {
    return 400;
  }

  if (
    error.status === 413 ||
    error.statusCode === 413 ||
    error.type === "entity.too.large"
  ) {
    return 413;
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return 400;
  }

  if (error.code === 11000) {
    return 409;
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return 401;
  }

  return error.statusCode || 500;
};

const getMongooseValidationDetails = (error) => {
  if (error.name !== "ValidationError") {
    return null;
  }

  const details = Object.entries(error.errors || {}).map(([path, item]) => ({
    path,
    message: String(item?.message || "Invalid value").replace(/["']/g, ""),
  }));

  return details.length > 0 ? details : null;
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = getStatusCode(error);
  const message = getErrorMessage(error);
  const details =
    sanitizeDetails(error.details) || getMongooseValidationDetails(error);

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
};

export default errorHandler;
