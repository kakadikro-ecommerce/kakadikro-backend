import { notFound } from "../shared/errors/http-error.js";

const notFoundHandler = (req, res, next) => {
  next(notFound("The requested resource was not found"));
};

export default notFoundHandler;
