import { notFound } from "../shared/errors/http-error.js";

const notFoundHandler = (req, res, next) => {
  next(notFound(`Route not found: ${req.originalUrl}`));
};

export default notFoundHandler;
