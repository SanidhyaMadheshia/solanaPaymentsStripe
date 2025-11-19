/*
  Warnings:

  - You are about to drop the column `cancelUrl` on the `CheckoutSession` table. All the data in the column will be lost.
  - You are about to drop the column `successUrl` on the `CheckoutSession` table. All the data in the column will be lost.
  - Made the column `buyerWallet` on table `CheckoutSession` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."CheckoutSession" DROP COLUMN "cancelUrl",
DROP COLUMN "successUrl",
ALTER COLUMN "buyerWallet" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Invoice" ADD COLUMN     "buyerEmail" TEXT;
