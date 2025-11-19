/*
  Warnings:

  - You are about to drop the column `sessionKey` on the `CheckoutSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."CheckoutSession_sessionKey_key";

-- AlterTable
ALTER TABLE "public"."CheckoutSession" DROP COLUMN "sessionKey";
