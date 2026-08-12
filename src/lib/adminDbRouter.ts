/** Local API dispatcher — เรียก Supabase โดยตรง ไม่มี HTTP ไป PHP server ภายนอก */
import { getSupabase } from "@/lib/supabase"
import { API } from "@/lib/apiRoutes"
import { uploadLocalFile } from "@/lib/localUpload"
import { uploadToSupabaseStorage } from "@/lib/storageUpload"
import { getSessionUserId, isAdminPanelRole } from "@/lib/session"
import {
  dbAdminFetchCart,
  dbAdminUpdateOrder,
  dbFetchBankAccounts,
  dbFetchCategories,
  dbFetchChatMessages,
  dbFetchChatThreads,
  dbFetchCommissionSettings,
  dbFetchDeposits,
  dbFetchOrdersByStatus,
  dbFetchPaymentLimits,
  dbFetchProducts,
  dbFetchShops,
  dbFetchSlides,
  dbFetchUsers,
  dbFetchVerifications,
  dbFetchWithdrawals,
  dbResetChatReadState,
  dbSaveCommissionSettings,
  dbSavePaymentLimits,
  dbSendChatMessage,
  dbDeleteChatMessage,
  dbUpdateChatMessage,
} from "@/lib/dbService"

type Json = Record<string, unknown>

function ok(extra?: Json) {
  return { success: true, ...extra }
}

function fail(message: string) {
  return { success: false, message }
}

function normalizeShippingToStatus(toStatus: string) {
  if (toStatus === "success") return "completed"
  return toStatus
}

function isCustomerScopedAdminGet(base: string, params: URLSearchParams) {
  if (base === API.adminCart && params.get("filter_user") === "1") return true
  if (base === API.adminCartOrders && params.get("filter_user") === "1") return true
  if (base === API.adminShippingHistory) return true
  return false
}

function ensureAdminPanelAccess(base: string, params?: URLSearchParams) {
  if (base === API.submitReviewAdmin) {
    if (!getSessionUserId()) return fail("กรุณาเข้าสู่ระบบ")
    if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์เข้าถึงฝั่งผู้ดูแล")
    return null
  }
  if (!base.startsWith("admin/")) return null
  if (params && isCustomerScopedAdminGet(base, params)) return null
  if (!getSessionUserId()) return fail("กรุณาเข้าสู่ระบบ")
  if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์เข้าถึงฝั่งผู้ดูแล")
  return null
}

function isEditAction(action: string) {
  return action === "edit" || action === "update"
}

function normalizeNotificationType(raw: string) {
  if (raw === "customer_service") return "service"
  return raw || "platform"
}

/** รูปสินค้า/ร้าน → public/images (โปรเจกต์) */
async function uploadProjectImage(file: File) {
  return uploadLocalFile(file, "images")
}

/** รูปอื่น → Supabase Storage */
async function uploadRemoteImage(file: File, prefix: string) {
  return uploadToSupabaseStorage(file, prefix)
}

async function resolveImageUpload(
  fd: FormData,
  field: string,
  existingPath: string,
  mode: "project" | "storage",
  storagePrefix = "",
) {
  const file = fd.get(field)
  if (file instanceof File && file.size > 0) {
    return mode === "project" ? uploadProjectImage(file) : uploadRemoteImage(file, storagePrefix)
  }
  const hinted = String(fd.get(`${field}_path`) ?? "").trim()
  if (hinted && hinted !== "[object File]") return hinted
  return existingPath
}

async function resolveValidUserId(raw: FormDataEntryValue | null) {
  const id = Number(raw)
  if (!id || Number.isNaN(id)) return null
  const sb = getSupabase()
  const { data } = await sb.from("users").select("id").eq("id", id).maybeSingle()
  return data?.id ?? null
}

