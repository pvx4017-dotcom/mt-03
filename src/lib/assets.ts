const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")
const storageBase = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/uploads` : ""
export const ASSET_BASE = (import.meta.env.VITE_ASSET_BASE ?? storageBase).replace(/\/$/, "")

/** ไฟล์ใน public/ — โลโก้, ธงชาติ (ไม่ fetch ภายนอกตอน runtime) */
export const staticAsset = (path: string) => `/${path.replace(/^\//, "").replace(/ /g, "%20")}`

export const logoAsset = () => staticAsset("logo/logo meatt.webp")

export const flagAsset = (code: string) => staticAsset(`flags/w40/${code.toLowerCase()}.png`)

const LOCAL_PREFIXES = ["logo/", "flags/", "partner/", "menu/"]

const isLocalStatic = (p: string) =>
  LOCAL_PREFIXES.some((pre) => p.startsWith(pre)) || p.startsWith("images/banner_")

export const asset = (path: string) => {
  const p = path.replace(/^\//, "")
  if (/^https?:\/\//i.test(p)) return p
  if (isLocalStatic(p)) return staticAsset(p)
  if (!ASSET_BASE) return staticAsset(p)
  return `${ASSET_BASE}/${p}`
}

export const formatPrice = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
