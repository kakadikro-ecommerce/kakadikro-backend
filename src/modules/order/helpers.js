import AppError from "../../shared/errors/app-error.js";
import { badRequest, createHttpError, forbidden } from "../../shared/errors/http-error.js";

export const buildOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${timestamp}${randomSuffix}`;
};

export const findVariantByWeight = (product, weight) =>
  product.variants.find((variant) => variant.weight === weight);

export const buildOrderItem = (product, variant, quantity) => ({
  product: product._id,
  name: product.name,
  slug: product.slug,
  productImage: product.images?.[0]?.url || "",
  weight: variant.weight,
  quantity,
  unitPrice: variant.price,
  totalPrice: variant.price * quantity,
});

export const calculateTotals = (items, charges = {}) => {
  const subtotalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingAmount = Number(charges.shippingAmount || 0);
  const taxAmount = Number(charges.taxAmount || 0);
  const discountAmount = Number(charges.discountAmount || 0);
  const totalAmount =
    subtotalAmount + shippingAmount + taxAmount - discountAmount;

  if (totalAmount < 0) {
    throw badRequest("Total amount cannot be negative");
  }

  return {
    subtotalAmount,
    shippingAmount,
    taxAmount,
    discountAmount,
    totalAmount,
  };
};

export const rollbackInventory = async (inventoryAdjustments) => {
  const touchedProducts = new Set();

  for (const adjustment of inventoryAdjustments) {
    adjustment.variant.stock = adjustment.originalStock;
    touchedProducts.add(adjustment.product);
  }

  await Promise.all(Array.from(touchedProducts, (product) => product.save()));
};

export const attachOrderRelations = (query) =>
  query
    .populate("user", "name email role")
    .populate("items.product", "name slug category images variants");

export const ensureOrderAccess = (order, requester) => {
  const isOwner = order.user?._id
    ? order.user._id.toString() === requester.id
    : order.user.toString() === requester.id;
  const isAdmin = requester.role === "admin";

  if (!isOwner && !isAdmin) {
    throw forbidden("You are not allowed to access this order");
  }
};

export const rethrowOrderServiceError = (error, message) => {
  if (error instanceof AppError) {
    throw error;
  }

  if (error?.name === "ValidationError") {
    throw badRequest("Order validation failed", error.message);
  }

  throw createHttpError(message, error?.statusCode || 500, error?.message || null);
};
