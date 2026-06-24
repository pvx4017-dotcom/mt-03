import { getSupabase } from "@/lib/supabase"
import { clearSession, getSessionUserId, requireUserId, setSession } from "@/lib/session"

type Result<T> = { success: boolean; message?: string } & T

function fail<T>(message: string, extra?: T): Result<T> {
  return { success: false, message, ...(extra ?? ({} as T)) }
}

function ok<T>(extra?: T): Result<T> {
  return { success: true, ...(extra ?? ({} as T)) }
}

type UserJoin = { username?: string; phone?: string; email?: string } | null

function flattenUserJoin<T extends Record<string, unknown>>(row: T) {
  const joined = row.users as UserJoin
  const { users: _users, ...rest } = row
  return {
    ...rest,
    username: (rest.username as string | undefined) ?? joined?.username,
    phone: (rest.phone as string | undefined) ?? joined?.phone,
    email: (rest.email as string | undefined) ?? joined?.email,
  }
}

async function uploadFile(bucket: string, path: string, file: File) {
  const sb = getSupabase()
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function dbProcessAuth(fd: FormData) {
  const sb = getSupabase()
  const action = String(fd.get("action") ?? "")

  if (action === "login") {
    const account = String(fd.get("account") ?? "")
    const password = String(fd.get("password") ?? "")
    const { data, error } = await sb.rpc("login_user", { p_account: account, p_password: password })
    if (error) return fail(error.message)
    const row = data as { success?: boolean; message?: string; user_id?: number; role?: string }
    if (row?.success && row.user_id) setSession(row.user_id, row.role ?? "customer")
    return row ?? fail("เข้าสู่ระบบไม่สำเร็จ")
  }

  if (action === "register") {
    const email = fd.get("email") ? String(fd.get("email")) : ""
    const phone = fd.get("phone") ? String(fd.get("phone")) : ""
    const password = String(fd.get("password") ?? "")
    const confirm = String(fd.get("confirm_password") ?? "")
    const invitation = String(fd.get("invitation_code") ?? "")
    const { data, error } = await sb.rpc("register_user", {
      p_email: email,
      p_phone: phone,
      p_password: password,
      p_confirm: confirm,
      p_invitation: invitation,
    })
    if (error) return fail(error.message)
    return (data as Result<Record<string, never>>) ?? fail("สมัครไม่สำเร็จ")
  }

  return fail("action ไม่ถูกต้อง")
}

export async function dbFetchUserInfo() {
  const uid = getSessionUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data, error } = await sb.rpc("get_user_profile", { p_user_id: uid })
  if (error) return fail(error.message)
  return data as Result<{ user?: Record<string, unknown> }>
}

export async function dbLogout() {
  clearSession()
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export async function dbFetchCategories() {
  const sb = getSupabase()
  const { data, error } = await sb.from("product_categories").select("*").order("id")
  if (error) return []
  return data ?? []
}

export async function dbFetchShops(recommendedOnly = false) {
  const sb = getSupabase()
  let q = sb.from("shops").select("*").order("id")
  if (recommendedOnly) q = q.eq("is_recommended", true)
  else q = q.eq("is_recommended", false)
  const { data, error } = await q
  if (error) return []
  return data ?? []
}

export async function dbFetchProducts() {
  const sb = getSupabase()
  const { data, error } = await sb.from("store_products").select("*").order("id")
  if (error) return []
  return data ?? []
}

export async function dbFetchSlides() {
  const sb = getSupabase()
  const { data } = await sb.from("slide_images").select("*").order("id")
  return data ?? []
}

// ─── Cart (product_orders) ──────────────────────────────────────────────────

export async function dbFetchCartOrders() {
  const uid = requireUserId()
  if (!uid) return []
  const sb = getSupabase()
  const { data } = await sb
    .from("product_orders")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "pending")
    .order("id")
  return data ?? []
}

