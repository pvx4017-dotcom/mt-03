-- Supabase Storage bucket "uploads"
-- ใช้กับ: แชท, KYC, หมวดหมู่, สไลด์, รูปร้านค้า, สินค้าที่อัปโหลดใหม่
-- สินค้าเดิมในแคตตาล็อกยังเสิร์ฟจาก public/images ของโปรเจกต์ (path images/store_product_...)
--
-- รันใน Supabase SQL Editor ของโปรเจกต์ใหม่ (ครั้งเดียว)

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS meta_uploads_select ON storage.objects;
DROP POLICY IF EXISTS meta_uploads_insert ON storage.objects;
DROP POLICY IF EXISTS meta_uploads_update ON storage.objects;
DROP POLICY IF EXISTS meta_uploads_delete ON storage.objects;

CREATE POLICY meta_uploads_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'uploads');

CREATE POLICY meta_uploads_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY meta_uploads_update ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'uploads')
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY meta_uploads_delete ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'uploads');
