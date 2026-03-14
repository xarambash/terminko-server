/*
  Warnings:

  - Made the column `email` on table `guests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `guests` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "guests" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;
