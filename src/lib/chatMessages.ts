/** Shared support-chat helpers (customer + admin) */

export const CHAT_DELETED_MARKER = "CHATDEL:"

export function isChatDeletedMessage(raw: unknown) {
  const s = String(raw ?? "")
  return s === CHAT_DELETED_MARKER || s.startsWith("CHATDEL:")
}

export function chatMessagePreview(raw: unknown) {
  const s = String(raw ?? "")
  if (isChatDeletedMessage(s)) return "ข้อความนี้ถูกลบแล้ว"
  if (s.startsWith("CHATIMG:")) return "[รูปภาพ]"
  return s
}

/** Poll signature that changes on insert / edit / soft-delete */
export function chatRowsSignature(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "0"
  let h = 0
  for (const r of rows) {
    h = (Math.imul(h, 31) + Number(r.id ?? 0)) | 0
    h = (Math.imul(h, 31) + String(r.message ?? "").length) | 0
    h = (Math.imul(h, 31) + String(r.sender_type ?? "").length) | 0
  }
  const last = rows[rows.length - 1]
  return `${rows.length}:${String(last.id ?? "")}:${String(last.created_at ?? "")}:${h}`
}
