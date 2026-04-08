import slugify from "slugify";
import Product from "./product.model.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";

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

export const createProduct = async (data, userId) => {
  const productData = { ...data };
  const slug = buildSlug(data);

  if (slug) {
    productData.slug = slug;
  }

  if (userId) {
    productData.createdBy = userId;
  }

  const product = await Product.create(productData);
  return product;
};

export const getAllProducts = async (query) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    order = "desc"
  } = query;

  const filter = { isActive: true };

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const escapeRegex = (text) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (category) {
    const trimmedCategory = escapeRegex(category.trim());

    filter.category = {
      $regex: `^${trimmedCategory}$`,
      $options: "i",
    };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
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
    data: products,
  };
};

export const getAllProductsAdmin = async (query) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    isActive,
    sortBy = "createdAt",
    order = "desc",
  } = query;

  const filter = {};

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const escapeRegex = (text) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (category) {
    const trimmedCategory = escapeRegex(category.trim());

    filter.category = {
      $regex: `^${trimmedCategory}$`,
      $options: "i",
    };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

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
    data: products,
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

  return normalizeProductArrayFields(product);
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

  return product;
};

export const updateProduct = async (id, data) => {
  const product = await Product.findById(id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const slug = buildSlug(data);
  if (slug) {
    data.slug = slug;
  }

  Object.assign(product, data);

  await product.save();

  return product;
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
}