export async function dbCreateProductOrder(fd: FormData) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const row = {
    user_id: uid,
    product_id: Number(fd.get("product_id") ?? 0) || null,
    product_name: String(fd.get("product_name") ?? ""),
    shop_name: String(fd.get("shop_name") ?? ""),
    product_image: String(fd.get("product_image") ?? ""),
    product_category: String(fd.get("product_category") ?? ""),
    unit_price: Number(fd.get("unit_price") ?? 0),
    quantity: Number(fd.get("quantity") ?? 1),
    selected_color: String(fd.get("selected_color") ?? "") || null,
    selected_size: String(fd.get("selected_size") ?? "") || null,
    status: "pending",
  }
  const { error } = await sb.from("product_orders").insert(row)
  if (error) return fail(error.message)
  return ok()
}

export async function dbDeleteProductOrder(orderId: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { error } = await sb
    .from("product_orders")
    .delete()
    .eq("id", orderId)
    .eq("user_id", uid)
  if (error) return fail(error.message)
  return ok()
}

export async function dbUpdateProductOrderQty(orderId: number, delta: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: cur } = await sb
    .from("product_orders")
    .select("quantity")
    .eq("id", orderId)
    .eq("user_id", uid)
    .single()
  const next = Math.max(1, Number(cur?.quantity ?? 1) + delta)
  const { error } = await sb
    .from("product_orders")
    .update({ quantity: next })
    .eq("id", orderId)
    .eq("user_id", uid)
  if (error) return fail(error.message)
  return ok()
}

export async function dbSetProductOrderQty(orderId: number, quantity: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { error } = await sb
    .from("product_orders")
    .update({ quantity: Math.max(1, quantity) })
    .eq("id", orderId)
    .eq("user_id", uid)
  if (error) return fail(error.message)
  return ok()
}

export async function dbConfirmProductOrders(fd: FormData) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: rows, error: fetchErr } = await sb
    .from("product_orders")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "pending")
  if (fetchErr) return fail(fetchErr.message)
  if (!rows?.length) return fail("ไม่มีสินค้าในตะกร้า")

  const contactName = String(fd.get("contact_name") ?? "").trim()
  const contactAddress = String(fd.get("contact_address") ?? "").trim()
  const contactPhone = String(fd.get("contact_phone") ?? "").trim()
  const billNo = `BILL-${Date.now()}`

  const inserts = rows.map((r) => ({
    user_id: uid,
    order_no: billNo,
    product_id: r.product_id,
    product_name: r.product_name,
    shop_name: r.shop_name,
    product_image: r.product_image,
    product_category: r.product_category,
    quantity: r.quantity,
    unit_price: r.unit_price,
    total_price: Number(r.unit_price ?? 0) * Number(r.quantity ?? 1),
    selected_color: r.selected_color,
    selected_size: r.selected_size,
    contact_name: contactName || null,
    contact_address: contactAddress || null,
    contact_phone: contactPhone || null,
    receiver_name: contactName || null,
    receiver_address: contactAddress || null,
    receiver_phone: contactPhone || null,
    shipping_method: "free",
    status: "pending",
  }))
  const { error: insErr } = await sb.from("admin_cart_orders").insert(inserts)
  if (insErr) return fail(insErr.message)
  await sb.from("product_orders").delete().eq("user_id", uid).eq("status", "pending")
  return ok({ message: "ยืนยันคำสั่งซื้อแล้ว" })
}

// ─── Orders pipeline ────────────────────────────────────────────────────────

export async function dbFetchOrdersByStatus(status: string, userOnly = false) {
  const sb = getSupabase()
  const uid = getSessionUserId()
  let q = sb.from("admin_cart_orders").select("*").order("created_at", { ascending: false })
  if (userOnly && uid) q = q.eq("user_id", uid)
  if (status) q = q.eq("status", status)
  const { data } = await q
  return data ?? []
}

