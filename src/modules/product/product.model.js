import mongoose from "mongoose";

const mapToPlainObject = (value) => {
  if (!value) {
    return {};
  }

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }

  return {};
};

const transformProductResponse = (_, ret) => {
  ret.specifications = mapToPlainObject(ret.specifications);

  if (!ret.productType) {
    ret.productType = "GROCERY";
  }

  if (Array.isArray(ret.variants)) {
    ret.variants = ret.variants.map((variant) => {
      const attributes = mapToPlainObject(variant.attributes);
      const weight =
        attributes.weight ||
        (typeof variant.weight === "string" ? variant.weight : undefined);
      const name = variant.name || weight || "";

      if (weight && !attributes.weight) {
        attributes.weight = weight;
      }

      return {
        ...variant,
        name,
        attributes,
        // Temporary compatibility for clients that still read variants.weight
        ...(weight ? { weight } : {}),
      };
    });
  }

  return ret;
};

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  // Legacy field kept so unmigrated grocery documents still hydrate correctly
  weight: {
    type: String,
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
  attributes: {
    type: Map,
    of: String,
    default: {}
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

  productType: {
    type: String,
    enum: ["GROCERY", "ELECTRONICS"],
    required: true,
    default: "GROCERY",
    index: true
  },

  category: {
    type: String,
    required: true,
    index: true
  },

  images: [
    {
      url: String,
      altText: String
    }
  ],

  video: {
    type: new mongoose.Schema(
      {
        url: String,
        altText: String
      },
      { _id: false }
    ),
    default: null
  },

  variants: {
    type: [variantSchema],
    required: true
  },

  specifications: {
    type: Map,
    of: String,
    default: {}
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

  numReviews: {
    type: Number,
    default: 0
  },

  tags: [String],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: transformProductResponse },
  toObject: { virtuals: true, transform: transformProductResponse }
});

productSchema.pre("validate", function normalizeLegacyProductFields() {
  if (!this.productType) {
    this.productType = "GROCERY";
  }

  if (this.specifications == null) {
    this.specifications = new Map();
  }

  if (Array.isArray(this.variants)) {
    this.variants = this.variants.map((variant) => {
      const attributes =
        variant.attributes instanceof Map
          ? Object.fromEntries(variant.attributes.entries())
          : { ...(variant.attributes || {}) };

      const weight =
        (typeof variant.weight === "string" && variant.weight.trim()) ||
        attributes.weight ||
        "";
      const name =
        (typeof variant.name === "string" && variant.name.trim()) || weight;

      if (weight && !attributes.weight) {
        attributes.weight = weight;
      }

      variant.name = name;
      variant.attributes = attributes;
      if (weight) {
        variant.weight = weight;
      }

      return variant;
    });
  }
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

productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product"
});

export default mongoose.model("Product", productSchema);
