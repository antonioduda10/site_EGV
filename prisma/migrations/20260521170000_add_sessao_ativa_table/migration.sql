-- Tabela para rastrear sessões ativas (presença online) no painel admin.
CREATE TABLE IF NOT EXISTS "SessaoAtiva" (
  "usuarioId" TEXT NOT NULL,
  "sessaoVersao" INTEGER NOT NULL DEFAULT 1,
  "ultimoPingEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessaoAtiva_pkey" PRIMARY KEY ("usuarioId"),
  CONSTRAINT "SessaoAtiva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SessaoAtiva_ultimoPingEm_idx" ON "SessaoAtiva"("ultimoPingEm");
