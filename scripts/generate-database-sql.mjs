import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "live-products.json"), "utf8"))
const categories = JSON.parse(fs.readFileSync(path.join(__dirname, "live-categories.json"), "utf8"))
const shops = JSON.parse(fs.readFileSync(path.join(__dirname, "live-shops.json"), "utf8"))
const recShops = JSON.parse(fs.readFileSync(path.join(__dirname, "live-rec-shops.json"), "utf8"))
const slides = JSON.parse(fs.readFileSync(path.join(__dirname, "live-slides.json"), "utf8"))

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replace(/'/g, "''")}'`
}

function sqlJson(v) {
  if (v === null || v === undefined || v === "") return "NULL"
  const raw = typeof v === "string" ? v : JSON.stringify(v)
  try {
    JSON.parse(raw)
    return `'${raw.replace(/'/g, "''")}'::jsonb`
  } catch {
    return "NULL"
  }
}

const recNames = new Set((recShops.shops ?? []).map((s) => s.shop_name))

const productUserIds = [
  ...new Set(
    (products.products ?? [])
      .map((p) => Number(p.user_id))
      .filter((id) => Number.isFinite(id) && id > 0),
  ),
].sort((a, b) => a - b)

const header = `-- Meta Business Shopping — Supabase PostgreSQL schema + seed
-- Generated: ${new Date().toISOString()}
-- Products: ${products.products?.length ?? 0} | Categories: ${categories.categories?.length ?? 0} | Shops: ${shops.shops?.length ?? 0}

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- DROP (idempotent re-run in SQL editor)
-- ============================================================
DROP FUNCTION IF EXISTS login_user(TEXT, TEXT);
DROP FUNCTION IF EXISTS register_user(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_set_user_password(BIGINT, TEXT);
DROP FUNCTION IF EXISTS set_user_withdraw_password(BIGINT, TEXT);
DROP FUNCTION IF EXISTS update_user_password(BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS verify_withdraw_password(BIGINT, TEXT);
DROP FUNCTION IF EXISTS get_user_profile(BIGINT);

DROP TABLE IF EXISTS chat_admin_read CASCADE;
DROP TABLE IF EXISTS payment_limits_history CASCADE;
DROP TABLE IF EXISTS commission_settings CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS support_chat_messages CASCADE;
DROP TABLE IF EXISTS shop_follows CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS shipping_history CASCADE;
DROP TABLE IF EXISTS admin_cart_orders CASCADE;
DROP TABLE IF EXISTS product_orders CASCADE;
DROP TABLE IF EXISTS customer_store_products_mirror CASCADE;
DROP TABLE IF EXISTS customer_stores CASCADE;
DROP TABLE IF EXISTS withdraw_requests CASCADE;
DROP TABLE IF EXISTS deposit_requests CASCADE;
DROP TABLE IF EXISTS identity_verifications CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS store_products CASCADE;
DROP TABLE IF EXISTS slide_images CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS payment_limits CASCADE;
DROP TABLE IF EXISTS invitation_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- CORE TABLES
-- ============================================================
CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT,
  email           TEXT UNIQUE,
  phone           TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  role            TEXT NOT NULL DEFAULT 'customer',
  referral_code   TEXT UNIQUE,
  referred_by     TEXT,
  wallet_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  wallet_profit   NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit          NUMERIC(14,2) NOT NULL DEFAULT 0,
  withdraw_password_hash TEXT,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invitation_codes (
  code        TEXT PRIMARY KEY,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bank_accounts (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name       TEXT,
  account_number  TEXT,
  account_name    TEXT,
  phone_number    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_verifications (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name        TEXT,
  id_card_number   TEXT,
  id_card_image    TEXT,
  id_card_back     TEXT,
  selfie_image     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_categories (
  id              BIGSERIAL PRIMARY KEY,
  category_name   TEXT NOT NULL,
  category_image  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shops (
  id              BIGSERIAL PRIMARY KEY,
  shop_name       TEXT NOT NULL UNIQUE,
  shop_image      TEXT,
  review_count    INT NOT NULL DEFAULT 0,
  view_count      INT NOT NULL DEFAULT 0,
  trust_score     NUMERIC(6,2) NOT NULL DEFAULT 0,
  sales_volume    INT NOT NULL DEFAULT 0,
  is_recommended  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE slide_images (
  id           BIGSERIAL PRIMARY KEY,
  slide_image  TEXT NOT NULL,
  image_path   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE store_products (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT REFERENCES users(id) ON DELETE SET NULL,
  product_type        TEXT NOT NULL DEFAULT 'admin',
  shop_name           TEXT,
  product_category    TEXT,
  product_name        TEXT NOT NULL,
  product_description TEXT,
  product_sizes       TEXT,
  product_colors      TEXT,
  product_image       TEXT,
  product_images      JSONB,
  product_price       NUMERIC(14,2) NOT NULL DEFAULT 0,
  product_stock       INT NOT NULL DEFAULT 0,
  review_count        INT NOT NULL DEFAULT 0,
  view_count          INT NOT NULL DEFAULT 0,
  trust_score         NUMERIC(6,2) NOT NULL DEFAULT 0,
  sales_volume        INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_stores (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name       TEXT NOT NULL,
  shop_image      TEXT,
  main_category   TEXT,
  product_comment TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  sold_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_store_products_mirror (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_product_id  BIGINT,
  catalog_source     TEXT NOT NULL DEFAULT 'admin',
  product_name       TEXT,
  shop_name          TEXT,
  product_category   TEXT,
  product_image      TEXT,
  product_images     JSONB,
  product_price      NUMERIC(14,2) DEFAULT 0,
  product_stock      INT NOT NULL DEFAULT 0,
  view_count         INT NOT NULL DEFAULT 0,
  trust_score        NUMERIC(6,2) NOT NULL DEFAULT 0,
  sales_volume       INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      BIGINT,
  product_name    TEXT,
  shop_name       TEXT,
  product_image   TEXT,
  product_category TEXT,
  unit_price      NUMERIC(14,2) DEFAULT 0,
  quantity        INT NOT NULL DEFAULT 1,
  selected_color  TEXT,
  selected_size   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_cart_orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_no        TEXT,
  product_id      BIGINT,
  product_name    TEXT,
  shop_name       TEXT,
  product_image   TEXT,
  product_category TEXT,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(14,2) DEFAULT 0,
  total_price     NUMERIC(14,2) DEFAULT 0,
  selected_color  TEXT,
  selected_size   TEXT,
  contact_name    TEXT,
  contact_address TEXT,
  contact_phone   TEXT,
  receiver_name   TEXT,
  receiver_address TEXT,
  receiver_phone  TEXT,
  commission_amount NUMERIC(14,2) DEFAULT 0,
  shipping_method TEXT DEFAULT 'free',
  status          TEXT NOT NULL DEFAULT 'pending',
  review_text     TEXT,
  star_rating     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shipping_history (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT REFERENCES admin_cart_orders(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deposit_requests (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL,
  payment_method  TEXT DEFAULT 'bank_transfer',
  request_no      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE withdraw_requests (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(14,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_limits (
  id            INT PRIMARY KEY DEFAULT 1,
  min_deposit   NUMERIC(14,2) NOT NULL DEFAULT 100,
  min_withdraw  NUMERIC(14,2) NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_limits_singleton CHECK (id = 1)
);

CREATE TABLE payment_limits_history (
  id            BIGSERIAL PRIMARY KEY,
  min_deposit   NUMERIC(14,2) NOT NULL,
  min_withdraw  NUMERIC(14,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commission_settings (
  id          INT PRIMARY KEY DEFAULT 1,
  percent     NUMERIC(6,2) NOT NULL DEFAULT 20,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commission_settings_singleton CHECK (id = 1)
);

CREATE TABLE chat_admin_read (
  user_id   BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  ntype       TEXT NOT NULL DEFAULT 'platform',
  title       TEXT,
  message     TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shop_follows (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_name     TEXT NOT NULL,
  shop_image    TEXT,
  review_count  INT NOT NULL DEFAULT 0,
  view_count    INT NOT NULL DEFAULT 0,
  trust_score   NUMERIC(6,2) NOT NULL DEFAULT 0,
  sales_volume  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, shop_name)
);

CREATE TABLE support_chat_messages (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type  TEXT NOT NULL,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      BIGINT REFERENCES admin_cart_orders(id) ON DELETE SET NULL,
  product_image TEXT,
  review_text   TEXT,
  star_rating   INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_products_shop ON store_products(shop_name);
CREATE INDEX idx_store_products_category ON store_products(product_category);
CREATE INDEX idx_product_orders_user ON product_orders(user_id, status);
CREATE INDEX idx_admin_cart_user ON admin_cart_orders(user_id, status);
CREATE INDEX idx_notifications_user ON notifications(user_id, ntype);
CREATE INDEX idx_chat_user ON support_chat_messages(user_id, created_at);

-- ============================================================
-- AUTH RPC (SECURITY DEFINER)
-- ============================================================
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
DECLARE v_code TEXT; v_ref TEXT; v_uid BIGINT;
BEGIN
  IF p_password IS NULL OR p_password <> p_confirm THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านไม่ตรงกัน');
  END IF;
  v_code := regexp_replace(COALESCE(p_invitation, ''), '\\D', '', 'g');
  IF length(v_code) <> 5 THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสเชิญไม่ถูกต้อง');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM invitation_codes WHERE code = v_code AND is_active) THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสเชิญไม่ถูกต้องหรือหมดอายุ');
  END IF;
  IF p_email IS NOT NULL AND p_email <> '' AND EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'message', 'อีเมลนี้ถูกใช้แล้ว');
  END IF;
  IF p_phone IS NOT NULL AND p_phone <> '' AND EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
    RETURN jsonb_build_object('success', false, 'message', 'เบอร์โทรนี้ถูกใช้แล้ว');
  END IF;
  v_ref := lpad((floor(random()*99999))::int::text, 5, '0');
  INSERT INTO users (email, phone, password_hash, referral_code, wallet_balance)
  VALUES (
    NULLIF(p_email, ''), NULLIF(p_phone, ''),
    crypt(p_password, gen_salt('bf')), v_ref, 0
  ) RETURNING id INTO v_uid;
  RETURN jsonb_build_object('success', true, 'message', 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', 'user_id', v_uid);
END; $$;

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
      'credit', u.credit, 'wallet_balance', u.wallet_balance,
      'is_bank_linked', b.id IS NOT NULL,
      'has_withdraw_password', u.withdraw_password_hash IS NOT NULL,
      'bank_account', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object(
        'account_name', b.account_name, 'account_number', b.account_number, 'bank_name', b.bank_name
      ) END
    )
  );
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
  IF length(p_password) <> 6 THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสผ่านต้อง 6 หลัก');
  END IF;
  UPDATE users SET withdraw_password_hash = crypt(p_password, gen_salt('bf')) WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'บันทึกรหัสการถอนแล้ว');
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

-- ============================================================
-- SEED: invitation codes, limits, users
-- ============================================================
INSERT INTO invitation_codes (code) VALUES ('12345'), ('88888'), ('99999');

INSERT INTO payment_limits (id, min_deposit, min_withdraw) VALUES (1, 100, 100)
ON CONFLICT (id) DO UPDATE SET min_deposit = EXCLUDED.min_deposit, min_withdraw = EXCLUDED.min_withdraw;

INSERT INTO payment_limits_history (min_deposit, min_withdraw) VALUES (100, 100);

INSERT INTO commission_settings (id, percent) VALUES (1, 20)
ON CONFLICT (id) DO UPDATE SET percent = EXCLUDED.percent;

INSERT INTO users (username, email, phone, password_hash, role, referral_code, wallet_balance, credit)
VALUES
  ('admin', 'admin@meta.local', NULL, crypt('admin123', gen_salt('bf')), 'admin', '10001', 99999, 99999),
  ('demo', NULL, '+66812345678', crypt('123456', gen_salt('bf')), 'customer', '20002', 5000, 5000);

-- Sample notifications
INSERT INTO notifications (user_id, ntype, title, message) VALUES
  (NULL, 'platform', 'ยินดีต้อนรับสู่ Meta Business', 'ขอบคุณที่ใช้บริการแพลตฟอร์มของเรา'),
  (NULL, 'service', 'ศูนย์บริการลูกค้า', 'หากมีคำถาม ติดต่อแชทฝ่ายสนับสนุนได้ตลอด 24 ชม.'),
  (2, 'personal', 'ยินดีต้อนรับ', 'บัญชีทดลองของคุณพร้อมใช้งานแล้ว');

`

