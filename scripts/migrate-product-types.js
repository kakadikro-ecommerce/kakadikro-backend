/**
 * Idempotent migration: existing grocery products → productType + variant name/attributes.
 *
 * What it does:
 * 1. Sets productType to "GROCERY" where missing
 * 2. Converts variants.weight → variants.name + variants.attributes.weight
 * 3. Initializes specifications to {} where missing
 * 4. Does NOT modify or remove historical brand values
 *
 * Usage:
 *   node scripts/migrate-product-types.js
 *   node scripts/migrate-product-types.js --dry-run
 */
import "dotenv/config";
import mongoose from "mongoose";

const DRY_RUN = process.argv.includes("--dry-run");

const needsVariantMigration = (variant) => {
  if (!variant || typeof variant !== "object") {
    return false;
  }

  const hasName = typeof variant.name === "string" && variant.name.trim() !== "";
  const hasWeight =
    typeof variant.weight === "string" && variant.weight.trim() !== "";
  const attributes = variant.attributes;

  if (!hasName && hasWeight) {
    return true;
  }

  if (hasName && hasWeight && !attributes?.weight) {
    return true;
  }

  if (attributes === undefined || attributes === null) {
    return true;
  }

  return false;
};

const migrateVariant = (variant) => {
  const attributes =
    variant.attributes && typeof variant.attributes === "object"
      ? { ...variant.attributes }
      : {};

  const weight =
    (typeof variant.weight === "string" && variant.weight.trim()) ||
    (typeof attributes.weight === "string" && attributes.weight.trim()) ||
    "";

  const name =
    (typeof variant.name === "string" && variant.name.trim()) || weight;

  if (weight && !attributes.weight) {
    attributes.weight = weight;
  }

  const migrated = {
    name,
    price: variant.price,
    mrp: variant.mrp,
    stock: variant.stock ?? 0,
    attributes,
  };

  // Keep legacy weight on the document until verified; app no longer depends on it
  if (weight) {
    migrated.weight = weight;
  }

  return migrated;
};

const migrateProductDocument = (product) => {
  const updates = {};
  let changed = false;

  if (!product.productType) {
    updates.productType = "GROCERY";
    changed = true;
  }

  if (
    product.specifications === undefined ||
    product.specifications === null
  ) {
    updates.specifications = {};
    changed = true;
  }

  if (Array.isArray(product.variants) && product.variants.some(needsVariantMigration)) {
    updates.variants = product.variants.map(migrateVariant);
    changed = true;
  }

  return { changed, updates };
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${DRY_RUN ? "DRY RUN" : "WRITE"}`);

  const collection = mongoose.connection.db.collection("products");
  const products = await collection.find({}).toArray();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    scanned += 1;
    const { changed, updates } = migrateProductDocument(product);

    if (!changed) {
      skipped += 1;
      continue;
    }

    console.log(
      `${DRY_RUN ? "[dry-run] would update" : "updating"} ${product._id} (${product.name || "unnamed"})`,
      updates
    );

    if (!DRY_RUN) {
      await collection.updateOne({ _id: product._id }, { $set: updates });
    }

    updated += 1;
  }

  console.log(
    `\nDone. scanned=${scanned} updated=${updated} skipped=${skipped}`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
