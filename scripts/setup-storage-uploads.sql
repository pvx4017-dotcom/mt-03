-- OPTIONAL: Storage bucket สำหรับแชท/KYC เท่านั้น
-- รูปสินค้า / ร้านค้า / หมวด / สไลด์ เก็บใน public/ ของโปรเจกต์แล้ว ไม่ต้องใช้ Storage
--
-- โปรเจกต์ใหม่แนะนำ: ข้ามไฟล์นี้ไปก่อน เพื่อไม่ให้โควตา Storage เต็มอีก
-- รันเฉพาะเมื่อต้องการอัปโหลดแชท/KYC ขึ้น Supabase จริงๆ
-- (ตอนนี้แอปอัปโหลดแชท/KYC ลง public/ ตอน yarn dev แล้ว)

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
