-- Conta Master: como reconhecer cada empresa (nomes, CNPJs, chaves Pix,
-- prefixos de pedido) e a cor da marca do modelo automático. Colunas novas,
-- com default/opcionais. Não mexe em dado existente.
ALTER TABLE "Organization" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Organization" ADD COLUMN "brandColor" TEXT;
