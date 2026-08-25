-- แก้ error: function gen_salt(unknown) does not exist
-- รันใน Supabase SQL Editor (ไม่ต้องรัน database.sql ใหม่ทั้งไฟล์)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION login_user(p_account TEXT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u users%ROWTYPE;
BEGIN
  SELECT * INTO u FROM users
  WHERE status = 'active'
    AND (email = p_account OR phone = p_account OR username = p_account)
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบบัญชีผู้ใช้');
  END IF;
  IF u.password_hash = crypt(p_password, u.password_hash) THEN
    RETURN jsonb_build_object('success', true, 'user_id', u.id, 'role', u.role, 'message', 'เข้าสู่ระบบสำเร็จ');
  END IF;
  RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านไม่ถูกต้อง');
END; $$;

CREATE OR REPLACE FUNCTION register_user(
  p_email TEXT, p_phone TEXT, p_password TEXT, p_confirm TEXT, p_invitation TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_code TEXT; v_ref TEXT; v_uid BIGINT; v_username TEXT; v_tries INT := 0;
BEGIN
  IF p_password IS NULL OR p_password <> p_confirm THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านไม่ตรงกัน');
  END IF;
  v_code := regexp_replace(COALESCE(p_invitation, ''), '\D', '', 'g');
  IF length(v_code) <> 5 THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสเชิญไม่ถูกต้อง');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM invitation_codes WHERE code = v_code AND is_active IS TRUE
  ) AND NOT EXISTS (
    SELECT 1 FROM users WHERE referral_code = v_code AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสเชิญไม่ถูกต้องหรือหมดอายุ');
  END IF;
  IF COALESCE(p_email, '') = '' AND COALESCE(p_phone, '') = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'กรุณากรอกอีเมลหรือเบอร์โทร');
  END IF;
  IF p_email IS NOT NULL AND p_email <> '' AND EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'message', 'อีเมลนี้ถูกใช้แล้ว');
  END IF;
  IF p_phone IS NOT NULL AND p_phone <> '' AND EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
    RETURN jsonb_build_object('success', false, 'message', 'เบอร์โทรนี้ถูกใช้แล้ว');
  END IF;
  LOOP
    v_tries := v_tries + 1;
    v_ref := lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = v_ref);
    IF v_tries > 20 THEN
      RETURN jsonb_build_object('success', false, 'message', 'ไม่สามารถสร้างรหัสเชิญได้ กรุณาลองใหม่');
    END IF;
  END LOOP;
  v_username := COALESCE(NULLIF(p_email, ''), NULLIF(p_phone, ''), 'user');
  INSERT INTO users (username, email, phone, password_hash, referral_code, referred_by, wallet_balance)
  VALUES (
    v_username,
    NULLIF(p_email, ''), NULLIF(p_phone, ''),
    crypt(p_password, gen_salt('bf')), v_ref, v_code, 0
  ) RETURNING id INTO v_uid;
  RETURN jsonb_build_object('success', true, 'message', 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', 'user_id', v_uid);
END; $$;

CREATE OR REPLACE FUNCTION verify_withdraw_password(p_user_id BIGINT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE h TEXT;
BEGIN
  SELECT withdraw_password_hash INTO h FROM users WHERE id = p_user_id;
  IF h IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF h = crypt(p_password, h) THEN RETURN jsonb_build_object('ok', true); END IF;
  RETURN jsonb_build_object('ok', false);
END; $$;

CREATE OR REPLACE FUNCTION update_user_password(p_user_id BIGINT, p_current TEXT, p_new TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u users%ROWTYPE;
BEGIN
  SELECT * INTO u FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'ไม่พบผู้ใช้'); END IF;
  IF u.password_hash <> crypt(p_current, u.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
  END IF;
  UPDATE users SET password_hash = crypt(p_new, gen_salt('bf')) WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'เปลี่ยนรหัสผ่านแล้ว');
END; $$;

CREATE OR REPLACE FUNCTION set_user_withdraw_password(p_user_id BIGINT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF p_password !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนต้องเป็นตัวเลข 6 หลัก');
  END IF;
  UPDATE users SET withdraw_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_user_id AND withdraw_password_hash IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'มีรหัสการถอนอยู่แล้ว กรุณายืนยันรหัสเดิมก่อนเปลี่ยน');
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'บันทึกรหัสการถอนแล้ว');
END; $$;

CREATE OR REPLACE FUNCTION change_user_withdraw_password(p_user_id BIGINT, p_current_password TEXT, p_new_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE h TEXT;
BEGIN
  IF p_new_password !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนใหม่ต้องเป็นตัวเลข 6 หลัก');
  END IF;
  SELECT withdraw_password_hash INTO h FROM users WHERE id = p_user_id FOR UPDATE;
  IF h IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'ยังไม่ได้ตั้งรหัสการถอน'); END IF;
  IF h <> crypt(p_current_password, h) THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนเดิมไม่ถูกต้อง');
  END IF;
  UPDATE users SET withdraw_password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'เปลี่ยนรหัสการถอนแล้ว');
END; $$;

CREATE OR REPLACE FUNCTION admin_set_user_withdraw_password(p_actor_id BIGINT, p_target_user_id BIGINT, p_new_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE actor users%ROWTYPE; target users%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM users WHERE id = p_actor_id;
  IF NOT FOUND OR actor.role NOT IN ('admin', 'super_admin') OR actor.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีสิทธิ์เปลี่ยนรหัสการถอน');
  END IF;
  SELECT * INTO target FROM users WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'ไม่พบผู้ใช้'); END IF;
  IF target.role IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่สามารถเปลี่ยนรหัสของบัญชีผู้ดูแลได้');
  END IF;
  IF p_new_password !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนใหม่ต้องเป็นตัวเลข 6 หลัก');
  END IF;
  UPDATE users SET withdraw_password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_target_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'ผู้ดูแลเปลี่ยนรหัสการถอนแล้ว');
END; $$;

CREATE OR REPLACE FUNCTION admin_set_user_password(p_user_id BIGINT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านว่าง');
  END IF;
  UPDATE users SET password_hash = crypt(p_password, gen_salt('bf')) WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'เปลี่ยนรหัสผ่านแล้ว');
END; $$;

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