export async function dbFetchShippingHistory(toStatus: string) {
  const uid = requireUserId()
  if (!uid) return []
  const sb = getSupabase()
  const { data: hist } = await sb
    .from("shipping_history")
    .select("order_id")
    .eq("user_id", uid)
    .eq("to_status", toStatus)
  const ids = (hist ?? []).map((h) => h.order_id).filter(Boolean)
  if (!ids.length) return []
  const { data } = await sb.from("admin_cart_orders").select("*").in("id", ids)
  return data ?? []
}

export async function dbFetchOrderHubCounts() {
  const uid = requireUserId()
  if (!uid) return {}
  const sb = getSupabase()
  const count = async (status: string) => {
    const { count: c } = await sb
      .from("admin_cart_orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("status", status)
    return c ?? 0
  }
  const pendingReview = await sb
    .from("admin_cart_orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("status", "completed")
    .is("star_rating", null)
  return {
    pending_payment: await count("pending"),
    to_ship: await count("shipping"),
    to_receive: await count("receiving"),
    pending_review: pendingReview.count ?? 0,
    after_sales: 0,
  }
}

export async function dbAdminUpdateOrder(
  orderId: number,
  patch: {
    status?: string
    quantity?: number
    receiver_name?: string
    receiver_address?: string
    receiver_phone?: string
    commission_amount?: number
  },
) {
  const sb = getSupabase()
  const { data: order } = await sb.from("admin_cart_orders").select("*").eq("id", orderId).single()
  if (!order) return fail("ไม่พบคำสั่งซื้อ")

  const prevStatus = String(order.status ?? "pending")
  const nextStatus = patch.status ?? prevStatus
  const qty =
    patch.quantity != null && !Number.isNaN(patch.quantity)
      ? patch.quantity
      : Number(order.quantity ?? 1)
  const unitPrice = Number(order.unit_price ?? 0)
  const totalPrice = unitPrice * qty

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status) updates.status = patch.status
  if (patch.quantity != null && !Number.isNaN(patch.quantity)) {
    updates.quantity = qty
    updates.total_price = totalPrice
  }
  if (patch.receiver_name) updates.receiver_name = patch.receiver_name
  if (patch.receiver_address) updates.receiver_address = patch.receiver_address
  if (patch.receiver_phone) updates.receiver_phone = patch.receiver_phone

  // Admin ยืนยันจากตะกร้า → หัก wallet + คำนวณค่าคอมจาก settings
  if (nextStatus === "shipping" && prevStatus === "pending") {
    const { data: cs } = await sb.from("commission_settings").select("percent").eq("id", 1).single()
    const pct = Number(cs?.percent ?? 20)
    const commission = totalPrice * (pct / 100)
    updates.commission_amount = commission
    const totalDue = totalPrice + commission
    const { data: user } = await sb.from("users").select("wallet_balance").eq("id", order.user_id).single()
    const balance = Number(user?.wallet_balance ?? 0)
    if (balance < totalDue) {
      return fail(
        `ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ $${totalDue.toFixed(2)}, มี $${balance.toFixed(2)})`,
      )
    }
    const { error: walletErr } = await sb
      .from("users")
      .update({ wallet_balance: balance - totalDue })
      .eq("id", order.user_id)
    if (walletErr) return fail(walletErr.message)
  }

  // จัดส่งเสร็จ → เครดิตกำไร + นับยอดขายร้านลูกค้า
  if (nextStatus === "completed" && prevStatus !== "completed") {
    const commission = Number(updates.commission_amount ?? order.commission_amount ?? 0)
    if (commission > 0) {
      const { data: u } = await sb.from("users").select("wallet_profit").eq("id", order.user_id).single()
      const { error: profitErr } = await sb
        .from("users")
        .update({ wallet_profit: Number(u?.wallet_profit ?? 0) + commission })
        .eq("id", order.user_id)
      if (profitErr) return fail(profitErr.message)
    }
    const { data: store } = await sb
      .from("customer_stores")
      .select("sold_count")
      .eq("user_id", order.user_id)
      .maybeSingle()
    if (store) {
      await sb
        .from("customer_stores")
        .update({ sold_count: Number(store.sold_count ?? 0) + qty })
        .eq("user_id", order.user_id)
    }
    if (order.product_id) {
      const { data: mirror } = await sb
        .from("customer_store_products_mirror")
        .select("id, sales_volume")
        .eq("user_id", order.user_id)
        .or(`source_product_id.eq.${order.product_id},id.eq.${order.product_id}`)
        .maybeSingle()
      if (mirror) {
        await sb
          .from("customer_store_products_mirror")
          .update({ sales_volume: Number(mirror.sales_volume ?? 0) + qty })
          .eq("id", mirror.id)
      }
    }
  }

  const { error } = await sb.from("admin_cart_orders").update(updates).eq("id", orderId)
  if (error) return fail(error.message)
  if (nextStatus !== prevStatus) {
    await sb.from("shipping_history").insert({
      order_id: orderId,
      user_id: order.user_id,
      from_status: prevStatus,
      to_status: nextStatus,
    })
  }
  return ok()
}

export async function dbAdminSubmitReview(orderId: number, reviewText: string, starRating: number) {
  const sb = getSupabase()
  const { data: order } = await sb.from("admin_cart_orders").select("*").eq("id", orderId).single()
  if (!order) return fail("ไม่พบคำสั่งซื้อ")
  await sb
    .from("admin_cart_orders")
    .update({ review_text: reviewText, star_rating: starRating })
    .eq("id", orderId)
  await sb.from("reviews").insert({
    user_id: order.user_id,
    order_id: orderId,
    product_image: order.product_image,
    review_text: reviewText,
    star_rating: starRating,
  })
  return ok({ message: "บันทึกรีวิวแล้ว" })
}

export async function dbAdminFetchCart(status: string) {
  const sb = getSupabase()
  const { data, count } = await sb
    .from("admin_cart_orders")
    .select("*", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
  return { success: true, items: data ?? [], count: count ?? 0 }
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

export async function dbFetchPaymentLimits() {
  const sb = getSupabase()
  const { data } = await sb.from("payment_limits").select("*").eq("id", 1).single()
  const { data: history } = await sb
    .from("payment_limits_history")
    .select("*")
    .order("created_at", { ascending: false })
  return {
    success: true,
    limits: history ?? [],
    min_deposit: data?.min_deposit ?? 100,
    min_withdraw: data?.min_withdraw ?? 100,
  }
}

export async function dbSubmitDeposit(amount: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const requestNo = `DEP-${Date.now()}`
  const { error } = await sb.from("deposit_requests").insert({
    user_id: uid,
    amount,
    payment_method: "bank_transfer",
    request_no: requestNo,
    status: "pending",
  })
  if (error) return fail(error.message)
  return ok({ user_id: uid, amount: amount.toFixed(2), request_no: requestNo })
}

export async function dbSubmitWithdraw(amount: number, withdrawPassword: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: user } = await sb.from("users").select("withdraw_password_hash,wallet_balance").eq("id", uid).single()
  if (!user?.withdraw_password_hash) return fail("ยังไม่ได้ตั้งรหัสถอน")
  const { data: verified } = await sb.rpc("verify_withdraw_password", {
    p_user_id: uid,
    p_password: withdrawPassword,
  })
  if (!(verified as { ok?: boolean })?.ok) return fail("รหัสถอนไม่ถูกต้อง")
  const limits = await dbFetchPaymentLimits()
  if (amount < Number(limits.min_withdraw ?? 100)) return fail(`ถอนขั้นต่ำ ${limits.min_withdraw}`)
  if (Number(user.wallet_balance) < amount) return fail("ยอดเงินไม่เพียงพอ")
  const { error } = await sb.from("withdraw_requests").insert({ user_id: uid, amount, status: "pending" })
  if (error) return fail(error.message)
  return ok({ message: "ส่งคำขอถอนแล้ว" })
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function dbFetchNotifications(type: string) {
  const uid = getSessionUserId()
  const sb = getSupabase()
  let q = sb.from("notifications").select("*").eq("ntype", type).order("created_at", { ascending: false })
  if (uid) q = q.or(`user_id.is.null,user_id.eq.${uid}`)
  else q = q.is("user_id", null)
  const { data } = await q
  return (data ?? []).map((r) => ({
    ...r,
    is_read: r.is_read ? 1 : 0,
  }))
}

export async function dbMarkNotificationRead(id: number) {
  const sb = getSupabase()
  await sb.from("notifications").update({ is_read: true }).eq("id", id)
  return ok()
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function dbFetchChatMessages(userId?: number) {
  const uid = userId ?? getSessionUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data } = await sb
    .from("support_chat_messages")
    .select("*")
    .eq("user_id", uid)
    .order("created_at")
  return { success: true, rows: data ?? [] }
}

export async function dbSendChatMessage(text: string, userId?: number) {
  const uid = userId ?? getSessionUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { error } = await sb.from("support_chat_messages").insert({
    user_id: uid,
    sender_type: "user",
    message: text,
  })
  if (error) return fail(error.message)
  return ok()
}

export async function dbUploadChatImage(file: File) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const path = `support_chat/${uid}_${Date.now()}_${file.name}`
  try {
    await uploadFile("uploads", path, file)
  } catch {
    return fail("อัปโหลดไม่สำเร็จ — สร้าง bucket uploads ใน Supabase Storage")
  }
  return dbSendChatMessage(`CHATIMG:uploads/${path}`)
}

export async function dbFetchChatThreads() {
  const sb = getSupabase()
  const [{ data: messages }, { data: readStates }] = await Promise.all([
    sb.from("support_chat_messages").select("user_id, created_at, message, sender_type").order("created_at"),
    sb.from("chat_admin_read").select("user_id, read_at"),
  ])
  const readMap = new Map((readStates ?? []).map((r) => [Number(r.user_id), r.read_at]))
  const map = new Map<number, Record<string, unknown>>()
  for (const row of messages ?? []) {
    const uid = Number(row.user_id)
    const readAt = readMap.get(uid)
    const isUnread =
      row.sender_type === "user" && (!readAt || new Date(row.created_at) > new Date(String(readAt)))
    const prev = map.get(uid)
    if (!prev || new Date(row.created_at) > new Date(String(prev.last_at))) {
      map.set(uid, {
        user_id: uid,
        last_message: row.message,
        last_at: row.created_at,
        unread: isUnread ? 1 : 0,
      })
    } else if (isUnread) {
      map.set(uid, { ...prev, unread: Number(prev.unread ?? 0) + 1 })
    }
  }
  const userIds = [...map.keys()]
  if (userIds.length) {
    const { data: users } = await sb.from("users").select("id, phone, email, username").in("id", userIds)
    const userMap = new Map((users ?? []).map((u) => [Number(u.id), u]))
    return [...map.values()].map((t) => {
      const u = userMap.get(Number(t.user_id))
      const unread = Number(t.unread ?? 0)
      return {
        ...t,
        message_count: unread,
        phone: u?.phone,
        email: u?.email,
        username: u?.username,
      }
    })
  }
  return [...map.values()].map((t) => ({
    ...t,
    message_count: Number(t.unread ?? 0),
  }))
}

export async function dbResetChatReadState(userId: number) {
  const sb = getSupabase()
  const { error } = await sb
    .from("chat_admin_read")
    .upsert({ user_id: userId, read_at: new Date().toISOString() })
  if (error) return fail(error.message)
  return ok()
}

// ─── Shop follows ───────────────────────────────────────────────────────────

export async function dbFetchFollowingShops() {
  const uid = requireUserId()
  if (!uid) return []
  const sb = getSupabase()
  const { data } = await sb.from("shop_follows").select("*").eq("user_id", uid)
  return data ?? []
}

export async function dbUnfollowShop(shopName: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  await sb.from("shop_follows").delete().eq("user_id", uid).eq("shop_name", shopName)
  return ok()
}

export async function dbFollowStatus(shopName: string) {
  const uid = getSessionUserId()
  if (!uid) return { success: true, following: false }
  const sb = getSupabase()
  const { data } = await sb
    .from("shop_follows")
    .select("id")
    .eq("user_id", uid)
    .eq("shop_name", shopName)
    .maybeSingle()
  return { success: true, following: Boolean(data) }
}

export async function dbToggleFollow(payload: {
  shop_name: string
  shop_image?: string
  review_count?: number
  view_count?: number
  trust_score?: number
  sales_volume?: number
}) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: existing } = await sb
    .from("shop_follows")
    .select("id")
    .eq("user_id", uid)
    .eq("shop_name", payload.shop_name)
    .maybeSingle()
  if (existing) {
    await sb.from("shop_follows").delete().eq("id", existing.id)
    return { success: true, following: false }
  }
  await sb.from("shop_follows").insert({
    user_id: uid,
    shop_name: payload.shop_name,
    shop_image: payload.shop_image ?? "",
    review_count: payload.review_count ?? 0,
    view_count: payload.view_count ?? 0,
    trust_score: payload.trust_score ?? 0,
    sales_volume: payload.sales_volume ?? 0,
  })
  return { success: true, following: true }
}

