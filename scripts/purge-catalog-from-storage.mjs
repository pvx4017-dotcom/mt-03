/**
 * ลบรูป catalog ออกจาก Supabase Storage ผ่าน Storage API
 * ใช้ path จาก seed / public/images — ไม่ต้อง list bucket (สำคัญตอนโดนล็อก quota)
 *
 *   yarn images:purge-storage:dry
 *   yarn images:purge-storage
 *
 * ถ้า API ลบไม่ได้ทั้งหมด → รัน scripts/purge-catalog-storage.sql
 * (SET LOCAL storage.allow_delete_query = true)
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")

loadEnv(ROOT)

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads"
const dryRun = process.argv.includes("--dry-run")

function normalizePath(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/\\/g, "/")
  if (!s || /^https?:\/\//i.test(s)) return null
  s = s.replace(/^\/+/, "")
  if (s.startsWith("marketting/")) s = s.slice("marketting/".length)
  if (s.startsWith("CHATIMG:")) s = s.slice(8).trim()
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

function collectKnownPaths() {
  const paths = new Set()
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

  // ทุกไฟล์ใต้ public/images
  const imgDir = path.join(PUBLIC_DIR, "images")
  if (fs.existsSync(imgDir)) {
    for (const name of fs.readdirSync(imgDir)) {
      if (/\.(jpe?g|png|webp|gif)$/i.test(name)) paths.add(`images/${name}`)
    }
  }

  return [...paths].sort()
}

/** object keys ที่อาจถูกอัปโหลดใน bucket uploads */
function storageKeysFor(relPath) {
  const keys = new Set([relPath])
  if (relPath.startsWith("uploads/")) keys.add(relPath.slice("uploads/".length))
  else keys.add(`uploads/${relPath}`)
  return [...keys]
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error("ต้องมี VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env")
    process.exit(1)
  }

  const relPaths = collectKnownPaths()
  const keys = [...new Set(relPaths.flatMap(storageKeysFor))].sort()

  console.log(`Known catalog paths : ${relPaths.length}`)
  console.log(`Storage keys to try : ${keys.length}`)
  console.log(`Bucket              : ${BUCKET}`)

  if (dryRun) {
    console.log("\n[dry-run] ตัวอย่าง keys:")
    for (const k of keys.slice(0, 20)) console.log(`  ${k}`)
    if (keys.length > 20) console.log(`  … +${keys.length - 20}`)
    console.log("\nรันจริง: yarn images:purge-storage")
    console.log("ถ้า API ล้มเหลว: วาง scripts/purge-catalog-storage.sql ใน SQL Editor")
    return
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let deleted = 0
  let failedBatches = 0
  const chunk = 100
  const errors = []

  for (let i = 0; i < keys.length; i += chunk) {
    const batch = keys.slice(i, i + chunk)
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      failedBatches++
      errors.push({ batchStart: i, error: error.message })
      console.warn(`[${i + 1}-${i + batch.length}] FAILED: ${error.message}`)
    } else {
      const n = Array.isArray(data) ? data.length : 0
      deleted += n
      console.log(`[${i + 1}-${Math.min(i + batch.length, keys.length)}] removed rows: ${n} (total reported ${deleted})`)
    }
  }

  console.log("\n=== Done ===")
  console.log(`API reported removed : ${deleted}`)
  console.log(`Failed batches       : ${failedBatches}`)
  if (failedBatches) {
    console.log("\nถ้ายังเต็ม quota / ลบไม่สำเร็จ ให้รัน SQL นี้ใน Dashboard:")
    console.log("  scripts/purge-catalog-storage.sql")
    console.log("(ใช้ SET LOCAL storage.allow_delete_query = true)")
    process.exitCode = 1
  } else {
    console.log("ตรวจโควตาอีกครั้งใน Supabase Dashboard → Settings → Usage")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
