import Joi from "joi";
import { isValidObjectId } from "../../shared/errors/http-error.js";

const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error("any.invalid");
  }

  return value;
}, "ObjectId validation");

const booleanFromForm = Joi.boolean().truthy("true").falsy("false");

export const createBrandVideoValidation = Joi.object({
  productId: objectIdSchema.required().messages({
    "any.required": "Please select a product",
    "any.invalid": "Please select a valid product",
  }),
  variantName: Joi.string().trim().allow("").max(120).default(""),
  sortOrder: Joi.number().integer().min(0).max(9999).default(0),
  isActive: booleanFromForm.default(true),
});

export const updateBrandVideoValidation = Joi.object({
  productId: objectIdSchema.optional().messages({
    "any.invalid": "Please select a valid product",
  }),
  variantName: Joi.string().trim().allow("").max(120).optional(),
  sortOrder: Joi.number().integer().min(0).max(9999).optional(),
  isActive: booleanFromForm.optional(),
}).min(1);
