-- Add encryption metadata columns for AES-256-GCM support
-- encryption_iv: base64-encoded 16-byte initialization vector
-- encryption_tag: base64-encoded 16-byte GCM authentication tag
-- key_version: integer for future key rotation (default 1)
ALTER TABLE "broker_connections"
  ADD COLUMN "encryption_iv" varchar(64) NOT NULL DEFAULT 'stub',
  ADD COLUMN "encryption_tag" varchar(64) NOT NULL DEFAULT 'stub',
  ADD COLUMN "key_version" integer DEFAULT 1 NOT NULL;

-- Remove the stub defaults once existing rows are handled
-- (existing stub-encrypted rows keep 'stub' values; new rows will always supply real values)
