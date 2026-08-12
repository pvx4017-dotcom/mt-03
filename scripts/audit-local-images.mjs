/**
 * เทียบ path รูปใน seed / database.sql กับไฟล์จริงใน public/
 *   node scripts/audit-local-images.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")
const OUT = path.join(__dirname, "audit-local-images-report.json")

function normalizePath(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/\\/g, "/")
  if (!s || /^https?:\/\//i.test(s)) return null
  s = s.replace(/^\/+/, "")
  if (s.startsWith("marketting/")) s = s.slice("marketting/".length)
  if (s.startsWith("CHATIMG:")) s = s.slice(8).trim()
  // ข้าม placeholder จากคอมเมนต์ เช่น images/...
  if (!s || s.endsWith("/...") || s.includes("/.../") || /\.\.\.$/.test(s)) return null
  if (!/\.(jpe?g|png|webp|gif)$/i.test(s) && !/^[\w./%-]+$/.test(s)) return null
  return s || null
}

function addPath(set, raw) {
  const p = normalizePath(raw)
  if (p) set.add(p)
}

function readJson(file) {
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function collectFromSeed(paths) {
  const products = readJson(path.join(__dirname, "live-products.json"))
  const categories = readJson(path.join(__dirname, "live-categories.json"))
  const shops = readJson(path.join(__dirname, "live-shops.json"))
  const recShops = readJson(path.join(__dirname, "live-rec-shops.json"))
  const slides = readJson(path.join(__dirname, "live-slides.json"))

  for (const row of products?.products ?? []) {
    addPath(paths, row.product_image)
    if (row.product_images) {
      try {
        const arr =
          typeof row.product_images === "string" ? JSON.parse(row.product_images) : row.product_images
        for (const img of arr ?? []) addPath(paths, img)
      } catch {
        /* ignore */
      }
    }
  }
  for (const row of categories?.categories ?? []) addPath(paths, row.category_image)
  for (const row of [...(shops?.shops ?? []), ...(recShops?.shops ?? [])]) addPath(paths, row.shop_image)
  for (const row of slides?.slides ?? []) {
    addPath(paths, row.image_path)
    addPath(paths, row.slide_image)
  }
}

function collectFromDatabaseSql(paths) {
  const sqlPath = path.join(ROOT, "database.sql")
  if (!fs.existsSync(sqlPath)) return
  const text = fs.readFileSync(sqlPath, "utf8")
  // จับเฉพาะ path ที่มีนามสกุลรูป — เลี่ยงคอมเมนต์อย่าง images/...
  const re =
    /(?:CHATIMG:)?(?:images|uploads|stores|support_chat|kyc)\/[A-Za-z0-9_./%-]+\.(?:jpg|jpeg|png|webp|gif)/gi
  for (const m of text.matchAll(re)) addPath(paths, m[0])
}

function listPublicFiles(dir, base = "") {
  const out = new Set()
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name
    if (ent.isDirectory()) {
      for (const p of listPublicFiles(path.join(dir, ent.name), rel)) out.add(p)
    } else {
      out.add(rel.replace(/\\/g, "/"))
    }
  }
  return out
}

const expected = new Set()
collectFromSeed(expected)
collectFromDatabaseSql(expected)

const present = listPublicFiles(PUBLIC_DIR)
const missing = [...expected].filter((p) => !present.has(p)).sort()
const orphanHint = [...present].filter(
  (p) =>
    (p.startsWith("images/") || p.startsWith("uploads/") || p.startsWith("stores/")) &&
    !expected.has(p),
)

const report = {
  expected: expected.size,
  presentInPublic: present.size,
  missingCount: missing.length,
  missingSample: missing.slice(0, 50),
  missing,
  orphanCatalogSample: orphanHint.slice(0, 30),
}

fs.writeFileSync(OUT, JSON.stringify(report, null, 2))
console.log(`Expected paths : ${report.expected}`)
console.log(`Files in public: ${report.presentInPublic}`)
console.log(`Missing        : ${report.missingCount}`)
if (missing.length) {
  console.log("\nMissing sample:")
  for (const p of missing.slice(0, 20)) console.log(`  ${p}`)
}
console.log(`\nReport: ${OUT}`)
