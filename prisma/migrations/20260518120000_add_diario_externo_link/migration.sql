-- Add configurable external diary URL for admin panel and sidebar shortcuts.
ALTER TABLE "ConfiguracaoSite"
ADD COLUMN "diarioExternoLink" TEXT;
