import crypto from "crypto";

export const GUEST_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export const generateGuestToken = () => crypto.randomBytes(32).toString("hex");

export const hashGuestToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const isGuestToken = (token) => GUEST_TOKEN_PATTERN.test(String(token || "").trim());

export const guestTokensMatch = (storedHash, rawToken) => {
  if (!storedHash || !isGuestToken(rawToken)) {
    return false;
  }

  const actual = Buffer.from(hashGuestToken(rawToken));
  const expected = Buffer.from(String(storedHash));

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
};