// ─── Store / mirror products ────────────────────────────────────────────────

export async function dbFetchOtherStoreProducts() {
  const sb = getSupabase()
  const { data } = await sb.from("store_products").select("*").order("id")
  return (data ?? []).map((r) => ({ ...r, catalog_source: "admin" }))
}

export async function dbFetchCustomerShopProducts(userId?: number) {
  const uid = userId ?? getSessionUserId()
  if (!uid) return []
  const sb = getSupabase()
  const { data } = await sb.from("customer_store_products_mirror").select("*").eq("user_id", uid)
  return data ?? []
}

export async function dbFetchAllCustomerShopProducts() {
  const sb = getSupabase()
  const { data } = await sb.from("customer_store_products_mirror").select("*").order("id", { ascending: false })
  return data ?? []
}

export async function dbAddProductToMyStore(productId: number, catalogSource: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  let source: Record<string, unknown> | null = null
  if (catalogSource === "mirror") {
    const { data } = await sb.from("customer_store_products_mirror").select("*").eq("id", productId).single()
    source = data
  } else {
    const { data } = await sb.from("store_products").select("*").eq("id", productId).single()
    source = data
  }
  if (!source) return fail("ไม่พบสินค้า")
  const { error } = await sb.from("customer_store_products_mirror").insert({
    user_id: uid,
    source_product_id: productId,
    catalog_source: catalogSource,
    product_name: source.product_name,
    shop_name: source.shop_name,
    product_category: source.product_category,
    product_image: source.product_image,
    product_images: source.product_images,
    product_price: source.product_price,
    product_stock: source.product_stock ?? 0,
    view_count: source.view_count ?? 0,
    trust_score: source.trust_score ?? 0,
    sales_volume: source.sales_volume ?? 0,
  })
  if (error) return fail(error.message)
  return ok()
}

