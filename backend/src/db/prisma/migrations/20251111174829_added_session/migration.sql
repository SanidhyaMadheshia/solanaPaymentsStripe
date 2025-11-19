-- CreateEnum
CREATE TYPE "public"."CheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."CheckoutSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "buyerWallet" TEXT,
    "buyerEmail" TEXT,
    "successUrl" TEXT,
    "cancelUrl" TEXT,
    "status" "public"."CheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_sessionKey_key" ON "public"."CheckoutSession"("sessionKey");

-- CreateIndex
CREATE INDEX "CheckoutSession_userId_idx" ON "public"."CheckoutSession"("userId");

-- CreateIndex
CREATE INDEX "CheckoutSession_invoiceId_idx" ON "public"."CheckoutSession"("invoiceId");

-- AddForeignKey
ALTER TABLE "public"."CheckoutSession" ADD CONSTRAINT "CheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CheckoutSession" ADD CONSTRAINT "CheckoutSession_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