let body = header

if (productUserIds.length) {
  body += `\n-- Product owner stubs from live (${productUserIds.length}) — required for store_products.user_id FK\n`
  body += `INSERT INTO users (id, username, password_hash, role, referral_code, status) VALUES\n`
  body += productUserIds
    .map(
      (uid) =>
        `  (${uid}, ${sqlStr(`seller_${uid}`)}, crypt('seed', gen_salt('bf')), 'customer', ${sqlStr(`R${uid}`)}, 'active')`,
    )
    .join(",\n")
  body += ";\n"
  body += `SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 2) FROM users));\n`
}

body += `\n-- Categories (${categories.categories?.length ?? 0})\n`
for (const c of categories.categories ?? []) {
  body += `INSERT INTO product_categories (id, category_name, category_image, created_at) VALUES (${c.id}, ${sqlStr(c.category_name)}, ${sqlStr(c.category_image)}, ${sqlStr(c.created_at)}::timestamptz);\n`
}

body += `\n-- Shops (${shops.shops?.length ?? 0})\n`
for (const s of shops.shops ?? []) {
  const rec = recNames.has(s.shop_name)
  body += `INSERT INTO shops (id, shop_name, shop_image, review_count, view_count, trust_score, sales_volume, is_recommended, created_at) VALUES (${s.id}, ${sqlStr(s.shop_name)}, ${sqlStr(s.shop_image)}, ${Number(s.review_count)||0}, ${Number(s.view_count)||0}, ${Number(s.trust_score)||0}, ${Number(s.sales_volume)||0}, ${rec}, ${sqlStr(s.created_at)}::timestamptz);\n`
}

