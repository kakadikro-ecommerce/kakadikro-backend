import * as paymentService from "./payment.service.js";

export const createPaymentOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentOrder(
      req.user.id,
      req.body
    );

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

/**
 * Razorpay webhook handler.
 * Expects raw body (Buffer) on req.body for signature verification.
 */
export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    paymentService.verifyWebhookSignature(rawBody, signature);

    const eventPayload =
      Buffer.isBuffer(rawBody) || typeof rawBody === "string"
        ? JSON.parse(rawBody.toString("utf8"))
        : rawBody;

    const result = await paymentService.handleRazorpayWebhook(eventPayload);

    // Always acknowledge so Razorpay does not retry endlessly for ignored events
    return res.status(200).json({
      success: true,
      message: "Webhook received",
      data: {
        event: result?.event || eventPayload?.event,
        handled: Boolean(result?.handled),
        ignored: Boolean(result?.ignored),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllPaymentsAdmin = async (req, res, next) => {
  try {
    const result = await paymentService.getAllPaymentsAdmin(req.query);

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      pagination: result.pagination,
      summary: result.summary,
      data: result.payments,
    });
  } catch (error) {
    return next(error);
  }
};
