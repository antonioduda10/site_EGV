-- Controla invalidação de sessão por usuário (deslogar forçado).
ALTER TABLE "Usuario"
ADD COLUMN "sessaoVersao" INTEGER NOT NULL DEFAULT 1;
