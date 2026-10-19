const parseNonNegativeInt = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getShippingConfig = (env = process.env) => {
  const codEnabled = String(env.SHIPPING_COD_ENABLED || "").toLowerCase() === "true";

  return {
    methodId: String(env.SHIPPING_METHOD_ID || "standard").trim() || "standard",
    methodName: String(env.SHIPPING_METHOD_NAME || "Standard Delivery").trim() || "Standard Delivery",
    methodDescription: String(env.SHIPPING_METHOD_DESCRIPTION || "").trim(),
    feePaise: parseNonNegativeInt(env.SHIPPING_FEE_PAISE, 0),
    codEnabled,
    codFeePaise: codEnabled ? parseNonNegativeInt(env.SHIPPING_COD_FEE_PAISE, 0) : 0,
    blockedPincodes: parseList(env.SHIPPING_BLOCKED_PINCODES),
  };
};

const INDIA_COUNTRIES = new Set(["IN", "IND", "INDIA", "BHARAT"]);

const normalizeCountry = (country) => String(country || "").trim().toUpperCase();

export const isDomesticIndia = (country) => {
  const value = normalizeCountry(country);
  if (!value) {
    return true;
  }

  return INDIA_COUNTRIES.has(value);
};

const normalizePincode = (zipcode) => {
  const digits = String(zipcode ?? "").replace(/\D/g, "");
  return digits.length > 6 ? digits.slice(0, 6) : digits;
};

export const isServiceablePincode = (zipcode, country, config) => {
  if (!isDomesticIndia(country)) {
    return false;
  }

  const pincode = normalizePincode(zipcode);
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return false;
  }

  if (config.blockedPincodes.includes(pincode)) {
    return false;
  }

  return true;
};

const methodDescription = (config) =>
  config.methodDescription || "Delivery across India";

const unavailableMethod = (config) => ({
  id: config.methodId,
  name: config.methodName,
  description: methodDescription(config),
  serviceable: false,
  shipping_fee: 0,
  cod: false,
  cod_fee: 0,
});

const availableMethod = (config) => ({
  id: config.methodId,
  name: config.methodName,
  description: methodDescription(config),
  serviceable: true,
  shipping_fee: config.feePaise,
  cod: config.codEnabled,
  cod_fee: config.codEnabled ? config.codFeePaise : 0,
});

const PINCODE_STATE = [
  ["11", "DL"],
  ["12", "HR"],
  ["13", "HR"],
  ["14", "PB"],
  ["15", "PB"],
  ["16", "CH"],
  ["17", "HP"],
  ["18", "JK"],
  ["19", "JK"],
  ["20", "UP"],
  ["21", "UP"],
  ["22", "UP"],
  ["23", "UP"],
  ["24", "UP"],
  ["25", "UP"],
  ["26", "UP"],
  ["27", "UP"],
  ["28", "UP"],
  ["30", "RJ"],
  ["31", "RJ"],
  ["32", "RJ"],
  ["33", "RJ"],
  ["34", "RJ"],
  ["36", "GJ"],
  ["37", "GJ"],
  ["38", "GJ"],
  ["39", "GJ"],
  ["40", "MH"],
  ["41", "MH"],
  ["42", "MH"],
  ["43", "MH"],
  ["44", "MH"],
  ["45", "MP"],
  ["46", "MP"],
  ["47", "MP"],
  ["48", "MP"],
  ["49", "CG"],
  ["50", "TG"],
  ["51", "AP"],
  ["52", "AP"],
  ["53", "AP"],
  ["56", "KA"],
  ["57", "KA"],
  ["58", "KA"],
  ["59", "KA"],
  ["60", "TN"],
  ["61", "TN"],
  ["62", "TN"],
  ["63", "TN"],
  ["64", "TN"],
  ["67", "KL"],
  ["68", "KL"],
  ["69", "KL"],
  ["70", "WB"],
  ["71", "WB"],
  ["72", "WB"],
  ["73", "WB"],
  ["74", "WB"],
  ["75", "OD"],
  ["76", "OD"],
  ["77", "OD"],
  ["78", "AS"],
  ["79", "AS"],
  ["80", "BR"],
  ["81", "BR"],
  ["82", "BR"],
  ["83", "BR"],
  ["84", "BR"],
  ["85", "BR"],
];

const stateCodeForPincode = (zipcode) => {
  const prefix = normalizePincode(zipcode).slice(0, 2);
  const match = PINCODE_STATE.find(([code]) => code === prefix);
  return match ? match[1] : "";
};

const addressCountry = (address) =>
  address?.country || address?.country_code || address?.countryCode || "";

export const buildShippingInfoResponse = (addresses, env = process.env) => {
  const config = getShippingConfig(env);

  return {
    addresses: addresses.map((address, index) => {
      const country = addressCountry(address);
      const serviceable = isServiceablePincode(address.zipcode, country, config);
      const stateCode =
        String(address.state_code || address.stateCode || "").trim().toUpperCase() ||
        stateCodeForPincode(address.zipcode);

      return {
        id: address.id === undefined || address.id === null || address.id === ""
          ? String(index)
          : String(address.id),
        zipcode: normalizePincode(address.zipcode),
        ...(stateCode ? { state_code: stateCode } : {}),
        country: "IN",
        shipping_methods: [serviceable ? availableMethod(config) : unavailableMethod(config)],
      };
    }),
  };
};

export const razorpayOrderIdCandidates = (razorpayOrderId) => {
  const value = String(razorpayOrderId || "").trim();
  if (!value) {
    return [];
  }

  const withoutPrefix = value.replace(/^order_/i, "");
  return [...new Set([value, withoutPrefix, `order_${withoutPrefix}`])];
};

export const shouldMarkOrderPaid = (paymentEntity) => {
  const method = String(paymentEntity?.method || "").trim().toLowerCase();
  return method !== "cod";
};

export const reconcilePaidAmount = (order, amountPaise) => {
  const paidPaise = Number(amountPaise);
  if (!Number.isFinite(paidPaise) || paidPaise < 0) {
    return order;
  }

  const subtotal = Number(order.subtotalAmount || 0);
  const tax = Number(order.taxAmount || 0);
  const discount = Number(order.discountAmount || 0);
  const paidRupees = Math.round(paidPaise) / 100;
  const shipping = Math.max(0, Math.round((paidRupees - subtotal - tax + discount) * 100) / 100);

  order.shippingAmount = shipping;
  order.totalAmount = Math.round((subtotal + shipping + tax - discount) * 100) / 100;
  return order;
};
