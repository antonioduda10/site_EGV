-- Keep migration history consistent for shadow database validation.
ALTER TABLE "SugestaoContato"
ADD COLUMN IF NOT EXISTS "perfilDestino" TEXT;

-- Ensure index exists before older migration drops it.
CREATE INDEX IF NOT EXISTS "SugestaoContato_perfilDestino_idx"
ON "SugestaoContato"("perfilDestino");
