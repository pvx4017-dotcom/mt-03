/**
 * ลอง list + ดาวน์โหลดทุก object ใน Supabase Storage bucket "uploads" ลง public/
 * รวม chat/KYC และ path ที่ seed ไม่มี
 *
 *   yarn images:pull:storage
 *   node scripts/probe-storage-and-pull.mjs --dry-run
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")
const FAIL_FILE = path.join(__dirname, "pull-storage-failed.json")

loadEnv(ROOT)

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads"
const dryRun = process.argv.includes("--dry-run")
const skipExisting = process.argv.includes("--skip-existing")
const concurrency = Math.max(
  1,
  Number((process.argv.find((a) => a.startsWith("--concurrency=")) ?? "").split("=")[1]) || 6,
)

async function listAll(supabase, prefix = "") {
  const out = []
  let offset = 0
  const limit = 100
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw new Error(`list ${prefix || "/"}: ${error.message}`)
    if (!data?.length) break
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name
      // folder entries have id null / no metadata size in some API versions
      const isFolder = item.id === null || (item.metadata == null && !item.name.includes("."))
      if (item.metadata || /\.(jpe?g|png|webp|gif|svg|pdf)$/i.test(item.name)) {
        out.push(full)
      } else if (isFolder || !item.metadata) {
        // recurse into "folders"
        const nested = await listAll(supabase, full)
        out.push(...nested)
      } else {
        out.push(full)
      }
    }
    if (data.length < limit) break
    offset += limit
  }
  return out
}

/** map storage object key → public relative path */
function toPublicPath(objectKey) {
  const key = objectKey.replace(/^\/+/, "")
  // object ใน bucket uploads บางอันเป็น images/... บางอัน support_chat/...
  // เก็บใน public ให้ตรง path ที่แอปอ่าน
  if (key.startsWith("uploads/")) return key
  if (key.startsWith("support_chat/")) return `uploads/${key}`
  if (key.startsWith("kyc/")) return `uploads/${key}`
  if (key.startsWith("stores/")) return key
  return key
}

async function pool(items, n, worker) {
  let i = 0
  async function run() {
    while (i < items.length) {
      const idx = i++
      await worker(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run))
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error("ต้องมี VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY (หรือ anon) ใน .env")
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Listing bucket: ${BUCKET} …`)
  let keys
  try {
    keys = await listAll(supabase, "")
  } catch (err) {
    console.error("\n❌ List Storage ไม่ได้:", err.message)
    console.error(
      "โปรเจกต์อาจโดนจำกัดเพราะเกิน storage quota — ต้องลบไฟล์ใน Supabase Dashboard หรืออัปเกรดแพ็กเกจก่อนดึงจาก Storage ได้\n" +
        "ตอนนี้รูป catalog จาก live seed อยู่ใน public/ แล้ว — ใช้ yarn images:audit เพื่อดูช่องว่าง",
    )
    process.exit(1)
  }

  // unique
  keys = [...new Set(keys)].sort()
  console.log(`Objects found: ${keys.length}`)
  if (dryRun) {
    for (const k of keys.slice(0, 30)) console.log(`  ${k} → public/${toPublicPath(k)}`)
    if (keys.length > 30) console.log(`  … +${keys.length - 30} more`)
    return
  }

  let ok = 0
  let skipped = 0
  let failed = 0
  const failures = []

  await pool(keys, concurrency, async (objectKey, idx) => {
    const rel = toPublicPath(objectKey)
    const dest = path.join(PUBLIC_DIR, ...rel.split("/"))
    const label = `[${idx + 1}/${keys.length}] ${objectKey}`
    try {
      if (skipExisting && fs.existsSync(dest)) {
        skipped++
        return
      }
      const { data, error } = await supabase.storage.from(BUCKET).download(objectKey)
      if (error) throw new Error(error.message)
      const buf = Buffer.from(await data.arrayBuffer())
      if (!buf.length) throw new Error("empty")
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, buf)
      ok++
      if ((ok + skipped) % 25 === 0) console.log(`… ${ok} saved, ${skipped} skipped, ${failed} failed`)
    } catch (err) {
      failed++
      failures.push({ path: objectKey, error: err.message })
      console.warn(`${label} FAILED: ${err.message}`)
    }
  })

  if (failures.length) fs.writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 2))
  console.log("\n=== Done ===")
  console.log(`Saved   : ${ok}`)
  console.log(`Skipped : ${skipped}`)
  console.log(`Failed  : ${failed}`)
  if (failures.length) {
    console.log(`Failures: ${FAIL_FILE}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
