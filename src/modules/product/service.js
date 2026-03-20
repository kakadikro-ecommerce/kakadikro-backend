import slugify from "slugify";
import Product from "./model.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";

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
    order = "desc",
  } = query;

  const filter = { isActive: true };

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (category) {
    filter.category = category;
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

  if (category) {
    filter.category = category;
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
  const product = await Product.findOne({ slug, isActive: true });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);

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

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await product.deleteOne();

  return { message: "Product deleted successfully" };
};
