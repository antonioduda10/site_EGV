-- Add manual ordering for linked videos in the public gallery.
ALTER TABLE "VideoGaleria"
ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

WITH ordered_videos AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "dataPublicacao" DESC, "id" ASC) - 1 AS position
  FROM "VideoGaleria"
)
UPDATE "VideoGaleria"
SET "ordem" = ordered_videos.position
FROM ordered_videos
WHERE "VideoGaleria"."id" = ordered_videos."id";

CREATE INDEX "VideoGaleria_ordem_idx" ON "VideoGaleria"("ordem");
