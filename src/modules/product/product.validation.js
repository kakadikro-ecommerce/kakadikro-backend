import Joi from "joi";
import { nonNumericString } from "../../shared/validation/string.js";

const imageSchema = Joi.object({
  url: Joi.string().trim().required(),
  altText: Joi.string().allow("").optional(),
});

const variantSchema = Joi.object({
  weight: Joi.string().trim().required(),

  price: Joi.number()
    .min(1)
    .required()
    .messages({
      "number.base": "Price must be a number",
      "number.min": "Price must be at least 1",
    }),

  mrp: Joi.number()
    .min(Joi.ref("price"))
    .required()
    .messages({
      "number.base": "MRP must be a number",
      "number.min": "MRP must be greater than or equal to price",
    }),

  stock: Joi.number()
    .min(0)
    .required()
    .messages({
      "number.base": "Stock must be a number",
    }),
});

export const createProductValidation = Joi.object({

  name: nonNumericString("Name").min(2).required(),

  brand: nonNumericString("Brand").min(2).required(),

  category: nonNumericString("Category").min(2).required(),

  slug: Joi.string().trim().optional(),

  description: Joi.string().allow("").optional(),

  shortDescription: Joi.string().allow("").optional(),

  images: Joi.array()
    .items(imageSchema)
    .optional(),

  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .required(),

  ingredients: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  features: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  benefits: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  usage: Joi.string().allow("").optional(),

  isActive: Joi.boolean().optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
});

export const updateProductValidation = Joi.object({

  name: nonNumericString("Name").min(2).required(),

  brand: nonNumericString("Brand").min(2).required(),

  category: nonNumericString("Category").min(2).required(),

  slug: Joi.string().trim().optional(),

  description: Joi.string().allow("").optional(),

  shortDescription: Joi.string().allow("").optional(),

  images: Joi.array()
    .items(imageSchema)
    .optional(),

  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .optional(),

  ingredients: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  features: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  benefits: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  usage: Joi.string().allow("").optional(),

  isActive: Joi.boolean().optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
});
