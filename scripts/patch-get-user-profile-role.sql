-- Patch live DB: include role in get_user_profile
-- Run once in Supabase SQL Editor after upgrading the app

CREATE OR REPLACE FUNCTION get_user_profile(p_user_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u users%ROWTYPE; b bank_accounts%ROWTYPE;
BEGIN
  SELECT * INTO u FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'ไม่พบผู้ใช้'); END IF;
  SELECT * INTO b FROM bank_accounts WHERE user_id = p_user_id ORDER BY id DESC LIMIT 1;
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', u.id, 'username', u.username, 'email', u.email, 'phone', u.phone,
      'role', u.role,
      'credit', u.credit, 'wallet_balance', u.wallet_balance,
      'is_bank_linked', b.id IS NOT NULL,
      'has_withdraw_password', u.withdraw_password_hash IS NOT NULL,
      'bank_account', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object(
        'account_name', b.account_name, 'account_number', b.account_number, 'bank_name', b.bank_name
      ) END
    )
  );
END; $$;
