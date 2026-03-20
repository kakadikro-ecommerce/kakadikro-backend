import * as paymentService from "./service.js";

export const createPaymentOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentOrder(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
