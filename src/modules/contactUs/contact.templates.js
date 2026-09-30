import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getBrandLinks } from "../../config/mail.js";

const WEBSITE = "https://kakadikro.com";
const ADDRESS = "Parvat patiya, Surat -395010 Gujarat, India.";
const TAGLINE = "Authentic Gujarati masala &amp; spices";

const assetsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets"
);

const page = "#EEF1F6";
const card = "#FFFFFF";
const ink = "#1C1C1C";
const muted = "#5E6972";
const line = "#E2E6EB";
const buttonBg = "#2B2B2B";
const panel = "#D7EEF6";

const INLINE_IMAGES = {
  logo: {
    file: path.join(assetsRoot, "logo.png"),
    filename: "kakadikro-logo.png",
    cid: "kakadikro-logo@kakadikro.com",
    contentType: "image/png",
  },
  facebook: {
    file: path.join(assetsRoot, "email", "facebook.png"),
    filename: "facebook.png",
    cid: "kakadikro-facebook@kakadikro.com",
    contentType: "image/png",
    remote: "https://img.icons8.com/color/48/facebook-new.png",
  },
  instagram: {
    file: path.join(assetsRoot, "email", "instagram.png"),
    filename: "instagram.png",
    cid: "kakadikro-instagram@kakadikro.com",
    contentType: "image/png",
    remote: "https://img.icons8.com/color/48/instagram-new.png",
  },
  youtube: {
    file: path.join(assetsRoot, "email", "youtube.png"),
    filename: "youtube.png",
    cid: "kakadikro-youtube@kakadikro.com",
    contentType: "image/png",
    remote: "https://img.icons8.com/color/48/youtube-play.png",
  },
  crosslife: {
    file: path.join(assetsRoot, "email", "crosslife.jpg"),
    filename: "crosslife.jpg",
    cid: "kakadikro-crosslife@kakadikro.com",
    contentType: "image/jpeg",
  },
  crossline: {
    file: path.join(assetsRoot, "email", "crossline.jpg"),
    filename: "crossline.jpg",
    cid: "kakadikro-crossline@kakadikro.com",
    contentType: "image/jpeg",
  },
};

const imageReady = (key) => {
  const item = INLINE_IMAGES[key];
  return Boolean(item && fs.existsSync(item.file));
};

const imageSrc = (key) => {
  const item = INLINE_IMAGES[key];
  if (!item) {
    return "";
  }

  if (imageReady(key)) {
    return `cid:${item.cid}`;
  }

  return item.remote || "";
};

const attachmentsFor = (keys) =>
  keys
    .filter((key) => imageReady(key))
    .map((key) => {
      const item = INLINE_IMAGES[key];
      return {
        filename: item.filename,
        path: item.file,
        cid: item.cid,
        contentType: item.contentType,
        contentDisposition: "inline",
      };
    });

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const formatSubmittedAt = (value = new Date()) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const textOrFallback = (value, fallback) => {
  const text = String(value || "").trim();
  return text || fallback;
};

const formatMessageHtml = (value) =>
  escapeHtml(textOrFallback(value, "")).replace(/\r\n|\n|\r/g, "<br />");

const img = ({ src, alt, width }) => {
  if (!src) {
    return "";
  }

  return `<img src="${src}" width="${width}" alt="${escapeHtml(alt)}" style="display:block; width:100%; max-width:${width}px; height:auto; border:0; outline:none; text-decoration:none;" />`;
};

const logoHtml = () => {
  const src = imageSrc("logo");
  if (!src) {
    return `<p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:28px; font-weight:bold; color:${ink};">Kaka Dikro</p>`;
  }

  return img({ src, alt: "Kaka Dikro", width: 168 });
};

