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
  config/                 Database and AWS S3 configuration
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
  shared/                 Reusable auth, error, HTTP, upload, utility, and validation helpers
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
AWS_S3_BUCKET_NAME=your_s3_bucket_name

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

S3_BASE_URL=https://your-bucket.s3.ap-south-1.amazonaws.com
CLOUDFRONT_BASE_URL=https://your-cloudfront-domain
```

Notes:

- `CLIENT_ORIGIN` can contain a comma-separated list of allowed frontend origins.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are required for online payment APIs.
- `S3_BASE_URL` and `CLOUDFRONT_BASE_URL` are used when mapping stored image keys to response URLs.

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
POST /api/v1/user/contacts
```

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

Product create/update supports JSON payloads and `multipart/form-data`. For multipart uploads, use the `images` field. Up to 5 files are supported, with JPEG, PNG, WebP, and MP4 accepted by the upload configuration.

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
- Product media is stored in S3 under generated `uploads/<uuid>` keys.
