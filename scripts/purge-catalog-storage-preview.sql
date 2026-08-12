-- Preview catalog objects in Storage (no delete)

SELECT COUNT(*) AS catalog_objects
FROM storage.objects
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

SELECT name, created_at
FROM storage.objects
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
  )
ORDER BY created_at DESC
LIMIT 50;
