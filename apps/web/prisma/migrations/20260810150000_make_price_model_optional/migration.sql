-- AlterColumn: make priceModel optional (previously required)
ALTER TABLE "availability" ALTER COLUMN "price_model" DROP NOT NULL;

