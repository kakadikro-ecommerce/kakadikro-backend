import * as cartService from "./service.js";

export const getMyCart = async (req, res, next) => {
  try {
    const cart = await cartService.getMyCart(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};

export const addItemToCart = async (req, res, next) => {
  try {
    const cart = await cartService.addItemToCart(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCartItemQuantity = async (req, res, next) => {
  try {
    const cart = await cartService.updateCartItemQuantity(
      req.user.id,
      req.params.itemId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeCartItem(req.user.id, req.params.itemId);

    return res.status(200).json({
      success: true,
      message: "Cart item removed successfully",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};
