import Joi from "joi";

const booleanFromForm = Joi.boolean().truthy("true").falsy("false");

const productTypeSchema = Joi.string()
  .trim()
  .uppercase()
  .valid("HOME", "CROSSLIFE", "CROSSLINE")
  .messages({
    "any.only": "Please select Home, Crosslife, or Crossline",
    "any.required": "Please select where this banner should appear",
  });

export const createHeroBannerValidation = Joi.object({
  productType: productTypeSchema.required(),
  sortOrder: Joi.number().integer().min(0).max(9999).default(0),
  isActive: booleanFromForm.default(true),
  altText: Joi.string().trim().allow("").max(200).default(""),
});

export const updateHeroBannerValidation = Joi.object({
  productType: productTypeSchema.optional(),
  sortOrder: Joi.number().integer().min(0).max(9999).optional(),
  isActive: booleanFromForm.optional(),
  altText: Joi.string().trim().allow("").max(200).optional(),
});
