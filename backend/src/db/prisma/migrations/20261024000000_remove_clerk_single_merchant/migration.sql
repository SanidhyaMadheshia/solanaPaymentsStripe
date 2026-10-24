-- AlterEnum
ALTER TYPE "public"."CheckoutStatus" ADD VALUE 'FAILED';

-- DropIndex
DROP INDEX "public"."User_clerkId_key";

-- AlterTable
ALTER TABLE "public"."ApiKey" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "prefix" TEXT;

-- AlterTable
ALTER TABLE "public"."CheckoutSession" DROP COLUMN "socketid",
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "txSignature" TEXT,
ADD COLUMN     "verifyError" TEXT;

-- AlterTable
ALTER TABLE "public"."Invoice" ADD COLUMN     "buyerWallet" TEXT,
ADD COLUMN     "webhookAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "webhookDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "webhookLastError" TEXT,
ADD COLUMN     "webhookNextAttemptAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Price" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "clerkId",
ADD COLUMN     "defaultWebhookUrl" TEXT,
ADD COLUMN     "walletAddress" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_txSignature_key" ON "public"."CheckoutSession"("txSignature");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "public"."Invoice"("createdAt");

-- Single-merchant model: create the default merchant and move all existing
-- data to it. Previous Clerk-backed users are kept (not deleted) but unused.
INSERT INTO "public"."User" ("id", "name", "pubKey", "createdAt", "updatedAt")
VALUES ('default', 'My Store', ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "public"."ApiKey"  SET "userId" = 'default' WHERE "userId" <> 'default';
UPDATE "public"."Product" SET "userId" = 'default' WHERE "userId" <> 'default';
UPDATE "public"."Invoice" SET "userId" = 'default' WHERE "userId" <> 'default';
