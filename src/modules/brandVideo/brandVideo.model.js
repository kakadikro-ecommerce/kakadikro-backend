import mongoose from "mongoose";

const brandVideoSchema = new mongoose.Schema(
  {
    video: {
      url: {
        type: String,
        required: true,
        trim: true,
      },
      altText: {
        type: String,
        trim: true,
        default: "",
      },
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantName: {
      type: String,
      trim: true,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

brandVideoSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });

export default mongoose.model("BrandVideo", brandVideoSchema);
