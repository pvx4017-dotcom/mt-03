-- Patch live DB: เก็บ URL LINE OA ของผู้ดูแล สำหรับเมนู LINE ฝั่งลูกค้า
-- รันใน Supabase SQL Editor ได้ถ้าต้องการเก็บใน commission_settings
-- Safe to re-run.
-- ถ้ายังไม่รัน ระบบจะเก็บลิงก์ LINE แบบสำรองให้อัตโนมัติอยู่แล้ว

ALTER TABLE commission_settings
  ADD COLUMN IF NOT EXISTS line_url TEXT NOT NULL DEFAULT '';
