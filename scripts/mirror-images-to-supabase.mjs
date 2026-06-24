/**
 * Mirror รูปจาก live site ไป Supabase Storage bucket "uploads"
 *
 * ใช้งาน:
 *   1. ตั้งค่า .env (ดู .env.example)
 *   2. สร้าง bucket "uploads" ใน Supabase (public)
 *   3. node scripts/mirror-images-to-supabase.mjs
 *
 * Options:
 *   --dry-run          แสดงจำนวน path ไม่อัปโหลด
 *   --skip-existing    ข้ามไฟล์ที่มีใน Storage แล้ว
 *   --concurrency=8    จำนวน download/upload พร้อมกัน
 *   --limit=50         จำกัดจำนวน (ทดสอบ)
 *   --prefix=images/   กรอง path ด้วย prefix
 *   --resume           ใช้ cache ข้ามไฟล์ที่สำเร็จแล้ว
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const CACHE_FILE = path.join(__dirname, ".mirror-images-cache.json")
const FAIL_FILE = path.join(__dirname, "mirror-images-failed.json")

const LIVE_BASE =
  process.env.LIVE_ASSET_BASE?.replace(/\/$/, "") ??
  "https://ffshoppingx9.bigselashoping.org/marketting"
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads"

loadEnv(ROOT)

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    skipExisting: false,
    resume: false,
    concurrency: 8,
    limit: 0,
    prefix: "",
  }
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true
    else if (arg === "--skip-existing") opts.skipExisting = true
    else if (arg === "--resume") opts.resume = true
    else if (arg.startsWith("--concurrency=")) opts.concurrency = Math.max(1, Number(arg.split("=")[1]) || 8)
    else if (arg.startsWith("--limit=")) opts.limit = Math.max(0, Number(arg.split("=")[1]) || 0)
    else if (arg.startsWith("--prefix=")) opts.prefix = arg.slice("--prefix=".length)
  }
  return opts
}

function normalizePath(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/\\/g, "/")
  if (!s || /^https?:\/\//i.test(s)) return null
  s = s.replace(/^\/+/, "")
  if (s.startsWith("marketting/")) s = s.slice("marketting/".length)
  return s
}

function mimeType(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  }
  return map[ext] ?? "application/octet-stream"
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function collectImagePaths() {
  const paths = new Set()
  const add = (raw) => {
    const p = normalizePath(raw)
    if (p) paths.add(p)
  }

  const products = readJson(path.join(__dirname, "live-products.json"))
  const categories = readJson(path.join(__dirname, "live-categories.json"))
  const shops = readJson(path.join(__dirname, "live-shops.json"))
  const recShops = readJson(path.join(__dirname, "live-rec-shops.json"))
  const slides = readJson(path.join(__dirname, "live-slides.json"))

  for (const row of products.products ?? []) {
    add(row.product_image)
    if (row.product_images) {
      try {
        const arr =
          typeof row.product_images === "string" ? JSON.parse(row.product_images) : row.product_images
        for (const img of arr ?? []) add(img)
      } catch {
        /* ignore bad json */
      }
    }
  }
  for (const row of categories.categories ?? []) add(row.category_image)
  for (const row of [...(shops.shops ?? []), ...(recShops.shops ?? [])]) add(row.shop_image)
  for (const row of slides.slides ?? []) {
    add(row.image_path)
    add(row.slide_image)
  }

  // รูปเสริมที่ UI อาจใช้
  add("partner/my-bg.png")

  return [...paths].sort()
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return new Set()
  try {
    return new Set(JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")))
  } catch {
    return new Set()
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify([...cache], null, 0))
}

async function pool(items, concurrency, worker) {
  let index = 0
  const results = []
  async function run() {
    while (index < items.length) {
      const i = index++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

async function downloadImage(relativePath, retries = 3) {
  const url = `${LIVE_BASE}/${relativePath}`
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length === 0) throw new Error("empty body")
      return buf
    } catch (err) {
      if (attempt === retries) throw new Error(`${url}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new Error("unreachable")
}

async function existsInStorage(supabase, publicBase, relativePath) {
  const publicUrl = `${publicBase}/${relativePath.split("/").map(encodeURIComponent).join("/")}`
  try {
    const res = await fetch(publicUrl, { method: "HEAD" })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  let allPaths = collectImagePaths()
  if (opts.prefix) allPaths = allPaths.filter((p) => p.startsWith(opts.prefix))
  if (opts.limit > 0) allPaths = allPaths.slice(0, opts.limit)

  console.log(`Live source : ${LIVE_BASE}`)
  console.log(`Bucket      : ${BUCKET}`)
  console.log(`Total paths : ${allPaths.length}`)

  if (opts.dryRun) {
    console.log("\n[dry-run] ตัวอย่าง 10 path แรก:")
    for (const p of allPaths.slice(0, 10)) console.log(`  ${LIVE_BASE}/${p}`)
    return
  }

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "\nต้องตั้งค่า VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env\n" +
        "(Service role ใช้สำหรับอัปโหลด — อย่า commit key นี้)",
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const publicBase = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`

  const cache = opts.resume ? loadCache() : new Set()
  const queue = allPaths.filter((p) => !cache.has(p))
  console.log(`To process  : ${queue.length} (${cache.size} cached)`)

  let ok = 0
  let skipped = 0
  let failed = 0
  const failures = []
  const started = Date.now()

  await pool(queue, opts.concurrency, async (relativePath, idx) => {
    const label = `[${idx + 1}/${queue.length}] ${relativePath}`

    try {
      if (opts.skipExisting && (await existsInStorage(supabase, publicBase, relativePath))) {
        skipped++
        cache.add(relativePath)
        if ((idx + 1) % 50 === 0) saveCache(cache)
        return
      }

      const body = await downloadImage(relativePath)
      const { error } = await supabase.storage.from(BUCKET).upload(relativePath, body, {
        upsert: true,
        contentType: mimeType(relativePath),
        cacheControl: "31536000",
      })
      if (error) throw new Error(error.message)

      ok++
      cache.add(relativePath)
      if ((ok + skipped) % 25 === 0) {
        saveCache(cache)
        const elapsed = ((Date.now() - started) / 1000).toFixed(0)
        console.log(`… ${ok} uploaded, ${skipped} skipped, ${failed} failed (${elapsed}s)`)
      }
    } catch (err) {
      failed++
      failures.push({ path: relativePath, error: err.message, url: `${LIVE_BASE}/${relativePath}` })
      console.warn(`${label} FAILED: ${err.message}`)
    }
  })

  saveCache(cache)
  if (failures.length) fs.writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 2))

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log("\n=== Done ===")
  console.log(`Uploaded : ${ok}`)
  console.log(`Skipped  : ${skipped}`)
  console.log(`Failed   : ${failed}`)
  console.log(`Time     : ${elapsed}s`)
  if (failures.length) {
    console.log(`Failures saved to scripts/mirror-images-failed.json`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
