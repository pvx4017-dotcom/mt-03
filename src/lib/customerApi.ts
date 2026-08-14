import { asset } from "@/lib/assets"
import { API, apiPath } from "@/lib/apiRoutes"
import { handleAdminGet, handleAdminPost } from "@/lib/adminDbRouter"
import * as db from "@/lib/dbService"
import { isSupabaseConfigured } from "@/lib/supabase"

export type CustomerUser = {
  id?: number | string
  username?: string
  phone?: string
  email?: string
  role?: string
  credit?: number | string
  wallet_balance?: number
  is_bank_linked?: boolean
  has_withdraw_password?: boolean
  bank_account?: {
    account_name?: string
    account_number?: string
    bank_name?: string
  }
}

export type ProductOrderRow = {
  id: number
  product_name?: string
  shop_name?: string
  product_image?: string
  quantity?: number
  unit_price?: number | string
  total_price?: number | string
  selected_color?: string
  selected_size?: string
}

export type OrderHubCounts = {
  pending_payment?: number
  to_ship?: number
  to_receive?: number
  pending_review?: number
  after_sales?: number
}

export type NotificationRow = {
  id?: number
  title?: string
  message?: string
  created_at?: string
  is_read?: number
}

export type ChatMessageRow = {
  id?: number
  sender_type?: string
  message?: string
  created_at?: string
}

export type ReviewItem = {
  product_image?: string
  review_text?: string
  star_rating?: number
}

export type FollowShopRow = {
  shop_name?: string
  shop_image?: string
  review_count?: number
  view_count?: number
  trust_score?: number
  sales_volume?: number
}

export type StoreProductRow = Record<string, unknown> & {
  id?: number
  product_name?: string
  shop_name?: string
  product_category?: string
  product_image?: string
  product_images?: string
  product_price?: number | string
  product_stock?: number
  view_count?: number
  trust_score?: number
  sales_volume?: number
  catalog_source?: string
  user_id?: number
}

function ensureConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env")
  }
}

export function parseCustomerImage(img: unknown): string {
  const s = String(img ?? "").trim()
  if (!s) return asset("")
  if (s.startsWith("CHATIMG:")) return parseCustomerImage(s.slice(8))
  // URL ภายนอกที่ไม่ใช่ Supabase Storage ใช้ตรง ๆ — ที่เหลือให้ asset() เลือกโปรเจกต์หรือ Storage
  if (/^https?:\/\//i.test(s) && !/\/storage\/v1\/object\/public\//i.test(s)) return s
  return asset(s)
}

export function fmtMoney(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n)
    ? n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00"
}

