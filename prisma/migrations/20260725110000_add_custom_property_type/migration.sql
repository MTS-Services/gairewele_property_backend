-- Allow free-text custom property type when propertyType = OTHERS
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "customPropertyType" TEXT;
ALTER TABLE "PropertyRequest" ADD COLUMN IF NOT EXISTS "customPropertyType" TEXT;
