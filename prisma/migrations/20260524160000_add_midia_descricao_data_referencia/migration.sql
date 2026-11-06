-- Add optional metadata for media gallery items.
ALTER TABLE "Midia"
ADD COLUMN "descricao" TEXT,
ADD COLUMN "dataReferencia" TIMESTAMP(3);
