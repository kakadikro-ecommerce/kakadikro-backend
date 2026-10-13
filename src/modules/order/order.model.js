import mongoose from "mongoose";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "./constants.js";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    productImage: {
      type: String,
      default: "",
    },
    weight: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    addressLine1: {
      type: String,
      trim: true,
      default: "",
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    postalCode: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      trim: true,
      default: "",
    },
    courierName: {
      type: String,
      trim: true,
      default: "",
    },
    trackingUrl: {
      type: String,
      trim: true,
      default: "",
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      immutable: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestContact: {
      name: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    guestTokenHash: {
      type: String,
      select: false,
    },
    guestAccessTokenHash: {
      type: String,
      select: false,
    },
    idempotencyKey: {
      type: String,
      select: false,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      immutable: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one order item is required",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({}),
    },
    shipment: {
      type: shipmentSchema,
      default: () => ({}),
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
      immutable: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
      immutable: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.virtual("orderOwner", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
});

orderSchema.index(
  { guestAccessTokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: { guestAccessTokenHash: { $type: "string" } },
    name: "guestAccessTokenHash_1",
  }
);

orderSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "idempotencyKey_1",
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
