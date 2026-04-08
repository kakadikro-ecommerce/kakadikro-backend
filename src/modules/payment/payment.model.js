import mongoose from "mongoose";

const PAYMENT_STATUSES = ["pending", "success", "failed", "refunded"];

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    refund: {
      razorpayRefundId: {
        type: String,
        default: "",
      },
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
      status: {
        type: String,
        default: "",
      },
      refundedAt: {
        type: Date,
        default: null,
      },
      notes: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
