-- WARNING:
-- SQL DELETE only removes rows in storage.objects (metadata).
-- The real files in the Storage backend stay as ORPHANS and STILL COUNT toward quota.
-- That is why Usage can stay "full" after this script succeeds.
--
-- Prefer deleting via Storage API / Dashboard when the project is not quota-locked:
--   yarn images:purge-storage
--
-- If you already ran SQL delete and quota is still full:
--   open a Supabase support ticket and ask infra to clean orphaned storage objects.
--
-- This script is kept only as a last-resort metadata cleanup.

BEGIN;

SET LOCAL storage.allow_delete_query = 'true';

DELETE FROM storage.objects
WHERE bucket_id = 'uploads'
  AND (
    name LIKE 'images/%'
    OR name LIKE 'uploads/products/%'
    OR name LIKE 'uploads/shops/%'
    OR name LIKE 'uploads/categories/%'
    OR name LIKE 'uploads/slides/%'
    OR name LIKE 'products/%'
    OR name LIKE 'shops/%'
    OR name LIKE 'categories/%'
    OR name LIKE 'slides/%'
    OR name LIKE 'stores/%'
  );

COMMIT;
