import Joi from "joi";
import { nonNumericString } from "../../shared/validation/string.js";

const imageSchema = Joi.object({
  url: Joi.string().trim().required(),
  altText: Joi.string().allow("").optional(),
});

const stringMapSchema = Joi.object()
  .pattern(Joi.string().trim(), Joi.string().allow("").trim())
  .optional();

const variantSchema = Joi.object({
  name: Joi.string().trim(),

  // Accepted for backward compatibility; normalized to name + attributes.weight
  weight: Joi.string().trim(),

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

  attributes: stringMapSchema,
})
  .or("name", "weight")
  .messages({
    "object.missing": "Variant name is required",
  });

const productTypeSchema = Joi.string()
  .valid("GROCERY", "ELECTRONICS")
  .messages({
    "any.only": "productType must be either GROCERY or ELECTRONICS",
  });

const ingredientsSchema = Joi.array()
  .items(Joi.string().trim())
  .optional();

const validateGroceryIngredients = (value, helpers) => {
  const productType = value.productType || "GROCERY";

  if (productType === "GROCERY") {
    if (!Array.isArray(value.ingredients) || value.ingredients.length === 0) {
      return helpers.message("Ingredients are required for grocery products");
    }
  }

  return value;
};

export const createProductValidation = Joi.object({

  name: nonNumericString("Name").min(2).required(),

  productType: productTypeSchema.required(),

  category: nonNumericString("Category").min(2).required(),

  slug: Joi.string().trim().optional(),

  description: Joi.string().allow("").optional(),

  shortDescription: Joi.string().allow("").optional(),

  images: Joi.array()
    .items(imageSchema)
    .optional(),

  specifications: stringMapSchema,

  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .required(),

  ingredients: ingredientsSchema,

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
}).custom(validateGroceryIngredients);

export const updateProductValidation = Joi.object({

  name: nonNumericString("Name").min(2).required(),

  productType: productTypeSchema.optional(),

  category: nonNumericString("Category").min(2).required(),

  slug: Joi.string().trim().optional(),

  description: Joi.string().allow("").optional(),

  shortDescription: Joi.string().allow("").optional(),

  images: Joi.array()
    .items(imageSchema)
    .optional(),

  specifications: stringMapSchema,

  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .optional(),

  ingredients: ingredientsSchema,

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
}).custom((value, helpers) => {
  if (value.productType) {
    return validateGroceryIngredients(value, helpers);
  }

  return value;
});
