import nodemailer from "nodemailer";

let transporter;

const isSecure = () => {
  const flag = String(process.env.SMTP_SECURE ?? "").trim().toLowerCase();

  if (flag === "true" || flag === "1") {
    return true;
  }

  if (flag === "false" || flag === "0") {
    return false;
  }

  return Number(process.env.SMTP_PORT) === 465;
};

export const getSmtpConfigStatus = () => {
  const missing = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].filter(
    (key) => !String(process.env[key] || "").trim()
  );

  return {
    ready: missing.length === 0,
    missing,
  };
};

export const getMailer = () => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: isSecure(),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
};

export const getSenderAddress = () => String(process.env.SMTP_USER || "").trim();

export const getContactInbox = () =>
  String(process.env.SMTP_USER || "contact@kakadikro.com").trim();

export const getBrandLinks = () => ({
  website: "https://kakadikro.com",
  youtube: String(process.env.NEXT_PUBLIC_YOUTUBE_URL || "").trim(),
  instagram: String(process.env.NEXT_PUBLIC_INSTAGRAM_URL || "").trim(),
  facebook: String(process.env.NEXT_PUBLIC_FACEBOOK_URL || "").trim(),
});
