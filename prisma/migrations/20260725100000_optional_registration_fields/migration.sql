-- Ensure WhatsApp number, website, and company logo stay optional on registration.
-- These columns were already nullable in init; this migration makes that explicit
-- and safe to re-apply on environments that may have altered constraints.

ALTER TABLE "User" ALTER COLUMN "whatsappNumber" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "website" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "companyLogo" DROP NOT NULL;
