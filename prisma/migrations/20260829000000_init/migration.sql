-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MedStatus" AS ENUM ('RECEIVED', 'COLLECTING_DATA', 'MISSING_EVIDENCE', 'READY_TO_GENERATE', 'DEFENSE_GENERATED', 'READY_TO_SUBMIT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MedReason" AS ENUM ('UNRECOGNIZED_TRANSACTION', 'PRODUCT_NOT_RECEIVED', 'PRODUCT_NOT_AS_DESCRIBED', 'FRAUD_SCAM', 'FRAUD_COERCION', 'FRAUD_ACCOUNT_TAKEOVER', 'DUPLICATE_CHARGE', 'OPERATIONAL_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'DIGITAL', 'SERVICE', 'SUBSCRIPTION', 'TICKET', 'INFOPRODUCT', 'MARKETPLACE', 'SAAS', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('MANUAL', 'API', 'WEBHOOK', 'SHOPIFY', 'TRACKING_PROVIDER', 'PAYMENT_PROVIDER', 'ANTIFRAUD', 'ERP', 'MERCHANT', 'SYSTEM_DERIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'POSTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('INVOICE', 'DELIVERY_RECEIPT', 'TRANSACTION_RECEIPT', 'CONTRACT', 'SCREENSHOT', 'LOG_EXPORT', 'DEFENSE_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Med" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "merchantId" TEXT,
    "medId" TEXT NOT NULL,
    "transactionId" TEXT,
    "endToEndId" TEXT,
    "pixId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "transactionAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL,
    "responseDeadlineAt" TIMESTAMP(3),
    "reason" "MedReason" NOT NULL,
    "reasonDescription" TEXT,
    "requestingInstitution" TEXT,
    "productType" "ProductType",
    "status" "MedStatus" NOT NULL DEFAULT 'RECEIVED',
    "payer" JSONB NOT NULL,
    "payerAddress" JSONB,
    "payerIp" TEXT,
    "payerDevice" TEXT,
    "merchantName" TEXT,
    "additionalInformation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Med_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "externalId" TEXT,
    "endToEndId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "method" TEXT,
    "status" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "identification" JSONB NOT NULL,
    "address" JSONB,
    "accountCreatedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "externalId" TEXT,
    "productType" "ProductType" NOT NULL,
    "items" JSONB NOT NULL,
    "totalAmountCents" INTEGER,
    "placedAt" TIMESTAMP(3),
    "checkoutIp" TEXT,
    "deviceFingerprint" TEXT,
    "userAgent" TEXT,
    "shippingAddress" JSONB,
    "provider" TEXT,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingCode" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "postedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "receiverName" TEXT,
    "events" JSONB NOT NULL,
    "source" "EvidenceSource" NOT NULL,
    "sourceProvider" TEXT,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "displayValue" TEXT,
    "source" "EvidenceSource" NOT NULL,
    "sourceProvider" TEXT,
    "sourceReference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "documentId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "source" "EvidenceSource" NOT NULL,
    "sourceReference" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "scoreTotal" INTEGER NOT NULL,
    "scoreMax" INTEGER NOT NULL,
    "claimCount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "Defense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "defenseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "documentIds" TEXT[],
    "submittedAt" TIMESTAMP(3),
    "providerReference" TEXT,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT,
    "source" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "organizationId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("organizationId","scope","key")
);

-- CreateIndex
CREATE INDEX "Med_organizationId_status_idx" ON "Med"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Med_organizationId_responseDeadlineAt_idx" ON "Med"("organizationId", "responseDeadlineAt");

-- CreateIndex
CREATE INDEX "Med_organizationId_openedAt_idx" ON "Med"("organizationId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Med_organizationId_medId_key" ON "Med"("organizationId", "medId");

-- CreateIndex
CREATE UNIQUE INDEX "MedTransaction_medId_key" ON "MedTransaction"("medId");

-- CreateIndex
CREATE INDEX "MedTransaction_organizationId_idx" ON "MedTransaction"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_medId_key" ON "Customer"("medId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_medId_key" ON "Order"("medId");

-- CreateIndex
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tracking_medId_key" ON "Tracking"("medId");

-- CreateIndex
CREATE INDEX "Tracking_organizationId_idx" ON "Tracking"("organizationId");

-- CreateIndex
CREATE INDEX "Tracking_trackingCode_idx" ON "Tracking"("trackingCode");

-- CreateIndex
CREATE INDEX "Evidence_organizationId_medId_idx" ON "Evidence"("organizationId", "medId");

-- CreateIndex
CREATE INDEX "Evidence_medId_type_idx" ON "Evidence"("medId", "type");

-- CreateIndex
CREATE INDEX "Document_organizationId_medId_idx" ON "Document"("organizationId", "medId");

-- CreateIndex
CREATE INDEX "Defense_organizationId_medId_idx" ON "Defense"("organizationId", "medId");

-- CreateIndex
CREATE UNIQUE INDEX "Defense_medId_version_key" ON "Defense"("medId", "version");

-- CreateIndex
CREATE INDEX "Submission_organizationId_medId_idx" ON "Submission"("organizationId", "medId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_medId_idx" ON "AuditLog"("organizationId", "medId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_occurredAt_idx" ON "AuditLog"("organizationId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Med" ADD CONSTRAINT "Med_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedTransaction" ADD CONSTRAINT "MedTransaction_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracking" ADD CONSTRAINT "Tracking_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defense" ADD CONSTRAINT "Defense_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

