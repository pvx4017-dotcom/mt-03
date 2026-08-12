/**
 * รูปสินค้า/ร้าน/catalog ทั้งหมดเสิร์ฟจาก public/ ในโปรเจกต์
 * คอลัมน์ในฐานข้อมูลเก็บแค่ path ข้อความ (เช่น images/foo.jpg) ไม่เก็บไฟล์รูป
 */

export const ASSET_BASE = (import.meta.env.VITE_ASSET_BASE ?? "").replace(/\/$/, "")

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")

/** fallback Storage — เปิดเฉพาะเมื่อจำเป็น (VITE_USE_STORAGE_FALLBACK=1) */
export const STORAGE_ASSET_BASE = (
  import.meta.env.VITE_STORAGE_ASSET_BASE ??
  (import.meta.env.VITE_USE_STORAGE_FALLBACK === "1" && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/uploads`
    : "")
).replace(/\/$/, "")

/** ไฟล์ใน public/ */
export const staticAsset = (path: string) => `/${path.replace(/^\//, "").replace(/ /g, "%20")}`

export const logoAsset = () => staticAsset("logo/logo meatt.webp")

export const flagAsset = (code: string) => staticAsset(`flags/w40/${code.toLowerCase()}.png`)

/**
 * แปลงค่าจาก DB → relative path ใต้ public/
 * รองรับ path เดิม และ URL เต็มของ Supabase Storage
 */
export function normalizeAssetPath(input: string): string {
  let raw = String(input ?? "").trim()
  if (!raw) return ""
  if (raw.startsWith("CHATIMG:")) raw = raw.slice(8).trim()

  // URL เต็ม → ตัดเหลือ object key
  const storageMatch = raw.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/i)
  if (storageMatch) raw = decodeURIComponent(storageMatch[1])

  raw = raw.replace(/\\/g, "/").replace(/^\/+/, "")
  if (raw.startsWith("marketting/")) raw = raw.slice("marketting/".length)

  // chat/kyc เก็บใต้ public/uploads/...
  if (raw.startsWith("support_chat/")) return `uploads/${raw}`
  if (raw.startsWith("kyc/")) return `uploads/${raw}`
  return raw
}

export const asset = (path: string) => {
  const raw = String(path ?? "").trim()
  if (!raw) return staticAsset("logo/logo meatt.webp")
  if (/^https?:\/\//i.test(raw) && !/\/storage\/v1\/object\/public\//i.test(raw)) return raw

  const p = normalizeAssetPath(raw)
  if (!p) return staticAsset("logo/logo meatt.webp")
  if (ASSET_BASE) return `${ASSET_BASE}/${p}`
  return staticAsset(p)
}

/** รูปแชท */
export function chatImageAsset(relPath: string): string | null {
  let raw = String(relPath ?? "").trim().replace(/^\/+/, "")
  if (!raw) return null
  if (raw.startsWith("CHATIMG:")) raw = raw.slice(8).trim()
  const p = normalizeAssetPath(raw)
  if (!p.includes("support_chat/")) return null
  if (ASSET_BASE) return `${ASSET_BASE}/${p}`
  if (STORAGE_ASSET_BASE) {
    const bucketKey = p.startsWith("uploads/") ? p.slice("uploads/".length) : p
    return `${STORAGE_ASSET_BASE}/${bucketKey}`
  }
  return staticAsset(p)
}

export const formatPrice = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
