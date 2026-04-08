import Joi from "joi";
import { isValidObjectId } from "../../shared/errors/http-error.js";

const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error("any.invalid");
  }
  return value;
}, "ObjectId validation");

export const createReviewValidation = Joi.object({
  productId: objectIdSchema.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().allow("").optional(),
});

export const updateReviewValidation = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().trim().allow("").optional(),
}).min(1);
