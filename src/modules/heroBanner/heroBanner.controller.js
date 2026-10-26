import * as heroBannerService from "./heroBanner.service.js";
import {
  createHeroBannerValidation,
  updateHeroBannerValidation,
} from "./heroBanner.validation.js";
import {
  deleteFilesFromS3,
  uploadHeroBannerFromRequest,
} from "../../shared/upload/service.js";
import { badRequest, ensureValidObjectId } from "../../shared/errors/http-error.js";

const parsePayload = (schema, body = {}, { allowEmpty = false } = {}) => {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    throw badRequest(error.details[0].message.replace(/["']/g, ""));
  }

  if (!allowEmpty && Object.keys(value).length === 0) {
    throw badRequest("Please provide at least one field to update");
  }

  return value;
};

export const createHeroBanner = async (req, res, next) => {
  let uploadedFile = null;

  try {
    uploadedFile = await uploadHeroBannerFromRequest(req, res, { required: true });
    const payload = parsePayload(createHeroBannerValidation, req.body);
    const heroBanner = await heroBannerService.createHeroBanner({
      file: uploadedFile,
      payload,
      userId: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: "Hero banner created successfully",
      data: heroBanner,
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

export const updateHeroBanner = async (req, res, next) => {
  let uploadedFile = null;

  try {
    ensureValidObjectId(req.params.id, "hero banner");
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      uploadedFile = await uploadHeroBannerFromRequest(req, res, {
        required: false,
      });
    }

    const payload = parsePayload(updateHeroBannerValidation, req.body || {}, {
      allowEmpty: Boolean(uploadedFile),
    });
    const heroBanner = await heroBannerService.updateHeroBanner(req.params.id, {
      file: uploadedFile,
      payload,
    });

    res.status(200).json({
      success: true,
      message: "Hero banner updated successfully",
      data: heroBanner,
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

export const deleteHeroBanner = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "hero banner");
    await heroBannerService.deleteHeroBanner(req.params.id);

    res.status(200).json({
      success: true,
      message: "Hero banner deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminHeroBanners = async (req, res, next) => {
  try {
    const result = await heroBannerService.getAdminHeroBanners(req.query);

    res.status(200).json({
      success: true,
      message: "Hero banners fetched successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getHeroBannerById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "hero banner");
    const heroBanner = await heroBannerService.getHeroBannerById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Hero banner fetched successfully",
      data: heroBanner,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicHeroBanners = async (req, res, next) => {
  try {
    const data = await heroBannerService.getPublicHeroBanners(req.query);

    res.status(200).json({
      success: true,
      message: "Hero banners fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
