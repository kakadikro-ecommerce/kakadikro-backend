import { uploadProductMediaFromRequest } from "../../shared/upload/service.js";
import { normalizeImageRecordForStorage } from "../../shared/utils/image.js";

export const parseArrayField = (value, fieldName) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (trimmedValue.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (!Array.isArray(parsedValue)) {
      const error = new Error(`Please provide ${fieldName} in a valid format`);
        error.statusCode = 400;
        throw error;
      }

      return parsedValue
        .map((item) =>
          typeof item === "string" ? item.trim() : String(item).trim()
        )
        .filter(Boolean);
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      const err = new Error(`Please provide ${fieldName} in a valid format`);
      err.statusCode = 400;
      throw err;
    }
  }

  return trimmedValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const parseMultipartPayload = (body) => {
  const parsedBody = { ...body };
  const jsonFields = [
    "variants",
    "existingImages",
    "existingVideo",
    "specifications",
  ];

  for (const field of jsonFields) {
    if (
      typeof parsedBody[field] === "string" &&
      parsedBody[field].trim() !== ""
    ) {
      try {
        parsedBody[field] = JSON.parse(parsedBody[field]);
      } catch (error) {
        const err = new Error(`Please provide ${field} in a valid format`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const arrayFields = ["ingredients", "features", "benefits", "tags"];

  for (const field of arrayFields) {
    if (parsedBody[field] !== undefined) {
      parsedBody[field] = parseArrayField(parsedBody[field], field);
    }
  }

  return parsedBody;
};

export const normalizeAltTexts = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return [];
    }

    if (trimmedValue.startsWith("[")) {
      return JSON.parse(trimmedValue);
    }

    return [trimmedValue];
  }

  return [];
};

export const buildUploadedImages = (files, altTexts) => {
  return files.map((file, index) => ({
    url: file.key,
    altText: altTexts[index] || "",
  }));
};

const normalizeVideoForStorage = (video) => {
  if (video === null || video === "") {
    return null;
  }

  if (!video || typeof video !== "object" || Array.isArray(video)) {
    const error = new Error("Please provide video in a valid format");
    error.statusCode = 400;
    throw error;
  }

  return normalizeImageRecordForStorage(video);
};

const resolveExistingVideo = (parsedBody) => {
  if (!Object.prototype.hasOwnProperty.call(parsedBody, "existingVideo")) {
    return { provided: false, video: undefined };
  }

  const existingVideo = parsedBody.existingVideo;

  if (existingVideo === null || existingVideo === "") {
    return { provided: true, video: null };
  }

  if (
    !existingVideo ||
    typeof existingVideo !== "object" ||
    Array.isArray(existingVideo)
  ) {
    const error = new Error("Please provide existingVideo in a valid format");
    error.statusCode = 400;
    throw error;
  }

  return {
    provided: true,
    video: normalizeImageRecordForStorage(existingVideo),
  };
};

export const prepareProductPayload = async (req, res) => {
  const isMultipartRequest = req.is("multipart/form-data");

  if (!isMultipartRequest) {
    const payload = { ...req.body };

    if (Array.isArray(payload.images)) {
      payload.images = payload.images.map(normalizeImageRecordForStorage);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "video")) {
      payload.video = normalizeVideoForStorage(payload.video);
    }

    return {
      payload,
      uploadedFiles: [],
    };
  }

  const { images: imageFiles, video: videoFile } =
    await uploadProductMediaFromRequest(req, res);
  const uploadedFiles = [...imageFiles, ...(videoFile ? [videoFile] : [])];
  const parsedBody = parseMultipartPayload(req.body);
  const altTexts = normalizeAltTexts(parsedBody.imageAltTexts);
  const existingImages = Array.isArray(parsedBody.existingImages)
    ? parsedBody.existingImages.map(normalizeImageRecordForStorage)
    : [];
  const uploadedImages = buildUploadedImages(imageFiles, altTexts);
  const hasExplicitImages =
    uploadedImages.length > 0 || parsedBody.existingImages !== undefined;
  const existingVideo = resolveExistingVideo(parsedBody);
  const videoAltText =
    typeof parsedBody.videoAltText === "string" ? parsedBody.videoAltText : "";

  delete parsedBody.imageAltTexts;
  delete parsedBody.existingImages;
  delete parsedBody.existingVideo;
  delete parsedBody.videoAltText;
  delete parsedBody.video;

  const payload = {
    ...parsedBody,
  };

  if (hasExplicitImages) {
    payload.images = [...existingImages, ...uploadedImages];
  }

  if (videoFile) {
    payload.video = {
      url: videoFile.key,
      altText: videoAltText,
    };
  } else if (existingVideo.provided) {
    payload.video = existingVideo.video;
  }

  return {
    payload,
    uploadedFiles,
  };
};

export const validatePayload = (schema, payload) => {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationError = new Error(
      "Please check the form and fix the highlighted fields"
    );
    validationError.statusCode = 400;
    validationError.details = error.details.map((detail) => ({
      message: detail.message.replace(/["]/g, ""),
      path: detail.path.join("."),
    }));
    throw validationError;
  }

  return value;
};
