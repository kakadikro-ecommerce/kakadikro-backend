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
    allowedPincodes: parseList(env.SHIPPING_SERVICEABLE_PINCODES),
  };
};

const normalizeCountry = (country) => String(country || "").trim().toUpperCase();

export const isDomesticIndia = (country) => {
  const value = normalizeCountry(country);
  return value === "IN" || value === "INDIA";
};

const normalizePincode = (zipcode) => String(zipcode || "").trim();

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

  if (config.allowedPincodes.length > 0 && !config.allowedPincodes.includes(pincode)) {
    return false;
  }

  return true;
};

const unavailableMethod = (config) => ({
  id: config.methodId,
  name: config.methodName,
  description: config.methodDescription,
  serviceable: false,
  shipping_fee: 0,
  cod: false,
  cod_fee: 0,
});

const availableMethod = (config) => ({
  id: config.methodId,
  name: config.methodName,
  description: config.methodDescription,
  serviceable: true,
  shipping_fee: config.feePaise,
  cod: config.codEnabled,
  cod_fee: config.codEnabled ? config.codFeePaise : 0,
});

export const buildShippingInfoResponse = (addresses, env = process.env) => {
  const config = getShippingConfig(env);

  return {
    addresses: addresses.map((address) => {
      const serviceable = isServiceablePincode(address.zipcode, address.country, config);

      return {
        id: String(address.id),
        zipcode: normalizePincode(address.zipcode),
        ...(address.state_code ? { state_code: String(address.state_code).trim() } : {}),
        country: isDomesticIndia(address.country) ? "IN" : normalizeCountry(address.country).slice(0, 2),
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
