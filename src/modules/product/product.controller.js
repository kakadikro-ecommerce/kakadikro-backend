import * as productService from "./product.service.js";
import { deleteFilesFromS3 } from "../../shared/upload/service.js";
import { PRODUCT_TYPES } from "./productType.catalog.js";
import {
  prepareProductPayload,
  validatePayload,
} from "./product.payload.js";
import {
  createProductValidation,
  updateProductValidation,
} from "./product.validation.js";

const cleanupUploadedFiles = async (files = []) => {
  const keys = files.map((file) => file.key).filter(Boolean);
  await deleteFilesFromS3(keys);
};

export const createProduct = async (req, res, next) => {
  let uploadedFiles = [];

  try {
    const preparedRequest = await prepareProductPayload(req, res);
    uploadedFiles = preparedRequest.uploadedFiles;

    const validatedPayload = validatePayload(
      createProductValidation,
      preparedRequest.payload
    );

    const product = await productService.createProduct(
      validatedPayload,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    if (uploadedFiles.length > 0) {
      try {
        await cleanupUploadedFiles(uploadedFiles);
      } catch (cleanupError) {
        error.details = error.details || cleanupError.message;
      }
    }

    next(error);
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);

    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProductsAdmin = async (req, res, next) => {
  try {
    const result = await productService.getAllProductsAdmin(req.query);

    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  let uploadedFiles = [];

  try {
    const preparedRequest = await prepareProductPayload(req, res);
    uploadedFiles = preparedRequest.uploadedFiles;

    const existingProduct = await productService.getProductById(req.params.id);
    const originalPayload = preparedRequest.payload;

    // Merge existing type-specific fields for validation only, so partial
    // updates still enforce grocery/electronics rules without forcing
    // the admin to resend every field.
    const productType =
      originalPayload.productType || existingProduct.productType || "GROCERY";
    const existingSpecs =
      existingProduct.specifications instanceof Map
        ? Object.fromEntries(existingProduct.specifications)
        : existingProduct.specifications || {};

    const payloadForValidation = {
      ...originalPayload,
      productType,
      ingredients:
        originalPayload.ingredients !== undefined
          ? originalPayload.ingredients
          : existingProduct.ingredients || [],
      specifications:
        originalPayload.specifications !== undefined
          ? originalPayload.specifications
          : existingSpecs,
    };

    const validatedPayload = validatePayload(
      updateProductValidation,
      payloadForValidation
    );

    const updateData = { ...validatedPayload };
    if (originalPayload.ingredients === undefined) {
      delete updateData.ingredients;
    }
    if (originalPayload.specifications === undefined) {
      delete updateData.specifications;
    }

    const product = await productService.updateProduct(
      req.params.id,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    if (uploadedFiles.length > 0) {
      try {
        await cleanupUploadedFiles(uploadedFiles);
      } catch (cleanupError) {
        error.details = error.details || cleanupError.message;
      }
    }

    next(error);
  }
}; 

export const updateProductStatus = async (req, res, next) => {
  try {
    await productService.updateProductStatus(req.params.id, req.body.isActive);
    res.status(200).json({

      success: true,
      message: "Product status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getProductTypes = async (_req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Product types fetched successfully",
      data: PRODUCT_TYPES,
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const products = await productService.getRelatedProducts(
      req.params.slug,
      limit
    );

    res.status(200).json({
      success: true,
      message: "Related products fetched successfully",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};