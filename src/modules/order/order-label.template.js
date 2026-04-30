import fs from "fs";
import path from "path";

const logoPath = path.resolve(process.cwd(), "src/assets/kde-logo.png");

const getLogoDataUrl = () => {
  if (!fs.existsSync(logoPath)) {
    return "";
  }

  const logo = fs.readFileSync(logoPath).toString("base64");
  return `data:image/png;base64,${logo}`;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatReceiverAddressLines = (address = {}) => {
  const cityLine = [address.city, address.state].filter(Boolean).join(", ");
  const postalLine = [address.postalCode, address.country].filter(Boolean).join(", ");

  return [
    address.addressLine1,
    address.addressLine2,
    cityLine,
    postalLine,
  ].filter(Boolean);
};

const renderAddressLines = (lines = []) =>
  lines.map((line) => escapeHtml(line)).join("<br />");

const senderDetails = {
  name: "KakaDikro",
  phone: "9824186954",
  addressLines: [
    "Atlion Associate, Office No. 20, First Floor, Raj Empire,",
    "Maharana Pratap Chowk, Godadara,",
    "Surat, Gujarat 395010, India",
  ],
};

export const buildOrderLabelHtml = (order) => {
  const logoDataUrl = getLogoDataUrl();
  const receiver = order.shippingAddress || {};
  const receiverName = receiver.fullName || receiver.name || "Customer";
  const receiverPhone = receiver.phone || receiver.mobile || "";
  const receiverAddressLines = formatReceiverAddressLines(receiver);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Order-${order._id}</title>
        <style>
          @page {
            size: 6in 4in;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html {
            height: 4in;
            margin: 0;
            overflow: hidden;
            width: 6in;
          }

          body {
            height: 4in;
            width: 6in;
            margin: 0;
            overflow: hidden;
            padding: 0;
            color: #1b1b1b;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 16px;
            line-height: 1.28;
          }

          .label {
            height: 100%;
            width: 100%;
            background: #ffffff;
            overflow: hidden;
            padding: 4px 12px 8px;
            position: relative;
          }

          .content {
            display: flex;
            flex-direction: column;
            gap: 6px;
            height: 100%;
          }

          .brand {
            align-items: center;
            display: flex;
            justify-content: center;
            min-height: 80px;
          }

          .logo-wrap {
            align-items: center;
            display: flex;
            height: 78px;
            justify-content: center;
            width: 100%;
          }

          .logo {
            display: block;
            height: 150px;
            max-width: 340px;
            object-fit: contain;
          }

          .address-block {
            padding: 4px 4px;
            text-align: left;
          }

          .to-block {
            flex: 1 1 auto;
            min-height: 96px;
          }

          .from-block {
            flex: 0 0 auto;
          }

          .section-divider {
            align-self: center;
            border-top: 1px solid #2d2d2d;
            height: 1px;
            margin: 4px 0;
            width: 100%;
          }

          .section-title {
            display: block;
            font-size: 17px;
            font-weight: 800;
            letter-spacing: 0;
            line-height: 1.2;
            margin: 0 0 3px;
            text-transform: uppercase;
          }

          .return-note {
            display: block;
            font-size: 12px;
            font-style: italic;
            font-weight: 600;
            line-height: 1.2;
            margin: -1px 0 3px;
            text-decoration: underline;
          }

          .name {
            font-size: 16px;
            font-weight: 800;
            line-height: 1.2;
            margin: 0 0 3px;
            text-transform: uppercase;
            word-break: break-word;
          }

          .address {
            font-size: 13px;
            line-height: 1.24;
            margin: 0 0 3px;
            text-transform: uppercase;
            word-break: break-word;
          }

          .mobile {
            font-size: 15px;
            font-weight: 800;
            line-height: 1.2;
            margin: 0;
            word-break: break-word;
          }

          .from-block .section-title {
            font-size: 16px;
            margin-bottom: 3px;
          }

          .from-block .name {
            font-size: 15px;
          }

          .from-block .address {
            font-size: 12.5px;
          }

          .from-block .mobile {
            font-size: 14px;
          }

          .from-block .name,
          .from-block .mobile {
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <main class="label">
          <section class="content">
            <div class="brand">
              <div class="logo-wrap">
                ${logoDataUrl
      ? `<img class="logo" src="${logoDataUrl}" alt="KakaDikro logo" />`
      : `<strong class="name">${escapeHtml(senderDetails.name)}</strong>`
    }
              </div>
            </div>

            <div class="address-block to-block">
              <span class="section-title">To</span>
              <p class="name">${escapeHtml(receiverName)}</p>
              <p class="address">${renderAddressLines(receiverAddressLines)}</p>
              <div class="mobile">MOBILE : +91 ${escapeHtml(receiverPhone)}</div>
            </div>

            <div class="section-divider" aria-hidden="true"></div>

            <div class="address-block from-block">
              <span class="section-title">From</span>
              <span class="return-note">(Return on this address if order not delivered)</span>
              <p class="name">${escapeHtml(senderDetails.name)}</p>
              <p class="address">${renderAddressLines(senderDetails.addressLines)}</p>
              <div class="mobile">Mobile : +91 ${escapeHtml(senderDetails.phone)}</div>
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
};
