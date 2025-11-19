/*
  Warnings:

  - Added the required column `txHash` to the `CheckoutSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."CheckoutSession" ADD COLUMN     "txHash" TEXT NOT NULL;
