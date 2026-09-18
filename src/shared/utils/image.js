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

export const attachPresignedUrlsToProducts = async (products = []) => {
  const plainProducts = products.map(toPlainProduct);
  const keys = [];

  for (const product of plainProducts) {
    if (!Array.isArray(product?.images)) {
      continue;
    }

    for (const image of product.images) {
      const key = extractImageKey(image?.url);

      if (key && !isFullUrl(key)) {
        keys.push(key);
      }
    }
  }

  const urlMap = await getPresignedGetUrls(keys);

  for (const product of plainProducts) {
    if (!Array.isArray(product?.images)) {
      continue;
    }

    product.images = product.images.map((image) => {
      const key = extractImageKey(image?.url);

      if (!key) {
        return { ...image, url: null };
      }

      if (isFullUrl(key)) {
        return { ...image, url: key };
      }

      return {
        ...image,
        url: urlMap.get(key) || null,
      };
    });
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
