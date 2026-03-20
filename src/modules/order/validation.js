import Joi from "joi";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "./constants.js";

const shippingAddressValidation = Joi.object({
  fullName: Joi.string().trim().min(3).required(),
  phone: Joi.string().trim().min(10).max(15).required(),
  addressLine1: Joi.string().trim().min(5).required(),
  addressLine2: Joi.string().trim().allow("").optional(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  postalCode: Joi.string().trim().min(4).max(10).required(),
  country: Joi.string().trim().default("India"),
});

export const createOrderValidation = Joi.object({
  shippingAddress: shippingAddressValidation.required(),
  paymentMethod: Joi.string()
    .trim()
    .valid(...PAYMENT_METHODS)
    .optional(),
  shippingAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  notes: Joi.string().trim().allow("").optional(),
});

export const updateOrderStatusValidation = Joi.object({
  orderStatus: Joi.string()
    .trim()
    .valid(...ORDER_STATUSES)
    .optional(),
  paymentStatus: Joi.string()
    .trim()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  adminNote: Joi.string().trim().allow("").optional(),
}).or("orderStatus", "paymentStatus", "adminNote");
