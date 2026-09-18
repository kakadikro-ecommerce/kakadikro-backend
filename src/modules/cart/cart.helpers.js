import AppError from "../../shared/errors/app-error.js";
import {
  badRequest,
  createHttpError,
  ensureFound,
} from "../../shared/errors/http-error.js";
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

export const attachCartRelations = (query) =>
  query.populate("items.product", "name slug category productType images variants isActive");

export const buildCartSummary = async (cart) => {
  const imageKeys = cart.items.map((item) =>
    extractImageKey(item.product?.images?.[0]?.url || item.productImage || "")
  );
  const imageUrlMap = await getPresignedGetUrls(imageKeys);

  const items = cart.items.map((item, index) => {
    const product = item.product;

    const variant = product?.variants
      ? findVariantByWeight(product, item.weight)
      : null;

    const unitPrice = variant?.price ?? item.unitPrice ?? 0;
    const totalPrice = unitPrice * item.quantity;
    const imageKey = imageKeys[index];
    let productImage = "";

    if (imageKey) {
      productImage = isFullUrl(imageKey)
        ? imageKey
        : imageUrlMap.get(imageKey) || "";
    }

    return {
      _id: item._id,
      product: product?._id || item.product,
      name: product?.name || item.name,
      slug: product?.slug || item.slug || "",
      productImage,
      category: product?.category || "",
      weight: item.weight,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      isAvailable: Boolean(product?.isActive && variant),
      stock: variant?.stock ?? 0,
    };
  });

  const subtotalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    _id: cart._id,
    user: cart.user,
    totalItems,
    subtotalAmount,
    items,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

export const buildCartItemSnapshot = (product, variant, quantity) => ({
  product: product._id,
  name: product.name,
  slug: product.slug,
  productImage: extractImageKey(product.images?.[0]?.url || "") || "",
  weight: getVariantKey(variant),
  quantity,
  unitPrice: variant.price,
});

export const ensureCartItemQuantity = (quantity, stock, productName, weight) => {
  if (quantity < 1) {
    throw badRequest("Quantity must be at least 1");
  }

  if (stock < quantity) {
    throw badRequest(
      `Only ${stock} item(s) left for '${productName}' (${weight})`
    );
  }
};

export const ensureActiveProduct = (product) =>
  ensureFound(product && product.isActive ? product : null, "Product not found");

export const rethrowCartServiceError = (error, message) => {
  if (error instanceof AppError) {
    throw error;
  }

  if (error?.name === "ValidationError") {
    throw badRequest("Cart validation failed", error.message);
  }

  throw createHttpError(message, error?.statusCode || 500, error?.message || null);
};
