ALTER TABLE "Property"
ALTER COLUMN "size" TYPE INTEGER
USING regexp_replace("size", '[^0-9]', '', 'g')::INTEGER;