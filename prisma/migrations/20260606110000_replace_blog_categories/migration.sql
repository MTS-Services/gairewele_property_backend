/*
  Replaces old BlogCategory enum variants with the new category set.
  Existing rows are remapped to the closest new category.
*/

-- AlterEnum
BEGIN;
CREATE TYPE "BlogCategory_new" AS ENUM (
  'Policy & Regulation',
  'Property News',
  'Opinion & Commentary',
  'Property Investment',
  'Market Analysis',
  'Developers & Development',
  'Property Law',
  'Fraud Alerts',
  'Property Disputes',
  'News',
  'Landlord & Tenants',
  'Market Trends'
);

ALTER TABLE "Blog"
ALTER COLUMN "category"
TYPE "BlogCategory_new"
USING (
  CASE "category"::text
    WHEN 'BUY' THEN 'Property Investment'
    WHEN 'RENT' THEN 'Landlord & Tenants'
    WHEN 'INVEST' THEN 'Property Investment'
    WHEN 'MARKET_NEWS' THEN 'Property News'
    WHEN 'GUIDES' THEN 'Opinion & Commentary'
    WHEN 'DESIGN_LIFESTYLE' THEN 'Developers & Development'
    WHEN 'LEGAL' THEN 'Property Law'
    WHEN 'COMMERCIAL' THEN 'Market Analysis'
    ELSE 'News'
  END::"BlogCategory_new"
);

ALTER TYPE "BlogCategory" RENAME TO "BlogCategory_old";
ALTER TYPE "BlogCategory_new" RENAME TO "BlogCategory";
DROP TYPE "public"."BlogCategory_old";
COMMIT;
