import { getSupabase } from "@/lib/supabase"

function sanitizeFileName(name: string) {
  const base = String(name ?? "").trim().replace(/\\/g, "/").split("/").pop() ?? "file"
  return base.replace(/\s+/g, "_").replace(/[^\w.\-()+]/g, "") || "file"
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

  const path = `${cleanPrefix}/${Date.now()}_${sanitizeFileName(file.name)}`
  const sb = getSupabase()
  try {
    const { error } = await sb.storage.from("uploads").upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
    if (error) throw error
    return path
  } catch (err) {
    throw new Error(storageFailMessage(err, "อัปโหลดไป Storage ไม่สำเร็จ"))
  }
}
