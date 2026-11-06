ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "image_data" bytea;
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "mime_type" text DEFAULT 'image/jpeg' NOT NULL;
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "size_bytes" integer;
