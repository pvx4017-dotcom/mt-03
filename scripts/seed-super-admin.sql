-- Super Admin + ฟังก์ชันเปลี่ยนรหัสผ่าน Admin
-- รันใน Supabase SQL Editor สำหรับฐานข้อมูลที่มีอยู่แล้ว

CREATE OR REPLACE FUNCTION super_admin_set_admin_password(
  p_actor_id BIGINT,
  p_target_user_id BIGINT,
  p_new_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  actor users%ROWTYPE;
  target users%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM users WHERE id = p_actor_id;
  IF NOT FOUND OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีสิทธิ์เข้าถึง');
  END IF;

  SELECT * INTO target FROM users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบบัญชีผู้ดูแล');
  END IF;

  IF target.role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่ใช่บัญชีผู้ดูแล');
  END IF;

  IF p_new_password IS NULL OR length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  END IF;

  UPDATE users SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_target_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'เปลี่ยนรหัสผ่านแล้ว');
END; $$;

-- สร้าง/อัปเดตบัญชี Super Admin (ใช้ email เดียวกับ database.sql)
INSERT INTO users (username, email, phone, password_hash, role, referral_code, wallet_balance, credit, status)
VALUES (
  'superadmin',
  'superadmin@meta.local',
  NULL,
  crypt('superadmin123', gen_salt('bf')),
  'super_admin',
  '10000',
  0,
  0,
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  status = 'active';

-- ถ้าเคย seed เป็น superadmin@meta.com แล้ว ให้ promote บัญชีนั้นด้วย (เลือกรันถ้าจำเป็น):
-- UPDATE users SET role = 'super_admin', password_hash = crypt('superadmin123', gen_salt('bf')), status = 'active'
-- WHERE email IN ('superadmin@meta.com', 'superadmin@meta.local');

SELECT id, username, email, role, status FROM users WHERE role IN ('admin', 'super_admin') ORDER BY id;
