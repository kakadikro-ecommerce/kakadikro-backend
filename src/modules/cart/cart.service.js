import Cart from "./cart.model.js";
import Product from "../product/product.model.js";
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
} from "./cart.helpers.js";
import { extractImageKey } from "../../shared/utils/image.js";

const ownerFilter = (actor) => {
  if (actor?.userId) {
    ensureValidObjectId(actor.userId, "user");
    return { user: actor.userId };
  }

  if (!actor?.guestTokenHash) {
    throw new Error("Cart owner is missing");
  }

  return { guestTokenHash: actor.guestTokenHash };
};

const getOrCreateCart = async (actor) => {
  const filter = ownerFilter(actor);
  let cart = await Cart.findOne(filter).select("+guestTokenHash");

  if (!cart) {
    cart = await Cart.create({
      ...filter,
      items: [],
    });
  }

  return cart;
};

const actorFromUserId = (userIdOrActor) => {
  if (userIdOrActor && typeof userIdOrActor === "object") {
    return userIdOrActor;
  }

  return { userId: userIdOrActor };
};

export const getMyCart = async (userIdOrActor) => {
  try {
    const actor = actorFromUserId(userIdOrActor);
    const cart = await getOrCreateCart(actor);
    const populatedCart = await attachCartRelations(Cart.findById(cart._id));

    return await buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to fetch cart");
  }
};

export const addItemToCart = async (userIdOrActor, payload) => {
  try {
    const actor = actorFromUserId(userIdOrActor);
    ensureValidObjectId(payload.productId, "product");

    const product = ensureActiveProduct(await Product.findById(payload.productId));
    const variant = findVariantByWeight(product, payload.weight);

    ensureFound(
      variant,
      `Variant '${payload.weight}' is not available for product '${product.name}'`
    );

    const cart = await getOrCreateCart(actor);
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
      existingItem.productImage =
        extractImageKey(product.images?.[0]?.url || "") || "";
    } else {
      cart.items.push(buildCartItemSnapshot(product, variant, payload.quantity));
    }

    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return await buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to add item to cart");
  }
};

export const updateCartItemQuantity = async (userIdOrActor, itemId, payload) => {
  try {
    const actor = actorFromUserId(userIdOrActor);
    ensureValidObjectId(itemId, "cart item");

    const cart = ensureFound(await getOrCreateCart(actor), "Cart not found");
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
    item.productImage = extractImageKey(product.images?.[0]?.url || "") || "";

    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return await buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to update cart item");
  }
};

export const removeCartItem = async (userIdOrActor, itemId) => {
  try {
    const actor = actorFromUserId(userIdOrActor);
    ensureValidObjectId(itemId, "cart item");

    const cart = ensureFound(await getOrCreateCart(actor), "Cart not found");
    const item = ensureFound(cart.items.id(itemId), "Cart item not found");

    item.deleteOne();
    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return await buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to remove cart item");
  }
};

export const mergeGuestCart = async (userId, guestTokenHash) => {
  if (!userId || !guestTokenHash) {
    return null;
  }

  const guestCart = await Cart.findOne({ guestTokenHash }).select("+guestTokenHash");
  if (!guestCart || guestCart.items.length === 0) {
    return null;
  }

  const userCart = await getOrCreateCart({ userId });

  for (const item of guestCart.items) {
    const existingItem = userCart.items.find(
      (entry) =>
        entry.product.toString() === item.product.toString() && entry.weight === item.weight
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      const snapshot = item.toObject();
      delete snapshot._id;
      userCart.items.push(snapshot);
    }
  }

  guestCart.items = [];
  await guestCart.save();
  await userCart.save();
  return userCart;
};

export const clearCart = async (userIdOrActor) => {
  try {
    const actor = actorFromUserId(userIdOrActor);
    const cart = await getOrCreateCart(actor);
    cart.items = [];
    await cart.save();

    const populatedCart = await attachCartRelations(Cart.findById(cart._id));
    return await buildCartSummary(populatedCart);
  } catch (error) {
    rethrowCartServiceError(error, "Failed to clear cart");
  }
};
