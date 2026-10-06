import slugify from "slugify";
import Product from "./product.model.js";
import {
  buildProductTypeFilter,
  normalizeProductType,
} from "./productType.catalog.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";
import { deleteFilesFromS3 } from "../../shared/upload/service.js";
import {
  attachPresignedUrlsToProduct,
  attachPresignedUrlsToProducts,
  extractImageKey,
  normalizeImageRecordForStorage,
} from "../../shared/utils/image.js";

const normalizeArrayResponseField = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (trimmedValue.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        return parsedValue
          .map((item) =>
            typeof item === "string" ? item.trim() : String(item).trim()
          )
          .filter(Boolean);
      }
    } catch (error) {
      return [trimmedValue];
    }
  }

  return [trimmedValue];
};

const normalizeProductArrayFields = (product) => {
  const arrayFields = ["ingredients", "features", "benefits", "tags"];

  for (const field of arrayFields) {
    product[field] = normalizeArrayResponseField(product[field]);
  }

  return product;
};

const buildSlug = (data) => {
  if (data.slug) return data.slug;
  if (!data.name) return undefined;
  return slugify(data.name, { lower: true, strict: true });
};

const normalizeAttributes = (attributes = {}) => {
  if (attributes instanceof Map) {
    return Object.fromEntries(attributes.entries());
  }

  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return {};
  }

  return Object.entries(attributes).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    acc[String(key).trim()] = String(value).trim();
    return acc;
  }, {});
};

const normalizeVariants = (variants) => {
  if (!Array.isArray(variants)) {
    return variants;
  }

  return variants.map((variant) => {
    const attributes = normalizeAttributes(variant.attributes);
    const legacyWeight =
      typeof variant.weight === "string" ? variant.weight.trim() : "";
    const name =
      (typeof variant.name === "string" && variant.name.trim()) ||
      legacyWeight;

    if (legacyWeight && !attributes.weight) {
      attributes.weight = legacyWeight;
    }

    return {
      name,
      price: variant.price,
      mrp: variant.mrp,
      stock: variant.stock,
      attributes,
    };
  });
};

const normalizeSpecifications = (specifications) => {
  if (specifications === undefined) {
    return undefined;
  }

  return normalizeAttributes(specifications);
};

const prepareProductData = (data) => {
  const productData = { ...data };

  // brand is no longer part of the Product model — never persist it
  delete productData.brand;

  if (productData.variants !== undefined) {
    productData.variants = normalizeVariants(productData.variants);
  }

  if (productData.specifications !== undefined) {
    productData.specifications = normalizeSpecifications(
      productData.specifications
    );
  }

  if (Array.isArray(productData.images)) {
    productData.images = productData.images.map(normalizeImageRecordForStorage);
  }

  if (productData.video === null || productData.video === "") {
    productData.video = null;
  } else if (
    productData.video &&
    typeof productData.video === "object" &&
    !Array.isArray(productData.video)
  ) {
    productData.video = normalizeImageRecordForStorage(productData.video);
  }

  return productData;
};

const collectImageKeys = (images = []) =>
  images.map((image) => extractImageKey(image?.url)).filter(Boolean);

