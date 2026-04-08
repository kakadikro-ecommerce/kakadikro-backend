import {
  createReview,
  getProductReviews,
  canUserReview,
  updateReview,
  deleteReview,
} from "./review.service.js";

export const createProductReview = async (req, res, next) => {
  try {
    const review = await createReview(
      req.user._id,
      req.body.productId,
      req.body.rating,
      req.body.comment
    );

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsByProduct = async (req, res, next) => {
  try {
    const result = await getProductReviews(req.params.productId, req.query);

    res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const checkReviewEligibility = async (req, res, next) => {
  try {
    const result = await canUserReview(req.user._id, req.params.productId);

    res.status(200).json({
      success: true,
      message: "Review eligibility fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductReview = async (req, res, next) => {
  try {
    const review = await updateReview(req.params.id, req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductReview = async (req, res, next) => {
  try {
    await deleteReview(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
