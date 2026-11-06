-- Add option to open home "Nossa História" button in a new tab.
ALTER TABLE "ConfiguracaoSite"
ADD COLUMN "botaoHistoriaNovaAba" BOOLEAN NOT NULL DEFAULT false;
