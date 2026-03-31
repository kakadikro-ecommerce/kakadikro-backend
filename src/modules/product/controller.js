import * as productService from "./service.js";
import { deleteFilesFromS3 } from "../../shared/upload/service.js";
import {
  prepareProductPayload,
  validatePayload,
} from "./payload.js";
import {
  createProductValidation,
  updateProductValidation,
} from "./validation.js";

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

    const validatedPayload = validatePayload(
      updateProductValidation,
      preparedRequest.payload
    );

    const product = await productService.updateProduct(
      req.params.id,
      validatedPayload,
      req.user?.id
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

export const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(
      req.params.id,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
