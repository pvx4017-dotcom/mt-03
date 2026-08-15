/**
 * รูปสินค้าที่มีอยู่แล้วในแคตตาล็อก → public/images ของโปรเจกต์
 * รูปร้านค้า + สินค้าที่อัปโหลดใหม่ + แชท / KYC / หมวด / สไลด์ → Supabase Storage bucket "uploads"
 */

import { LOGO_PATH } from "@/lib/brand"

export const ASSET_BASE = (import.meta.env.VITE_ASSET_BASE ?? "").replace(/\/$/, "")

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")

export const STORAGE_ASSET_BASE = (
  import.meta.env.VITE_STORAGE_ASSET_BASE ??
  (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/uploads` : "")
).replace(/\/$/, "")

export const staticAsset = (path: string) => `/${path.replace(/^\//, "").replace(/ /g, "%20")}`

export const logoAsset = () => staticAsset(LOGO_PATH)

export const flagAsset = (code: string) => staticAsset(`flags/w40/${code.toLowerCase()}.png`)

export function normalizeAssetPath(input: string): string {
  let raw = String(input ?? "").trim()
  if (!raw) return ""
  if (raw.startsWith("CHATIMG:")) raw = raw.slice(8).trim()

  const storageMatch = raw.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/i)
  if (storageMatch) raw = decodeURIComponent(storageMatch[1])

  raw = raw.replace(/\\/g, "/").replace(/^\/+/, "")
  if (raw.startsWith("marketting/")) raw = raw.slice("marketting/".length)
  return raw
}

/** สินค้าเดิมในแคตตาล็อก + รูปร้านเดิมที่ยังอยู่ใน repo — เสิร์ฟจากโปรเจกต์ */
export function isProjectCatalogPath(path: string): boolean {
  const p = normalizeAssetPath(path)
  if (!p) return false
  if (p.startsWith("images/store_product")) return true
  if (p.startsWith("images/category_")) return true
  if (p.startsWith("images/shop_") || p.startsWith("images/general_shop_")) return true
  if (p.startsWith("images/banner_")) return true
  // อัปโหลดเก่าลง public/images/<timestamp>_... ก่อนย้ายไป Storage
  if (/^images\/\d+_/.test(p)) return true
  return false
}

/** ร้านค้าใหม่ / สินค้าใหม่ / แชท / KYC / หมวด / สไลด์ → Storage */
export function isStorageAssetPath(path: string): boolean {
  const p = normalizeAssetPath(path)
  if (!p) return false
  if (isProjectCatalogPath(p)) return false
  if (p.includes("support_chat/") || p.startsWith("images/chat/")) return true
  if (p.includes("/kyc/") || p.startsWith("kyc/") || p.startsWith("images/kyc/")) return true
  if (
    p.startsWith("categories/") ||
    p.startsWith("slides/") ||
    p.startsWith("products/") ||
    p.startsWith("shops/") ||
    p.startsWith("stores/") ||
    p.startsWith("receiving_qr/") ||
    p.startsWith("uploads/")
  )
    return true
  return false
}

function storageObjectUrl(p: string) {
  if (!STORAGE_ASSET_BASE) return staticAsset(p.startsWith("uploads/") ? p : `uploads/${p}`)
  // bucket key: ตัด uploads/ นำหน้าถ้ามี
  const bucketKey = p.startsWith("uploads/") ? p.slice("uploads/".length) : p
  return `${STORAGE_ASSET_BASE}/${bucketKey}`
}

export const asset = (path: string) => {
  const raw = String(path ?? "").trim()
  if (!raw) return logoAsset()
  if (/^https?:\/\//i.test(raw) && !/\/storage\/v1\/object\/public\//i.test(raw)) return raw

  const p = normalizeAssetPath(raw)
  if (!p) return logoAsset()

  if (isStorageAssetPath(p)) return storageObjectUrl(p)

  // สินค้าเดิมในแคตตาล็อก + seed ใน public/ (เช่น images/store_product_* , images/shop_*)
  if (ASSET_BASE) return `${ASSET_BASE}/${p}`
  return staticAsset(p)
}

export function chatImageAsset(relPath: string): string | null {
  let raw = String(relPath ?? "").trim().replace(/^\/+/, "")
  if (!raw) return null
  if (raw.startsWith("CHATIMG:")) raw = raw.slice(8).trim()
  if (/^https?:\/\//i.test(raw) && !/\/storage\/v1\/object\/public\//i.test(raw)) return raw

  const p = normalizeAssetPath(raw)
  if (!p.includes("support_chat/") && !p.includes("/chat/") && !p.startsWith("images/chat/")) return null
  return storageObjectUrl(p)
}

export const formatPrice = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
