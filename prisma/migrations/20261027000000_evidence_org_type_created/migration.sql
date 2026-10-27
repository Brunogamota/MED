-- Lista de comprovantes gerados (mais novos primeiro). Só um índice novo.
CREATE INDEX "Evidence_organizationId_type_createdAt_idx" ON "Evidence"("organizationId", "type", "createdAt");
