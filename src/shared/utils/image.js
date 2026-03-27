import "dotenv/config";

const normalizeBaseUrl = (value = "") => value.trim().replace(/\/+$/, "");

const S3_BASE_URL = normalizeBaseUrl(process.env.S3_BASE_URL || "");
const CLOUDFRONT_BASE_URL = normalizeBaseUrl(process.env.CLOUDFRONT_BASE_URL || "");

const removeLeadingSlash = (value = "") => value.replace(/^\/+/, "");

export const isFullUrl = (value = "") => /^https?:\/\//i.test(value);

export const extractImageKey = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (S3_BASE_URL && trimmedValue.startsWith(S3_BASE_URL)) {
    return removeLeadingSlash(trimmedValue.slice(S3_BASE_URL.length));
  }

  if (CLOUDFRONT_BASE_URL && trimmedValue.startsWith(CLOUDFRONT_BASE_URL)) {
    return removeLeadingSlash(trimmedValue.slice(CLOUDFRONT_BASE_URL.length));
  }

  return isFullUrl(trimmedValue) ? trimmedValue : removeLeadingSlash(trimmedValue);
};

export const getImageUrl = (key) => {
  if (!key || typeof key !== "string") {
    return null;
  }

  const trimmedKey = key.trim();

  if (!trimmedKey) {
    return null;
  }

  if (S3_BASE_URL && trimmedKey.startsWith(S3_BASE_URL)) {
    return trimmedKey.replace(S3_BASE_URL, CLOUDFRONT_BASE_URL);
  }

  if (CLOUDFRONT_BASE_URL && trimmedKey.startsWith(CLOUDFRONT_BASE_URL)) {
    return trimmedKey;
  }

  if (isFullUrl(trimmedKey)) {
    return trimmedKey;
  }

  return CLOUDFRONT_BASE_URL
    ? `${CLOUDFRONT_BASE_URL}/${removeLeadingSlash(trimmedKey)}`
    : trimmedKey;
};

export const normalizeImageRecordForStorage = (image = {}) => ({
  ...image,
  url: extractImageKey(image.url),
});

export const mapImageRecordToResponse = (image = {}) => ({
  ...image,
  url: getImageUrl(image.url),
});