export function fmtDateTime(value: unknown) {
  if (!value) return "-"
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function maskPhone(phone: unknown) {
  const s = String(phone ?? "").trim()
  if (!s || s === "-") return "-"
  if (s.length <= 4) return "****"
  return s.slice(0, -4) + "****"
}

export function formatRelativeTime(value: unknown) {
  const ts = new Date(String(value ?? "")).getTime()
  if (!Number.isFinite(ts) || ts <= 0) return "เมื่อสักครู่"
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return "เมื่อสักครู่"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diffSec / 86400)} วันที่แล้ว`
}

export function parseProductRowImage(row: StoreProductRow): string {
  const multiRaw = row.product_images as unknown
  if (multiRaw) {
    if (Array.isArray(multiRaw) && multiRaw.length) {
      const first = String(multiRaw[0] ?? "").trim()
      if (first) return parseCustomerImage(first)
    } else {
      const multi = String(multiRaw).trim()
      if (multi) {
        try {
          const parsed = JSON.parse(multi) as unknown
          if (Array.isArray(parsed) && parsed.length) {
            const first = String(parsed[0] ?? "").trim()
            if (first) return parseCustomerImage(first)
          }
        } catch {
          /* legacy */
        }
      }
    }
  }
  return parseCustomerImage(row.product_image)
}

export async function fetchUserInfo() {
  ensureConfigured()
  return handleAdminGet(API.userInfo) as Promise<{ success: boolean; message?: string; user?: CustomerUser }>
}

export async function processAuth(fd: FormData) {
  ensureConfigured()
  return handleAdminPost(API.authProcess, fd) as Promise<{ success: boolean; message?: string; redirect?: string }>
}

export async function fetchCartOrders() {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.productOrders, { status: "pending" }))
  return (data.orders ?? []) as ProductOrderRow[]
}

type ApiResult = { success: boolean; message?: string; [key: string]: unknown }

export async function createProductOrder(fd: FormData) {
  ensureConfigured()
  return handleAdminPost(API.ordersCreate, fd) as Promise<ApiResult>
}

export async function confirmProductOrders(fd: FormData) {
  ensureConfigured()
  return handleAdminPost(API.ordersConfirm, fd) as Promise<ApiResult>
}

export async function deleteProductOrder(orderId: number) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("order_id", String(orderId))
  return handleAdminPost(API.ordersDelete, fd) as Promise<ApiResult>
}

export async function updateProductOrderQty(orderId: number, delta: number) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("order_id", String(orderId))
  fd.append("delta", String(delta))
  return handleAdminPost(API.ordersUpdateQty, fd) as Promise<ApiResult>
}

export async function setProductOrderQty(orderId: number, quantity: number) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("order_id", String(orderId))
  fd.append("quantity", String(quantity))
  return handleAdminPost(API.ordersSetQty, fd) as Promise<ApiResult>
}

export async function fetchPendingPaymentOrders() {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.adminCart, { status: "pending", filter_user: "1" }))
  return ((data.items ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    bill_no: row.bill_no ?? row.order_no,
    added_at: row.added_at ?? row.created_at,
  }))
}

export async function fetchToShipOrders() {
  ensureConfigured()
  const data = await handleAdminGet(
    apiPath(API.adminCartOrders, { order_status: "shipping", filter_user: "1" }),
  )
  return ((data.items ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    ordered_at: row.ordered_at ?? row.created_at,
  }))
}

export async function fetchToReceiveOrders() {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.adminShippingHistory, { to_status: "receiving" }))
  return ((data.items ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    ordered_at: row.ordered_at ?? row.created_at,
  }))
}

export async function fetchCompletedOrders() {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.adminShippingHistory, { to_status: "success" }))
  return ((data.items ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    ordered_at: row.ordered_at ?? row.created_at,
  }))
}

export async function fetchOrderContacts() {
  ensureConfigured()
  const data = await handleAdminGet(API.orderContacts)
  if (data.success === false) return []
  return ((data.orders ?? data.items ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    bill_no: row.bill_no ?? row.order_no,
    created_at: row.created_at ?? row.added_at,
  }))
}

export async function fetchOrderHubCounts() {
  ensureConfigured()
  return handleAdminGet(API.orderHubCounts) as Promise<OrderHubCounts & { success?: boolean }>
}

export async function fetchPaymentLimits() {
  ensureConfigured()
  return handleAdminGet(API.adminPaymentLimits) as Promise<{
    success: boolean
    limits?: { min_deposit?: number; min_withdraw?: number }
    min_deposit?: number
    min_withdraw?: number
    message?: string
  }>
}

export async function fetchStoreCustomerStatus() {
  ensureConfigured()
  return handleAdminGet(API.storeStatus) as Promise<{
    success: boolean
    has_store?: boolean
    store?: Record<string, unknown>
    sold_count?: number
    wallet_balance?: number
    wallet_profit?: number
    store_products_mirror_count?: number
    message?: string
  }>
}

export async function submitDepositRequest(amount: number) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("amount", amount.toFixed(2))
  fd.append("payment_method", "bank_transfer")
  return handleAdminPost(API.walletDeposit, fd) as Promise<{
    success: boolean
    message?: string
    user_id?: number
    amount?: string
    request_no?: string
    has_pending?: boolean
  }>
}

export async function submitWithdrawRequest(amount: number, withdrawPassword: string) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("amount", String(amount))
  fd.append("withdraw_password", withdrawPassword)
  return handleAdminPost(API.walletWithdraw, fd) as Promise<{ success: boolean; message?: string }>
}

export async function resetAfterSalesBadge() {
  return { success: true }
}

export async function fetchNotifications(type: string) {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.userNotifications, { type }))
  return (data.rows ?? []) as NotificationRow[]
}

export async function markNotificationRead(notificationId: number) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("action", "read")
  fd.append("notification_id", String(notificationId))
  return handleAdminPost(API.userNotifications, fd)
}

export async function fetchChatMessages() {
  ensureConfigured()
  return handleAdminGet(apiPath(API.supportChat, { mode: "messages" })) as Promise<{
    success: boolean
    rows?: ChatMessageRow[]
    message?: string
  }>
}

export async function sendChatMessage(text: string) {
  ensureConfigured()
  return db.dbSendChatMessage(text)
}

export async function uploadChatImage(file: File) {
  ensureConfigured()
  return db.dbUploadChatImage(file)
}

export async function deleteChatMessage(messageId: number) {
  ensureConfigured()
  return db.dbDeleteChatMessage(messageId)
}

export async function fetchMyReviews() {
  ensureConfigured()
  return handleAdminGet(API.reviewsList) as Promise<{ success: boolean; items?: ReviewItem[]; message?: string }>
}

export async function fetchPendingReviewOrders() {
  ensureConfigured()
  const data = await handleAdminGet(API.reviewsPending)
  return (data.items ?? []) as Record<string, unknown>[]
}

export async function submitCustomerReview(orderId: number, reviewText: string, starRating: number) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("order_id", String(orderId))
  fd.append("review_text", reviewText)
  fd.append("star_rating", String(starRating))
  return handleAdminPost(API.submitReview, fd) as Promise<ApiResult>
}

export async function fetchDepositHistory() {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.walletHistory, { type: "deposit" }))
  return (data.items ?? []) as Record<string, unknown>[]
}

export async function fetchWithdrawHistory() {
  ensureConfigured()
  const data = await handleAdminGet(apiPath(API.walletHistory, { type: "withdraw" }))
  return (data.items ?? []) as Record<string, unknown>[]
}

export async function fetchFollowingShops() {
  ensureConfigured()
  const data = await handleAdminGet(API.shopFollows)
  return (data.shops ?? []) as FollowShopRow[]
}

export async function unfollowShop(shopName: string) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("action", "unfollow")
  fd.append("shop_name", shopName)
  return handleAdminPost(API.shopFollows, fd)
}

export async function fetchFollowStatus(shopName: string) {
  ensureConfigured()
  return handleAdminGet(
    apiPath(API.shopFollows, { action: "status", shop_name: shopName }),
  ) as Promise<{ success: boolean; following?: boolean }>
}

export async function toggleFollowShop(payload: {
  shop_name: string
  shop_image?: string
  review_count?: number
  view_count?: number
  trust_score?: number
  sales_volume?: number
}) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("action", "toggle")
  fd.append("shop_name", payload.shop_name)
  fd.append("shop_image", payload.shop_image ?? "")
  fd.append("review_count", String(payload.review_count ?? 0))
  fd.append("view_count", String(payload.view_count ?? 0))
  fd.append("trust_score", String(payload.trust_score ?? 0))
  fd.append("sales_volume", String(payload.sales_volume ?? 0))
  return handleAdminPost(API.shopFollows, fd) as Promise<{ success: boolean; following?: boolean }>
}

export async function fetchOtherStoreProducts() {
  ensureConfigured()
  const data = await handleAdminGet(API.otherStoreProducts)
  return (data.products ?? []) as StoreProductRow[]
}

export async function fetchCustomerShopProducts() {
  ensureConfigured()
  return db.dbFetchCustomerShopProducts() as Promise<StoreProductRow[]>
}

export async function addProductToMyStore(productId: number, catalogSource: "admin" | "mirror") {
  ensureConfigured()
  const fd = new FormData()
  fd.append("product_id", String(productId))
  fd.append("catalog_source", catalogSource)
  return handleAdminPost(API.storeAddProduct, fd) as Promise<ApiResult>
}

export async function updateMirrorProduct(
  id: number,
  fields: { product_stock: number; view_count: number; trust_score: number; sales_volume: number },
) {
  ensureConfigured()
  return db.dbUpdateMirrorProduct(id, fields)
}

export async function deleteMirrorProduct(id: number) {
  ensureConfigured()
  return db.dbDeleteMirrorProduct(id)
}

export async function fetchProductCategoryNames() {
  ensureConfigured()
  const cats = await db.dbFetchCategories()
  const seen = new Set<string>()
  const names: string[] = []
  for (const row of cats) {
    const name = String(row.category_name ?? "").trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

export async function submitStoreCustomer(
  action: "save" | "update",
  fields: { shop_name: string; main_category: string; shop_image?: File | null },
) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("action", action)
  fd.append("shop_name", fields.shop_name)
  fd.append("main_category", fields.main_category)
  if (fields.shop_image) fd.append("shop_image", fields.shop_image)
  return handleAdminPost(API.storeSubmit, fd) as Promise<ApiResult>
}

export async function submitBankAccount(fields: {
  bank_name: string
  account_number: string
  account_name: string
  phone_number?: string
}) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("bank_name", fields.bank_name)
  fd.append("account_number", fields.account_number)
  fd.append("account_name", fields.account_name)
  if (fields.phone_number) fd.append("phone_number", fields.phone_number)
  return handleAdminPost(API.bankSubmit, fd) as Promise<ApiResult>
}

export async function submitVerification(fields: {
  full_name: string
  id_card_number: string
  id_card_image: File
  id_card_back: File
  selfie_image: File
}) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("full_name", fields.full_name)
  fd.append("id_card_number", fields.id_card_number)
  fd.append("id_card_image", fields.id_card_image)
  fd.append("id_card_back", fields.id_card_back)
  fd.append("selfie_image", fields.selfie_image)
  return handleAdminPost(API.verificationSubmit, fd) as Promise<ApiResult>
}

export async function updatePassword(current: string, newPassword: string, confirm: string) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("current_password", current)
  fd.append("new_password", newPassword)
  fd.append("confirm_password", confirm)
  return handleAdminPost(API.userUpdatePassword, fd) as Promise<ApiResult>
}

export async function setWithdrawPassword(password: string, confirm: string) {
  ensureConfigured()
  const fd = new FormData()
  fd.append("withdraw_password", password)
  fd.append("confirm_password", confirm)
  return handleAdminPost(API.userSetWithdrawPassword, fd) as Promise<ApiResult>
}
