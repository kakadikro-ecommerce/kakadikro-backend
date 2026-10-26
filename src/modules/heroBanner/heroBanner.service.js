import HeroBanner from "./heroBanner.model.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";
import { deleteFilesFromS3 } from "../../shared/upload/service.js";
import { extractImageKey, getImageUrl } from "../../shared/utils/image.js";
import { ensureFound } from "../../shared/errors/http-error.js";

const BANNER_PLACEMENTS = new Set(["HOME", "CROSSLIFE", "CROSSLINE"]);

const resolveBannerPlacement = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return BANNER_PLACEMENTS.has(normalized) ? normalized : null;
};

const toPlain = (doc) => {
  if (!doc) return doc;
  if (typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
};

const signImage = async (image) => {
  if (!image?.url) return null;

  const storageKey = extractImageKey(image.url);
  const key =
    storageKey && !/^https?:\/\//i.test(storageKey) ? storageKey : undefined;

  return {
    url: await getImageUrl(image.url),
    altText: image.altText || "",
    ...(key ? { key } : {}),
  };
};

const serializeHeroBanner = async (doc) => {
  const plain = toPlain(doc);

  return {
    id: String(plain._id),
    _id: String(plain._id),
    productType: plain.productType,
    sortOrder: plain.sortOrder ?? 0,
    isActive: plain.isActive !== false,
    image: await signImage(plain.image),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const createHeroBanner = async ({ file, payload, userId }) => {
  const heroBanner = await HeroBanner.create({
    image: {
      url: file.key,
      altText: payload.altText || "",
    },
    productType: payload.productType,
    sortOrder: payload.sortOrder ?? 0,
    isActive: payload.isActive !== false,
    createdBy: userId || undefined,
  });

  return serializeHeroBanner(heroBanner);
};

export const updateHeroBanner = async (id, { file, payload }) => {
  const existing = ensureFound(
    await HeroBanner.findById(id),
    "Hero banner not found"
  );

  if (payload.productType) {
    existing.productType = payload.productType;
  }

  if (payload.sortOrder !== undefined) {
    existing.sortOrder = payload.sortOrder;
  }

  if (payload.isActive !== undefined) {
    existing.isActive = payload.isActive;
  }

  if (payload.altText !== undefined) {
    existing.image = {
      url: existing.image?.url,
      altText: payload.altText || "",
    };
  }

  const previousKey = existing.image?.url;

  if (file?.key) {
    existing.image = {
      url: file.key,
      altText:
        payload.altText !== undefined
          ? payload.altText || ""
          : existing.image?.altText || "",
    };
  }

  await existing.save();

  if (file?.key && previousKey && previousKey !== file.key) {
    await deleteFilesFromS3([extractImageKey(previousKey)]);
  }

  return serializeHeroBanner(existing);
};

export const deleteHeroBanner = async (id) => {
  const existing = ensureFound(
    await HeroBanner.findById(id),
    "Hero banner not found"
  );
  const key = extractImageKey(existing.image?.url);
  await existing.deleteOne();
  await deleteFilesFromS3([key]);
};

export const getHeroBannerById = async (id) => {
  const existing = ensureFound(
    await HeroBanner.findById(id),
    "Hero banner not found"
  );
  return serializeHeroBanner(existing);
};

export const getAdminHeroBanners = async (query = {}) => {
  const { page, limit, skip } = normalizePagination(query);
  const filter = {};

  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;

  const productType = resolveBannerPlacement(query.productType);
  if (productType) {
    filter.productType = productType;
  }

  const [items, total] = await Promise.all([
    HeroBanner.find(filter)
      .sort({ productType: 1, sortOrder: 1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    HeroBanner.countDocuments(filter),
  ]);

  const data = await Promise.all(items.map((item) => serializeHeroBanner(item)));

  return {
    data,
    pagination: buildPaginationMeta({ total, page, limit }),
  };
};

export const getPublicHeroBanners = async (query = {}) => {
  const filter = { isActive: true };
  const productType = resolveBannerPlacement(query.productType);

  if (productType) {
    filter.productType = productType;
  }

  const items = await HeroBanner.find(filter).sort({
    sortOrder: 1,
    updatedAt: -1,
  });

  const serialized = await Promise.all(
    items.map((item) => serializeHeroBanner(item))
  );

  return serialized.filter((item) => item?.image?.url);
};
