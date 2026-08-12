/**
 * ตรวจว่าโปรเจกต์ Supabase ใหม่พร้อมใช้หลังรัน database.sql
 *
 *   yarn db:verify
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
loadEnv(ROOT)

const TABLES = [
  "users",
  "product_categories",
  "shops",
  "slide_images",
  "store_products",
  "invitation_codes",
  "payment_limits",
  "commission_settings",
]

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || url.includes("YOUR_PROJECT")) {
    console.error("ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env ก่อน")
    process.exit(1)
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Project: ${url}`)
  let ok = true

  for (const table of TABLES) {
    const { count, error } = await sb.from(table).select("*", { count: "exact", head: true })
    if (error) {
      ok = false
      console.error(`✗ ${table}: ${error.message}`)
    } else {
      console.log(`✓ ${table}: ${count ?? 0} rows`)
    }
  }

  const { data: login, error: loginErr } = await sb.rpc("login_user", {
    p_account: "admin@meta.local",
    p_password: "admin123",
  })
  if (loginErr) {
    ok = false
    console.error(`✗ login_user RPC: ${loginErr.message}`)
  } else if (!login?.success) {
    ok = false
    console.error(`✗ login admin ล้มเหลว: ${login?.message ?? "unknown"}`)
  } else {
    const role = login.user?.role ?? login.role ?? "?"
    console.log(`✓ login admin@meta.local ok (role=${role})`)
  }

  const imgDir = path.join(ROOT, "public", "images")
  const imgCount = fs.existsSync(imgDir)
    ? fs.readdirSync(imgDir).filter((n) => /\.(jpe?g|png|webp|gif)$/i.test(n)).length
    : 0
  console.log(`✓ public/images files: ${imgCount}`)

  console.log("\n" + (ok ? "=== Database ready ===" : "=== มีปัญหา — ตรวจ SQL / .env ==="))
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
