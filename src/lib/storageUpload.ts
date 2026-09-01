import { asset, normalizeAssetPath } from "@/lib/assets"
import { getSupabase } from "@/lib/supabase"

function sanitizeFileName(name: string) {
  const base = String(name ?? "").trim().replace(/\\/g, "/").split("/").pop() ?? "file"
  return base.replace(/\s+/g, "_").replace(/[^\w.\-()+]/g, "") || "file"
}

function fileNameWithExt(file: File) {
  const cleaned = sanitizeFileName(file.name)
  if (/\.[a-z0-9]+$/i.test(cleaned) && cleaned !== "file") return cleaned
  const mime = String(file.type ?? "").toLowerCase()
  const stem = cleaned.replace(/\.[^.]+$/, "") || "photo"
  if (mime.includes("png")) return `${stem}.png`
  if (mime.includes("webp")) return `${stem}.webp`
  if (mime.includes("gif")) return `${stem}.gif`
  return `${stem}.jpg`
}

function storageFailMessage(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err ?? "")
  if (/bucket.*not found|Bucket not found|does not exist/i.test(msg)) {
    return `${fallback} — ยังไม่มี Storage bucket "uploads" (รัน scripts/setup-storage-uploads.sql)`
  }
  if (/policy|denied|Unauthorized|403|row-level security|restricted|quota/i.test(msg)) {
    return `${fallback} — Storage ไม่พร้อม (${msg})`
  }
  return msg ? `${fallback}: ${msg}` : fallback
}

/**
 * อัปโหลดไฟล์ไป Supabase Storage bucket "uploads"
 * ใช้กับแชท / KYC / หมวด / สไลด์ / รูปร้าน / สินค้าที่อัปโหลดใหม่
 * คืน path สำหรับเก็บใน DB เช่น slides/....jpg, shops/....jpg, products/....jpg
 */
export async function uploadToSupabaseStorage(file: File, prefix: string): Promise<string> {
  const cleanPrefix = String(prefix ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/")
  if (!cleanPrefix) throw new Error("prefix อัปโหลดไม่ถูกต้อง")

  const path = `${cleanPrefix}/${Date.now()}_${fileNameWithExt(file)}`
  const sb = getSupabase()
  try {
    const { error } = await sb.storage.from("uploads").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    })
    if (error) throw error
    return path
  } catch (err) {
    throw new Error(storageFailMessage(err, "อัปโหลดไป Storage ไม่สำเร็จ"))
  }
}

function storageObjectKey(input: string): string {
  const p = normalizeAssetPath(input)
  if (!p) return ""
  return p.startsWith("uploads/") ? p.slice("uploads/".length) : p
}

/**
 * URL สำหรับแสดงรูปใน Storage — ใช้ signed URL (ใช้ได้ทั้ง bucket สาธารณะและส่วนตัว)
 * ถ้า sign ไม่ได้ ค่อย fallback เป็น public URL จาก asset()
 */
export async function resolveUploadsDisplayUrl(input: string): Promise<string> {
  const raw = String(input ?? "").trim()
  if (!raw) return ""
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw
  if (/^https?:\/\//i.test(raw) && /\/storage\/v1\/object\/sign\//i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw) && !/\/storage\/v1\/object\/public\//i.test(raw)) return raw

  const key = storageObjectKey(raw)
  if (!key) return asset(raw)

  try {
    const sb = getSupabase()
    const signed = await sb.storage.from("uploads").createSignedUrl(key, 60 * 60)
    if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl

    const down = await sb.storage.from("uploads").download(key)
    if (!down.error && down.data) return URL.createObjectURL(down.data)
  } catch {
    /* fall through */
  }
  return asset(raw)
}

export async function attachSignedUploadUrls<T extends Record<string, unknown>>(
  row: T,
  keys: (keyof T & string)[],
): Promise<T> {
  const next: Record<string, unknown> = { ...row }
  await Promise.all(
    keys.map(async (key) => {
      const val = String(row[key] ?? "").trim()
      if (!val) return
      next[`${key}_url`] = await resolveUploadsDisplayUrl(val)
    }),
  )
  return next as T
}
