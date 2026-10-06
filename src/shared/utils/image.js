import "dotenv/config";
import { getPresignedGetUrl, getPresignedGetUrls } from "../upload/presign.js";

const normalizeBaseUrl = (value = "") => value.trim().replace(/\/+$/, "");

const S3_BASE_URL = normalizeBaseUrl(process.env.S3_BASE_URL || "");
const CLOUDFRONT_BASE_URL = normalizeBaseUrl(
  process.env.CLOUDFRONT_BASE_URL || ""
);

const removeLeadingSlash = (value = "") => value.replace(/^\/+/, "");

const getHostname = (value) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export const isFullUrl = (value = "") => /^https?:\/\//i.test(value);

const getKnownStorageHosts = () => {
  const hosts = new Set();
  const bucket = (process.env.AWS_S3_BUCKET_NAME || "").toLowerCase();
  const region = process.env.AWS_REGION || "ap-south-1";

  const s3BaseHost = getHostname(S3_BASE_URL);
  const cloudFrontHost = getHostname(CLOUDFRONT_BASE_URL);

  if (s3BaseHost) {
    hosts.add(s3BaseHost);
  }

  if (cloudFrontHost) {
    hosts.add(cloudFrontHost);
  }

  if (bucket) {
    hosts.add(`${bucket}.s3.${region}.amazonaws.com`);
    hosts.add(`${bucket}.s3.amazonaws.com`);
    hosts.add(`${bucket}.s3-${region}.amazonaws.com`);
  }

  return hosts;
};

const extractKeyFromUrl = (value) => {
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  const pathname = removeLeadingSlash(decodeURIComponent(parsed.pathname || ""));
  const bucket = process.env.AWS_S3_BUCKET_NAME || "";
  const knownHosts = getKnownStorageHosts();

  if (knownHosts.has(host)) {
    return pathname || null;
  }

  if (
    bucket &&
    host.includes("amazonaws.com") &&
    pathname.startsWith(`${bucket}/`)
  ) {
    return pathname.slice(bucket.length + 1) || null;
  }

  // Presigned S3 / CloudFront URLs may not match configured hosts exactly.
  if (host.includes("amazonaws.com") || host.includes("cloudfront.net")) {
    return pathname || null;
  }

  return null;
};

export const extractImageKey = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!isFullUrl(trimmedValue)) {
    return removeLeadingSlash(trimmedValue.split(/[?#]/)[0]) || null;
  }

  try {
    return extractKeyFromUrl(trimmedValue);
  } catch {
    return removeLeadingSlash(trimmedValue.split(/[?#]/)[0]) || null;
  }
};

export const getImageUrl = async (key) => {
  if (!key || typeof key !== "string") {
    return null;
  }

  const extractedKey = extractImageKey(key);

  if (!extractedKey) {
    return null;
  }

  if (isFullUrl(extractedKey)) {
    return extractedKey;
  }

  return getPresignedGetUrl(extractedKey);
};

export const normalizeImageRecordForStorage = (image = {}) => {
  const rawValue =
    typeof image?.key === "string" && image.key.trim()
      ? image.key
      : image?.url;
  const key = extractImageKey(rawValue);

  if (!key || isFullUrl(key)) {
    const error = new Error(
      "Please provide a valid image key or storage URL for existing media"
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    url: key,
    altText: typeof image?.altText === "string" ? image.altText : "",
  };
};

export const mapImageRecordToResponse = async (image = {}) => {
  const storageKey = extractImageKey(image?.url);
  const key =
    storageKey && !isFullUrl(storageKey) ? storageKey : undefined;

  return {
    ...image,
    ...(key ? { key } : {}),
    url: await getImageUrl(image.url),
  };
};

const toPlainProduct = (product) => {
  if (!product) {
    return product;
  }

  if (typeof product.toObject === "function") {
    return product.toObject();
  }

  return { ...product };
};

const collectSignableKey = (value, keys) => {
  const key = extractImageKey(value);

  if (key && !isFullUrl(key)) {
    keys.push(key);
  }
};

const mapMediaUrl = (value, urlMap) => {
  const key = extractImageKey(value);

  if (!key) {
    return null;
  }

  if (isFullUrl(key)) {
    return key;
  }

  return urlMap.get(key) || null;
};

const mapMediaRecordToResponse = (media, urlMap) => {
  if (!media || typeof media !== "object" || !media.url) {
    return null;
  }

  const storageKey = extractImageKey(media.url);
  const key =
    storageKey && !isFullUrl(storageKey) ? storageKey : undefined;

  return {
    ...media,
    ...(key ? { key } : {}),
    url: mapMediaUrl(media.url, urlMap),
  };
};

export const attachPresignedUrlsToProducts = async (products = []) => {
  const plainProducts = products.map(toPlainProduct);
  const keys = [];

  for (const product of plainProducts) {
    if (Array.isArray(product?.images)) {
      for (const image of product.images) {
        collectSignableKey(image?.url, keys);
      }
    }

    collectSignableKey(product?.video?.url, keys);
  }

  const urlMap = await getPresignedGetUrls(keys);

  for (const product of plainProducts) {
    if (Array.isArray(product?.images)) {
      product.images = product.images
        .map((image) => mapMediaRecordToResponse(image, urlMap))
        .filter(Boolean);
    }

    product.video = mapMediaRecordToResponse(product.video, urlMap);
  }

  return plainProducts;
};

export const attachPresignedUrlsToProduct = async (product) => {
  if (!product) {
    return product;
  }

  const [serialized] = await attachPresignedUrlsToProducts([product]);
  return serialized;
};
