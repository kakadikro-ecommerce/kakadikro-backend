import * as brandVideoService from "./brandVideo.service.js";
import {
  createBrandVideoValidation,
  updateBrandVideoValidation,
} from "./brandVideo.validation.js";
import {
  deleteFilesFromS3,
  uploadBrandVideoFromRequest,
} from "../../shared/upload/service.js";
import { badRequest, ensureValidObjectId } from "../../shared/errors/http-error.js";

const parsePayload = (schema, body = {}) => {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    throw badRequest(error.details[0].message.replace(/["']/g, ""));
  }

  return value;
};

export const createBrandVideo = async (req, res, next) => {
  let uploadedFile = null;

  try {
    uploadedFile = await uploadBrandVideoFromRequest(req, res, { required: true });
    const payload = parsePayload(createBrandVideoValidation, req.body);
    const brandVideo = await brandVideoService.createBrandVideo({
      file: uploadedFile,
      payload,
      userId: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: "Brand video created successfully",
      data: brandVideo,
    });
  } catch (error) {
    if (uploadedFile?.key) {
      try {
        await deleteFilesFromS3([uploadedFile.key]);
      } catch (cleanupError) {
        error.details = error.details || cleanupError.message;
      }
    }

    next(error);
  }
};

export const updateBrandVideo = async (req, res, next) => {
  let uploadedFile = null;

  try {
    ensureValidObjectId(req.params.id, "brand video");
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      uploadedFile = await uploadBrandVideoFromRequest(req, res, { required: false });
    }

    const payload = parsePayload(updateBrandVideoValidation, req.body || {});
    const brandVideo = await brandVideoService.updateBrandVideo(req.params.id, {
      file: uploadedFile,
      payload,
    });

    res.status(200).json({
      success: true,
      message: "Brand video updated successfully",
      data: brandVideo,
    });
  } catch (error) {
    if (uploadedFile?.key) {
      try {
        await deleteFilesFromS3([uploadedFile.key]);
      } catch (cleanupError) {
        error.details = error.details || cleanupError.message;
      }
    }

    next(error);
  }
};

export const deleteBrandVideo = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "brand video");
    await brandVideoService.deleteBrandVideo(req.params.id);

    res.status(200).json({
      success: true,
      message: "Brand video deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminBrandVideos = async (req, res, next) => {
  try {
    const result = await brandVideoService.getAdminBrandVideos(req.query);

    res.status(200).json({
      success: true,
      message: "Brand videos fetched successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBrandVideoById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "brand video");
    const brandVideo = await brandVideoService.getBrandVideoById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Brand video fetched successfully",
      data: brandVideo,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicBrandVideos = async (req, res, next) => {
  try {
    const data = await brandVideoService.getPublicBrandVideos();

    res.status(200).json({
      success: true,
      message: "Brand videos fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
