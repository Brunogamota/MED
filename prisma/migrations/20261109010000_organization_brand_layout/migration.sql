-- Modelo automático: cada empresa nova ganha um desenho de comprovante que as
-- outras não usam, além da cor. Coluna nova, opcional.
ALTER TABLE "Organization" ADD COLUMN "brandLayout" TEXT;
