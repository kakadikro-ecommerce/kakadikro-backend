import Cart from "./model.js";
import Product from "../product/model.js";
import {
  ensureFound,
  ensureValidObjectId,
} from "../../shared/errors/http-error.js";
import {
  attachCartRelations,
  buildCartItemSnapshot,
  buildCartSummary,
  ensureActiveProduct,
  ensureCartItemQuantity,
  findVariantByWeight,
  rethrowCartServiceError,
} from "./helpers.js";

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

export const getMyCart = async (userId) => {
  try {
    ensureValidObjectId(userId, "user");

    const cart = await getOrCreateCart(userId);
    const populatedCart = await attachCartRelations(Cart.findById(cart._id));

    return buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to fetch cart");
  }
};

export const addItemToCart = async (userId, payload) => {
  try {
    ensureValidObjectId(userId, "user");
    ensureValidObjectId(payload.productId, "product");

    const product = ensureActiveProduct(await Product.findById(payload.productId));
    const variant = findVariantByWeight(product, payload.weight);

    ensureFound(
      variant,
      `Variant '${payload.weight}' is not available for product '${product.name}'`
    );

    const cart = await getOrCreateCart(userId);
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === payload.productId &&
        item.weight === payload.weight
    );

    const nextQuantity = existingItem
      ? existingItem.quantity + payload.quantity
      : payload.quantity;

    ensureCartItemQuantity(
      nextQuantity,
      variant.stock,
      product.name,
      payload.weight
    );

    if (existingItem) {
      existingItem.quantity = nextQuantity;
      existingItem.unitPrice = variant.price;
      existingItem.name = product.name;
      existingItem.slug = product.slug || "";
      existingItem.productImage = product.images?.[0]?.url || "";
    } else {
      cart.items.push(buildCartItemSnapshot(product, variant, payload.quantity));
    }

    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to add item to cart");
  }
};

export const updateCartItemQuantity = async (userId, itemId, payload) => {
  try {
    ensureValidObjectId(userId, "user");
    ensureValidObjectId(itemId, "cart item");

    const cart = ensureFound(await Cart.findOne({ user: userId }), "Cart not found");
    const item = ensureFound(cart.items.id(itemId), "Cart item not found");

    const product = ensureActiveProduct(await Product.findById(item.product));
    const variant = findVariantByWeight(product, item.weight);

    ensureFound(
      variant,
      `Variant '${item.weight}' is not available for product '${product.name}'`
    );

    ensureCartItemQuantity(
      payload.quantity,
      variant.stock,
      product.name,
      item.weight
    );

    item.quantity = payload.quantity;
    item.unitPrice = variant.price;
    item.name = product.name;
    item.slug = product.slug || "";
    item.productImage = product.images?.[0]?.url || "";

    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to update cart item");
  }
};

export const removeCartItem = async (userId, itemId) => {
  try {
    ensureValidObjectId(userId, "user");
    ensureValidObjectId(itemId, "cart item");

    const cart = ensureFound(await Cart.findOne({ user: userId }), "Cart not found");
    const item = ensureFound(cart.items.id(itemId), "Cart item not found");

    item.deleteOne();
    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to remove cart item");
  }
};

export const clearCart = async (userId) => {
  try {
    ensureValidObjectId(userId, "user");

    const cart = await getOrCreateCart(userId);
    cart.items = [];
    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to clear cart");
  }
};
