import * as orderService from "./service.js";

export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getMyOrders(req.user.id, req.query);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      pagination: result.pagination,
      data: result.orders,
    });
  } catch (error) {
    return next(error);
  }
};

export const trackOrder = async (req, res, next) => {
  try {
    const order = await orderService.trackOrder(
      req.params.orderNumber,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateMyOrder = async (req, res, next) => {
  try {
    const order = await orderService.updateMyOrder(
      req.params.id,
      req.user.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      pagination: result.pagination,
      data: result.orders,
    });
  } catch (error) {
    return next(error);
  }
}; 

export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}; 

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const order = await orderService.deleteOrder(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};
