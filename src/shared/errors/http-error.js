import mongoose from "mongoose";
import AppError from "./app-error.js";

export const createHttpError = (message, statusCode, details = null) =>
  new AppError(message, statusCode, details);

export const badRequest = (message, details = null) =>
  createHttpError(message, 400, details);

export const unauthorized = (message = "Unauthorized", details = null) =>
  createHttpError(message, 401, details);

export const forbidden = (message = "Forbidden", details = null) =>
  createHttpError(message, 403, details);

export const notFound = (message = "Resource not found", details = null) =>
  createHttpError(message, 404, details);

export const conflict = (message, details = null) =>
  createHttpError(message, 409, details);

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const ensureValidObjectId = (value, resourceName = "Resource") => {
  if (!isValidObjectId(value)) {
    throw badRequest(`Invalid ${resourceName} id`);
  }
};

export const ensureFound = (value, message) => {
  if (!value) {
    throw notFound(message);
  }

  return value;
};