export async function dbUpdateMirrorProduct(
  id: number,
  fields: { product_stock: number; view_count: number; trust_score: number; sales_volume: number },
) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { error } = await sb
    .from("customer_store_products_mirror")
    .update(fields)
    .eq("id", id)
    .eq("user_id", uid)
  if (error) return fail(error.message)
  return ok()
}

export async function dbDeleteMirrorProduct(id: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { error } = await sb
    .from("customer_store_products_mirror")
    .delete()
    .eq("id", id)
    .eq("user_id", uid)
  if (error) return fail(error.message)
  return ok()
}

export async function dbFetchStoreStatus() {
  const uid = getSessionUserId()
  if (!uid) return { success: true, has_store: false }
  const sb = getSupabase()
  const { data: store } = await sb.from("customer_stores").select("*").eq("user_id", uid).maybeSingle()
  const { data: user } = await sb.from("users").select("wallet_balance,wallet_profit").eq("id", uid).single()
  const { count } = await sb
    .from("customer_store_products_mirror")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid)
  return {
    success: true,
    has_store: Boolean(store),
    store: store ?? undefined,
    sold_count: store?.sold_count ?? 0,
    wallet_balance: user?.wallet_balance ?? 0,
    wallet_profit: user?.wallet_profit ?? 0,
    store_products_mirror_count: count ?? 0,
  }
}

