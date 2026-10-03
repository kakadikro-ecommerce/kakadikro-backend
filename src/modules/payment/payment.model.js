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

paymentSchema.index(
  { razorpayOrderId: 1 },
  {
    unique: true,
    sparse: true,
    name: "razorpayOrderId_1",
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

export const ensurePaymentIndexes = async () => {
  const indexes = await Payment.collection.indexes();
  const razorpayIndex = indexes.find(
    (index) => index.key?.razorpayOrderId === 1
  );

  if (razorpayIndex && !razorpayIndex.sparse) {
    await Payment.collection.dropIndex(razorpayIndex.name);
  }

  await Payment.collection.createIndex(
    { razorpayOrderId: 1 },
    { unique: true, sparse: true, name: "razorpayOrderId_1" }
  );
};

export default Payment;
