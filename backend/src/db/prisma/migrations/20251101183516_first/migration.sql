/*
  Warnings:

  - The values [PARTIAL,REFUNDED] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `btcAddress` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `cancelUrl` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `memo` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `successUrl` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `blockHeight` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `confirmations` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Price` table. All the data in the column will be lost.
  - You are about to drop the column `prod_id` on the `Price` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - The `pubKey` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Otp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clerkId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `amount` on the `Invoice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `amount` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `amount` to the `Price` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `Price` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clerkId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."InvoiceStatus_new" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');
ALTER TABLE "public"."Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Invoice" ALTER COLUMN "status" TYPE "public"."InvoiceStatus_new" USING ("status"::text::"public"."InvoiceStatus_new");
ALTER TYPE "public"."InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "public"."InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "public"."InvoiceStatus_old";
ALTER TABLE "public"."Invoice" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_priceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Otp" DROP CONSTRAINT "Otp_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Price" DROP CONSTRAINT "Price_prod_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."WebhookEvent" DROP CONSTRAINT "WebhookEvent_invoiceId_fkey";

-- DropIndex
DROP INDEX "public"."Invoice_expiresAt_idx";

-- DropIndex
DROP INDEX "public"."Invoice_status_idx";

-- DropIndex
DROP INDEX "public"."Payment_status_idx";

-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "btcAddress",
DROP COLUMN "cancelUrl",
DROP COLUMN "customerEmail",
DROP COLUMN "customerName",
DROP COLUMN "memo",
DROP COLUMN "successUrl",
ADD COLUMN     "priceAmount" DECIMAL(20,8),
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "solAddress" TEXT,
ADD COLUMN     "txHash" TEXT,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "priceId" DROP NOT NULL,
DROP COLUMN "amount",
ADD COLUMN     "amount" DECIMAL(20,8) NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "blockHeight",
DROP COLUMN "confirmations",
DROP COLUMN "amount",
ADD COLUMN     "amount" DECIMAL(20,8) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Price" DROP COLUMN "price",
DROP COLUMN "prod_id",
ADD COLUMN     "amount" DECIMAL(20,8) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "productId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "expiresAt",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "isVerified",
DROP COLUMN "password",
ADD COLUMN     "clerkId" TEXT NOT NULL,
DROP COLUMN "pubKey",
ADD COLUMN     "pubKey" TEXT[];

-- DropTable
DROP TABLE "public"."Otp";

-- DropTable
DROP TABLE "public"."WebhookEvent";

-- DropEnum
DROP TYPE "public"."WebhookEventType";

-- DropEnum
DROP TYPE "public"."WebhookStatus";

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "public"."User"("clerkId");

-- AddForeignKey
ALTER TABLE "public"."Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