export async function dbSubmitStore(
  action: "save" | "update",
  fields: { shop_name: string; main_category: string; shop_image?: File | null },
) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  let imagePath: string | null = null
  if (fields.shop_image) {
    imagePath = `uploads/stores/${uid}_${Date.now()}_${fields.shop_image.name}`
    try {
      await uploadFile("uploads", imagePath, fields.shop_image)
    } catch {
      return fail("อัปโหลดรูปร้านไม่สำเร็จ")
    }
  }
  const sb = getSupabase()
  const row = {
    user_id: uid,
    shop_name: fields.shop_name,
    main_category: fields.main_category,
    product_comment: `หมวดหมู่หลัก:${fields.main_category}`,
    ...(imagePath ? { shop_image: imagePath } : {}),
  }
  if (action === "update") {
    const { error } = await sb.from("customer_stores").update(row).eq("user_id", uid)
    if (error) return fail(error.message)
  } else {
    const { error } = await sb.from("customer_stores").insert(row)
    if (error) return fail(error.message)
  }
  return ok({ message: "ลงทะเบียนเปิดร้านเรียบร้อยแล้ว" })
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function dbSubmitBankAccount(fields: {
  bank_name: string
  account_number: string
  account_name: string
  phone_number?: string
}) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  await sb.from("bank_accounts").delete().eq("user_id", uid)
  const { error } = await sb.from("bank_accounts").insert({ user_id: uid, ...fields })
  if (error) return fail(error.message)
  return ok({ message: "บันทึกข้อมูลแล้ว" })
}

