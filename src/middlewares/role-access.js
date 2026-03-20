import {
  badRequest,
  forbidden,
  unauthorized,
} from "../shared/errors/http-error.js";

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized("Unauthorized: User not logged in");
      }

      if (!req.user.role) {
        throw badRequest("User role not defined");
      }

      if (!roles.includes(req.user.role)) {
        throw forbidden(`Access denied: Role '${req.user.role}' is not allowed`);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
