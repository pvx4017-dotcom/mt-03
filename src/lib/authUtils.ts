/** แปลงค่าที่ผู้ใช้กรอกให้ตรงกับที่เก็บในฐานข้อมูล (email / +66…) */
export function normalizeLoginAccount(
  raw: string,
  method: "phone" | "email",
  countryCode = "+66",
): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""

  if (method === "email" || trimmed.includes("@")) return trimmed

  if (trimmed.startsWith("+")) return trimmed.replace(/\s/g, "")

  let digits = trimmed.replace(/\D/g, "")
  if (digits.startsWith("66")) return `+${digits}`
  if (digits.startsWith("0")) digits = digits.slice(1)
  return `${countryCode}${digits}`
}
