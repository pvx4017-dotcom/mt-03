/**
 * เทียบ/ดึงแคตตาล็อกจากร้านอ้างอิง Tiktok shop แล้วเติมลง Supabase + public/
 *
 *   node scripts/sync-catalog-from-live.mjs              # เทียบอย่างเดียว
 *   node scripts/sync-catalog-from-live.mjs --apply      # ใส่แถวที่ขาด
 *   node scripts/sync-catalog-from-live.mjs --apply --images
 *
 * แหล่ง: https://1tsaks-marketplacex.pttgroup.cc/marketplace/api/*.php
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const CACHE_DIR = path.join(__dirname, ".live-cache")
loadEnv(ROOT)

const LIVE_BASE = (
  process.env.LIVE_MARKETPLACE_BASE ||
  process.env.LIVE_ASSET_BASE ||
  "https://1tsaks-marketplacex.pttgroup.cc/marketplace"
).replace(/\/$/, "")

const apply = process.argv.includes("--apply")
const pullImages = process.argv.includes("--images")

function norm(v) {
  return String(v ?? "").trim().toLowerCase()
}

function productKey(row) {
  const name = norm(row.product_name)
  const shop = norm(row.shop_name)
  return shop ? `${shop}::${name}` : name
}

async function fetchJson(rel) {
  const url = `${LIVE_BASE}/api/${rel}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${rel} HTTP ${res.status}: ${text.slice(0, 180)}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${rel} ไม่ใช่ JSON: ${text.slice(0, 180)}`)
  }
}

function parseImages(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean)
  const s = String(raw).trim()
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.map(String).map((x) => x.trim()).filter(Boolean)
  } catch {
    /* keep as single path */
  }
  return [s]
}

function toImageJson(raw) {
  const list = parseImages(raw)
  return list.length ? list : null
}

