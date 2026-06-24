/**
 * ดาวน์โหลดโลโก้ + ธงชาติจาก reference ครั้งเดียว → public/ (ไม่ fetch ตอน runtime)
 * รัน: node scripts/fetch-brand-assets.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(__dirname, "..", "public")

const LIVE_BASE =
  process.env.LIVE_ASSET_BASE?.replace(/\/$/, "") ??
  "https://ffshoppingx9.bigselashoping.org/marketting"

const FLAG_CODES = [
  "cn", "us", "fr", "kr", "jp", "tw", "de", "es", "ru", "th", "pt", "vn", "sa", "my", "id",
]

const BRAND_FILES = [
  { url: `${LIVE_BASE}/logo/logo%20meatt.webp`, dest: "logo/logo meatt.webp" },
  { url: `${LIVE_BASE}/logo/shop%20logo.webp`, dest: "logo/shop logo.webp" },
  { url: `${LIVE_BASE}/images/banner_hot_product_1775719595992.png`, dest: "images/banner_hot_product_1775719595992.png" },
  { url: `${LIVE_BASE}/images/banner_smart_home_2_1775724145981.png`, dest: "images/banner_smart_home_2_1775724145981.png" },
  { url: `${LIVE_BASE}/images/banner_luxury_furniture_3_1775724161606.png`, dest: "images/banner_luxury_furniture_3_1775724161606.png" },
  { url: `${LIVE_BASE}/menu/home.png`, dest: "menu/home.png" },
  { url: `${LIVE_BASE}/menu/category.png`, dest: "menu/category.png" },
  { url: `${LIVE_BASE}/menu/cart.png`, dest: "menu/cart.png" },
  { url: `${LIVE_BASE}/menu/personal.png`, dest: "menu/personal.png" },
]

async function download(url, dest) {
  const full = path.join(publicRoot, dest)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  fs.writeFileSync(full, Buffer.from(await res.arrayBuffer()))
  console.log("OK", dest)
}

async function main() {
  for (const f of BRAND_FILES) await download(f.url, f.dest)
  for (const code of FLAG_CODES) {
    await download(`https://flagcdn.com/w40/${code}.png`, `flags/w40/${code}.png`)
  }
  console.log("Done — assets in public/logo, public/flags, public/images, public/menu")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
