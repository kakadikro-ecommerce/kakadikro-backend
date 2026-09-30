import {
  badRequest,
  forbidden,
  unauthorized,
} from "../shared/errors/http-error.js";

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized("Please log in to continue");
      }

      if (!req.user.role) {
        throw badRequest("Your account role is not set. Please contact support.");
      }

      if (!roles.includes(req.user.role)) {
        throw forbidden("You do not have permission to perform this action");
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
