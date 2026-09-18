export const PRODUCT_TYPES = [
  {
    code: "GROCERY",
    label: "Grocery",
    fields: ["ingredients", "features", "benefits", "tags", "usage", "variants"],
  },
  {
    code: "ELECTRONICS",
    label: "Electronics",
    fields: ["specifications", "features", "benefits", "tags", "usage", "variants"],
  },
];

export const getProductType = (code) => {
  const normalized = String(code || "GROCERY").trim().toUpperCase();
  return PRODUCT_TYPES.find((type) => type.code === normalized) || PRODUCT_TYPES[0];
};

export const isKnownProductType = (code) =>
  PRODUCT_TYPES.some((type) => type.code === String(code || "").trim().toUpperCase());
