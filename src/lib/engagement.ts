const CHECKIN_KEY = (uid: string | number) => `meta_checkin_v1_${uid}`
const LEVELS_KEY = "meta_seller_levels_v1"
const LOAN_KEY = (uid: string | number) => `meta_loan_apps_v1_${uid}`

export type CheckinState = {
  dates: string[]
  total: number
}

export type SellerLevel = {
  id: number
  code: string
  name: string
  min_topup: number
  commission_rate: string
  referral_reward: string
  sort_order: number
  is_active: boolean
}

export type LoanApp = {
  id: string
  amount: number
  name: string
  phone: string
  status: "pending" | "reviewing"
  created_at: string
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function loadCheckin(uid: string | number | undefined | null): CheckinState {
  if (uid == null || uid === "") return { dates: [], total: 0 }
  try {
    const raw = localStorage.getItem(CHECKIN_KEY(uid))
    if (!raw) return { dates: [], total: 0 }
    const parsed = JSON.parse(raw) as CheckinState
    return { dates: parsed.dates ?? [], total: Number(parsed.total ?? 0) }
  } catch {
    return { dates: [], total: 0 }
  }
}

export function isCheckedInToday(uid: string | number | undefined | null) {
  return loadCheckin(uid).dates.includes(todayKey())
}

export function performLocalCheckin(uid: string | number | undefined | null, points = 20) {
  if (uid == null || uid === "") return { ok: false, message: "กรุณาเข้าสู่ระบบ", state: loadCheckin(uid) }
  const state = loadCheckin(uid)
  const today = todayKey()
  if (state.dates.includes(today)) {
    return { ok: false, message: "วันนี้คุณเช็กอินแล้ว", state }
  }
  const next: CheckinState = { dates: [...state.dates, today], total: state.total + points }
  localStorage.setItem(CHECKIN_KEY(uid), JSON.stringify(next))
  return { ok: true, message: `เช็กอินสำเร็จ +${points} พอยท์`, state: next }
}

export const DEFAULT_SELLER_LEVELS: SellerLevel[] = [
  { id: 1, code: "L1", name: "สมาชิกทั่วไป", min_topup: 0, commission_rate: "0.5%~1%", referral_reward: "5", sort_order: 1, is_active: true },
  { id: 2, code: "L2", name: "ร้านค้าเงิน", min_topup: 100, commission_rate: "0.8%~1.5%", referral_reward: "8", sort_order: 2, is_active: true },
  { id: 3, code: "L3", name: "ร้านค้าทอง", min_topup: 500, commission_rate: "1%~2%", referral_reward: "12", sort_order: 3, is_active: true },
  { id: 4, code: "L4", name: "ร้านค้าเพชร", min_topup: 2000, commission_rate: "1.5%~2.5%", referral_reward: "16", sort_order: 4, is_active: true },
  { id: 5, code: "L5", name: "ร้านค้าแพลทินัม", min_topup: 5000, commission_rate: "2%~3%", referral_reward: "20", sort_order: 5, is_active: true },
]

export function loadSellerLevels(): SellerLevel[] {
  try {
    const raw = localStorage.getItem(LEVELS_KEY)
    if (!raw) return DEFAULT_SELLER_LEVELS
    const parsed = JSON.parse(raw) as SellerLevel[]
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SELLER_LEVELS
  } catch {
    return DEFAULT_SELLER_LEVELS
  }
}

export function saveSellerLevels(rows: SellerLevel[]) {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(rows))
}

export function memberLevelForBalance(balance: number, levels?: SellerLevel[]) {
  const active = (levels?.length ? levels : loadSellerLevels())
    .filter((row) => row.is_active)
    .sort((a, b) => a.min_topup - b.min_topup)
  let current = active[0]?.code ?? "L1"
  for (const row of active) {
    if (balance >= row.min_topup) current = row.code
  }
  return current
}

export function loadLoans(uid: string | number | undefined | null): LoanApp[] {
  if (uid == null || uid === "") return []
  try {
    const raw = localStorage.getItem(LOAN_KEY(uid))
    return raw ? (JSON.parse(raw) as LoanApp[]) : []
  } catch {
    return []
  }
}

export function saveLoan(uid: string | number | undefined | null, app: Omit<LoanApp, "id" | "status" | "created_at">) {
  if (uid == null || uid === "") return
  const rows = loadLoans(uid)
  rows.unshift({
    ...app,
    id: `LOAN-${Date.now()}`,
    status: "pending",
    created_at: new Date().toISOString(),
  })
  localStorage.setItem(LOAN_KEY(uid), JSON.stringify(rows))
}
