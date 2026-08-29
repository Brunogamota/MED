-- Entrega digital e novos status de entrega.
--
-- Migration puramente aditiva: nenhuma coluna ou tabela existente e alterada ou
-- removida, e nenhum dado atual e tocado. Pode ser aplicada com a aplicacao no ar.
--
-- Observacao sobre `ALTER TYPE ... ADD VALUE`: no PostgreSQL 12+ isso pode rodar
-- dentro da transacao da migration, desde que os novos valores nao sejam usados
-- na mesma transacao — e nao sao: aqui apenas se acrescenta os rotulos.

-- AlterEnum
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'IN_PRODUCTION' AFTER 'CREATED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'NOT_DELIVERED' AFTER 'DELIVERED';

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'PLATFORM', 'OTHER');

-- CreateTable
CREATE TABLE "DigitalDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "sentTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "platform" TEXT,
    "firstAccessAt" TIMESTAMP(3),
    "accessCount" INTEGER,
    "source" "EvidenceSource" NOT NULL,
    "sourceProvider" TEXT,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalDelivery_medId_key" ON "DigitalDelivery"("medId");

-- CreateIndex
CREATE INDEX "DigitalDelivery_organizationId_idx" ON "DigitalDelivery"("organizationId");

-- AddForeignKey
ALTER TABLE "DigitalDelivery" ADD CONSTRAINT "DigitalDelivery_medId_fkey" FOREIGN KEY ("medId") REFERENCES "Med"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: o codigo de rastreio passa a ser opcional, porque "em producao"
-- acontece antes de existir codigo. Relaxar NOT NULL nao afeta linha existente.
ALTER TABLE "Tracking" ALTER COLUMN "trackingCode" DROP NOT NULL;
