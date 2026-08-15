-- Run once in the Supabase SQL editor for an existing project.
-- Users must verify the old withdrawal PIN; admins can reset it after support verification.

CREATE OR REPLACE FUNCTION public.set_user_withdraw_password(p_user_id BIGINT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_password !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนต้องเป็นตัวเลข 6 หลัก');
  END IF;
  UPDATE public.users
  SET withdraw_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_user_id AND withdraw_password_hash IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'มีรหัสการถอนอยู่แล้ว กรุณายืนยันรหัสเดิมก่อนเปลี่ยน');
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'บันทึกรหัสการถอนแล้ว');
END;
$$;

CREATE OR REPLACE FUNCTION public.change_user_withdraw_password(
  p_user_id BIGINT,
  p_current_password TEXT,
  p_new_password TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE h TEXT;
BEGIN
  IF p_new_password !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนใหม่ต้องเป็นตัวเลข 6 หลัก');
  END IF;
  SELECT withdraw_password_hash INTO h
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  IF h IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'ยังไม่ได้ตั้งรหัสการถอน');
  END IF;
  IF h <> crypt(p_current_password, h) THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนเดิมไม่ถูกต้อง');
  END IF;
  UPDATE public.users
  SET withdraw_password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'เปลี่ยนรหัสการถอนแล้ว');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_withdraw_password(
  p_actor_id BIGINT,
  p_target_user_id BIGINT,
  p_new_password TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE actor public.users%ROWTYPE; target public.users%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = p_actor_id;
  IF NOT FOUND OR actor.role NOT IN ('admin', 'super_admin') OR actor.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีสิทธิ์เปลี่ยนรหัสการถอน');
  END IF;
  SELECT * INTO target FROM public.users WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบผู้ใช้');
  END IF;
  IF target.role IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่สามารถเปลี่ยนรหัสของบัญชีผู้ดูแลได้');
  END IF;
  IF p_new_password !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสการถอนใหม่ต้องเป็นตัวเลข 6 หลัก');
  END IF;
  UPDATE public.users
  SET withdraw_password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_target_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'ผู้ดูแลเปลี่ยนรหัสการถอนแล้ว');
END;
$$;

NOTIFY pgrst, 'reload schema';
