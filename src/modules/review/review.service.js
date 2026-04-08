import Review from "./review.model.js";
import Product from "../product/product.model.js";
import Order from "../order/order.model.js";
import {
  badRequest,
  conflict,
  ensureValidObjectId,
  notFound,
  forbidden,
} from "../../shared/errors/http-error.js";

const normalizeComment = (comment) => {
  if (comment === undefined || comment === null) return "";
  return String(comment).trim();
};

const getReviewPopulation = () => [
  {
    path: "user",
    select: "name",
  },
];

const hasDeliveredPurchase = async (userId, productId) => {
  const order = await Order.findOne({
    user: userId,
    $or: [{ orderStatus: "delivered" }, { status: "delivered" }],
    "items.product": productId,
  }).select("_id");

  return Boolean(order);
};

export const canUserReview = async (userId, productId) => {
  ensureValidObjectId(userId, "User");
  ensureValidObjectId(productId, "Product");

  const [product, existingReview, verifiedPurchase] = await Promise.all([
    Product.findById(productId).select("_id"),
    Review.findOne({ user: userId, product: productId }).select("_id"),
    hasDeliveredPurchase(userId, productId),
  ]);

  if (!product) {
    throw notFound("Product not found");
  }

  return {
    canReview: Boolean(verifiedPurchase && !existingReview),
    verifiedPurchase: Boolean(verifiedPurchase),
    alreadyReviewed: Boolean(existingReview),
  };
};

export const createReview = async (userId, productId, rating, comment) => {
  ensureValidObjectId(userId, "User");
  ensureValidObjectId(productId, "Product");

  const numericRating = Number(rating);

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw badRequest("Rating must be an integer between 1 and 5");
  }

  const [product, existingReview, verifiedPurchase] = await Promise.all([
    Product.findById(productId),
    Review.findOne({ user: userId, product: productId }),
    hasDeliveredPurchase(userId, productId),
  ]);

  if (!product) {
    throw notFound("Product not found");
  }

  if (!verifiedPurchase) {
    throw forbidden("You can only review products from delivered orders");
  }

  if (existingReview) {
    throw conflict("You have already reviewed this product");
  }

  const review = await Review.create({
    user: userId,
    product: productId,
    rating: numericRating,
    comment: normalizeComment(comment),
  }).catch((error) => {
    if (error?.code === 11000) {
      throw conflict("You have already reviewed this product");
    }
    throw error;
  });

  product.numReviews = Number(product.numReviews || 0) + 1;
  await product.save();

  return review.populate(getReviewPopulation());
};

export const getProductReviews = async (productId, query = {}) => {
  ensureValidObjectId(productId, "Product");

  const product = await Product.findById(productId).select("_id");
  if (!product) {
    throw notFound("Product not found");
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { product: productId };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate(getReviewPopulation())
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: reviews,
  };
};

export const updateReview = async (reviewId, userId, data) => {
  ensureValidObjectId(reviewId, "Review");
  ensureValidObjectId(userId, "User");

  const review = await Review.findById(reviewId);

  if (!review) {
    throw notFound("Review not found");
  }

  if (String(review.user) !== String(userId)) {
    throw forbidden("You can only update your own review");
  }

  const updates = {};

  if (data.rating !== undefined) {
    const numericRating = Number(data.rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw badRequest("Rating must be an integer between 1 and 5");
    }
    updates.rating = numericRating;
  }

  if (data.comment !== undefined) {
    updates.comment = normalizeComment(data.comment);
  }

  if (Object.keys(updates).length === 0) {
    return review.populate(getReviewPopulation());
  }

  Object.assign(review, updates);
  await review.save();

  return review.populate(getReviewPopulation());
};

export const deleteReview = async (reviewId, userId) => {
  ensureValidObjectId(reviewId, "Review");
  ensureValidObjectId(userId, "User");

  const review = await Review.findById(reviewId);

  if (!review) {
    throw notFound("Review not found");
  }

  if (String(review.user) !== String(userId)) {
    throw forbidden("You can only delete your own review");
  }

  const product = await Product.findById(review.product);
  if (!product) {
    throw notFound("Product not found");
  }

  await review.deleteOne();

  product.numReviews = Math.max(Number(product.numReviews || 0) - 1, 0);
  await product.save();

  return { deleted: true };
};