export async function dbSubmitVerification(fields: {
  full_name: string
  id_card_number: string
  id_card_image: File
  id_card_back: File
  selfie_image: File
}) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const ts = Date.now()
  const front = `uploads/kyc/${uid}_${ts}_front_${fields.id_card_image.name}`
  const back = `uploads/kyc/${uid}_${ts}_back_${fields.id_card_back.name}`
  const selfie = `uploads/kyc/${uid}_${ts}_selfie_${fields.selfie_image.name}`
  try {
    await uploadFile("uploads", front, fields.id_card_image)
    await uploadFile("uploads", back, fields.id_card_back)
    await uploadFile("uploads", selfie, fields.selfie_image)
  } catch {
    return fail("อัปโหลดเอกสารไม่สำเร็จ")
  }
  const sb = getSupabase()
  const { error } = await sb.from("identity_verifications").insert({
    user_id: uid,
    full_name: fields.full_name,
    id_card_number: fields.id_card_number,
    id_card_image: front,
    id_card_back: back,
    selfie_image: selfie,
    status: "pending",
  })
  if (error) return fail(error.message)
  return ok({ message: "ส่งคำขอยืนยันตัวตนแล้ว" })
}

export async function dbUpdatePassword(current: string, newPassword: string, confirm: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  if (newPassword !== confirm) return fail("รหัสผ่านใหม่ไม่ตรงกัน")
  const sb = getSupabase()
  const { data, error } = await sb.rpc("update_user_password", {
    p_user_id: uid,
    p_current: current,
    p_new: newPassword,
  })
  if (error) return fail(error.message)
  return (data as { success: boolean; message?: string }) ?? fail("เปลี่ยนไม่สำเร็จ")
}

export async function dbSetWithdrawPassword(password: string, confirm: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  if (password !== confirm) return fail("รหัสผ่านไม่ตรงกัน")
  const sb = getSupabase()
  const { error } = await sb.rpc("set_user_withdraw_password", {
    p_user_id: uid,
    p_password: password,
  })
  if (error) return fail(error.message)
  return ok({ message: "บันทึกรหัสการถอนแล้ว" })
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function dbFetchReviews() {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data } = await sb.from("reviews").select("*").eq("user_id", uid).order("created_at", { ascending: false })
  return { success: true, items: data ?? [] }
}