const button = ({ href, label }) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 0 0;">
    <tr>
      <td align="center" bgcolor="${buttonBg}" style="border-radius:6px; background:${buttonBg};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:40px;v-text-anchor:middle;width:190px;" arcsize="12%" stroke="f" fillcolor="${buttonBg}">
          <w:anchorlock/>
          <center style="color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold;">${escapeHtml(label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${href}" style="display:inline-block; padding:12px 18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:16px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:6px;">
          ${escapeHtml(label)}
        </a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>
`;

const socialRow = () => {
  const links = getBrandLinks();
  const items = [
    { key: "facebook", label: "Facebook", href: links.facebook },
    { key: "instagram", label: "Instagram", href: links.instagram },
    { key: "youtube", label: "YouTube", href: links.youtube },
  ].filter((item) => item.href && imageSrc(item.key));

  if (items.length === 0) {
    return "";
  }

  const cells = items
    .map(
      (item) => `
        <td align="center" valign="top" style="padding:0 14px;">
          <a href="${escapeHtml(item.href)}" style="text-decoration:none; color:${muted};">
            <img src="${imageSrc(item.key)}" width="28" height="28" alt="${escapeHtml(item.label)}" style="display:block; border:0; outline:none; text-decoration:none; margin:0 auto 8px auto; width:28px; height:28px;" />
            <span style="display:block; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:14px; letter-spacing:0.08em; text-transform:uppercase; color:${muted};">
              ${escapeHtml(item.label)}
            </span>
          </a>
        </td>`
    )
    .join("");

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:18px auto 0 auto;">
      <tr>${cells}</tr>
    </table>
  `;
};

const productBand = () => {
  const photos = [
    { key: "crosslife", alt: "CROSSLiFE" },
    { key: "crossline", alt: "CROSSLiNE" },
  ]
    .map((photo) => ({ ...photo, src: imageSrc(photo.key) }))
    .filter((photo) => photo.src);

  if (photos.length === 0) {
    return "";
  }

  if (photos.length === 1) {
    return `
      <tr>
        <td bgcolor="${panel}" style="background:${panel}; padding:18px 18px 22px 18px;">
          ${img({ src: photos[0].src, alt: photos[0].alt, width: 560 })}
        </td>
      </tr>
    `;
  }

  return `
    <tr>
      <td bgcolor="${panel}" style="background:${panel}; padding:18px 16px 22px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="50%" valign="middle" style="width:50%; padding:0 7px 0 0;">
              ${img({ src: photos[0].src, alt: photos[0].alt, width: 268 })}
            </td>
            <td width="50%" valign="middle" style="width:50%; padding:0 0 0 7px;">
              ${img({ src: photos[1].src, alt: photos[1].alt, width: 268 })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

const shell = ({ preheader, cardRows, footerNote }) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>Kakadikro</title>
  </head>
  <body style="margin:0; padding:0; background:${page};">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${page};">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${page}" style="background:${page}; margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="${card}" style="width:100%; max-width:600px; background:${card}; margin:0 auto;">
            ${cardRows}
          </table>
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center" style="width:100%; max-width:600px; margin:0 auto;">
            <tr>
              <td align="center" style="padding:22px 12px 8px 12px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:${muted};">
                  ${footerNote}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0 0;">
                  <tr>
                    <td height="1" bgcolor="${line}" style="height:1px; background:${line}; font-size:0; line-height:0;">&nbsp;</td>
                  </tr>
                </table>
                ${socialRow()}
                <p style="margin:18px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:${ink};">
                  ${TAGLINE}
                </p>
                <p style="margin:6px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:${muted};">
                  ${escapeHtml(ADDRESS)}
                </p>
                <p style="margin:10px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px;">
                  <a href="${WEBSITE}" style="color:${muted}; text-decoration:underline;">kakadikro.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const copyBlock = (inner) => `
  <tr>
    <td style="padding:8px 32px 28px 32px;">
      ${inner}
    </td>
  </tr>
`;

const headline = (text) => `
  <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:32px; line-height:38px; font-weight:bold; color:${ink};">
    ${text}
  </h1>
`;

const paragraph = (html) => `
  <p style="margin:14px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:${muted};">
    ${html}
  </p>
`;

export const buildAdminInquiryEmail = ({
  name,
  email,
  phone,
  subject,
  message,
  submittedAt,
}) => {
  const rawName = textOrFallback(name, "Website visitor");
  const rawEmail = textOrFallback(email, "");
  const rawPhone = textOrFallback(phone, "");
  const rawSubject = textOrFallback(subject, "");
  const safeName = escapeHtml(rawName);
  const safeEmail = escapeHtml(rawEmail);
  const when = escapeHtml(formatSubmittedAt(submittedAt));
  const about = rawSubject
    ? `About ${escapeHtml(rawSubject)}`
    : "Sent from the website";
  const phoneHtml = rawPhone
    ? `<a href="tel:${escapeHtml(rawPhone.replace(/[^\d+]/g, ""))}" style="color:${ink}; text-decoration:none;">${escapeHtml(rawPhone)}</a>`
    : "Not shared";

  const html = shell({
    preheader: `${rawName} wrote through the Kakadikro website.`,
    footerNote: `Reply to this email to write back to ${safeName}.`,
    cardRows: `
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          ${logoHtml()}
        </td>
      </tr>
      ${copyBlock(`
        ${headline("Someone reached out.")}
        ${paragraph(`<span style="color:${ink}; font-size:20px; line-height:28px; font-weight:bold;">${safeName}</span><br />${about}<br />Received ${when} IST`)}
        ${paragraph(`<span style="color:${ink};">${formatMessageHtml(message)}</span>`)}
        ${paragraph(`<span style="color:${ink};">${safeEmail ? `<a href="mailto:${safeEmail}" style="color:${ink}; text-decoration:underline;">${safeEmail}</a>` : "No email shared"}</span><br />${phoneHtml}`)}
        ${button({ href: rawEmail ? `mailto:${safeEmail}` : WEBSITE, label: rawEmail ? "Reply by email" : "Visit Kakadikro" })}
      `)}
    `,
  });

  const text = [
    "Someone reached out.",
    "",
    rawName,
    rawSubject ? `About: ${rawSubject}` : "Sent from the website",
    `Received: ${formatSubmittedAt(submittedAt)} IST`,
    "",
    textOrFallback(message, ""),
    "",
    `Email: ${rawEmail}`,
    `Phone: ${rawPhone || "Not shared"}`,
    "",
    `Reply to this email to write back to ${rawName}.`,
    `Visit Kakadikro: ${WEBSITE}`,
    "",
    "Authentic Gujarati masala & spices",
    ADDRESS,
  ].join("\n");

  return {
    html,
    text,
    attachments: attachmentsFor(["logo", "facebook", "instagram", "youtube"]),
  };
};

export const buildUserConfirmationEmail = ({ name, subject, message, submittedAt }) => {
  const rawName = textOrFallback(name, "there").split(" ")[0];
  const rawSubject = textOrFallback(subject, "");
  const safeName = escapeHtml(rawName);
  const when = escapeHtml(formatSubmittedAt(submittedAt));
  const opening = rawSubject
    ? `Hello ${safeName}, thank you for writing to Kakadikro about ${escapeHtml(rawSubject)}. Your message is saved, and we'll reply from this address once someone here has read it.`
    : `Hello ${safeName}, thank you for writing to Kakadikro. Your message is saved, and we'll reply from this address once someone here has read it.`;

  const html = shell({
    preheader: "Thank you for writing. We've saved your note and will reply from this address.",
    footerNote: "This note was sent because you wrote to Kakadikro.",
    cardRows: `
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          ${logoHtml()}
        </td>
      </tr>
      ${copyBlock(`
        ${headline("Thanks for reaching out!")}
        ${paragraph(opening)}
        ${paragraph(`Saved ${when} IST`)}
        ${paragraph(`<span style="color:${ink};">${formatMessageHtml(message)}</span>`)}
        ${paragraph("Until then, the pantry is open.")}
        ${button({ href: WEBSITE, label: "Visit Kakadikro" })}
      `)}
      ${productBand()}
    `,
  });

  const text = [
    "Thanks for reaching out!",
    "",
    `Hello ${rawName},`,
    rawSubject
      ? `Thank you for writing to Kakadikro about ${rawSubject}. Your message is saved, and we'll reply from this address once someone here has read it.`
      : "Thank you for writing to Kakadikro. Your message is saved, and we'll reply from this address once someone here has read it.",
    "",
    `Saved: ${formatSubmittedAt(submittedAt)} IST`,
    "",
    "Your message:",
    textOrFallback(message, ""),
    "",
    "Until then, the pantry is open.",
    `Visit Kakadikro: ${WEBSITE}`,
    "",
    "Authentic Gujarati masala & spices",
    ADDRESS,
    "",
    "This note was sent because you wrote to Kakadikro.",
  ].join("\n");

  return {
    html,
    text,
    attachments: attachmentsFor([
      "logo",
      "facebook",
      "instagram",
      "youtube",
      "crosslife",
      "crossline",
    ]),
  };
};