body += `\n-- Slides (${slides.slides?.length ?? 0})\n`
for (const sl of slides.slides ?? []) {
  const img = sl.slide_image || sl.image_path
  body += `INSERT INTO slide_images (id, slide_image, image_path, created_at) VALUES (${sl.id}, ${sqlStr(img)}, ${sqlStr(img)}, ${sqlStr(sl.created_at)}::timestamptz);\n`
}

body += `\n-- Store products (${products.products?.length ?? 0})\n`
body += `SELECT setval('store_products_id_seq', (SELECT COALESCE(MAX(id),1) FROM store_products));\n`

for (const p of products.products ?? []) {
  let imagesJson = "NULL"
  const pi = p.product_images
  if (pi) {
    try {
      const parsed = typeof pi === "string" ? JSON.parse(pi) : pi
      imagesJson = sqlJson(JSON.stringify(parsed))
    } catch {
      imagesJson = sqlJson(pi)
    }
  }
  body += `INSERT INTO store_products (id, user_id, product_type, shop_name, product_category, product_name, product_description, product_sizes, product_colors, product_image, product_images, product_price, product_stock, review_count, view_count, trust_score, sales_volume, created_at) VALUES (${p.id}, ${p.user_id ? Number(p.user_id) : "NULL"}, ${sqlStr(p.product_type || "admin")}, ${sqlStr(p.shop_name)}, ${sqlStr(p.product_category)}, ${sqlStr(p.product_name)}, ${sqlStr(p.product_description)}, ${sqlStr(p.product_sizes)}, ${sqlStr(p.product_colors)}, ${sqlStr(p.product_image)}, ${imagesJson}, ${Number(p.product_price)||0}, ${Number(p.product_stock)||0}, ${Number(p.review_count)||0}, ${Number(p.view_count)||0}, ${Number(p.trust_score)||0}, ${Number(p.sales_volume)||0}, ${sqlStr(p.created_at)}::timestamptz);\n`
}

