# KakaDikro Backend

Backend API for the KakaDikro ecommerce application. This service provides user and admin APIs for authentication, products, carts, orders, payments, reviews, contact messages, file uploads, and order label generation.

## Tech Stack

- Node.js with Express 5
- MongoDB with Mongoose
- JWT authentication
- Joi request validation
- AWS S3 uploads with `multer-s3`
- Razorpay payment order creation and verification
- Puppeteer for order label generation
- CORS and request logging with `cors` and `morgan`

## Project Structure

```text
src/
  assets/                 Static project assets
  config/                 Database, mail, and AWS S3 configuration
  middlewares/            Auth, role access, validation, error, and 404 handlers
  modules/
    admin/                Admin auth, profile, user management, and admin model
    cart/                 User cart APIs and cart model
    contactUs/            Contact form and admin contact management
    order/                User/admin order APIs, order model, status constants, label template
    payment/              Razorpay payment APIs and payment model
    product/              Product APIs, product model, upload payload parsing
    review/               Product review APIs and review model
    user/                 User auth, profile, and user model
  routes/                 API route composition for user and admin route groups
  shared/                 Reusable auth, error, HTTP, mail, upload, utility, and validation helpers
  server.js               Express app bootstrap
```

## Requirements

- Node.js
- npm
- MongoDB database
- AWS S3 bucket for product media uploads
- Razorpay account for online payments

## Getting Started

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Update `.env` with your local or production values, then start the server:

```bash
npm run dev
```

For production:

```bash
npm start
```

The API runs on `http://localhost:5000` by default.

## Environment Variables

The project reads these variables from `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/ecommerce-backend
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRE=7d
CLIENT_ORIGIN=http://localhost:3000
COOKIE_SAME_SITE=lax

AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=kakadikroproduct
S3_PRESIGNED_URL_EXPIRES_IN=3600

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@kakadikro.com
SMTP_PASS=your_smtp_password
NEXT_PUBLIC_YOUTUBE_URL=https://www.youtube.com/@Kaka_Dikro
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/kaka.dikro
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/share/1BRUZeNZr6/

# Optional. Used only to extract object keys from legacy full S3/CloudFront URLs
# stored in the database. Responses now use backend-generated presigned GET URLs.
S3_BASE_URL=https://kakadikroproduct.s3.ap-south-1.amazonaws.com
CLOUDFRONT_BASE_URL=https://your-cloudfront-domain
```

Notes:

