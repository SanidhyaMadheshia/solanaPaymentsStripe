/*
  Warnings:

  - You are about to drop the column `userId` on the `CheckoutSession` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CheckoutSession" DROP CONSTRAINT "CheckoutSession_userId_fkey";

-- DropIndex
DROP INDEX "public"."CheckoutSession_userId_idx";

-- AlterTable
ALTER TABLE "public"."CheckoutSession" DROP COLUMN "userId";
