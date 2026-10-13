import * as cartService from "./cart.service.js";

const sendCart = (req, res, status, message, cart) => {
  if (req.cartActor?.issued && req.cartActor.guestToken) {
    res.setHeader("X-Guest-Cart-Token", req.cartActor.guestToken);
  }

  return res.status(status).json({
    success: true,
    message,
    ...(req.cartActor?.issued && req.cartActor.guestToken
      ? { guestCartToken: req.cartActor.guestToken }
      : {}),
    data: cart,
  });
};

export const getMyCart = async (req, res, next) => {
  try {
    const cart = await cartService.getMyCart(req.cartActor);
    return sendCart(req, res, 200, "Cart fetched successfully", cart);
  } catch (error) {
    return next(error);
  }
};

export const addItemToCart = async (req, res, next) => {
  try {
    const cart = await cartService.addItemToCart(req.cartActor, req.body);
    return sendCart(req, res, 200, "Item added to cart successfully", cart);
  } catch (error) {
    return next(error);
  }
};

export const updateCartItemQuantity = async (req, res, next) => {
  try {
    const cart = await cartService.updateCartItemQuantity(
      req.cartActor,
      req.params.itemId,
      req.body
    );
    return sendCart(req, res, 200, "Cart item updated successfully", cart);
  } catch (error) {
    return next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeCartItem(req.cartActor, req.params.itemId);
    return sendCart(req, res, 200, "Cart item removed successfully", cart);
  } catch (error) {
    return next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.cartActor);
    return sendCart(req, res, 200, "Cart cleared successfully", cart);
  } catch (error) {
    return next(error);
  }
};