body += `
SELECT setval('store_products_id_seq', (SELECT MAX(id) FROM store_products));
SELECT setval('product_categories_id_seq', (SELECT MAX(id) FROM product_categories));
SELECT setval('shops_id_seq', (SELECT MAX(id) FROM shops));
SELECT setval('slide_images_id_seq', (SELECT MAX(id) FROM slide_images));

-- ============================================================
-- RLS: เปิดใช้งาน + policy สำหรับ anon (local dev / clone)
-- ปรับ policy ให้เข้มขึ้นก่อน production
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE slide_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_cart_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_store_products_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_limits_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_admin_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_history ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'users','store_products','product_categories','shops','slide_images','product_orders',
    'admin_cart_orders','deposit_requests','withdraw_requests','notifications','shop_follows',
    'support_chat_messages','reviews','bank_accounts','identity_verifications','customer_stores',
    'customer_store_products_mirror','payment_limits','payment_limits_history','commission_settings',
    'chat_admin_read','invitation_codes','shipping_history'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS meta_public_all ON %I', t);
    EXECUTE format('CREATE POLICY meta_public_all ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Storage bucket สำหรับอัปโหลด (chat, KYC, ร้านค้า) — สร้างใน Supabase Dashboard > Storage ชื่อ uploads
-- GRANT ให้ anon/authenticated ตามต้องการ

-- บัญชีทดลอง:
--   Admin: admin@meta.local / admin123
--   Customer: +66812345678 / 123456
--   รหัสเชิญสมัคร: 12345
`

const outPath = path.join(root, "database.sql")
fs.writeFileSync(outPath, body, "utf8")
console.log("Wrote", outPath, "bytes:", fs.statSync(outPath).size)
