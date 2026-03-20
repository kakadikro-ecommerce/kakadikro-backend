import Joi from "joi";

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  altText: Joi.string().allow("").optional(),
});

const variantSchema = Joi.object({
  weight: Joi.string().trim().required(),

  price: Joi.number()
    .min(0)
    .required(),

  mrp: Joi.number()
    .min(Joi.ref("price"))
    .optional(),

  stock: Joi.number()
    .min(0)
    .optional(),

});

export const createProductValidation = Joi.object({
  name: Joi.string().trim().min(3).required(),

  slug: Joi.string().trim().optional(),

  description: Joi.string().allow("").optional(),

  shortDescription: Joi.string().allow("").optional(),

  category: Joi.string().trim().required(),

  brand: Joi.string().trim().optional(),

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

  isFeatured: Joi.boolean().optional(),

  rating: Joi.number()
    .min(0)
    .max(5)
    .optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
}); 

export const updateProductValidation = Joi.object({
  name: Joi.string().trim().min(3).optional(),

  slug: Joi.string().trim().optional(),

  description: Joi.string().allow("").optional(),

  shortDescription: Joi.string().allow("").optional(),

  category: Joi.string().trim().optional(),

  brand: Joi.string().trim().optional(),

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

  isFeatured: Joi.boolean().optional(),

  rating: Joi.number()
    .min(0)
    .max(5)
    .optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
});