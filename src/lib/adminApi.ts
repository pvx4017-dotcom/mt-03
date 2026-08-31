import { asset } from "@/lib/assets"
import { API, apiPath } from "@/lib/apiRoutes"
import { handleAdminGet, handleAdminPost } from "@/lib/adminDbRouter"
import {
  dbAdminNotifications,
  dbFetchBankAccounts,
  dbFetchCategories,
  dbFetchChatMessages,
  dbFetchChatThreads,
  dbFetchAllCustomerShopProducts,
  dbFetchAllCustomerStores,
  dbFetchDeposits,
  dbFetchPaymentLimits,
  dbFetchProducts,
  dbFetchShops,
  dbFetchSlides,
  dbFetchUsers,
  dbFetchVerifications,
  dbFetchWithdrawals,
} from "@/lib/dbService"
import { isSupabaseConfigured } from "@/lib/supabase"

type ApiResult<T> = { success: boolean; message?: string } & T

function ensureConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env")
  }
}

export function adminAsset(path: string) {
  return asset(path)
}

export function formatAdminDate(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("th-TH")
}

export type AdminCategory = {
  id: number
  category_name: string
  category_image: string
  created_at?: string
}

export type AdminShop = {
  id: number
  shop_name: string
  shop_image: string
  review_count: number
  view_count: number
  trust_score: string | number
  sales_volume: number
  created_at?: string
}

export type AdminUser = {
  id: number
  username: string
  email: string
  phone: string | null
  status: string
  role: string
  referral_code: string
  referred_by: string
  registered_at: string
}

export type AdminSlide = {
  id: number
  slide_image: string
  created_at?: string
}

export type AdminProduct = {
  id: number
  shop_name: string
  product_category: string
  product_name: string
  product_image: string
  product_price: string | number
  product_stock?: number
  created_at?: string
}

export async function adminGet<T>(path: string) {
  ensureConfigured()
  return handleAdminGet(path) as Promise<T>
}

export async function adminPost<T>(path: string, body: FormData) {
  ensureConfigured()
  return handleAdminPost(path, body) as Promise<T>
}

export async function fetchAdminBadges() {
  ensureConfigured()
  const [cart, receiving, threads] = await Promise.all([
    adminGet<{ success: boolean; count?: number }>(apiPath(API.adminCart, { status: "pending" })),
    adminGet<{ success: boolean; count?: number }>(
      apiPath(API.adminCartOrders, { order_status: "receiving", admin_view: "1" }),
    ),
    fetchChatThreads(),
  ])
  const unreadChat = threads.reduce(
    (sum, t) => sum + Number((t as Record<string, unknown>).message_count ?? (t as Record<string, unknown>).unread ?? 0),
    0,
  )
  return {
    cart: cart.success ? (cart.count ?? 0) : 0,
    receiving: receiving.success ? (receiving.count ?? 0) : 0,
    chat: unreadChat,
  }
}

export async function fetchAdminCategories() {
  ensureConfigured()
  const data = await adminGet<{ success?: boolean; categories?: AdminCategory[]; message?: string }>(
    API.adminProductCategories,
  )
  if (data.success === false) {
    throw new Error(String(data.message ?? "โหลดหมวดหมู่ไม่สำเร็จ"))
  }
  if (Array.isArray(data.categories)) return data.categories
  return (await dbFetchCategories()) as AdminCategory[]
}

export async function fetchAdminRecommendedShops() {
  return dbFetchShops(true) as Promise<AdminShop[]>
}

export async function fetchAdminGeneralShops() {
  return dbFetchShops(false) as Promise<AdminShop[]>
}

export async function fetchAdminSlideImages() {
  return dbFetchSlides() as Promise<AdminSlide[]>
}

export async function fetchAdminStoreProducts() {
  return dbFetchProducts() as Promise<AdminProduct[]>
}

export async function fetchAdminUsers() {
  const rows = await dbFetchUsers()
  return rows.map((u) => ({
    ...u,
    username: String(u.username ?? `user_${u.id}`),
    email: String(u.email ?? ""),
    phone: u.phone == null ? null : String(u.phone),
    status: String(u.status ?? "active"),
    referral_code: String(u.referral_code ?? ""),
    referred_by: String(u.referred_by ?? ""),
    registered_at: String(u.registered_at ?? ""),
    role: String(u.role ?? "customer"),
  })) as AdminUser[]
}

export type AdminPanelAccount = {
  id: number
  username: string | null
  email: string | null
  phone: string | null
  role: string
  status: string
  registered_at?: string
}

export async function fetchSuperAdminAccounts() {
  ensureConfigured()
  const data = await adminGet<ApiResult<{ accounts?: AdminPanelAccount[] }>>(API.adminSettings)
  if (data.success === false) throw new Error(String(data.message ?? "โหลดข้อมูลไม่สำเร็จ"))
  return data.accounts ?? []
}

export async function superAdminResetAdminPassword(userId: number, newPassword: string, confirmPassword: string) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("action", "reset_admin_password")
  fd.append("user_id", String(userId))
  fd.append("new_password", newPassword)
  fd.append("confirm_password", confirmPassword)
  return adminPost<ApiResult<Record<string, never>>>(API.adminSettings, fd)
}