const collectReplacedMediaKeys = (product, productData) => {
  const keysToDelete = [];

  if (Array.isArray(productData.images)) {
    const nextImageKeys = new Set(collectImageKeys(productData.images));

    for (const key of collectImageKeys(product.images)) {
      if (!nextImageKeys.has(key)) {
        keysToDelete.push(key);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(productData, "video")) {
    const previousVideoKey = extractImageKey(product.video?.url);
    const nextVideoKey = productData.video
      ? extractImageKey(productData.video.url)
      : null;

    if (previousVideoKey && previousVideoKey !== nextVideoKey) {
      keysToDelete.push(previousVideoKey);
    }
  }

  return keysToDelete;
};

const escapeRegex = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyCommonProductFilters = (filter, query) => {
  const { search, category, productType, minPrice, maxPrice } = query;

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (category) {
    const trimmedCategory = escapeRegex(category.trim());

    filter.category = {
      $regex: `^${trimmedCategory}$`,
      $options: "i",
    };
  }

  if (productType) {
    const typeFilter = buildProductTypeFilter(productType);

    if (typeFilter?.$or) {
      filter.$or = typeFilter.$or;
    } else if (typeFilter?.productType) {
      filter.productType = typeFilter.productType;
    } else {
      filter.productType = String(productType).trim().toUpperCase();
    }
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  return filter;
};

export const createProduct = async (data, userId) => {
  const productData = prepareProductData(data);
  const slug = buildSlug(data);

  if (slug) {
    productData.slug = slug;
  }

  if (userId) {
    productData.createdBy = userId;
  }

  productData.productType = normalizeProductType(productData.productType);

  if (productData.specifications === undefined) {
    productData.specifications = {};
  }

  const product = await Product.create(productData);
  return attachPresignedUrlsToProduct(product);
};

export const getAllProducts = async (query) => {
  const {
    sortBy = "createdAt",
    order = "desc"
  } = query;

  const filter = applyCommonProductFilters({ isActive: true }, query);

  const { page, limit, skip } = normalizePagination(query);

  const sortOrder = order === "asc" ? 1 : -1;

  const products = await Product.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(Number(limit));

  const total = await Product.countDocuments(filter);

  return {
    pagination: buildPaginationMeta({ total, page, limit }),
    data: await attachPresignedUrlsToProducts(products),
  };
};

export const getAllProductsAdmin = async (query) => {
  const {
    isActive,
    sortBy = "createdAt",
    order = "desc",
  } = query;

  const filter = applyCommonProductFilters({}, query);

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const { page, limit, skip } = normalizePagination(query);
  const sortOrder = order === "asc" ? 1 : -1;

  const products = await Product.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(Number(limit));

  const total = await Product.countDocuments(filter);

  return {
    pagination: buildPaginationMeta({ total, page, limit }),
    data: await attachPresignedUrlsToProducts(products),
  };
};

export const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug, isActive: true })
    .populate({
      path: "reviews",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "user",
        select: "name"
      }
    });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return attachPresignedUrlsToProduct(normalizeProductArrayFields(product));
};

export const getProductById = async (id) => {
  const product = await Product.findById(id)
    .populate({
      path: "reviews",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "user",
        select: "name"
      }
    });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return attachPresignedUrlsToProduct(product);
};

export const updateProduct = async (id, data) => {
  const product = await Product.findById(id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const productData = prepareProductData(data);
  const slug = buildSlug(productData);
  if (slug) {
    productData.slug = slug;
  }

  const replacedMediaKeys = collectReplacedMediaKeys(product, productData);

  Object.assign(product, productData);

  // Mongoose can miss array/subdocument updates via Object.assign — set explicitly.
  if (Array.isArray(productData.images)) {
    product.images = productData.images;
    product.markModified("images");
  }

  if (Object.prototype.hasOwnProperty.call(productData, "video")) {
    product.video = productData.video;
    product.markModified("video");
  }

  await product.save();

  if (replacedMediaKeys.length > 0) {
    try {
      await deleteFilesFromS3(replacedMediaKeys);
    } catch (error) {
      console.error("Failed to delete replaced product media from S3", error);
    }
  }

  return attachPresignedUrlsToProduct(product);
};

export const updateProductStatus = async (id, isActive) => {
  const product = await Product.findById(id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  product.isActive = isActive;
  await product.save();

  return product;
};

export const getRelatedProducts = async (slug, limit = 4) => {
  const current = await Product.findOne({ slug, isActive: true }).lean();

  if (!current) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const productType = normalizeProductType(current.productType);
  const parsedLimit = Math.min(Math.max(Number(limit) || 4, 1), 12);
  const baseFilter = {
    isActive: true,
    slug: { $ne: slug },
    ...buildProductTypeFilter(productType),
  };

  const sameCategory = current.category
    ? await Product.find({
        ...baseFilter,
        category: {
          $regex: `^${escapeRegex(current.category.trim())}$`,
          $options: "i",
        },
      })
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .lean()
    : [];

  if (sameCategory.length >= parsedLimit) {
    return attachPresignedUrlsToProducts(sameCategory);
  }

  const excludeIds = sameCategory.map((product) => product._id);
  const remaining = parsedLimit - sameCategory.length;

  const sameType = await Product.find({
    ...baseFilter,
    ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(remaining)
    .lean();

  return attachPresignedUrlsToProducts([...sameCategory, ...sameType]);
};
