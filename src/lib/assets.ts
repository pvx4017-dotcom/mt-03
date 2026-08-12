/**
 * รูปสินค้า / ร้านค้า → public/ ในโปรเจกต์
 * รูปอื่น (แชท, KYC, หมวด, สไลด์) → Supabase Storage bucket "uploads"
 */

export const ASSET_BASE = (import.meta.env.VITE_ASSET_BASE ?? "").replace(/\/$/, "")

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")

export const STORAGE_ASSET_BASE = (
  import.meta.env.VITE_STORAGE_ASSET_BASE ??
  (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/uploads` : "")
).replace(/\/$/, "")

export const staticAsset = (path: string) => `/${path.replace(/^\//, "").replace(/ /g, "%20")}`

export const logoAsset = () => staticAsset("logo/logo meatt.webp")

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

/** สินค้า / ร้าน — เสิร์ฟจากโปรเจกต์ */
export function isProjectCatalogPath(path: string): boolean {
  const p = normalizeAssetPath(path)
  if (!p) return false
  if (p.startsWith("stores/")) return true
  if (p.startsWith("uploads/products/") || p.startsWith("uploads/shops/")) return true
  if (p.startsWith("images/store_product")) return true
  if (p.startsWith("images/shop_") || p.startsWith("images/general_shop_")) return true
  if (p.startsWith("images/banner_")) return true
  // อัปโหลดสินค้า/ร้านใหม่ลง public/images/<timestamp>_...
  if (/^images\/\d+_/.test(p)) return true
  return false
}

/** แชท / KYC / หมวด / สไลด์ (และ uploads อื่นที่ไม่ใช่สินค้า/ร้าน) → Storage */
export function isStorageAssetPath(path: string): boolean {
  const p = normalizeAssetPath(path)
  if (!p) return false
  if (isProjectCatalogPath(p)) return false
  if (p.includes("support_chat/") || p.startsWith("images/chat/")) return true
  if (p.includes("/kyc/") || p.startsWith("kyc/") || p.startsWith("images/kyc/")) return true
  if (
    p.startsWith("categories/") ||
    p.startsWith("slides/") ||
    p.startsWith("uploads/categories/") ||
    p.startsWith("uploads/slides/")
  )
    return true
  if (p.startsWith("uploads/") && !p.startsWith("uploads/products/") && !p.startsWith("uploads/shops/"))
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
  if (!raw) return staticAsset("logo/logo meatt.webp")
  if (/^https?:\/\//i.test(raw) && !/\/storage\/v1\/object\/public\//i.test(raw)) return raw

  const p = normalizeAssetPath(raw)
  if (!p) return staticAsset("logo/logo meatt.webp")

  if (isStorageAssetPath(p)) return storageObjectUrl(p)

  // สินค้า/ร้าน + seed อื่นใน public/ (เช่น images/category_* ที่ยังอยู่ใน repo)
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
