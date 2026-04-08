import User from "../modules/user/user.model.js";
import Admin from "../modules/admin/admin.model.js";
import {
  unauthorized,
} from "../shared/errors/http-error.js";
import { verifyAccessToken } from "../shared/auth/token.service.js";

export const protect = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw unauthorized("Unauthorized: token missing");
    }

    const token = authorizationHeader.split(" ")[1];

    if (!token) {
      throw unauthorized("Unauthorized: token missing");
    }

    const decoded = verifyAccessToken(token);
    const model = decoded.role === "user" ? User : Admin;
    const user = await model.findById(decoded.id);

    if (!user) {
      throw unauthorized("Unauthorized: user not found");
    }

    req.user = user;

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(unauthorized("Unauthorized: invalid or expired token"));
    }

    if (error.statusCode) {
      return next(error);
    }

    return next(unauthorized("Unauthorized: invalid or expired token"));
  }
};
