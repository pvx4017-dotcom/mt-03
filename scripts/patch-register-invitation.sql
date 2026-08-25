-- Patch live DB: รับรหัสเชิญจากทั้ง invitation_codes และ users.referral_code
-- รันใน Supabase SQL Editor (ไม่ต้องรัน database.sql ใหม่ทั้งไฟล์)
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS invitation_codes (
  code        TEXT PRIMARY KEY,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO invitation_codes (code) VALUES ('12345'), ('88888'), ('99999')
ON CONFLICT (code) DO NOTHING;

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

CREATE OR REPLACE FUNCTION get_user_profile(p_user_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u users%ROWTYPE; b bank_accounts%ROWTYPE; w user_payout_wallets%ROWTYPE;
BEGIN
  SELECT * INTO u FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'ไม่พบผู้ใช้'); END IF;
  SELECT * INTO b FROM bank_accounts WHERE user_id = p_user_id ORDER BY id DESC LIMIT 1;
  SELECT * INTO w FROM user_payout_wallets WHERE user_id = p_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', u.id, 'username', u.username, 'email', u.email, 'phone', u.phone,
      'role', u.role, 'referral_code', u.referral_code,
      'credit', u.credit, 'wallet_balance', u.wallet_balance,
      'points', COALESCE(u.points, 0),
      'is_bank_linked', b.id IS NOT NULL,
      'has_withdraw_password', u.withdraw_password_hash IS NOT NULL,
      'bank_account', CASE WHEN b.id IS NULL AND w.user_id IS NULL THEN NULL ELSE jsonb_build_object(
        'account_name', b.account_name, 'account_number', b.account_number, 'bank_name', b.bank_name,
        'usdt_trc20', w.usdt_trc20, 'usdt_erc20', w.usdt_erc20, 'eth', w.eth
      ) END
    )
  );
END; $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION register_user(text, text, text, text, text) TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION get_user_profile(bigint) TO anon, authenticated;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
