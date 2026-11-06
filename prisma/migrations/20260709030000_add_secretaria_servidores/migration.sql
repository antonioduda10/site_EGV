CREATE TABLE "SecretariaServidor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "descricao" TEXT,
    "fotoUrl" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretariaServidor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecretariaServidor_ativo_ordem_idx" ON "SecretariaServidor"("ativo", "ordem");
CREATE INDEX "SecretariaServidor_ordem_idx" ON "SecretariaServidor"("ordem");
