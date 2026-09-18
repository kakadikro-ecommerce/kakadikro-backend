import AppError from "../../shared/errors/app-error.js";
import { badRequest, createHttpError, forbidden } from "../../shared/errors/http-error.js";
import { extractImageKey, isFullUrl } from "../../shared/utils/image.js";
import { getPresignedGetUrls } from "../../shared/upload/presign.js";

const getAttributeValue = (attributes, key) => {
  if (!attributes) {
    return undefined;
  }

  if (typeof attributes.get === "function") {
    return attributes.get(key);
  }

  return attributes[key];
};

export const getVariantKey = (variant) =>
  variant?.name ||
  variant?.weight ||
  getAttributeValue(variant?.attributes, "weight") ||
  "";

export const findVariantByWeight = (product, weight) =>
  product.variants.find((variant) => {
    if (variant.name === weight) {
      return true;
    }

    if (variant.weight === weight) {
      return true;
    }

    return getAttributeValue(variant.attributes, "weight") === weight;
  });

export const buildOrderItem = (product, variant, quantity) => ({
  product: product._id,
  name: product.name,
  slug: product.slug,
  productImage: extractImageKey(product.images?.[0]?.url || "") || "",
  weight: getVariantKey(variant),
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
    .populate("items.product", "name slug category productType images variants");

export const normalizeOrderImages = async (order) => {
  const orderData = order?.toObject ? order.toObject() : order;

  if (!orderData?.items || !Array.isArray(orderData.items)) {
    return orderData;
  }

  const imageKeys = orderData.items.map((item) =>
    extractImageKey(item.product?.images?.[0]?.url || item.productImage || "")
  );
  const imageUrlMap = await getPresignedGetUrls(imageKeys);

  orderData.items = orderData.items.map((item, index) => {
    const imageKey = imageKeys[index];
    let productImage = "";

    if (imageKey) {
      productImage = isFullUrl(imageKey)
        ? imageKey
        : imageUrlMap.get(imageKey) || "";
    }

    return {
      ...item,
      productImage,
    };
  });

  return orderData;
};

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
