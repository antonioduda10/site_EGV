-- Add album support and manual ordering for photo gallery media.
CREATE TABLE "AlbumFoto" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "capaMidiaId" TEXT,
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AlbumFoto_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Midia"
ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "albumId" TEXT;

ALTER TABLE "Midia"
ADD CONSTRAINT "Midia_albumId_fkey"
FOREIGN KEY ("albumId") REFERENCES "AlbumFoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AlbumFoto"
ADD CONSTRAINT "AlbumFoto_capaMidiaId_fkey"
FOREIGN KEY ("capaMidiaId") REFERENCES "Midia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Midia_albumId_idx" ON "Midia"("albumId");
CREATE INDEX "Midia_ordem_idx" ON "Midia"("ordem");
CREATE INDEX "AlbumFoto_ordem_idx" ON "AlbumFoto"("ordem");
