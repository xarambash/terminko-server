ALTER TABLE "resource_free_days" RENAME COLUMN "date" TO "start_date";
ALTER TABLE "resource_free_days" ADD COLUMN "end_date" DATE NOT NULL DEFAULT CURRENT_DATE;
UPDATE "resource_free_days" SET "end_date" = "start_date";
ALTER TABLE "resource_free_days" ALTER COLUMN "end_date" DROP DEFAULT;
