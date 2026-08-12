/** อัปโหลดรูปลง public/ ผ่าน Vite middleware (yarn dev / vite preview) */

const LOCAL_UPLOAD_UNAVAILABLE =
  "อัปโหลดรูปเก็บในโปรเจกต์ได้เมื่อรันบนเครื่อง (yarn dev) แล้ว commit โฟลเดอร์ public/ ก่อน deploy"

function sanitizeFileName(name: string) {
  const base = String(name ?? "").trim().replace(/\\/g, "/").split("/").pop() ?? "file"
  return base.replace(/\s+/g, "_").replace(/[^\w.\-()+]/g, "") || "file"
}

export async function uploadLocalFile(file: File, prefix: string): Promise<string> {
  const cleanPrefix = String(prefix ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/")
  if (!cleanPrefix) throw new Error("prefix อัปโหลดไม่ถูกต้อง")

  const safeName = sanitizeFileName(file.name)
  const qs = new URLSearchParams({
    prefix: cleanPrefix,
    name: safeName,
  })

  let res: Response
  try {
    res = await fetch(`/api/local-upload?${qs}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    })
  } catch {
    throw new Error(LOCAL_UPLOAD_UNAVAILABLE)
  }

  const data = (await res.json().catch(() => null)) as {
    success?: boolean
    path?: string
    message?: string
  } | null

  if (!res.ok || !data?.success || !data.path) {
    if (res.status === 404 || res.status === 405) throw new Error(LOCAL_UPLOAD_UNAVAILABLE)
    throw new Error(data?.message || LOCAL_UPLOAD_UNAVAILABLE)
  }

  return data.path
}
