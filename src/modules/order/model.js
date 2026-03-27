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
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
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
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      immutable: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      immutable: true,
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
      required: true,
    },
    shipment: {
      type: shipmentSchema,
      default: () => ({}),
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cod",
      immutable: true,
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
      immutable: true,
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
      immutable: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: null,
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

const Order = mongoose.model("Order", orderSchema);

export default Order;
