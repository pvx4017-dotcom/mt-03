import { getSupabase } from "@/lib/supabase"

const STAFF_ROLES = ["admin", "super_admin"] as const

let staffIdCache: { ids: Set<number>; at: number } | null = null
const STAFF_ID_CACHE_MS = 15_000

export function isStaffRole(role: unknown): boolean {
  const r = String(role ?? "").trim().toLowerCase()
  return r === "admin" || r === "super_admin"
}

export async function dbFetchStaffUserIds(): Promise<Set<number>> {
  if (staffIdCache && Date.now() - staffIdCache.at < STAFF_ID_CACHE_MS) {
    return staffIdCache.ids
  }
  const sb = getSupabase()
  const { data, error } = await sb.from("users").select("id").in("role", [...STAFF_ROLES])
  if (error) throw new Error(error.message)
  const ids = new Set(
    (data ?? []).map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0),
  )
  staffIdCache = { ids, at: Date.now() }
  return ids
}

/** รายชื่อจากตาราง users — ตัด admin / super_admin */
export function withoutStaffAccounts<T extends { role?: unknown; id?: unknown }>(rows: readonly T[]): T[] {
  return rows.filter((row) => !isStaffRole(row.role))
}

/** รายการที่ผูก user_id — ตัดของบัญชีผู้ดูแล */
export async function withoutStaffOwners<T extends Record<string, unknown>>(rows: readonly T[]): Promise<T[]> {
  if (!rows.length) return []
  const staffIds = await dbFetchStaffUserIds()
  if (!staffIds.size) return [...rows]
  return rows.filter((row) => !staffIds.has(Number(row.user_id)))
}

export async function assertCustomerUserId(userId: number): Promise<string | null> {
  if (!userId || Number.isNaN(userId)) return "ไม่พบผู้ใช้"
  const sb = getSupabase()
  const { data, error } = await sb.from("users").select("id, role").eq("id", userId).maybeSingle()
  if (error) return error.message
  if (!data) return "ไม่พบผู้ใช้"
  if (isStaffRole(data.role)) return "ไม่สามารถดำเนินการกับบัญชีผู้ดูแลได้"
  return null
}
