-- Permite direcionar mensagens de contato para perfis específicos no painel.
ALTER TABLE "SugestaoContato"
ADD COLUMN IF NOT EXISTS "perfilDestino" TEXT;

CREATE INDEX IF NOT EXISTS "SugestaoContato_perfilDestino_idx"
ON "SugestaoContato"("perfilDestino");