export async function fetchAdminLineContact() {
  ensureConfigured()
  const data = await adminGet<ApiResult<{ line_url?: string }>>(API.platformContact)
  return String(data.line_url ?? "").trim()
}

export async function saveAdminLineContact(lineUrl: string) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("line_url", lineUrl)
  return adminPost<ApiResult<{ line_url?: string }>>(API.platformContact, fd)
}

export async function fetchAdminCredits() {
  const data = await adminGet<ApiResult<{ credits?: Record<string, unknown>[] }>>(
    apiPath(API.adminCustomerTopup, { action: "credits" }),
  )
  if (data.success === false) throw new Error(String(data.message ?? "โหลดข้อมูลเครดิตไม่สำเร็จ"))
  return data.credits ?? []
}

export async function fetchAdminVerifications() {
  return dbFetchVerifications()
}

export async function fetchAdminBankAccounts() {
  return dbFetchBankAccounts()
}

export async function fetchAdminWithdrawPasswords() {
  const data = await adminGet<ApiResult<{ passwords?: Record<string, unknown>[] }>>(
    API.adminWithdrawPasswords,
  )
  if (data.success === false) throw new Error(String(data.message ?? "โหลดข้อมูลรหัสถอนไม่สำเร็จ"))
  return (data.passwords ?? []).map((row) => ({
    ...row,
    is_active: row.has_password ? 1 : 0,
    withdraw_password: row.has_password ? "******" : "",
  }))
}

export async function fetchAdminTopupWallets() {
  const data = await adminGet<ApiResult<{ wallets?: Record<string, unknown>[] }>>(
    apiPath(API.adminCustomerTopup, { action: "wallets" }),
  )
  if (data.success === false) throw new Error(String(data.message ?? "โหลดข้อมูลกระเป๋าไม่สำเร็จ"))
  return (data.wallets ?? []).map((row) => ({
    ...row,
    user_id: row.id ?? row.user_id,
    balance: row.wallet_balance ?? row.balance ?? 0,
    updated_at: row.updated_at ?? row.registered_at ?? null,
  }))
}

export async function fetchAdminUserWallet(userId: number) {
  const rows = await fetchAdminTopupWallets()
  const row = rows.find((r) => Number(r.user_id) === userId)
  return Number(row?.balance ?? 0)
}

export async function fetchAdminDeposits() {
  return dbFetchDeposits()
}

export async function fetchAdminWithdrawals() {
  return dbFetchWithdrawals()
}

export async function fetchAdminPaymentLimits() {
  return dbFetchPaymentLimits()
}

export async function fetchAdminShippingAddresses() {
  const data = await adminGet<{ success?: boolean; message?: string; addresses?: Record<string, unknown>[] }>(
    API.adminShippingAddresses,
  )
  if (data.success === false) throw new Error(String(data.message ?? "โหลดข้อมูลที่อยู่ไม่สำเร็จ"))
  return data.addresses ?? []
}

export async function fetchAdminNotifications() {
  return dbAdminNotifications()
}

export async function fetchTopupUsers() {
  const data = await adminGet<ApiResult<{ users?: Record<string, unknown>[] }>>(
    apiPath(API.adminCustomerTopup, { action: "users" }),
  )
  if (data.success === false) throw new Error(String(data.message ?? "โหลดข้อมูลผู้ใช้ไม่สำเร็จ"))
  return data.users ?? []
}

export async function fetchAdminCart(status = "pending") {
  return adminGet<ApiResult<{ items?: Record<string, unknown>[]; count?: number }>>(
    apiPath(API.adminCart, { status }),
  )
}

export async function fetchAdminOrders(orderStatus: string) {
  const data = await adminGet<
    ApiResult<{ items?: Record<string, unknown>[]; orders?: Record<string, unknown>[]; count?: number }>
  >(
    apiPath(API.adminCartOrders, { order_status: orderStatus, admin_view: "1" }),
  )
  const items = data.items ?? data.orders ?? []
  return { ...data, items, orders: items }
}

export async function fetchCustomerShopProducts() {
  return dbFetchAllCustomerShopProducts()
}

export async function fetchCustomerStores() {
  return dbFetchAllCustomerStores()
}

export async function fetchChatThreads() {
  ensureConfigured()
  const data = await adminGet<{ success?: boolean; rows?: Record<string, unknown>[]; message?: string }>(
    apiPath(API.supportChat, { mode: "threads" }),
  )
  if (data.success === false) {
    throw new Error(String(data.message ?? "โหลดรายการแชทไม่สำเร็จ"))
  }
  if (Array.isArray(data.rows)) return data.rows
  return dbFetchChatThreads()
}

export async function fetchChatMessages(userId: string | number) {
  ensureConfigured()
  const data = await adminGet<{ success?: boolean; rows?: Record<string, unknown>[]; message?: string }>(
    apiPath(API.supportChat, { mode: "messages", user_id: String(userId) }),
  )
  if (data.success === false) {
    throw new Error(String(data.message ?? "โหลดข้อความไม่สำเร็จ"))
  }
  if (Array.isArray(data.rows)) return data.rows
  const fallback = await dbFetchChatMessages(Number(userId))
  if ("rows" in fallback && Array.isArray(fallback.rows)) return fallback.rows
  return []
}
