-- Supabase Storage bucket "uploads" สำหรับรูปที่ไม่ใช่สินค้า/ร้าน
-- ใช้กับ: แชท, KYC, หมวดหมู่, สไลด์
-- รูปสินค้า / ร้านค้า เก็บใน public/images ของโปรเจกต์ — ไม่ใส่ใน Storage
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
