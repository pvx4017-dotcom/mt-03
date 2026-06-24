import { asset } from "@/lib/assets"
import { API, apiPath } from "@/lib/apiRoutes"
import { handleAdminGet, handleAdminPost } from "@/lib/adminDbRouter"
import {
  dbAdminNotifications,
  dbFetchBankAccounts,
  dbFetchCategories,
  dbFetchChatMessages,
  dbFetchChatThreads,
  dbFetchCustomerShopProducts,
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
  password: string
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
  const [cart, receiving, chat] = await Promise.all([
    adminGet<{ success: boolean; count?: number }>(apiPath(API.adminCart, { status: "pending" })),
    adminGet<{ success: boolean; count?: number }>(
      apiPath(API.adminCartOrders, { order_status: "receiving", admin_view: "1" }),
    ),
    adminGet<{ success: boolean; count?: number }>(apiPath(API.supportChat, { mode: "thread_user_count" })),
  ])
  return {
    cart: cart.success ? (cart.count ?? 0) : 0,
    receiving: receiving.success ? (receiving.count ?? 0) : 0,
    chat: chat.success ? (chat.count ?? 0) : 0,
  }
}

export async function fetchAdminCategories() {
  return dbFetchCategories() as Promise<AdminCategory[]>
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
  return dbFetchUsers() as Promise<AdminUser[]>
}

export async function fetchAdminCredits() {
  const data = await adminGet<ApiResult<{ credits?: Record<string, unknown>[] }>>(
    apiPath(API.adminCustomerTopup, { action: "credits" }),
  )
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
  return data.passwords ?? []
}

export async function fetchAdminTopupWallets() {
  const data = await adminGet<ApiResult<{ wallets?: Record<string, unknown>[] }>>(
    apiPath(API.adminCustomerTopup, { action: "wallets" }),
  )
  return data.wallets ?? []
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

export async function fetchAdminNotifications() {
  return dbAdminNotifications()
}

export async function fetchTopupUsers() {
  const data = await adminGet<ApiResult<{ users?: Record<string, unknown>[] }>>(
    apiPath(API.adminCustomerTopup, { action: "users" }),
  )
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
  return dbFetchCustomerShopProducts()
}

export async function fetchChatThreads() {
  return dbFetchChatThreads()
}

export async function fetchChatMessages(userId: string | number) {
  const data = await dbFetchChatMessages(Number(userId))
  if ("rows" in data && Array.isArray(data.rows)) return data.rows
  return []
}