export async function handleAdminGet(path: string): Promise<Json> {
  const [base, qs] = path.split("?")
  const params = new URLSearchParams(qs ?? "")
  const denied = ensureAdminPanelAccess(base, params)
  if (denied) return denied

  switch (base) {
    case API.adminProductCategories:
      return ok({ categories: await dbFetchCategories() })
    case API.adminRecommendedShops:
      return ok({ shops: await dbFetchShops(true) })
    case API.adminGeneralShops:
      return ok({ shops: await dbFetchShops(false) })
    case API.adminSlideImages:
      return ok({ slides: await dbFetchSlides() })
    case API.adminStoreProducts:
      return ok({ products: await dbFetchProducts() })
    case API.adminUsers:
      return ok({ users: await dbFetchUsers() })
    case API.adminIdentityVerifications:
      return ok({ verifications: await dbFetchVerifications() })
    case API.adminBankAccounts:
      return ok({ accounts: await dbFetchBankAccounts() })
    case API.adminDepositRequests:
      return ok({ deposits: await dbFetchDeposits() })
    case API.adminWithdrawRequests:
      return ok({ withdrawals: await dbFetchWithdrawals() })
    case API.adminPaymentLimits:
      return dbFetchPaymentLimits()
    case API.adminCommission:
      return dbFetchCommissionSettings()
    case API.adminNotifications:
      return ok({ rows: await (await import("@/lib/dbService")).dbAdminNotifications() })
    case API.customerShopProducts:
      return ok({ products: await (await import("@/lib/dbService")).dbFetchAllCustomerShopProducts() })
    case API.adminCart: {
      const status = params.get("status") ?? "pending"
      const filterUser = params.get("filter_user")
      if (filterUser === "1") {
        const uid = (await import("@/lib/session")).getSessionUserId()
        const sb = getSupabase()
        const { data } = await sb
          .from("admin_cart_orders")
          .select("*")
          .eq("status", status)
          .eq("user_id", uid ?? -1)
          .order("created_at", { ascending: false })
        return ok({ items: data ?? [] })
      }
      return dbAdminFetchCart(status)
    }
    case API.adminCartOrders: {
      const status = params.get("order_status") ?? "shipping"
      const filterUser = params.get("filter_user") === "1"
      const items = await dbFetchOrdersByStatus(status, filterUser)
      return ok({ items, orders: items, count: items.length })
    }
    case API.orderHubCounts:
      return { success: true, ...(await (await import("@/lib/dbService")).dbFetchOrderHubCounts()) }
    case API.orderContacts:
      return (await import("@/lib/dbService")).dbFetchOrderContacts()
    case API.adminShippingHistory: {
      const toStatus = normalizeShippingToStatus(params.get("to_status") ?? "receiving")
      const sb = getSupabase()
      const uid = (await import("@/lib/session")).getSessionUserId()
      let q = sb.from("admin_cart_orders").select("*").eq("status", toStatus)
      if (uid && params.get("filter_user") !== "0") q = q.eq("user_id", uid)
      const { data } = await q.order("created_at", { ascending: false })
      return ok({ items: data ?? [] })
    }
    case API.supportChat: {
      const mode = params.get("mode")
      if (mode === "thread_user_count" || mode === "threads") {
        if (!getSessionUserId()) return fail("กรุณาเข้าสู่ระบบ")
        if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์เข้าถึงฝั่งผู้ดูแล")
        if (mode === "thread_user_count") {
          const threads = await dbFetchChatThreads()
          return ok({ count: threads.length })
        }
        return ok({ rows: await dbFetchChatThreads() })
      }
      if (mode === "messages") {
        const userId = params.get("user_id")
        if (userId) {
          if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์เข้าถึงฝั่งผู้ดูแล")
          return dbFetchChatMessages(Number(userId))
        }
        return dbFetchChatMessages()
      }
      return fail("mode ไม่ถูกต้อง")
    }
    case API.adminCustomerTopup: {
      const action = params.get("action")
      const sb = getSupabase()
      if (action === "credits") {
        const { data } = await sb.from("users").select("id, username, email, phone, credit")
        return ok({ credits: data ?? [] })
      }
      if (action === "wallets") {
        const { data } = await sb.from("users").select("id, username, email, phone, wallet_balance, wallet_profit")
        return ok({ wallets: data ?? [] })
      }
      if (action === "users") {
        const { data } = await sb.from("users").select("id, username, email, phone, wallet_balance")
        return ok({ users: data ?? [] })
      }
      return ok({})
    }
    case API.adminWithdrawPasswords: {
      const sb = getSupabase()
      const { data } = await sb.from("users").select("id, username, email, phone, withdraw_password_hash")
      return ok({
        passwords: (data ?? []).map((u) => ({
          ...u,
          has_password: Boolean(u.withdraw_password_hash),
        })),
      })
    }
    case API.adminSettings:
      return (await import("@/lib/dbService")).dbSuperAdminListAdmins()
    case API.userInfo:
      return (await import("@/lib/dbService")).dbFetchUserInfo()
    case API.productOrders: {
      const rows = await (await import("@/lib/dbService")).dbFetchCartOrders()
      return ok({ orders: rows })
    }
    case API.reviewsList:
      return (await import("@/lib/dbService")).dbFetchReviews()
    case API.reviewsPending:
      return (await import("@/lib/dbService")).dbFetchPendingReviewOrders()
    case API.walletHistory: {
      const type = params.get("type") ?? "deposit"
      return (await import("@/lib/dbService")).dbFetchWalletHistory(type)
    }
    case API.shopFollows: {
      if (params.get("action") === "status") {
        return (await import("@/lib/dbService")).dbFollowStatus(String(params.get("shop_name") ?? ""))
      }
      return ok({ shops: await (await import("@/lib/dbService")).dbFetchFollowingShops() })
    }
    case API.userNotifications:
      return ok({
        rows: await (await import("@/lib/dbService")).dbFetchNotifications(params.get("type") ?? "service"),
      })
    case API.otherStoreProducts:
      return ok({ products: await (await import("@/lib/dbService")).dbFetchOtherStoreProducts() })
    case API.storeStatus:
      return (await import("@/lib/dbService")).dbFetchStoreStatus()
    default:
      return fail(`ไม่รองรับ GET ${base}`)
  }
}

