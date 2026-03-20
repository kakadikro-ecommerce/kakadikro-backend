import { uploadMultipleFilesFromRequest } from "../../shared/upload/service.js";

export const parseMultipartPayload = (body) => {
  const parsedBody = { ...body };
  const jsonFields = ["variants", "existingImages"];

  for (const field of jsonFields) {
    if (
      typeof parsedBody[field] === "string" &&
      parsedBody[field].trim() !== ""
    ) {
      try {
        parsedBody[field] = JSON.parse(parsedBody[field]);
      } catch (error) {
        const err = new Error(`Invalid JSON format in ${field}`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const arrayFields = ["ingredients", "features", "benefits", "tags"];

  for (const field of arrayFields) {
    if (typeof parsedBody[field] === "string") {
      parsedBody[field] = parsedBody[field]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
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
    url: file.location,
    altText: altTexts[index] || "",
  }));
};

export const prepareProductPayload = async (req, res) => {
  const isMultipartRequest = req.is("multipart/form-data");

  if (!isMultipartRequest) {
    return {
      payload: { ...req.body },
      uploadedFiles: [],
    };
  }

  const uploadedFiles = await uploadMultipleFilesFromRequest(
    req,
    res,
    "images",
    5,
    { required: false }
  );
  const parsedBody = parseMultipartPayload(req.body);
  const altTexts = normalizeAltTexts(parsedBody.imageAltTexts);
  const existingImages = Array.isArray(parsedBody.existingImages)
    ? parsedBody.existingImages
    : [];
  const uploadedImages = buildUploadedImages(uploadedFiles, altTexts);
  const hasExplicitImages =
    uploadedImages.length > 0 || parsedBody.existingImages !== undefined;

  delete parsedBody.imageAltTexts;
  delete parsedBody.existingImages;

  const payload = {
    ...parsedBody,
  };

  if (hasExplicitImages) {
    payload.images = [...existingImages, ...uploadedImages];
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
    const validationError = new Error("Validation failed");
    validationError.statusCode = 400;
    validationError.details = error.details.map((detail) => ({
      message: detail.message,
      path: detail.path.join("."),
    }));
    throw validationError;
  }

  return value;
};
