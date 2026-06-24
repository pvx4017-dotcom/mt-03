-- Supabase Storage: bucket "uploads" + policy สำหรับอัปโหลดรูปร้าน / KYC / แชท
-- รันใน Supabase SQL Editor ถ้าเปิดร้านแล้วขึ้น "อัปโหลดรูปร้านไม่สำเร็จ"
--
-- สาเหตุทั่วไป: ยังไม่มี bucket หรือไม่มี policy ให้ role anon/authenticated เขียนไฟล์

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
