export const PRODUCT_TYPES = [
  {
    code: "GROCERY",
    label: "Grocery",
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
    code: "ELECTRONICS",
    label: "Electronics",
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
    // Grocery-only fields — optional / not required for electronics
    notRequiredFields: ["ingredients"],
  },
];

export const getProductType = (code) => {
  const normalized = String(code || "GROCERY").trim().toUpperCase();
  return PRODUCT_TYPES.find((type) => type.code === normalized) || PRODUCT_TYPES[0];
};

export const isKnownProductType = (code) =>
  PRODUCT_TYPES.some((type) => type.code === String(code || "").trim().toUpperCase());

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
 * Grocery requires ingredients; Electronics requires specifications.
 * Cross-type fields are never required.
 */
export const validateProductTypeFields = (value, helpers) => {
  const productType = String(value.productType || "GROCERY").trim().toUpperCase();

  if (productType === "GROCERY") {
    if (!Array.isArray(value.ingredients) || value.ingredients.length === 0) {
      return helpers.message("Ingredients are required for grocery products");
    }
  }

  if (productType === "ELECTRONICS") {
    if (!hasNonEmptySpecifications(value.specifications)) {
      return helpers.message(
        "Specifications are required for electronics products"
      );
    }
  }

  return value;
};
