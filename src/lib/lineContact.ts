/** แปลงค่าที่แอดมินกรอกให้เป็นลิงก์ที่เปิดแอป LINE ได้ */

export function normalizeLineContactUrl(raw: string): string {
  const value = String(raw ?? "").trim()
  if (!value) return ""
  if (/^https?:\/\//i.test(value) || /^line:\/\//i.test(value)) return value
  if (value.startsWith("@")) return `https://line.me/R/ti/p/${value}`
  if (/^lin\.ee\//i.test(value)) return `https://${value}`
  if (/^line\.me\//i.test(value)) return `https://${value}`
  if (/^[\w.-]+$/.test(value)) return `https://line.me/R/ti/p/@${value.replace(/^@/, "")}`
  return value
}

export function isLikelyLineUrl(url: string): boolean {
  const value = String(url ?? "").trim().toLowerCase()
  if (!value) return false
  return (
    value.startsWith("https://line.me/") ||
    value.startsWith("http://line.me/") ||
    value.startsWith("https://lin.ee/") ||
    value.startsWith("http://lin.ee/") ||
    value.startsWith("line://")
  )
}
