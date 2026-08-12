/**
 * ดึงรูป catalog ลง public/ ให้ path ตรงกับที่ DB เก็บ (แบบ PHP project)
 *
 * แหล่ง path:
 *   1) scripts/live-*.json (ถ้ามี)
 *   2) ตาราง Supabase: product_categories, shops, slide_images, store_products, customer_stores
 *
 * แหล่งไฟล์ (ลองตามลำดับ):
 *   - ข้ามถ้ามีใน public/ แล้ว
 *   - Supabase Storage (bucket uploads) — ลองทั้ง path ตรงและตัด/เติม uploads/
 *   - LIVE_ASSET_BASE (reference site)
 *
 * ใช้งาน:
 *   yarn images:pull
 *   yarn images:pull --dry-run
 *   yarn images:pull --skip-existing --resume --concurrency=8
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")
const CACHE_FILE = path.join(__dirname, ".pull-catalog-images-cache.json")
const FAIL_FILE = path.join(__dirname, "pull-catalog-images-failed.json")

loadEnv(ROOT)

const LIVE_BASE =
  process.env.LIVE_ASSET_BASE?.replace(/\/$/, "") ??
  "https://ffshoppingx9.bigselashoping.org/marketting"
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads"

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
  if (s.startsWith("CHATIMG:")) s = s.slice(8).trim()
  if (s.startsWith("support_chat/")) s = `uploads/${s}`
  if (s.startsWith("kyc/")) s = `uploads/${s}`
  return s
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

function addPath(paths, raw) {
  const p = normalizePath(raw)
  if (p) paths.add(p)
}

function collectFromSeedJson(paths) {
  const products = readJsonIfExists(path.join(__dirname, "live-products.json"))
  const categories = readJsonIfExists(path.join(__dirname, "live-categories.json"))
  const shops = readJsonIfExists(path.join(__dirname, "live-shops.json"))
  const recShops = readJsonIfExists(path.join(__dirname, "live-rec-shops.json"))
  const slides = readJsonIfExists(path.join(__dirname, "live-slides.json"))

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
  const re =
    /(?:CHATIMG:)?(?:images|uploads|stores|support_chat|kyc)\/[A-Za-z0-9_./%-]+(?:\.(?:jpg|jpeg|png|webp|gif))?/gi
  for (const m of text.matchAll(re)) addPath(paths, m[0])
}

async function collectFromSupabase(supabase, paths) {
  const tables = [
    { table: "product_categories", cols: "category_image" },
    { table: "shops", cols: "shop_image" },
    { table: "slide_images", cols: "image_path, slide_image" },
    { table: "store_products", cols: "product_image, product_images" },
    { table: "customer_stores", cols: "shop_image" },
  ]

  for (const { table, cols } of tables) {
    const { data, error } = await supabase.from(table).select(cols)
    if (error) {
      console.warn(`  warn: อ่าน ${table} ไม่ได้ — ${error.message}`)
      continue
    }
    for (const row of data ?? []) {
      for (const col of cols.split(",").map((c) => c.trim())) {
        const val = row[col]
        if (col === "product_images" && val) {
          try {
            const arr = typeof val === "string" ? JSON.parse(val) : val
            if (Array.isArray(arr)) for (const img of arr) addPath(paths, img)
          } catch {
            /* ignore */
          }
        } else {
          addPath(paths, val)
        }
      }
    }
  }
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

function encodeStorageKey(relativePath) {
  return relativePath.split("/").map(encodeURIComponent).join("/")
}

