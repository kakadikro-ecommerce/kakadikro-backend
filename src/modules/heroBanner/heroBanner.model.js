import mongoose from "mongoose";

const heroBannerSchema = new mongoose.Schema(
  {
    image: {
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
    /** Where the banner appears: HOME carousel, or a product-line page. */
    productType: {
      type: String,
      required: true,
      enum: ["HOME", "CROSSLIFE", "CROSSLINE"],
      index: true,
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

heroBannerSchema.index({ productType: 1, isActive: 1, sortOrder: 1, updatedAt: -1 });

export default mongoose.model("HeroBanner", heroBannerSchema);
