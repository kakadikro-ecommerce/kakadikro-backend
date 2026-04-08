import { badRequest } from "../shared/errors/http-error.js";

export const buildErrorDetails = (details = []) => {
  if (!Array.isArray(details)) return [];

  return details.map((detail) => ({
    message: detail.message || "Invalid value",
    path: detail.path ? detail.path.join(".") : "",
  }));
};

export const validateRequest = (schema, property = "body") => {
  return (req, res, next) => {
    try {
      if (!schema || typeof schema.validate !== "function") {
        throw new Error("Invalid validation schema provided");
      }

      if (!req[property]) {
        throw badRequest(`Request ${property} is missing`);
      }

      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw badRequest("Validation failed", buildErrorDetails(error.details));
      }

      req[property] = value;
      return next();
    } catch (err) {
      return next(err);
    }
  };
};

export default validateRequest;