/** candidate URLs สำหรับดาวน์โหลด path หนึ่งตัว */
function candidateUrls(relativePath, supabaseUrl) {
  const urls = []
  if (supabaseUrl) {
    const base = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`
    urls.push(`${base}/${encodeStorageKey(relativePath)}`)
    // เคยอัปโหลดด้วย prefix uploads/... ใน bucket uploads → อาจซ้อน uploads/
    if (relativePath.startsWith("uploads/")) {
      const stripped = relativePath.slice("uploads/".length)
      urls.push(`${base}/${encodeStorageKey(stripped)}`)
    } else {
      urls.push(`${base}/${encodeStorageKey(`uploads/${relativePath}`)}`)
    }
  }
  urls.push(`${LIVE_BASE}/${relativePath}`)
  return [...new Set(urls)]
}

async function downloadFirstOk(urls, retries = 2) {
  let lastErr = "no candidates"
  for (const url of urls) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length === 0) throw new Error("empty body")
        return { buf, url }
      } catch (err) {
        lastErr = `${url}: ${err.message}`
        if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * attempt))
      }
    }
  }
  throw new Error(lastErr)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  const key = serviceKey || anonKey

  const paths = new Set()
  collectFromSeedJson(paths)
  collectFromDatabaseSql(paths)
  console.log(`Paths from seed+sql: ${paths.size}`)

  let supabase = null
  if (supabaseUrl && key) {
    supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    console.log("Collecting paths from Supabase tables…")
    await collectFromSupabase(supabase, paths)
  } else {
    console.warn("ไม่มี VITE_SUPABASE_URL / key — ใช้เฉพาะ live-*.json / database.sql")
  }

  let allPaths = [...paths].sort()
  if (opts.prefix) allPaths = allPaths.filter((p) => p.startsWith(opts.prefix))
  if (opts.limit > 0) allPaths = allPaths.slice(0, opts.limit)

  console.log(`Live source : ${LIVE_BASE}`)
  console.log(`Public dir  : ${PUBLIC_DIR}`)
  console.log(`Total paths : ${allPaths.length}`)

  if (opts.dryRun) {
    console.log("\n[dry-run] ตัวอย่าง 15 path แรก:")
    for (const p of allPaths.slice(0, 15)) console.log(`  public/${p}`)
    return
  }

  if (!allPaths.length) {
    console.error("ไม่พบ path รูป catalog — ตรวจ seed JSON หรือการเชื่อม Supabase")
    process.exit(1)
  }

  const cache = opts.resume ? loadCache() : new Set()
  const queue = allPaths.filter((p) => !cache.has(p))
  console.log(`To process  : ${queue.length} (${cache.size} cached)`)

  let ok = 0
  let skipped = 0
  let failed = 0
  const failures = []
  const started = Date.now()

  await pool(queue, opts.concurrency, async (relativePath, idx) => {
    const dest = path.join(PUBLIC_DIR, ...relativePath.split("/"))
    const label = `[${idx + 1}/${queue.length}] ${relativePath}`

    try {
      if (opts.skipExisting && fs.existsSync(dest)) {
        skipped++
        cache.add(relativePath)
        if ((idx + 1) % 50 === 0) saveCache(cache)
        return
      }

      const { buf } = await downloadFirstOk(candidateUrls(relativePath, supabaseUrl))
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, buf)

      ok++
      cache.add(relativePath)
      if ((ok + skipped) % 25 === 0) {
        saveCache(cache)
        const elapsed = ((Date.now() - started) / 1000).toFixed(0)
        console.log(`… ${ok} saved, ${skipped} skipped, ${failed} failed (${elapsed}s)`)
      }
    } catch (err) {
      failed++
      failures.push({ path: relativePath, error: err.message })
      console.warn(`${label} FAILED: ${err.message}`)
    }
  })

  saveCache(cache)
  if (failures.length) fs.writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 2))

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log("\n=== Done ===")
  console.log(`Saved   : ${ok}`)
  console.log(`Skipped : ${skipped}`)
  console.log(`Failed  : ${failed}`)
  console.log(`Time    : ${elapsed}s`)
  console.log("\nต่อไป: commit โฟลเดอร์ public/ แล้ว deploy — รูปจะถูกเสิร์ฟจากโปรเจกต์")
  if (failures.length) {
    console.log(`Failures saved to scripts/pull-catalog-images-failed.json`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
