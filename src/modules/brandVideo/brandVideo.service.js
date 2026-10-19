import BrandVideo from "./brandVideo.model.js";
import Product from "../product/product.model.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";
import { deleteFilesFromS3 } from "../../shared/upload/service.js";
import {
  attachPresignedUrlsToProducts,
  extractImageKey,
  getImageUrl,
} from "../../shared/utils/image.js";
import { ensureFound, notFound } from "../../shared/errors/http-error.js";

const variantLabel = (variant = {}) => {
  const name = typeof variant.name === "string" ? variant.name.trim() : "";
  if (name) return name;

  if (typeof variant.weight === "string" && variant.weight.trim()) {
    return variant.weight.trim();
  }

  if (typeof variant.weight === "number") {
    return String(variant.weight);
  }

  return "";
};

const resolveVariant = (product, variantName) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return null;

  const wanted = String(variantName || "").trim().toLowerCase();
  if (wanted) {
    const match = variants.find(
      (variant) => variantLabel(variant).toLowerCase() === wanted
    );
    if (match) return match;
  }

  return [...variants].sort(
    (left, right) => Number(left.price || 0) - Number(right.price || 0)
  )[0];
};

const signVideo = async (video) => {
  if (!video?.url) return null;

  const storageKey = extractImageKey(video.url);
  const key = storageKey && !/^https?:\/\//i.test(storageKey) ? storageKey : undefined;

  return {
    url: await getImageUrl(video.url),
    altText: video.altText || "",
    ...(key ? { key } : {}),
  };
};

const toPlain = (doc) => {
  if (!doc) return doc;
  if (typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
};

const serializeBrandVideo = async (doc, { includeInactiveProduct = false } = {}) => {
  const plain = toPlain(doc);
  const productDoc = plain.product && typeof plain.product === "object" ? plain.product : null;

  if (!includeInactiveProduct && productDoc && productDoc.isActive === false) {
    return null;
  }

  let product = null;

  if (productDoc) {
    const [signedProduct] = await attachPresignedUrlsToProducts([productDoc]);
    const variant = resolveVariant(signedProduct, plain.variantName);
    const image = Array.isArray(signedProduct.images) ? signedProduct.images[0] : null;

    product = {
      id: String(signedProduct._id || signedProduct.id),
      name: signedProduct.name,
      slug: signedProduct.slug,
      isActive: signedProduct.isActive !== false,
      image: image?.url || null,
      price: typeof variant?.price === "number" ? variant.price : null,
      mrp: typeof variant?.mrp === "number" ? variant.mrp : null,
      variantName: variantLabel(variant),
    };
  }

  return {
    id: String(plain._id),
    _id: String(plain._id),
    sortOrder: plain.sortOrder ?? 0,
    isActive: plain.isActive !== false,
    variantName: plain.variantName || "",
    video: await signVideo(plain.video),
    product,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const loadPopulated = (id) =>
  BrandVideo.findById(id).populate(
    "product",
    "name slug images variants isActive productType"
  );

export const assertProductExists = async (productId) => {
  const product = await Product.findById(productId).select("_id isActive name variants");
  if (!product) {
    throw notFound("Selected product was not found");
  }

  return product;
};

export const createBrandVideo = async ({ file, payload, userId }) => {
  await assertProductExists(payload.productId);

  const brandVideo = await BrandVideo.create({
    video: {
      url: file.key,
      altText: "",
    },
    product: payload.productId,
    variantName: payload.variantName || "",
    sortOrder: payload.sortOrder ?? 0,
    isActive: payload.isActive !== false,
    createdBy: userId || undefined,
  });

  const populated = await loadPopulated(brandVideo._id);
  return serializeBrandVideo(populated, { includeInactiveProduct: true });
};

export const updateBrandVideo = async (id, { file, payload }) => {
  const existing = ensureFound(
    await BrandVideo.findById(id),
    "Brand video not found"
  );

  if (payload.productId) {
    await assertProductExists(payload.productId);
    existing.product = payload.productId;
  }

  if (payload.variantName !== undefined) {
    existing.variantName = payload.variantName || "";
  }

  if (payload.sortOrder !== undefined) {
    existing.sortOrder = payload.sortOrder;
  }

  if (payload.isActive !== undefined) {
    existing.isActive = payload.isActive;
  }

  const previousKey = existing.video?.url;

  if (file?.key) {
    existing.video = {
      url: file.key,
      altText: existing.video?.altText || "",
    };
  }

  await existing.save();

  if (file?.key && previousKey && previousKey !== file.key) {
    await deleteFilesFromS3([extractImageKey(previousKey)]);
  }

  const populated = await loadPopulated(existing._id);
  return serializeBrandVideo(populated, { includeInactiveProduct: true });
};

export const deleteBrandVideo = async (id) => {
  const existing = ensureFound(
    await BrandVideo.findById(id),
    "Brand video not found"
  );
  const key = extractImageKey(existing.video?.url);
  await existing.deleteOne();
  await deleteFilesFromS3([key]);
};

export const getBrandVideoById = async (id) => {
  const existing = ensureFound(await loadPopulated(id), "Brand video not found");
  return serializeBrandVideo(existing, { includeInactiveProduct: true });
};

export const getAdminBrandVideos = async (query = {}) => {
  const { page, limit, skip } = normalizePagination(query);
  const filter = {};

  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;

  const [items, total] = await Promise.all([
    BrandVideo.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("product", "name slug images variants isActive productType"),
    BrandVideo.countDocuments(filter),
  ]);

  const data = await Promise.all(
    items.map((item) => serializeBrandVideo(item, { includeInactiveProduct: true }))
  );

  return {
    data,
    pagination: buildPaginationMeta({ total, page, limit }),
  };
};

export const getPublicBrandVideos = async () => {
  const items = await BrandVideo.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate({
      path: "product",
      match: { isActive: true },
      select: "name slug images variants isActive productType",
    });

  const serialized = await Promise.all(
    items.map((item) => serializeBrandVideo(item))
  );

  return serialized.filter((item) => item?.video?.url && item?.product?.slug);
};