export async function handleAdminPost(path: string, fd: FormData): Promise<Json> {
  const sb = getSupabase()
  const action = String(fd.get("action") ?? fd.get("mode") ?? "")
  const denied = ensureAdminPanelAccess(path)
  if (denied) return denied

  switch (path) {
    case API.adminUsers: {
      const id = Number(fd.get("id"))
      if (action === "delete") {
        await sb.from("users").delete().eq("id", id)
        return ok({ message: "ลบแล้ว" })
      }
      if (action === "block") {
        const { data: u } = await sb.from("users").select("status").eq("id", id).single()
        const next = u?.status === "banned" ? "active" : "banned"
        await sb.from("users").update({ status: next }).eq("id", id)
        return ok({ message: next === "banned" ? "ระงับแล้ว" : "ยกเลิกระงับแล้ว" })
      }
      if (action === "edit") {
        const status = String(fd.get("status") ?? "active")
        const { data: target } = await sb.from("users").select("role").eq("id", id).single()
        await sb.from("users").update({ status }).eq("id", id)
        const pwd = fd.get("password")
        if (pwd && String(pwd).trim()) {
          const targetRole = String(target?.role ?? "customer")
          if (targetRole === "admin" || targetRole === "super_admin") {
            return fail("เปลี่ยนรหัสผู้ดูแลได้ที่เมนูตั้งค่าระบบ (Super Admin) เท่านั้น")
          }
          const { data } = await sb.rpc("admin_set_user_password", {
            p_user_id: id,
            p_password: String(pwd),
          })
          const row = data as { success?: boolean; message?: string }
          if (row?.success === false) return fail(row.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ")
        }
        return ok({ message: "บันทึกแล้ว" })
      }
      return fail("action ไม่ถูกต้อง")
    }
    case API.adminCart: {
      if (action === "add") {
        const userId = await resolveValidUserId(fd.get("user_id"))
        if (!userId) return fail("ไม่พบรหัสลูกค้า — สินค้านี้ต้องมาจากร้านลูกค้าที่มี user_id ถูกต้อง")
        const { error } = await sb.from("admin_cart_orders").insert({
          user_id: userId,
          product_id: Number(fd.get("product_id") ?? 0),
          product_name: String(fd.get("product_name") ?? ""),
          shop_name: String(fd.get("shop_name") ?? ""),
          product_category: String(fd.get("product_category") ?? ""),
          product_image: String(fd.get("product_image") ?? ""),
          unit_price: Number(fd.get("unit_price") ?? 0),
          quantity: Number(fd.get("quantity") ?? 1),
          total_price: Number(fd.get("unit_price") ?? 0) * Number(fd.get("quantity") ?? 1),
          status: "pending",
        })
        if (error) return fail(error.message)
        return ok({ message: "เพิ่มแล้ว" })
      }
      if (action === "update_order") {
        const orderId = Number(fd.get("order_id") ?? fd.get("id"))
        return dbAdminUpdateOrder(orderId, {
          status: String(fd.get("status") ?? "shipping"),
          quantity: fd.has("quantity") ? Number(fd.get("quantity")) : undefined,
          receiver_name: fd.get("receiver_name") ? String(fd.get("receiver_name")) : undefined,
          receiver_address: fd.get("receiver_address") ? String(fd.get("receiver_address")) : undefined,
          receiver_phone: fd.get("receiver_phone") ? String(fd.get("receiver_phone")) : undefined,
          commission_amount: fd.has("commission_amount") ? Number(fd.get("commission_amount")) : undefined,
        })
      }
      if (action === "delete") {
        await sb.from("admin_cart_orders").delete().eq("id", Number(fd.get("id")))
        return ok({ message: "ลบแล้ว" })
      }
      return fail("action ไม่ถูกต้อง")
    }
    case API.adminCartOrders: {
      const orderId = Number(fd.get("order_id") ?? fd.get("id"))
      const status = String(fd.get("status") ?? fd.get("order_status") ?? "")
      if (status) return dbAdminUpdateOrder(orderId, { status })
      return fail("status ว่าง")
    }
    case API.adminPaymentLimits: {
      const minDeposit = Number(fd.get("min_deposit") ?? 100)
      const minWithdraw = Number(fd.get("min_withdraw") ?? 100)
      return dbSavePaymentLimits(minDeposit, minWithdraw)
    }
    case API.adminCommission: {
      const pct = Number(fd.get("percent") ?? fd.get("commission_percent") ?? 20)
      return dbSaveCommissionSettings(pct)
    }
    case API.adminProductCategories: {
      const id = Number(fd.get("id") ?? 0)
      if (action === "delete") {
        const { error } = await sb.from("product_categories").delete().eq("id", id)
        if (error) return fail(error.message)
        return ok({ message: "ลบแล้ว" })
      }
      let existingImage = ""
      if (isEditAction(action) && id) {
        const { data: cur } = await sb.from("product_categories").select("category_image").eq("id", id).single()
        existingImage = String(cur?.category_image ?? "")
      }
      let categoryImage = existingImage
      try {
        categoryImage = await resolveImageUpload(fd, "category_image", existingImage, "storage", "categories")
      } catch (err) {
        return fail(err instanceof Error ? err.message : "อัปโหลดรูปหมวดหมู่ไม่สำเร็จ")
      }
      const row = {
        category_name: String(fd.get("category_name") ?? "").trim(),
        category_image: categoryImage,
      }
      if (!row.category_name) return fail("กรุณาใส่ชื่อหมวดหมู่")
      if (isEditAction(action) && id) {
        const { error } = await sb.from("product_categories").update(row).eq("id", id)
        if (error) return fail(error.message)
      } else if (action === "create" || !id) {
        const { error } = await sb.from("product_categories").insert(row)
        if (error) return fail(error.message)
      } else {
        return fail("action ไม่ถูกต้อง")
      }
      return ok({ message: "บันทึกแล้ว" })
    }
    case API.adminGeneralShops:
    case API.adminRecommendedShops: {
      const id = Number(fd.get("id") ?? 0)
      const isRec = path === API.adminRecommendedShops
      if (action === "delete") {
        const { error } = await sb.from("shops").delete().eq("id", id)
        if (error) return fail(error.message)
        return ok({ message: "ลบแล้ว" })
      }
      let existingImage = ""
      if (isEditAction(action) && id) {
        const { data: cur } = await sb.from("shops").select("shop_image").eq("id", id).single()
        existingImage = String(cur?.shop_image ?? "")
      }
      let shopImage = existingImage
      try {
        shopImage = await resolveImageUpload(fd, "shop_image", existingImage, "project")
      } catch (err) {
        return fail(err instanceof Error ? err.message : "อัปโหลดรูปร้านค้าไม่สำเร็จ")
      }
      const row = {
        shop_name: String(fd.get("shop_name") ?? ""),
        shop_image: shopImage,
        review_count: Number(fd.get("review_count") ?? 0),
        view_count: Number(fd.get("view_count") ?? 0),
        trust_score: Number(fd.get("trust_score") ?? 0),
        sales_volume: Number(fd.get("sales_volume") ?? 0),
        is_recommended: isRec,
      }
      if (isEditAction(action) && id) {
        const { error } = await sb.from("shops").update(row).eq("id", id)
        if (error) return fail(error.message)
      } else {
        const { error } = await sb.from("shops").insert(row)
        if (error) return fail(error.message)
      }
      return ok({ message: "บันทึกแล้ว" })
    }
    case API.adminSlideImages: {
      const id = Number(fd.get("id") ?? 0)
      if (action === "delete") {
        const { error } = await sb.from("slide_images").delete().eq("id", id)
        if (error) return fail(error.message)
        return ok({ message: "ลบแล้ว" })
      }
      const file = fd.get("slide_image") as File | null
      let imagePath = String(fd.get("slide_image_path") ?? "")
      if (file && file.size) {
        try {
          imagePath = await uploadRemoteImage(file, "slides")
        } catch (err) {
          return fail(err instanceof Error ? err.message : "อัปโหลดรูปสไลด์ไม่สำเร็จ")
        }
      }
      if (action === "update" && id) {
        const { error } = await sb.from("slide_images").update({ slide_image: imagePath, image_path: imagePath }).eq("id", id)
        if (error) return fail(error.message)
      } else {
        const { error } = await sb.from("slide_images").insert({ slide_image: imagePath, image_path: imagePath })
        if (error) return fail(error.message)
      }
      return ok({ message: "บันทึกแล้ว" })
    }
    case API.adminStoreProducts: {
      const id = Number(fd.get("id") ?? 0)
      if (action === "delete") {
        await sb.from("store_products").delete().eq("id", id)
        return ok({ message: "ลบแล้ว" })
      }
      let existingImage = ""
      let existingImages: string[] = []
      if (isEditAction(action) && id) {
        const { data: cur } = await sb.from("store_products").select("product_image, product_images").eq("id", id).single()
        existingImage = String(cur?.product_image ?? "")
        if (Array.isArray(cur?.product_images)) {
          existingImages = cur.product_images.map(String)
        }
      }
      const uploaded: string[] = []
      for (const entry of fd.getAll("product_images[]")) {
        if (entry instanceof File && entry.size > 0) {
          try {
            uploaded.push(await uploadProjectImage(entry))
          } catch (err) {
            return fail(err instanceof Error ? err.message : "อัปโหลดรูปสินค้าไม่สำเร็จ")
          }
        }
      }
      const imageList = uploaded.length ? uploaded : existingImages.length ? existingImages : existingImage ? [existingImage] : []
      const userId = await resolveValidUserId(fd.get("user_id"))
      const row = {
        user_id: userId,
        product_type: String(fd.get("product_type") ?? "admin"),
        shop_name: String(fd.get("shop_name") ?? ""),
        product_category: String(fd.get("product_category") ?? ""),
        product_name: String(fd.get("product_name") ?? ""),
        product_description: String(fd.get("product_description") ?? ""),
        product_sizes: String(fd.get("product_sizes") ?? ""),
        product_colors: String(fd.get("product_colors") ?? ""),
        product_price: Number(fd.get("product_price") ?? 0),
        product_stock: Number(fd.get("product_stock") ?? 0),
        product_image: imageList[0] ?? "",
        product_images: imageList,
        review_count: Number(fd.get("review_count") ?? 0),
        view_count: Number(fd.get("view_count") ?? 0),
        trust_score: Number(fd.get("trust_score") ?? 0),
        sales_volume: Number(fd.get("sales_volume") ?? 0),
      }
      if (isEditAction(action) && id) await sb.from("store_products").update(row).eq("id", id)
      else await sb.from("store_products").insert(row)
      return ok({ message: "บันทึกแล้ว" })
    }
    case API.adminNotifications: {
      const id = Number(fd.get("id") ?? 0)
      if (action === "delete") {
        await sb.from("notifications").delete().eq("id", id)
        return ok({ message: "ลบแล้ว" })
      }
      const row = {
        ntype: normalizeNotificationType(String(fd.get("notification_type") ?? "platform")),
        title: String(fd.get("title") ?? ""),
        message: String(fd.get("message") ?? ""),
        user_id: fd.get("target_user_id") ? Number(fd.get("target_user_id")) : null,
      }
      if (action === "update" && id) await sb.from("notifications").update(row).eq("id", id)
      else await sb.from("notifications").insert(row)
      return ok({ message: "บันทึกแล้ว" })
    }
    case API.adminIdentityVerifications: {
      const id = Number(fd.get("id"))
      await sb
        .from("identity_verifications")
        .update({
          status: String(fd.get("status") ?? "pending"),
          rejection_reason: String(fd.get("rejection_reason") ?? "") || null,
        })
        .eq("id", id)
      return ok({ message: "อัปเดตแล้ว" })
    }
    case API.adminBankAccounts: {
      const id = Number(fd.get("id"))
      await sb
        .from("bank_accounts")
        .update({
          account_name: String(fd.get("account_name") ?? ""),
          bank_name: String(fd.get("bank_name") ?? ""),
          account_number: String(fd.get("account_number") ?? ""),
          phone_number: String(fd.get("phone_number") ?? ""),
        })
        .eq("id", id)
      return ok({ message: "บันทึกแล้ว" })
    }
    case API.adminWithdrawPasswords: {
      const userId = Number(fd.get("id"))
      const { data, error } = await sb.rpc("set_user_withdraw_password", {
        p_user_id: userId,
        p_password: String(fd.get("withdraw_password") ?? ""),
      })
      if (error) return fail(error.message)
      const row = data as { success?: boolean; message?: string } | null
      if (row?.success === false) return fail(row.message ?? "บันทึกรหัสถอนไม่สำเร็จ")
      return ok({ message: row?.message ?? "บันทึกแล้ว" })
    }
    case API.adminCustomerTopup: {
      const userId = Number(fd.get("user_id"))
      if (action === "topup") {
        const amt = Number(fd.get("amount") ?? 0)
        const { data: u } = await sb.from("users").select("wallet_balance").eq("id", userId).single()
        const next = Number(u?.wallet_balance ?? 0) + amt
        await sb.from("users").update({ wallet_balance: next }).eq("id", userId)
        return ok({ message: "เติมเงินแล้ว", balance_after: next })
      }
      if (action === "update_wallet_balance") {
        const balance = Number(fd.get("balance") ?? 0)
        await sb.from("users").update({ wallet_balance: balance }).eq("id", userId)
        return ok({ message: "อัปเดตยอดแล้ว" })
      }
      if (action === "update_credit") {
        const credit = Number(fd.get("credit") ?? 0)
        await sb.from("users").update({ credit }).eq("id", userId)
        return ok({ message: "อัปเดตเครดิตแล้ว" })
      }
      return fail("action ไม่ถูกต้อง")
    }
    case API.adminDepositRequests:
    case API.adminWithdrawRequests: {
      const id = Number(fd.get("id"))
      const status = String(fd.get("status") ?? "approved")
      const table = path === API.adminDepositRequests ? "deposit_requests" : "withdraw_requests"
      const { data: req } = await sb.from(table).select("*").eq("id", id).single()
      if (!req) return fail("ไม่พบรายการ")
      const prevStatus = String(req.status ?? "pending")
      if (prevStatus === status) return ok({ message: "อัปเดตแล้ว" })
      if (prevStatus !== "pending" && status === "approved") {
        return fail("รายการนี้ดำเนินการไปแล้ว")
      }
      await sb.from(table).update({ status }).eq("id", id)
      if (status === "approved" && prevStatus === "pending") {
        if (table === "deposit_requests") {
          const { data: u } = await sb.from("users").select("wallet_balance").eq("id", req.user_id).single()
          await sb
            .from("users")
            .update({ wallet_balance: Number(u?.wallet_balance ?? 0) + Number(req.amount) })
            .eq("id", req.user_id)
        } else {
          const { data: u } = await sb.from("users").select("wallet_balance").eq("id", req.user_id).single()
          const balance = Number(u?.wallet_balance ?? 0)
          if (balance < Number(req.amount)) {
            await sb.from(table).update({ status: prevStatus }).eq("id", id)
            return fail("ยอดเงินในกระเป๋าไม่เพียงพอ")
          }
          await sb
            .from("users")
            .update({ wallet_balance: balance - Number(req.amount) })
            .eq("id", req.user_id)
        }
      }
      return ok({ message: "อัปเดตแล้ว" })
    }
    case API.customerStoreMirror: {
      const id = Number(fd.get("id"))
      if (action === "delete") {
        await sb.from("customer_store_products_mirror").delete().eq("id", id)
        return ok({ message: "ลบแล้ว" })
      }
      if (action === "update_product") {
        await sb
          .from("customer_store_products_mirror")
          .update({
            product_stock: Number(fd.get("product_stock") ?? 0),
            view_count: Number(fd.get("view_count") ?? 0),
            trust_score: Number(fd.get("trust_score") ?? 0),
            sales_volume: Number(fd.get("sales_volume") ?? 0),
          })
          .eq("id", id)
        return ok({ message: "บันทึกแล้ว" })
      }
      return fail("action ไม่ถูกต้อง")
    }
    case API.supportChat: {
      const mode = String(fd.get("mode") ?? "")
      const userId = Number(fd.get("user_id") ?? 0)
      const adminOnly =
        mode === "reset_message_count" ||
        mode === "upload_image" ||
        mode === "delete_message" ||
        mode === "update_message" ||
        (!mode && String(fd.get("sender_type") ?? "") === "admin")
      if (adminOnly) {
        if (!getSessionUserId()) return fail("กรุณาเข้าสู่ระบบ")
        if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์เข้าถึงฝั่งผู้ดูแล")
      }
      if (mode === "reset_message_count") {
        return dbResetChatReadState(userId)
      }
      if (mode === "upload_image") {
        const file = fd.get("image") as File
        if (!(file instanceof File) || !file.size) return fail("ไม่พบไฟล์รูป")
        try {
          const saved = await uploadRemoteImage(file, "support_chat")
          await sb.from("support_chat_messages").insert({
            user_id: userId,
            sender_type: "admin",
            message: `CHATIMG:uploads/${saved}`,
          })
          return ok({ message: "ส่งแล้ว" })
        } catch (err) {
          return fail(err instanceof Error ? err.message : "อัปโหลดรูปแชทไม่สำเร็จ")
        }
      }
      if (mode === "delete_message") {
        return dbDeleteChatMessage(Number(fd.get("message_id")), {
          asAdmin: true,
          threadUserId: userId || undefined,
        })
      }
      if (mode === "update_message") {
        return dbUpdateChatMessage(Number(fd.get("message_id")), String(fd.get("message") ?? ""), {
          asAdmin: true,
          threadUserId: userId || undefined,
        })
      }
      await sb.from("support_chat_messages").insert({
        user_id: userId,
        sender_type: String(fd.get("sender_type") ?? "admin"),
        message: String(fd.get("message") ?? ""),
      })
      return ok({ message: "ส่งแล้ว" })
    }
    case API.submitReviewAdmin: {
      const orderId = Number(fd.get("order_id") ?? fd.get("id"))
      return (await import("@/lib/dbService")).dbAdminSubmitReview(
        orderId,
        String(fd.get("review_text") ?? ""),
        Number(fd.get("star_rating") ?? fd.get("rating") ?? 5),
      )
    }
    case API.submitReview: {
      const orderId = Number(fd.get("order_id") ?? fd.get("id"))
      return (await import("@/lib/dbService")).dbSubmitReview(
        orderId,
        String(fd.get("review_text") ?? ""),
        Number(fd.get("star_rating") ?? fd.get("rating") ?? 5),
      )
    }
    case API.authProcess:
      return (await import("@/lib/dbService")).dbProcessAuth(fd)
    case API.ordersConfirm:
      return (await import("@/lib/dbService")).dbConfirmProductOrders(fd)
    case API.ordersCreate:
      return (await import("@/lib/dbService")).dbCreateProductOrder(fd)
    case API.ordersDelete:
      return (await import("@/lib/dbService")).dbDeleteProductOrder(Number(fd.get("order_id")))
    case API.ordersUpdateQty:
      return (await import("@/lib/dbService")).dbUpdateProductOrderQty(
        Number(fd.get("order_id")),
        Number(fd.get("delta")),
      )
    case API.ordersSetQty:
      return (await import("@/lib/dbService")).dbSetProductOrderQty(
        Number(fd.get("order_id")),
        Number(fd.get("quantity")),
      )
    case API.walletDeposit:
      return (await import("@/lib/dbService")).dbSubmitDeposit(Number(fd.get("amount")))
    case API.walletWithdraw:
      return (await import("@/lib/dbService")).dbSubmitWithdraw(
        Number(fd.get("amount")),
        String(fd.get("withdraw_password") ?? ""),
      )
    case API.userNotifications:
      if (action === "read") {
        await (await import("@/lib/dbService")).dbMarkNotificationRead(Number(fd.get("notification_id")))
        return ok({})
      }
      return fail("action ไม่ถูกต้อง")
    case API.shopFollows: {
      if (action === "unfollow") {
        return (await import("@/lib/dbService")).dbUnfollowShop(String(fd.get("shop_name") ?? ""))
      }
      if (action === "toggle") {
        return (await import("@/lib/dbService")).dbToggleFollow({
          shop_name: String(fd.get("shop_name") ?? ""),
          shop_image: String(fd.get("shop_image") ?? ""),
          review_count: Number(fd.get("review_count") ?? 0),
          view_count: Number(fd.get("view_count") ?? 0),
          trust_score: Number(fd.get("trust_score") ?? 0),
          sales_volume: Number(fd.get("sales_volume") ?? 0),
        })
      }
      return fail("action ไม่ถูกต้อง")
    }
    case API.storeAddProduct:
      return (await import("@/lib/dbService")).dbAddProductToMyStore(
        Number(fd.get("product_id")),
        String(fd.get("catalog_source") ?? "admin") === "mirror" ? "mirror" : "admin",
      )
    case API.storeSubmit: {
      const shopImageRaw = fd.get("shop_image")
      const shopImage =
        shopImageRaw instanceof File && shopImageRaw.size > 0 ? shopImageRaw : null
      return (await import("@/lib/dbService")).dbSubmitStore(
        action === "update" ? "update" : "save",
        {
          shop_name: String(fd.get("shop_name") ?? ""),
          main_category: String(fd.get("main_category") ?? ""),
          shop_image: shopImage,
        },
      )
    }
    case API.bankSubmit:
      return (await import("@/lib/dbService")).dbSubmitBankAccount({
        bank_name: String(fd.get("bank_name") ?? ""),
        account_number: String(fd.get("account_number") ?? ""),
        account_name: String(fd.get("account_name") ?? ""),
        phone_number: String(fd.get("phone_number") ?? "") || undefined,
      })
    case API.verificationSubmit: {
      const front = fd.get("id_card_image") as File
      const back = fd.get("id_card_back") as File
      const selfie = fd.get("selfie_image") as File
      return (await import("@/lib/dbService")).dbSubmitVerification({
        full_name: String(fd.get("full_name") ?? ""),
        id_card_number: String(fd.get("id_card_number") ?? ""),
        id_card_image: front,
        id_card_back: back,
        selfie_image: selfie,
      })
    }
    case API.userUpdatePassword:
      return (await import("@/lib/dbService")).dbUpdatePassword(
        String(fd.get("current_password") ?? ""),
        String(fd.get("new_password") ?? ""),
        String(fd.get("confirm_password") ?? ""),
      )
    case API.userSetWithdrawPassword:
      return (await import("@/lib/dbService")).dbSetWithdrawPassword(
        String(fd.get("withdraw_password") ?? ""),
        String(fd.get("confirm_password") ?? ""),
      )
    case API.adminSettings:
      if (action === "reset_admin_password") {
        return (await import("@/lib/dbService")).dbSuperAdminResetAdminPassword(
          Number(fd.get("user_id") ?? fd.get("id")),
          String(fd.get("new_password") ?? ""),
          String(fd.get("confirm_password") ?? ""),
        )
      }
      return fail("action ไม่ถูกต้อง")
    default:
      if (path === API.supportChat) {
        return dbSendChatMessage(String(fd.get("message") ?? ""))
      }
      return fail(`ไม่รองรับ POST ${path}`)
  }
}
