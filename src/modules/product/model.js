import mongoose from "mongoose";
import { mapImageRecordToResponse } from "../../shared/utils/image.js";

const transformProductImages = (_, ret) => {
  if (Array.isArray(ret.images)) {
    ret.images = ret.images.map(mapImageRecordToResponse);
  }

  return ret;
};

const variantSchema = new mongoose.Schema({
  weight: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  mrp: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    unique: true
  },

  description: {
    type: String
  },

  shortDescription: {
    type: String
  },

  category: {
    type: String,
    required: true
  },

  brand: {
    type: String
  },

  images: [
    {
      url: String,
      altText: String
    }
  ],

  variants: {
    type: [variantSchema],
    required: true
  },

  ingredients: [String],

  features: [String],

  benefits: [String],

  usage: {
    type: String
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  rating: {
    type: Number,
    default: 0
  },

  tags: [String],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: transformProductImages },
  toObject: { virtuals: true, transform: transformProductImages }
});

productSchema.virtual("cartItems", {
  ref: "Cart",
  localField: "_id",
  foreignField: "items.product"
});

productSchema.virtual("orderItems", {
  ref: "Order",
  localField: "_id",
  foreignField: "items.product"
});

export default mongoose.model("Product", productSchema);
