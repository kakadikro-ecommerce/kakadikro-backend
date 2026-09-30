import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/database.js";
import routes from "./routes/index.js";
import notFoundHandler from "./middlewares/not-found.js";
import errorHandler from "./middlewares/error-handler.js";

dotenv.config({ override: true });

const app = express();
const normalizeOrigin = (value = "") => value.trim().replace(/\/+$/, "");
const defaultOrigins = [
  "https://kakadikro.com",
  "https://www.kakadikro.com",
  "https://admin.kakadikro.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://kakadikro-website.vercel.app",
  "https://kakadikro-admin.vercel.app",
];
const extraOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = new Set(
  [...defaultOrigins, ...extraOrigins].map(normalizeOrigin)
);
const corsAllowedHeaders = [
  "Content-Type",
  "Authorization",
  "Accept",
  "Origin",
  "X-Requested-With",
];
const corsAllowedMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return allowedOrigins.has(normalizeOrigin(origin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: corsAllowedMethods,
  allowedHeaders: corsAllowedHeaders,
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

connectDB();

// Express 5 auto-answers route OPTIONS with `Allow: POST` and no CORS headers.
// Terminate preflight here so website/admin origins get Access-Control-Allow-Origin.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", corsAllowedMethods.join(","));
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        corsAllowedHeaders.join(", ")
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
  } else if (origin) {
    console.log("Blocked by CORS:", origin);
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
});

app.use(cors(corsOptions));

// Razorpay webhooks need the raw body for HMAC signature verification.
// This must be registered before express.json().
app.use(
  "/api/payments/webhooks/razorpay",
  express.raw({ type: "application/json" })
);

// JSON and URL-encoded bodies only. Multipart product files are limited by
// Multer: up to 9 images at 5MB each, and one MP4 video at 50MB.
// Reverse proxies (Nginx) must also raise client_max_body_size — see README.
const bodyLimit = process.env.REQUEST_BODY_LIMIT || "30mb";
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(morgan("dev"));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Ecommerce API Running");
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
