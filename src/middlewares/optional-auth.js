import { protect } from "./auth.js";

export const optionalProtect = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return next();
  }

  return protect(req, res, next);
};
