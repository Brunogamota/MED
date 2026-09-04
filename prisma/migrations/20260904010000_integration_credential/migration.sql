-- Credencial de conector por organizacao. O segredo entra cifrado; a chave
-- fica no ambiente, para que um dump do banco sozinho nao abra nada.
CREATE TABLE "IntegrationCredential" (
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "accountLabel" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("organizationId","provider")
);
