import jwt from "jsonwebtoken";
import User from "../modules/user/model.js";
import {
  unauthorized,
} from "../shared/errors/http-error.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw unauthorized("Unauthorized: token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw unauthorized("Unauthorized: user not found");
    }

    req.user = user;

    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(unauthorized("Unauthorized: invalid or expired token"));
    }

    if (error.statusCode) {
      return next(error);
    }

    return next(unauthorized("Unauthorized: invalid or expired token"));
  }
};
