-- สินค้าของลูกค้า + ตะกร้าแอดมิน (ทดสอบ flow สั่งซื้อ)
-- รันใน Supabase SQL Editor ถ้าหน้า "สินค้าของลูกค้า" / ตะกร้าแอดมินว่าง
--
-- เงื่อนไข: มีลูกค้าใน users และมีสินค้าใน store_products แล้ว
-- สร้างร้านลูกค้า (ถ้ายังไม่มี) + mirror สินค้าจากแคตตาล็อกแอดมิน

-- 1) เปิดร้านให้ลูกค้าคนแรกที่ role = customer (หรือ id = 2 ถ้ามี)
INSERT INTO customer_stores (user_id, shop_name, shop_image, sold_count, created_at)
SELECT u.id, 'ร้านทดสอบ ' || u.id, 'logo/shop logo.webp', 0, NOW()
FROM users u
WHERE u.role = 'customer'
ORDER BY u.id
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- 2) คัดลอกสินค้าจาก store_products ไป customer_store_products_mirror (10 รายการแรก)
INSERT INTO customer_store_products_mirror (
  user_id,
  source_product_id,
  catalog_source,
  product_name,
  shop_name,
  product_category,
  product_image,
  product_images,
  product_price,
  product_stock,
  view_count,
  trust_score,
  sales_volume,
  created_at
)
SELECT
  cs.user_id,
  sp.id,
  'admin',
  sp.product_name,
  sp.shop_name,
  sp.product_category,
  sp.product_image,
  sp.product_images,
  sp.product_price,
  sp.product_stock,
  sp.view_count,
  sp.trust_score,
  sp.sales_volume,
  NOW()
FROM customer_stores cs
CROSS JOIN LATERAL (
  SELECT *
  FROM store_products
  ORDER BY id
  LIMIT 10
) sp
WHERE NOT EXISTS (
  SELECT 1
  FROM customer_store_products_mirror m
  WHERE m.user_id = cs.user_id
    AND m.source_product_id = sp.id
);

SELECT
  (SELECT COUNT(*) FROM customer_stores) AS customer_stores,
  (SELECT COUNT(*) FROM customer_store_products_mirror) AS mirror_products,
  (SELECT COUNT(*) FROM admin_cart_orders WHERE status = 'pending') AS admin_cart_pending;
