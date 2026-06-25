-- แก้บัญชี Super Admin ให้ login ได้ (รันใน Supabase SQL Editor)
-- ใช้เมื่อ seed เก่าใช้ superadmin@meta.com / Superadmin123 แต่ login ไม่ได้

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

UPDATE users
SET
  role = 'super_admin',
  password_hash = crypt('Superadmin123', gen_salt('bf')),
  status = 'active'
WHERE email IN ('superadmin@meta.local', 'superadmin@meta.com');

INSERT INTO users (username, email, phone, password_hash, role, referral_code, wallet_balance, credit, status)
SELECT
  'superadmin',
  'superadmin@meta.local',
  NULL,
  crypt('Superadmin123', gen_salt('bf')),
  'super_admin',
  '10000',
  0,
  0,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'superadmin@meta.local' AND role = 'super_admin'
);

SELECT id, username, email, role, status FROM users WHERE role IN ('admin', 'super_admin') ORDER BY id;
