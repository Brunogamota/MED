-- Tentativas de login falhas por origem. No banco porque cada instancia
-- serverless tem a propria memoria, e contador em memoria nao segura forca
-- bruta contra uma senha unica.
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);
