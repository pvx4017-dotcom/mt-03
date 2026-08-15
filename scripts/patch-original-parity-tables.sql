-- Patch live DB: original-parity tables (run once in Supabase SQL Editor)
-- Safe to re-run. Does not drop existing data.

ALTER TABLE users ADD COLUMN IF NOT EXISTS points NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS payer_account TEXT;

ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS withdraw_method TEXT;
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS payout_destination TEXT;

CREATE TABLE IF NOT EXISTS platform_receiving_accounts (
  id              BIGSERIAL PRIMARY KEY,
  channel         TEXT NOT NULL,
  account_name    TEXT,
  account_number  TEXT,
  network         TEXT,
  note            TEXT,
  qr_image        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_receiving_accounts ADD COLUMN IF NOT EXISTS qr_image TEXT;

CREATE TABLE IF NOT EXISTS user_payout_wallets (
  user_id     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  usdt_trc20  TEXT,
  usdt_erc20  TEXT,
  eth         TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_name     TEXT NOT NULL,
  receiver_phone    TEXT NOT NULL,
  receiver_address  TEXT NOT NULL,
  is_default        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default
  ON user_addresses (user_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS daily_checkins (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date  DATE NOT NULL,
  points        INT NOT NULL DEFAULT 20,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS seller_levels (
  id               BIGSERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  min_topup        NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_rate  TEXT,
  referral_reward  TEXT,
  sort_order       INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(14,2) NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id           BIGSERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT,
  value_label  TEXT,
  expires_at   DATE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id   BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'available',
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, coupon_id)
);

CREATE TABLE IF NOT EXISTS feedback_tickets (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ftype       TEXT NOT NULL DEFAULT 'complaint',
  subject     TEXT NOT NULL,
  detail      TEXT,
  contact     TEXT,
  image_path  TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO seller_levels (code, name, min_topup, commission_rate, referral_reward, sort_order, is_active)
VALUES
  ('L1', 'สมาชิกทั่วไป', 0, '0.5%~1%', '5', 1, TRUE),
  ('L2', 'ร้านค้าเงิน', 100, '0.8%~1.5%', '8', 2, TRUE),
  ('L3', 'ร้านค้าทอง', 500, '1%~2%', '12', 3, TRUE),
  ('L4', 'ร้านค้าเพชร', 2000, '1.5%~2.5%', '16', 4, TRUE),
  ('L5', 'ร้านค้าแพลทินัม', 5000, '2%~3%', '20', 5, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO coupons (code, title, description, value_label, expires_at, is_active)
VALUES
  ('MEATT50', 'ส่วนลดสินค้าในร้าน', 'ขั้นต่ำ 499 บาท ใช้ได้กับสินค้าที่ร่วมรายการ', '50฿', '2026-12-31', TRUE),
  ('SAVE10', 'ส่วนลดทั้งร้าน', 'สูงสุด 200 บาท', '10%', '2026-12-31', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO platform_receiving_accounts (channel, account_name, account_number, network, note, is_active, sort_order)
SELECT * FROM (
  VALUES
    ('bank', 'Tiktok shop', '123-4-56789-0', 'กสิกรไทย', 'โอนแล้วแจ้งแชทพร้อมหลักฐาน', TRUE, 1),
    ('usdt', 'USDT', 'TXYZexampleReceiveUSDT111', 'TRC20', 'ส่งเฉพาะ USDT เครือข่าย TRC20', TRUE, 2),
    ('eth', 'ETH', '0xExampleReceiveETH0000000000000001', 'ERC20', 'ส่งเฉพาะ ETH', TRUE, 3),
    ('btc', 'BTC', 'bc1qexampleReceiveBtc000000000000', 'Bitcoin', 'ส่งเฉพาะ BTC', TRUE, 4)
) AS seed(channel, account_name, account_number, network, note, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM platform_receiving_accounts);

ALTER TABLE platform_receiving_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payout_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'platform_receiving_accounts','user_payout_wallets','user_addresses','daily_checkins',
    'seller_levels','loan_applications','coupons','user_coupons','feedback_tickets'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS meta_public_all ON %I', t);
    EXECUTE format('CREATE POLICY meta_public_all ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

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
      'role', u.role,
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
