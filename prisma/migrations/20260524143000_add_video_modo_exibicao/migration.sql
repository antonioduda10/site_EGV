-- Add display mode selector for linked videos.
ALTER TABLE "VideoGaleria"
ADD COLUMN "modoExibicao" TEXT NOT NULL DEFAULT 'AUTO';