async function downloadFile(relPath) {
  const clean = String(relPath || "").replace(/^\/+/, "")
  if (!clean || /^https?:\/\//i.test(clean)) return { skipped: true }
  const dest = path.join(ROOT, "public", clean.replace(/\//g, path.sep))
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return { skipped: true }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const url = `${LIVE_BASE}/${clean}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, path: clean, status: res.status }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 32) return { ok: false, path: clean, status: "empty" }
  fs.writeFileSync(dest, buf)
  return { ok: true, path: clean, bytes: buf.length }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || url.includes("YOUR_")) {
    console.error("ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env ก่อน")
    process.exit(1)
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  console.log(`Live: ${LIVE_BASE}`)
  console.log("กำลังดึงแคตตาล็อกจากร้านอ้างอิง…")

  const [productsRes, categoriesRes, recShopsRes, generalShopsRes, slidesRes] = await Promise.all([
    fetchJson("admin_store_products.php"),
    fetchJson("admin_product_categories.php"),
    fetchJson("admin_recommended_shops.php"),
    fetchJson("admin_general_shops.php").catch(() => ({ success: false, shops: [] })),
    fetchJson("admin_slide_images.php").catch(() => ({ success: false, slides: [] })),
  ])

  if (!productsRes?.success) throw new Error(productsRes?.message || "โหลดสินค้าจากร้านอ้างอิงไม่สำเร็จ")
  if (!categoriesRes?.success) throw new Error(categoriesRes?.message || "โหลดหมวดหมู่จากร้านอ้างอิงไม่สำเร็จ")

  const liveProducts = Array.isArray(productsRes.products) ? productsRes.products : []
  const liveCategories = Array.isArray(categoriesRes.categories) ? categoriesRes.categories : []
  const liveRecShops = Array.isArray(recShopsRes.shops) ? recShopsRes.shops : []
  const liveGeneralShops = Array.isArray(generalShopsRes.shops) ? generalShopsRes.shops : []
  const liveShops = [...liveRecShops, ...liveGeneralShops]
  const recNames = new Set(liveRecShops.map((s) => norm(s.shop_name)))
  const liveSlides = Array.isArray(slidesRes.slides || slidesRes.images)
    ? (slidesRes.slides || slidesRes.images)
    : []

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(path.join(CACHE_DIR, "live-products.json"), JSON.stringify(productsRes))
  fs.writeFileSync(path.join(CACHE_DIR, "live-categories.json"), JSON.stringify(categoriesRes))
  fs.writeFileSync(path.join(CACHE_DIR, "live-shops.json"), JSON.stringify({ shops: liveShops }))

  const [{ data: localProducts, error: pErr }, { data: localCats, error: cErr }, { data: localShops, error: sErr }] =
    await Promise.all([
      sb.from("store_products").select("id, product_name, shop_name, product_category, product_price, product_image"),
      sb.from("product_categories").select("id, category_name, category_image"),
      sb.from("shops").select("id, shop_name, shop_image, is_recommended"),
    ])
  if (pErr) throw new Error(`store_products: ${pErr.message}`)
  if (cErr) throw new Error(`product_categories: ${cErr.message}`)
  if (sErr) throw new Error(`shops: ${sErr.message}`)

  const localProductKeys = new Set((localProducts ?? []).map(productKey))
  const localCatNames = new Set((localCats ?? []).map((c) => norm(c.category_name)))
  const localShopNames = new Set((localShops ?? []).map((s) => norm(s.shop_name)))
  const localIds = new Set((localProducts ?? []).map((p) => Number(p.id)))

  const missingProducts = liveProducts.filter((p) => {
    const name = String(p.product_name || "").trim()
    return name && !localProductKeys.has(productKey(p))
  })
  const missingCats = liveCategories.filter((c) => {
    const name = String(c.category_name || "").trim()
    return name && !localCatNames.has(norm(name))
  })
  const missingShops = liveShops.filter((s) => {
    const name = String(s.shop_name || "").trim()
    return name && !localShopNames.has(norm(name))
  })

  const localByCat = new Map()
  for (const p of localProducts ?? []) {
    const cat = String(p.product_category || "ไม่ระบุ").trim() || "ไม่ระบุ"
    localByCat.set(cat, (localByCat.get(cat) || 0) + 1)
  }
  const liveByCat = new Map()
  for (const p of liveProducts) {
    const cat = String(p.product_category || "ไม่ระบุ").trim() || "ไม่ระบุ"
    liveByCat.set(cat, (liveByCat.get(cat) || 0) + 1)
  }

  console.log("\n=== สินค้าในระบบของเราตอนนี้ ===")
  console.log(`สินค้า: ${(localProducts ?? []).length} รายการ`)
  console.log(`หมวดหมู่: ${(localCats ?? []).length}`)
  console.log(`ร้านค้า: ${(localShops ?? []).length}`)
  console.log("ตามหมวด:")
  for (const [cat, n] of [...localByCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${cat}`)
  }

  console.log("\n=== สินค้าในร้านอ้างอิง (Tiktok shop) ===")
  console.log(`สินค้า: ${liveProducts.length} รายการ`)
  console.log(`หมวดหมู่: ${liveCategories.length}`)
  console.log(`ร้านค้า: ${liveShops.length} (แนะนำ ${liveRecShops.length})`)
  console.log(`สไลด์: ${liveSlides.length}`)
  console.log("ตามหมวด:")
  for (const [cat, n] of [...liveByCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${cat}`)
  }

  console.log("\n=== ส่วนที่ยังขาดในระบบเรา ===")
  console.log(`สินค้าที่ยังไม่มี: ${missingProducts.length}`)
  console.log(`หมวดหมู่ที่ยังไม่มี: ${missingCats.length}`)
  console.log(`ร้านค้าที่ยังไม่มี: ${missingShops.length}`)
  if (missingCats.length) {
    console.log("หมวดใหม่:", missingCats.map((c) => c.category_name).join(", "))
  }
  if (missingShops.length) {
    console.log("ร้านใหม่:", missingShops.map((s) => s.shop_name).join(", "))
  }
  if (missingProducts.length) {
    console.log("ตัวอย่างสินค้าใหม่ (สูงสุด 20):")
    for (const p of missingProducts.slice(0, 20)) {
      console.log(`  - [${p.product_category || "-"}] ${p.product_name} / ${p.shop_name || "-"}  $${p.product_price}`)
    }
  }

  if (!apply) {
    console.log("\nยังไม่ได้เขียนลงฐานข้อมูล — รันพร้อม --apply เพื่อเติมรายการที่ขาด")
    console.log("ถ้าต้องการดึงรูปด้วย: node scripts/sync-catalog-from-live.mjs --apply --images")
    return
  }

  const { data: adminRow } = await sb.from("users").select("id").eq("email", "admin@meta.local").maybeSingle()
  const fallbackUserId = adminRow?.id ?? 1

  if (missingCats.length) {
    const rows = missingCats.map((c) => ({
      category_name: String(c.category_name).trim(),
      category_image: String(c.category_image || "").trim(),
    }))
    const { error } = await sb.from("product_categories").insert(rows)
    if (error) throw new Error(`insert categories: ${error.message}`)
    console.log(`เพิ่มหมวดหมู่ ${rows.length} รายการ`)
  }

  if (missingShops.length) {
    const seen = new Set()
    const rows = []
    for (const s of missingShops) {
      const name = String(s.shop_name).trim()
      if (seen.has(norm(name))) continue
      seen.add(norm(name))
      rows.push({
        shop_name: name,
        shop_image: String(s.shop_image || "").trim(),
        review_count: Number(s.review_count) || 0,
        view_count: Number(s.view_count) || 0,
        trust_score: Number(s.trust_score) || 0,
        sales_volume: Number(s.sales_volume) || 0,
        is_recommended: recNames.has(norm(name)),
      })
    }
    const { error } = await sb.from("shops").insert(rows)
    if (error) throw new Error(`insert shops: ${error.message}`)
    console.log(`เพิ่มร้านค้า ${rows.length} รายการ`)
  }

  if (missingProducts.length) {
    const { data: userIds } = await sb.from("users").select("id")
    const existingUsers = new Set((userIds ?? []).map((u) => Number(u.id)))
    const chunkSize = 50
    let inserted = 0
    for (let i = 0; i < missingProducts.length; i += chunkSize) {
      const chunk = missingProducts.slice(i, i + chunkSize).map((p) => {
        const uid = Number(p.user_id)
        return {
          user_id: existingUsers.has(uid) ? uid : fallbackUserId,
          product_type: String(p.product_type || "admin"),
          shop_name: String(p.shop_name || "").trim(),
          product_category: String(p.product_category || "").trim(),
          product_name: String(p.product_name || "").trim(),
          product_description: String(p.product_description || ""),
          product_sizes: String(p.product_sizes || ""),
          product_colors: String(p.product_colors || ""),
          product_image: String(p.product_image || "").trim(),
          product_images: toImageJson(p.product_images),
          product_price: Number(p.product_price) || 0,
          product_stock: Number(p.product_stock) || 0,
          review_count: Number(p.review_count) || 0,
          view_count: Number(p.view_count) || 0,
          trust_score: Number(p.trust_score) || 0,
          sales_volume: Number(p.sales_volume) || 0,
        }
      })
      const { error } = await sb.from("store_products").insert(chunk)
      if (error) throw new Error(`insert products: ${error.message}`)
      inserted += chunk.length
      console.log(`เพิ่มสินค้า ${inserted}/${missingProducts.length}`)
    }
  }

  if (pullImages) {
    const imagePaths = new Set()
    for (const p of missingProducts) {
      if (p.product_image) imagePaths.add(String(p.product_image).replace(/^\/+/, ""))
      for (const img of parseImages(p.product_images)) imagePaths.add(img.replace(/^\/+/, ""))
    }
    for (const c of liveCategories) {
      if (c.category_image) imagePaths.add(String(c.category_image).replace(/^\/+/, ""))
    }
    for (const s of missingShops) {
      if (s.shop_image) imagePaths.add(String(s.shop_image).replace(/^\/+/, ""))
    }
    console.log(`กำลังดึงรูป ${imagePaths.size} ไฟล์…`)
    let ok = 0
    let fail = 0
    let skip = 0
    for (const rel of imagePaths) {
      const result = await downloadFile(rel)
      if (result.skipped) skip += 1
      else if (result.ok) ok += 1
      else {
        fail += 1
        console.warn(`  ไม่ได้รูป ${rel} (${result.status})`)
      }
    }
    console.log(`รูป: โหลดใหม่ ${ok} ข้ามที่มีแล้ว ${skip} ไม่สำเร็จ ${fail}`)
  }

  console.log("\nเสร็จแล้ว — รีเฟรชหน้าเว็บเพื่อดูสินค้าที่เพิ่ม")
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
