import Joi from "joi";

export const createContactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(8).max(15).required(),
  message: Joi.string().min(5).max(1000).required(),
});