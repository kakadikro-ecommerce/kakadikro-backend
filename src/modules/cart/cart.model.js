import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
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
      default: "",
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
  },
  {
    timestamps: false,
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    guestTokenHash: {
      type: String,
      select: false,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cartSchema.virtual("cartOwner", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
});

cartSchema.virtual("cartOrders", {
  ref: "Order",
  localField: "user",
  foreignField: "user",
});

cartSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: "objectId" } },
    name: "user_1",
  }
);

cartSchema.index(
  { guestTokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: { guestTokenHash: { $type: "string" } },
    name: "guestTokenHash_1",
  }
);

const Cart = mongoose.model("Cart", cartSchema);

export const ensureCartIndexes = async () => {
  const indexes = await Cart.collection.indexes();

  for (const index of indexes) {
    const isUserIndex = index.key?.user === 1 && index.name !== "_id_";
    if (isUserIndex && !index.partialFilterExpression) {
      await Cart.collection.dropIndex(index.name);
    }
  }

  await Cart.collection.createIndex(
    { user: 1 },
    {
      unique: true,
      partialFilterExpression: { user: { $type: "objectId" } },
      name: "user_1",
    }
  );
  await Cart.collection.createIndex(
    { guestTokenHash: 1 },
    {
      unique: true,
      partialFilterExpression: { guestTokenHash: { $type: "string" } },
      name: "guestTokenHash_1",
    }
  );
};

export default Cart;
