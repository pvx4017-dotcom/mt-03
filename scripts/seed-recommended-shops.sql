-- ร้านค้าแนะนำ (reference: admin/recommended-shops)
-- รันใน Supabase SQL Editor ถ้าหน้า "ร้านค้าแนะนำ" ว่าง

INSERT INTO shops (id, shop_name, shop_image, review_count, view_count, trust_score, sales_volume, is_recommended, created_at)
VALUES
  (101, 'Adam Online Shopping', 'images/shop_adam_online_shopping_1776768680396.jpg', 87675, 356688, 100, 5769644, true, '2026-04-21 10:26:17'::timestamptz),
  (102, 'JJ Mobile', 'images/shop_jj_mobile_1778165606908.jpg', 3548, 6876, 99.9, 6541, true, '2026-04-21 10:27:00'::timestamptz),
  (103, 'MJ shopping', 'images/shop_mj_shopping_1777911062301.jpg', 1567, 5643, 99.9, 3421, true, '2026-05-04 16:10:35'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  shop_name = EXCLUDED.shop_name,
  shop_image = EXCLUDED.shop_image,
  review_count = EXCLUDED.review_count,
  view_count = EXCLUDED.view_count,
  trust_score = EXCLUDED.trust_score,
  sales_volume = EXCLUDED.sales_volume,
  is_recommended = EXCLUDED.is_recommended;

SELECT setval('shops_id_seq', (SELECT MAX(id) FROM shops));
