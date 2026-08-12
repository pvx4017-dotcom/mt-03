/**
 * รูปทั้งหมดเสิร์ฟจาก public/ ในโปรเจกต์ (แบบ PHP)
 * DB เก็บแค่ path เช่น images/foo.jpg, images/chat/..., images/kyc/...
 */

export const ASSET_BASE = (import.meta.env.VITE_ASSET_BASE ?? "").replace(/\/$/, "")

/** ไฟล์ใน public/ */
export const staticAsset = (path: string) => `/${path.replace(/^\//, "").replace(/ /g, "%20")}`

export const logoAsset = () => staticAsset("logo/logo meatt.webp")

export const flagAsset = (code: string) => staticAsset(`flags/w40/${code.toLowerCase()}.png`)

/**
 * แปลงค่าจาก DB → relative path ใต้ public/
 * รองรับ path เดิม + URL เต็มของ Supabase Storage (legacy)
 */
export function normalizeAssetPath(input: string): string {
  let raw = String(input ?? "").trim()
  if (!raw) return ""
  if (raw.startsWith("CHATIMG:")) raw = raw.slice(8).trim()

  const storageMatch = raw.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/i)
  if (storageMatch) raw = decodeURIComponent(storageMatch[1])

  raw = raw.replace(/\\/g, "/").replace(/^\/+/, "")
  if (raw.startsWith("marketting/")) raw = raw.slice("marketting/".length)

  // legacy Storage keys → public/ layout
  if (raw.startsWith("support_chat/")) return `uploads/${raw}`
  if (raw.startsWith("kyc/") && !raw.startsWith("images/")) return `uploads/${raw}`
  if (raw.startsWith("stores/")) return raw
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

/** รูปแชท — รองรับ path ใหม่ images/chat และ legacy uploads/support_chat */
export function chatImageAsset(relPath: string): string | null {
  let raw = String(relPath ?? "").trim().replace(/^\/+/, "")
  if (!raw) return null
  if (raw.startsWith("CHATIMG:")) raw = raw.slice(8).trim()
  if (/^https?:\/\//i.test(raw) && !/\/storage\/v1\/object\/public\//i.test(raw)) return raw

  const p = normalizeAssetPath(raw)
  const isChat =
    p.includes("/chat/") ||
    p.startsWith("images/chat/") ||
    p.includes("support_chat/")
  if (!isChat) return null
  if (ASSET_BASE) return `${ASSET_BASE}/${p}`
  return staticAsset(p)
}

export const formatPrice = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