- `CLIENT_ORIGIN` can contain a comma-separated list of allowed frontend origins.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are required for online payment APIs.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` are required for Contact Us emails. The authenticated sender is `SMTP_USER`. Do not expose these values to the frontend.
- `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, and `NEXT_PUBLIC_YOUTUBE_URL` are the social links used in email footers.
- Product media is stored in private S3 as object keys. Product, cart, and order APIs return temporary presigned GET URLs.
- `S3_BASE_URL` and `CLOUDFRONT_BASE_URL` are optional compatibility helpers for documents that still store full URLs instead of keys.
- Do not commit AWS credentials. Local deploys can use `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. Production can use an IAM role instead.

## Available Scripts

```bash
npm run dev     # Start the API with nodemon
npm start       # Start the API with node
npm test        # Placeholder test script
```

## API Base URL

All API routes are mounted under:

```text
/api/v1
```

Main route groups:

```text
/api/v1/user
/api/v1/admin
```

Protected routes expect a Bearer token:

```http
Authorization: Bearer <access_token>
```

## User APIs

### Auth

```text
POST /api/v1/user/auth/register
POST /api/v1/user/auth/login
POST /api/v1/user/auth/logout
```

### Profile

```text
GET  /api/v1/user/profile
PUT  /api/v1/user/profile
PUT  /api/v1/user/profile/password
```

### Products

```text
GET /api/v1/user/products
GET /api/v1/user/products/:slug
```

### Reviews

Mounted under `/api/v1/user/products/reviews`.

```text
POST   /api/v1/user/products/reviews
GET    /api/v1/user/products/reviews/:productId
GET    /api/v1/user/products/reviews/can-review/:productId
PUT    /api/v1/user/products/reviews/:id
DELETE /api/v1/user/products/reviews/:id
```

### Cart

```text
GET    /api/v1/user/cart
POST   /api/v1/user/cart/items
PUT    /api/v1/user/cart/items/:itemId
DELETE /api/v1/user/cart/items/:itemId
DELETE /api/v1/user/cart
```

### Orders

```text
POST /api/v1/user/orders
GET  /api/v1/user/orders
GET  /api/v1/user/orders/tracking/:id
PUT  /api/v1/user/orders/:id
PUT  /api/v1/user/orders/cancel/:id
```

Supported order statuses:

```text
pending, confirmed, dispatched, delivered, cancelled
```

Supported payment methods:

```text
cod, card, upi
```

### Payments

```text
POST /api/v1/user/payments/orders
POST /api/v1/user/payments/verification
```

### Contact

```text
POST /api/user/contacts
```

Request body:

```json
{
  "name": "Asha Patel",
  "email": "asha@example.com",
  "phone": "9876543210",
  "subject": "Bulk masala order",
  "message": "I would like a price list for the spice range."
}
```

`phone` and `subject` are optional. A successful submission stores the inquiry, emails `contact@kakadikro.com`, and sends a separate confirmation to the customer. The customer address is used only as `replyTo` on the business notification.

## Admin APIs

Admin APIs require an authenticated `admin` or `super_admin` token unless noted otherwise.

### Auth

```text
POST /api/v1/admin/auth/login
POST /api/v1/admin/auth/logout
```

### Profile

```text
GET /api/v1/admin/profile
PUT /api/v1/admin/profile
PUT /api/v1/admin/profile/password
```

### Products

```text
GET  /api/v1/admin/products
GET  /api/v1/admin/products/:id
POST /api/v1/admin/products
PUT  /api/v1/admin/products/:id
PUT  /api/v1/admin/products/status/:id
```

Product create/update supports JSON payloads and `multipart/form-data`. Images and video are both optional. The client chooses how many images to send, from 0 to 9.

Multipart fields:

- `images`: 0 to 9 files. JPEG, PNG, or WebP. Each file must be 5MB or smaller.
- `imageAltTexts`: optional alt text aligned with the uploaded images, same as before.
- `existingImages`: on update, JSON array of images to keep. Images are replaced only when this field is sent or new image files are uploaded. The stored list becomes `existingImages` plus the newly uploaded images.
- `video`: 0 or 1 file. MP4 only. Maximum 50MB. A new file replaces the stored video.
- `videoAltText`: optional alt text for the uploaded video.
- `existingVideo`: on update, when no new video file is sent. Send a JSON object `{ "url", "altText" }` to keep that video, or `null` / `""` to remove it. Omit the field to leave the stored video unchanged.

JSON create/update accepts `images` and an optional `video` object `{ "url", "altText" }`. `video: null` clears it. The server stores S3 object keys, not public URLs.

### Orders

```text
GET /api/v1/admin/orders
GET /api/v1/admin/orders/:id
GET /api/v1/admin/orders/label/:id
PUT /api/v1/admin/orders/status/:id
PUT /api/v1/admin/orders/active/:id
```

### Contacts

```text
GET    /api/v1/admin/contacts
GET    /api/v1/admin/contacts/:id
DELETE /api/v1/admin/contacts/:id
```

### Users and Admin Users

```text
POST /api/v1/admin/users
GET  /api/v1/admin/users
GET  /api/v1/admin/users/profile
GET  /api/v1/admin/users/:id
PUT  /api/v1/admin/users/status/:id
```

## Data Models

The application uses these main MongoDB collections:

- `User`: customer account, auth role, active status
- `Admin`: admin/super admin account and active status
- `Product`: product details, slug, category, media, variants, tags, reviews count
- `Cart`: one cart per user with product variant items
- `Order`: user order, immutable items, shipping address, payment status, shipment data
- `Payment`: Razorpay payment records and refund details
- `Review`: one review per user per product
- `Contact`: contact form submissions

## Response and Error Handling

- Successful API responses generally include `success`, `message`, and `data` or pagination fields.
- Request validation is handled with Joi schemas through `validateRequest`.
- Async controller errors are passed to the central error handler.
- Unknown routes are handled by the not-found middleware.

## Development Notes

- The server entry point is `src/server.js`.
- MongoDB connects through `src/config/database.js`.
- Route groups are composed in `src/routes/index.js`.
- Role access is enforced with `protect` and `authorizeRoles`.
- Product media is stored in private S3 under generated `uploads/<uuid>.<ext>` keys. API responses replace those keys with temporary presigned GET URLs. CloudFront is not used.
- Keep Block Public Access enabled on `kakadikroproduct`. Do not add a public `s3:GetObject` bucket policy.
- Browser access to presigned object URLs needs S3 CORS limited to the admin panel and website origins, with `GET` and `HEAD` only. Do not use `AllowedOrigins: ["*"]`.
- For in-browser video seeking, that CORS rule must also allow the `Range` request header and expose `Accept-Ranges`, `Content-Range`, and `Content-Length`.

## Upload size / 413 errors

Product create/update accepts **0 to 9 images at 5MB each** and **0 or 1 MP4 video at 50MB** (`multipart/form-data`). `REQUEST_BODY_LIMIT` (default `30mb`) applies to JSON and URL-encoded bodies only. It does not cap multipart file uploads. Multer enforces the file limits.

If the browser shows **CORS** + **413 Request Entity Too Large** against `api.kakadikro.com`, the reverse proxy (usually Nginx) rejected the body **before** Node ran — so CORS headers were never added. Fix Nginx (or your load balancer) and reload.

`deploy/nginx-api.snippet.conf` is a reference snippet. This repo does not change the live EC2 Nginx config. Copy these directives into the `server { }` block that proxies to this API, then reload Nginx on the instance:

```nginx
client_max_body_size 120M;
client_body_timeout 300s;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
proxy_request_buffering off;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Each image must be 5MB or smaller. The video must be 50MB or smaller.

When developing the admin panel locally, set `VITE_API_BASE_URL=http://localhost:5000/api` (exact name — `VITE_API_BASE_URL_LOCAL` is ignored by Vite).