export async function dbFetchPendingReviewOrders() {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data } = await sb
    .from("admin_cart_orders")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "completed")
    .is("star_rating", null)
    .order("created_at", { ascending: false })
  return { success: true, items: data ?? [] }
}

export async function dbFetchWalletHistory(type: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  if (type === "withdraw") {
    const { data } = await sb
      .from("withdraw_requests")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
    return { success: true, items: data ?? [] }
  }
  const { data } = await sb
    .from("deposit_requests")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
  return { success: true, items: data ?? [] }
}

// ─── Admin helpers ──────────────────────────────────────────────────────────

export async function dbFetchUsers() {
  const sb = getSupabase()
  const { data } = await sb.from("users").select("*").order("id")
  return data ?? []
}

export async function dbFetchDeposits() {
  const sb = getSupabase()
  const { data } = await sb.from("deposit_requests").select("*, users(email,phone,username)").order("created_at", { ascending: false })
  return (data ?? []).map((row) => {
    const flat = flattenUserJoin(row as Record<string, unknown>)
    return {
      ...flat,
      transaction_ref: flat.request_no ?? flat.transaction_ref,
      channel: flat.payment_method ?? flat.channel,
    }
  })
}

export async function dbFetchWithdrawals() {
  const sb = getSupabase()
  const { data } = await sb.from("withdraw_requests").select("*, users(email,phone,username)").order("created_at", { ascending: false })
  return (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>))
}

export async function dbFetchVerifications() {
  const sb = getSupabase()
  const { data } = await sb
    .from("identity_verifications")
    .select("*, users(email,phone,username)")
    .order("created_at", { ascending: false })
  return (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>))
}

export async function dbFetchBankAccounts() {
  const sb = getSupabase()
  const { data } = await sb.from("bank_accounts").select("*, users(email,phone,username)").order("id")
  return (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>))
}

export async function dbSavePaymentLimits(minDeposit: number, minWithdraw: number) {
  const sb = getSupabase()
  const now = new Date().toISOString()
  const { error } = await sb
    .from("payment_limits")
    .upsert({ id: 1, min_deposit: minDeposit, min_withdraw: minWithdraw, updated_at: now })
  if (error) return fail(error.message)
  await sb.from("payment_limits_history").insert({
    min_deposit: minDeposit,
    min_withdraw: minWithdraw,
    created_at: now,
  })
  return ok()
}

export async function dbFetchCommissionSettings() {
  const sb = getSupabase()
  const { data } = await sb.from("commission_settings").select("*").eq("id", 1).single()
  const pct = Number(data?.percent ?? 20)
  return { success: true, percent: pct, commission_percent: pct }
}

export async function dbSaveCommissionSettings(percent: number) {
  const sb = getSupabase()
  const { error } = await sb
    .from("commission_settings")
    .upsert({ id: 1, percent, updated_at: new Date().toISOString() })
  if (error) return fail(error.message)
  return ok()
}

export async function dbAdminNotifications() {
  const sb = getSupabase()
  const { data } = await sb.from("notifications").select("*").order("created_at", { ascending: false })
  return (data ?? []).map((row) => ({
    ...row,
    notification_type: row.ntype,
    target_user_id: row.user_id,
    recipient_mode: row.user_id ? "one" : "all",
  }))
}

export async function dbSubmitReview(orderId: number, reviewText: string, starRating: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: order } = await sb.from("admin_cart_orders").select("*").eq("id", orderId).eq("user_id", uid).single()
  if (!order) return fail("ไม่พบคำสั่งซื้อ")
  await sb.from("admin_cart_orders").update({ review_text: reviewText, star_rating: starRating }).eq("id", orderId)
  await sb.from("reviews").insert({
    user_id: uid,
    order_id: orderId,
    product_image: order.product_image,
    review_text: reviewText,
    star_rating: starRating,
  })
  return ok()
}
