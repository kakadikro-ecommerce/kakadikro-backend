export const PRODUCT_TYPE_ALIASES = {
  CROSSLIFE: "CROSSLIFE",
  CROSSLINE: "CROSSLINE",
  GROCERY: "CROSSLIFE",
  ELECTRONICS: "CROSSLINE",
  EQUIPMENT: "CROSSLINE",
};

export const resolveProductType = (code) => {
  const normalized = String(code || "").trim().toUpperCase();
  return PRODUCT_TYPE_ALIASES[normalized] || null;
};

export const normalizeProductType = (code) =>
  resolveProductType(code) || "CROSSLIFE";

export const buildProductTypeFilter = (code) => {
  const canonical = resolveProductType(code);

  if (canonical === "CROSSLIFE") {
    return {
      $or: [
        { productType: { $in: ["CROSSLIFE", "GROCERY"] } },
        { productType: { $exists: false } },
        { productType: null },
        { productType: "" },
      ],
    };
  }

  if (canonical === "CROSSLINE") {
    return {
      productType: { $in: ["CROSSLINE", "ELECTRONICS", "EQUIPMENT"] },
    };
  }

  return null;
};

export const PRODUCT_TYPES = [
  {
    code: "CROSSLIFE",
    label: "Cross Life",
    fields: [
      "name",
      "category",
      "shortDescription",
      "description",
      "usage",
      "ingredients",
      "features",
      "benefits",
      "tags",
      "variants",
      "images",
      "video",
    ],
    requiredFields: ["ingredients", "variants"],
    optionalFields: [
      "shortDescription",
      "description",
      "features",
      "benefits",
      "tags",
      "usage",
      "images",
      "video",
    ],
    // Fields that apply to other types and must not be required here
    notRequiredFields: ["specifications"],
  },
  {
    code: "CROSSLINE",
    label: "Cross Line",
    fields: [
      "name",
      "category",
      "shortDescription",
      "description",
      "usage",
      "specifications",
      "features",
      "benefits",
      "tags",
      "variants",
      "images",
      "video",
    ],
    requiredFields: ["specifications", "variants"],
    optionalFields: [
      "shortDescription",
      "description",
      "features",
      "benefits",
      "tags",
      "usage",
      "images",
      "video",
    ],
    // Cross Life-only fields — optional / not required for Cross Line
    notRequiredFields: ["ingredients"],
  },
];

export const getProductType = (code) => {
  const normalized = normalizeProductType(code);
  return PRODUCT_TYPES.find((type) => type.code === normalized) || PRODUCT_TYPES[0];
};

export const isKnownProductType = (code) => resolveProductType(code) !== null;

const hasNonEmptySpecifications = (specifications) => {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) {
    return false;
  }

  if (specifications instanceof Map) {
    return specifications.size > 0;
  }

  return Object.keys(specifications).length > 0;
};

/**
 * Type-specific required-field checks used by create/update Joi schemas.
 * Cross Life requires ingredients; Cross Line requires specifications.
 * Cross-type fields are never required.
 */
export const validateProductTypeFields = (value, helpers) => {
  const productType = normalizeProductType(value.productType);

  if (productType === "CROSSLIFE") {
    if (!Array.isArray(value.ingredients) || value.ingredients.length === 0) {
      return helpers.message("Ingredients are required for Cross Life products");
    }
  }

  if (productType === "CROSSLINE") {
    if (!hasNonEmptySpecifications(value.specifications)) {
      return helpers.message(
        "Specifications are required for Cross Line products"
      );
    }
  }

  return value;
};
