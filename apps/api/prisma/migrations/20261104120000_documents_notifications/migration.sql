-- CreateEnum
CREATE TYPE "DocLocale" AS ENUM ('uz', 'ru');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SHARTNOMA', 'HISOB_FAKTURA', 'YUK_XATI', 'AKT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('YARATILDI', 'IMZOLANDI', 'BEKOR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_AWAITING_ADVANCE', 'ORDER_TO_PICK', 'ORDER_SHIPPED', 'PAYMENT_TO_CONFIRM', 'PAYMENT_REJECTED', 'PRICE_APPROVAL', 'DEBT_DUE_SOON', 'DEBT_OVERDUE', 'LOW_STOCK');

-- CreateEnum
CREATE TYPE "NotificationEntity" AS ENUM ('ORDER', 'PAYMENT', 'PRODUCT');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "aktPrefix" TEXT NOT NULL DEFAULT 'AKT',
ADD COLUMN     "bankAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankMfo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "director" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "docLocale" "DocLocale" NOT NULL DEFAULT 'uz',
ADD COLUMN     "hisobFakturaPrefix" TEXT NOT NULL DEFAULT 'HF',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shartnomaPrefix" TEXT NOT NULL DEFAULT 'SH',
ADD COLUMN     "yukXatiPrefix" TEXT NOT NULL DEFAULT 'YX';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "telegramLinkHash" TEXT;

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "locale" "DocLocale" NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCounter" (
    "organizationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("organizationId","type","year")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "number" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "locale" "DocLocale" NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'YARATILDI',
    "createdById" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "entity" "NotificationEntity",
    "entityId" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "telegramSentAt" TIMESTAMP(3),
    "telegramTries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTemplate_organizationId_type_locale_idx" ON "DocumentTemplate"("organizationId", "type", "locale");

-- CreateIndex
CREATE INDEX "Document_organizationId_type_createdAt_idx" ON "Document"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Document_orderId_idx" ON "Document"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_organizationId_number_key" ON "Document"("organizationId", "number");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_telegramSentAt_createdAt_idx" ON "Notification"("telegramSentAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramLinkHash_key" ON "User"("telegramLinkHash");

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCounter" ADD CONSTRAINT "DocumentCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

