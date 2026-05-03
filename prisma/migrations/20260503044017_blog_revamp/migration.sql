/*
  Warnings:

  - The values [PROPERTY_NEWS,MARKET_INTELLIGENCE,ARCHITECTURE] on the enum `BlogCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isPublished` on the `Blog` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
BEGIN;
CREATE TYPE "BlogCategory_new" AS ENUM ('BUY', 'RENT', 'INVEST', 'MARKET_NEWS', 'GUIDES', 'DESIGN_LIFESTYLE', 'LEGAL', 'COMMERCIAL');
ALTER TABLE "Blog" ALTER COLUMN "category" TYPE "BlogCategory_new" USING ("category"::text::"BlogCategory_new");
ALTER TYPE "BlogCategory" RENAME TO "BlogCategory_old";
ALTER TYPE "BlogCategory_new" RENAME TO "BlogCategory";
DROP TYPE "public"."BlogCategory_old";
COMMIT;

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "isPublished",
ADD COLUMN     "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;
