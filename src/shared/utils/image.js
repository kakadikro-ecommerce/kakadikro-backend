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
    return pathname;
  }

  if (
    bucket &&
    host.includes("amazonaws.com") &&
    pathname.startsWith(`${bucket}/`)
  ) {
    return pathname.slice(bucket.length + 1);
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
    return removeLeadingSlash(trimmedValue.split(/[?#]/)[0]);
  }

  try {
    const key = extractKeyFromUrl(trimmedValue);
    return key || trimmedValue;
  } catch {
    return removeLeadingSlash(trimmedValue.split(/[?#]/)[0]);
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

export const normalizeImageRecordForStorage = (image = {}) => ({
  ...image,
  url: extractImageKey(image.url),
});

export const mapImageRecordToResponse = async (image = {}) => ({
  ...image,
  url: await getImageUrl(image.url),
});

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

const mapVideoToResponse = (video, urlMap) => {
  if (!video || typeof video !== "object" || !video.url) {
    return null;
  }

  return {
    ...video,
    url: mapMediaUrl(video.url, urlMap),
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
      product.images = product.images.map((image) => ({
        ...image,
        url: mapMediaUrl(image?.url, urlMap),
      }));
    }

    product.video = mapVideoToResponse(product.video, urlMap);
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
