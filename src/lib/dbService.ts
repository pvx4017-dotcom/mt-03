import { getSupabase } from "@/lib/supabase"
import { uploadToSupabaseStorage } from "@/lib/storageUpload"
import { clearSession, getSessionUserId, isAdminPanelRole, requireUserId, setSession } from "@/lib/session"
import { CHAT_DELETED_MARKER, chatMessagePreview } from "@/lib/chatMessages"
import { normalizeLineContactUrl } from "@/lib/lineContact"

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
    if (row?.success && row.user_id) {
      const role = row.role ?? "customer"
      setSession(row.user_id, role)
      if (role === "admin" || role === "super_admin") {
        return { ...row, redirect: "/admin" }
      }
    }
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
  const payload = (data ?? fail("ไม่พบผู้ใช้")) as Result<{ user?: Record<string, unknown> }>
  if (payload.success && payload.user) {
    const { data: kyc } = await sb
      .from("identity_verifications")
      .select("status, rejection_reason")
      .eq("user_id", uid)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    payload.user.kyc_status = kyc?.status ?? "none"
    payload.user.kyc_rejection_reason = kyc?.rejection_reason ?? null
  }
  return payload
}

export async function dbLogout() {
  clearSession()
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export async function dbFetchCategories() {
  const sb = getSupabase()
  const { data, error } = await sb.from("product_categories").select("*").order("id", { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function dbFetchShops(recommendedOnly = false) {
  const sb = getSupabase()
  let q = sb.from("shops").select("*").order("id", { ascending: false })
  if (recommendedOnly) q = q.eq("is_recommended", true)
  else q = q.eq("is_recommended", false)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function dbFetchProducts() {
  const sb = getSupabase()
  const { data, error } = await sb.from("store_products").select("*").order("id")
  if (error) throw new Error(error.message)
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
  const rows = data ?? []
  const missingIds = [
    ...new Set(
      rows
        .filter((r) => !String(r.product_image ?? "").trim() && r.product_id)
        .map((r) => Number(r.product_id)),
    ),
  ].filter((id) => id > 0)
  if (!missingIds.length) return rows

  const { data: products } = await sb
    .from("store_products")
    .select("id, product_image, product_images")
    .in("id", missingIds)
  const imageById = new Map<number, string>()
  for (const p of products ?? []) {
    const id = Number(p.id)
    let img = String(p.product_image ?? "").trim()
    if (!img && p.product_images) {
      const multi = p.product_images as unknown
      if (Array.isArray(multi) && multi.length) img = String(multi[0] ?? "").trim()
      else {
        try {
          const parsed = JSON.parse(String(multi)) as unknown
          if (Array.isArray(parsed) && parsed.length) img = String(parsed[0] ?? "").trim()
        } catch {
          /* ignore */
        }
      }
    }
    if (img) imageById.set(id, img)
  }

  return rows.map((r) => {
    if (String(r.product_image ?? "").trim()) return r
    const pid = Number(r.product_id)
    const img = imageById.get(pid)
    return img ? { ...r, product_image: img } : r
  })
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
  const { data: inserted, error: insErr } = await sb.from("admin_cart_orders").insert(inserts).select("id")
  if (insErr) return fail(insErr.message)
  await sb.from("product_orders").delete().eq("user_id", uid).eq("status", "pending")

  const payNow = String(fd.get("pay_now") ?? "") === "1"
  let newIds = (inserted ?? []).map((row) => Number(row.id)).filter((id) => id > 0)
  if (payNow && !newIds.length) {
    const { data: justCreated } = await sb
      .from("admin_cart_orders")
      .select("id")
      .eq("user_id", uid)
      .eq("order_no", billNo)
      .eq("status", "pending")
    newIds = (justCreated ?? []).map((row) => Number(row.id)).filter((id) => id > 0)
  }
  if (payNow && newIds.length) {
    const paid = await dbCustomerPayPendingOrders(newIds)
    if (!paid.success) {
      return ok({
        message: paid.message
          ? `ยืนยันคำสั่งซื้อแล้ว แต่ยังชำระไม่สำเร็จ: ${paid.message}`
          : "ยืนยันคำสั่งซื้อแล้ว — ยอดในระบบไม่พอ กรุณาเติมเงินแล้วชำระที่หน้ารอชำระเงิน",
        paid: false,
        pending: true,
      })
    }
    return ok({
      message: paid.message || "ชำระเงินด้วยยอดในระบบเรียบร้อยแล้ว",
      paid: true,
      paid_count: paid.paid_count,
    })
  }

  return ok({ message: "ยืนยันคำสั่งซื้อแล้ว", paid: false, pending: true })
}

function orderProductTotal(order: { quantity?: unknown; unit_price?: unknown; total_price?: unknown }) {
  const qty = Math.max(1, Number(order.quantity ?? 1) || 1)
  return Number(order.unit_price ?? 0) * qty
}

/** ลูกค้าชำระรายการรอชำระด้วยยอดกระเป๋าในระบบ (หักราคา + ค่าคอม แล้วเข้าสถานะรอจัดส่ง) */
export async function dbCustomerPayPendingOrders(
  orderIds: number[],
): Promise<{ success: boolean; message?: string; paid_count?: number }> {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const ids = [...new Set(orderIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
  if (!ids.length) return fail("ไม่พบรายการที่ต้องชำระ")

  const sb = getSupabase()
  const { data: orders, error } = await sb
    .from("admin_cart_orders")
    .select("*")
    .in("id", ids)
    .eq("user_id", uid)
    .eq("status", "pending")
  if (error) return fail(error.message)
  if (!orders?.length) return fail("ไม่พบรายการรอชำระเงิน")

  const { data: cs } = await sb.from("commission_settings").select("percent").eq("id", 1).maybeSingle()
  const pct = Number(cs?.percent ?? 20)
  let totalDue = 0
  for (const order of orders) {
    const productTotal = orderProductTotal(order)
    totalDue += productTotal + productTotal * (pct / 100)
  }

  const { data: user } = await sb.from("users").select("wallet_balance").eq("id", uid).single()
  const balance = Number(user?.wallet_balance ?? 0)
  if (balance < totalDue) {
    return fail(
      `ยอดเงินในระบบไม่เพียงพอ (ต้องชำระ $${totalDue.toFixed(2)}, มียอด $${balance.toFixed(2)})`,
    )
  }

  let paidCount = 0
  for (const order of orders) {
    const res = await dbAdminUpdateOrder(Number(order.id), { status: "shipping" })
    if (!res.success) {
      if (paidCount === 0) return res
      return ok({
        message: `ชำระสำเร็จ ${paidCount} รายการ แต่บางรายการไม่สำเร็จ: ${res.message ?? ""}`,
        paid_count: paidCount,
      })
    }
    paidCount += 1
  }
  return ok({ message: `ชำระเงินสำเร็จ ${paidCount} รายการ`, paid_count: paidCount })
}

// ─── Orders pipeline ────────────────────────────────────────────────────────

export async function dbFetchOrdersByStatus(status: string, userOnly = false) {
  const uid = getSessionUserId()
  if (userOnly && !uid) return []
  const sb = getSupabase()
  let q = sb.from("admin_cart_orders").select("*").order("created_at", { ascending: false })
  if (userOnly) q = q.eq("user_id", uid)
  if (status) q = q.eq("status", status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Record<string, unknown>[]
  if (userOnly) return rows
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(rows)
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

export async function dbFetchOrderContacts() {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data } = await sb
    .from("admin_cart_orders")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
  return ok({ orders: data ?? [] })
}

export async function dbFetchAdminShippingAddresses() {
  const fromBook = await (await import("@/lib/parityDb")).dbFetchUserAddressesAdmin()
  const seen = new Set<number>()
  const rows: Record<string, unknown>[] = []
  for (const row of fromBook) {
    const uid = Number(row.user_id)
    if (!uid || seen.has(uid)) continue
    seen.add(uid)
    rows.push({ ...row, is_default: Boolean(row.is_default) })
  }

  const sb = getSupabase()
  const joined = await sb
    .from("admin_cart_orders")
    .select(
      "id, user_id, receiver_name, receiver_address, receiver_phone, contact_name, contact_address, contact_phone, updated_at, created_at, users(username, phone, email)",
    )
    .order("created_at", { ascending: false })

  let rawRows = (joined.data ?? []) as Record<string, unknown>[]
  if (joined.error) {
    const plain = await sb
      .from("admin_cart_orders")
      .select(
        "id, user_id, receiver_name, receiver_address, receiver_phone, contact_name, contact_address, contact_phone, updated_at, created_at",
      )
      .order("created_at", { ascending: false })
    if (plain.error) throw new Error(plain.error.message)
    rawRows = (plain.data ?? []) as Record<string, unknown>[]
  }

  for (const raw of rawRows) {
    const row = flattenUserJoin(raw)
    const uid = Number(row.user_id)
    if (!uid || seen.has(uid)) continue
    const name = String(row.receiver_name ?? row.contact_name ?? "").trim()
    const address = String(row.receiver_address ?? row.contact_address ?? "").trim()
    const phone = String(row.receiver_phone ?? row.contact_phone ?? "").trim()
    if (!name && !address && !phone) continue
    seen.add(uid)
    rows.push({
      ...row,
      receiver_name: name || "-",
      receiver_address: address || "-",
      receiver_phone: phone || "-",
      is_default: false,
    })
  }
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(rows)
}

export async function dbDeleteCustomerStore(storeId: number) {
  const sb = getSupabase()
  const { data: store } = await sb.from("customer_stores").select("id, user_id").eq("id", storeId).maybeSingle()
  if (!store) return fail("ไม่พบร้านค้า")
  await sb.from("customer_store_products_mirror").delete().eq("user_id", store.user_id)
  const { error } = await sb.from("customer_stores").delete().eq("id", storeId)
  if (error) return fail(error.message)
  return ok({ message: "ลบร้านค้าแล้ว" })
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
  const allowedNext: Record<string, string[]> = {
    pending: ["shipping", "cancelled"],
    shipping: ["receiving"],
    receiving: ["completed"],
    completed: [],
    cancelled: [],
  }
  if (nextStatus !== prevStatus) {
    const allowed = allowedNext[prevStatus] ?? []
    if (!allowed.includes(nextStatus)) {
      return fail(
        `ไม่สามารถเปลี่ยนสถานะจาก ${prevStatus} เป็น ${nextStatus} ได้ — ต้องเดินตามลำดับ รอชำระเงิน → รอจัดส่ง → รอรับสินค้า → สำเร็จ`,
      )
    }
  }
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

  let walletDeducted = 0
  // ยืนยันจากตะกร้า / ลูกค้าชำระด้วยยอดในระบบ → หัก wallet + ค่าคอม
  if (nextStatus === "shipping" && prevStatus === "pending") {
    const { data: cs } = await sb.from("commission_settings").select("percent").eq("id", 1).maybeSingle()
    const pct = Number(cs?.percent ?? 20)
    const computed = totalPrice * (pct / 100)
    const commission =
      patch.commission_amount != null && Number.isFinite(patch.commission_amount) && patch.commission_amount >= 0
        ? Number(patch.commission_amount)
        : computed
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
    walletDeducted = totalDue
  }

  let balanceAdded = 0
  let profitAdded = 0

  if (nextStatus === "completed" && prevStatus !== "completed") {
    const commission = Number(updates.commission_amount ?? order.commission_amount ?? 0)
    const { data: u } = await sb
      .from("users")
      .select("wallet_balance,wallet_profit")
      .eq("id", order.user_id)
      .single()
    const nextBalance = Number(u?.wallet_balance ?? 0) + totalPrice
    const nextProfit = Number(u?.wallet_profit ?? 0) + Math.max(0, commission)
    const { error: profitErr } = await sb
      .from("users")
      .update({
        wallet_balance: nextBalance,
        wallet_profit: nextProfit,
      })
      .eq("id", order.user_id)
    if (profitErr) return fail(profitErr.message)
    balanceAdded = totalPrice
    profitAdded = Math.max(0, commission)
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

  let statusQuery = sb.from("admin_cart_orders").update(updates).eq("id", orderId)
  if (nextStatus !== prevStatus) statusQuery = statusQuery.eq("status", prevStatus)
  const { data: updatedRows, error } = await statusQuery.select("id")
  if (error || (nextStatus !== prevStatus && !updatedRows?.length)) {
    if (walletDeducted > 0) {
      const { data: u } = await sb.from("users").select("wallet_balance").eq("id", order.user_id).single()
      await sb
        .from("users")
        .update({ wallet_balance: Number(u?.wallet_balance ?? 0) + walletDeducted })
        .eq("id", order.user_id)
    }
    if (error) return fail(error.message)
    return fail("รายการนี้ถูกดำเนินการแล้ว")
  }
  if (nextStatus !== prevStatus) {
    await sb.from("shipping_history").insert({
      order_id: orderId,
      user_id: order.user_id,
      from_status: prevStatus,
      to_status: nextStatus,
    })
  }
  return ok({ balance_added: balanceAdded, profit_added: profitAdded })
}

export async function dbAdminSubmitReview(orderId: number, reviewText: string, starRating: number) {
  const sb = getSupabase()
  const { data: order } = await sb.from("admin_cart_orders").select("*").eq("id", orderId).single()
  if (!order) return fail("ไม่พบคำสั่งซื้อ")
  if (order.star_rating != null) return fail("รีวิวคำสั่งซื้อนี้ไปแล้ว")
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
  const { data, error } = await sb
    .from("admin_cart_orders")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  const items = await (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []) as Record<string, unknown>[],
  )
  return { success: true, items, count: items.length }
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

export async function dbSubmitDeposit(
  amount: number,
  paymentMethod = "bank_transfer",
  extra?: { payer_name?: string; payer_account?: string },
) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const limits = await dbFetchPaymentLimits()
  if (amount < Number(limits.min_deposit ?? 100)) return fail(`ฝากขั้นต่ำ $${Number(limits.min_deposit ?? 100).toFixed(2)}`)
  const sb = getSupabase()
  const { data: pending } = await sb
    .from("deposit_requests")
    .select("amount,request_no,user_id")
    .eq("user_id", uid)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle()
  if (pending) {
    return {
      success: false,
      has_pending: true,
      user_id: uid,
      amount: Number(pending.amount).toFixed(2),
      request_no: pending.request_no,
      message: "คุณยังมีรายการที่ยังรอดำเนินอยู่",
    }
  }
  const requestNo = `DEP-${Date.now()}`
  const method = String(paymentMethod || "bank_transfer").trim() || "bank_transfer"
  const { error } = await sb.from("deposit_requests").insert({
    user_id: uid,
    amount,
    payment_method: method,
    request_no: requestNo,
    payer_name: extra?.payer_name?.trim() || null,
    payer_account: extra?.payer_account?.trim() || null,
    status: "pending",
  })
  if (error) return fail(error.message)
  return ok({ user_id: uid, amount: amount.toFixed(2), request_no: requestNo })
}

export async function dbSubmitWithdraw(
  amount: number,
  withdrawPassword: string,
  extra?: { withdraw_method?: string; payout_destination?: string },
) {
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
  const { error } = await sb.from("withdraw_requests").insert({
    user_id: uid,
    amount,
    status: "pending",
    withdraw_method: extra?.withdraw_method?.trim() || null,
    payout_destination: extra?.payout_destination?.trim() || null,
  })
  if (error) return fail(error.message)
  return ok({ message: "ส่งคำขอถอนแล้ว" })
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function dbFetchNotifications(type: string) {
  if (type === "line_oa") return []
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
  const { data, error } = await sb
    .from("support_chat_messages")
    .select("*")
    .eq("user_id", uid)
    .order("created_at")
  if (error) return fail(error.message)
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
  try {
    const saved = await uploadToSupabaseStorage(file, "support_chat")
    return dbSendChatMessage(`CHATIMG:uploads/${saved}`)
  } catch (err) {
    return fail(err instanceof Error ? err.message : "อัปโหลดรูปแชทไม่สำเร็จ")
  }
}

/** Soft-delete — เก็บแถวไว้ให้ทั้งสองฝั่งเห็นสถานะ "ข้อความนี้ถูกลบแล้ว" */
export async function dbDeleteChatMessage(
  messageId: number,
  opts?: { threadUserId?: number; asAdmin?: boolean },
) {
  const sessionUid = getSessionUserId()
  if (!sessionUid) return fail("กรุณาเข้าสู่ระบบ")
  if (!messageId) return fail("ไม่พบข้อความ")
  const sb = getSupabase()
  const { data: msg, error: fetchErr } = await sb
    .from("support_chat_messages")
    .select("id, user_id, sender_type, message")
    .eq("id", messageId)
    .maybeSingle()
  if (fetchErr || !msg) return fail("ไม่พบข้อความ")

  const threadUid = Number(msg.user_id)
  const asAdmin = opts?.asAdmin ?? false
  const alreadyDeleted = String(msg.message ?? "").startsWith(CHAT_DELETED_MARKER)

  if (asAdmin) {
    if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์")
    if (opts?.threadUserId && threadUid !== opts.threadUserId) return fail("ไม่มีสิทธิ์")
  } else {
    if (threadUid !== sessionUid || msg.sender_type !== "user") return fail("ลบข้อความนี้ไม่ได้")
  }

  if (alreadyDeleted) return ok({ already_deleted: true })

  const { error } = await sb
    .from("support_chat_messages")
    .update({ message: CHAT_DELETED_MARKER })
    .eq("id", messageId)
  if (error) return fail(error.message)
  return ok()
}

export async function dbUpdateChatMessage(
  messageId: number,
  text: string,
  opts?: { threadUserId?: number; asAdmin?: boolean },
) {
  const sessionUid = getSessionUserId()
  if (!sessionUid) return fail("กรุณาเข้าสู่ระบบ")
  const next = text.trim()
  if (!next) return fail("ข้อความว่างไม่ได้")
  if (next.startsWith(CHAT_DELETED_MARKER) || next.startsWith("CHATIMG:")) {
    return fail("รูปแบบข้อความไม่ถูกต้อง")
  }

  const sb = getSupabase()
  const { data: msg, error: fetchErr } = await sb
    .from("support_chat_messages")
    .select("id, user_id, sender_type, message")
    .eq("id", messageId)
    .maybeSingle()
  if (fetchErr || !msg) return fail("ไม่พบข้อความ")
  if (String(msg.message ?? "").startsWith(CHAT_DELETED_MARKER)) {
    return fail("ข้อความถูกลบแล้ว แก้ไขไม่ได้")
  }
  if (String(msg.message ?? "").startsWith("CHATIMG:")) {
    return fail("แก้ไขรูปภาพไม่ได้")
  }

  const threadUid = Number(msg.user_id)
  const asAdmin = opts?.asAdmin ?? false
  if (asAdmin) {
    if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์")
    if (opts?.threadUserId && threadUid !== opts.threadUserId) return fail("ไม่มีสิทธิ์")
    if (msg.sender_type !== "admin") return fail("แก้ไขได้เฉพาะข้อความแอดมิน")
  } else {
    if (threadUid !== sessionUid || msg.sender_type !== "user") return fail("แก้ไขข้อความนี้ไม่ได้")
  }

  const { error } = await sb.from("support_chat_messages").update({ message: next }).eq("id", messageId)
  if (error) return fail(error.message)
  return ok()
}

export async function dbFetchChatThreads() {
  const sb = getSupabase()
  const [{ data: messages, error: msgErr }, { data: readStates, error: readErr }] = await Promise.all([
    sb.from("support_chat_messages").select("user_id, created_at, message, sender_type").order("created_at"),
    sb.from("chat_admin_read").select("user_id, read_at"),
  ])
  if (msgErr) throw new Error(msgErr.message)
  if (readErr) throw new Error(readErr.message)
  const readMap = new Map((readStates ?? []).map((r) => [Number(r.user_id), r.read_at]))
  const map = new Map<number, Record<string, unknown>>()
  for (const row of messages ?? []) {
    const uid = Number(row.user_id)
    const readAt = readMap.get(uid)
    const isUnread =
      row.sender_type === "user" && (!readAt || new Date(row.created_at) > new Date(String(readAt)))
    const prev = map.get(uid)
    const preview = chatMessagePreview(row.message)
    if (!prev || new Date(row.created_at) > new Date(String(prev.last_at))) {
      map.set(uid, {
        user_id: uid,
        last_message: preview,
        last_at: row.created_at,
        unread: isUnread ? 1 : 0,
      })
    } else if (isUnread) {
      map.set(uid, { ...prev, unread: Number(prev.unread ?? 0) + 1 })
    }
  }
  const userIds = [...map.keys()]
  const sortThreads = (rows: Record<string, unknown>[]) =>
    rows.sort(
      (a, b) => new Date(String(b.last_at ?? 0)).getTime() - new Date(String(a.last_at ?? 0)).getTime(),
    )

  if (userIds.length) {
    const { data: users, error: userErr } = await sb
      .from("users")
      .select("id, phone, email, username, role")
      .in("id", userIds)
      .not("role", "in", "(admin,super_admin)")
    if (userErr) throw new Error(userErr.message)
    const userMap = new Map((users ?? []).map((u) => [Number(u.id), u]))
    return sortThreads(
      [...map.values()]
        .filter((t) => userMap.has(Number(t.user_id)))
        .map((t) => {
          const u = userMap.get(Number(t.user_id))
          const unread = Number(t.unread ?? 0)
          return {
            ...t,
            message_count: unread,
            phone: u?.phone,
            email: u?.email,
            username: u?.username,
          }
        }),
    )
  }
  return sortThreads(
    [...map.values()].map((t) => ({
      ...t,
      message_count: Number(t.unread ?? 0),
    })),
  )
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

export async function dbFetchCustomerStoreByShop(shopName: string) {
  const target = String(shopName ?? "").trim()
  if (!target) return null
  const sb = getSupabase()
  const { data: exact, error: exactError } = await sb
    .from("customer_stores")
    .select("*")
    .eq("shop_name", target)
    .maybeSingle()
  if (exactError) throw new Error(exactError.message)
  if (exact) {
    const blocked = await (await import("@/lib/adminUserFilter")).assertCustomerUserId(Number(exact.user_id))
    return blocked ? null : exact
  }
  const { data: rows, error } = await sb.from("customer_stores").select("*")
  if (error) throw new Error(error.message)
  const customerRows = await (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (rows ?? []) as Record<string, unknown>[],
  )
  const norm = target
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
  return (
    customerRows.find((row) => {
      const name = String(row.shop_name ?? "")
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "")
      return name === norm || name.includes(norm) || norm.includes(name)
    }) ?? null
  )
}

export async function dbFetchCustomerStoreByUserId(userId: number) {
  if (!userId) return null
  if (await (await import("@/lib/adminUserFilter")).assertCustomerUserId(userId)) return null
  const sb = getSupabase()
  const { data, error } = await sb.from("customer_stores").select("*").eq("user_id", userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

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
  const uid = getSessionUserId()
  let q = sb.from("customer_store_products_mirror").select("*").order("id", { ascending: false })
  if (uid) q = q.neq("user_id", uid)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const rows = await (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []) as Record<string, unknown>[],
  )
  return rows.map((r) => ({ ...r, catalog_source: "mirror" }))
}

export async function dbFetchCustomerShopProducts(userId?: number) {
  const uid = userId ?? getSessionUserId()
  if (!uid) return []
  if (await (await import("@/lib/adminUserFilter")).assertCustomerUserId(uid)) return []
  const sb = getSupabase()
  const { data, error } = await sb.from("customer_store_products_mirror").select("*").eq("user_id", uid)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function dbFetchAllCustomerShopProducts() {
  const sb = getSupabase()
  const { data, error } = await sb.from("customer_store_products_mirror").select("*").order("id", { ascending: false })
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners((data ?? []) as Record<string, unknown>[])
}

export async function dbFetchAllCustomerStores() {
  const sb = getSupabase()
  const { data: stores, error } = await sb
    .from("customer_stores")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  if (!stores?.length) return []

  const { data: products, error: productsError } = await sb
    .from("customer_store_products_mirror")
    .select("user_id")
  if (productsError) throw new Error(productsError.message)
  const counts = new Map<number, number>()
  for (const row of products ?? []) {
    const uid = Number(row.user_id)
    if (uid) counts.set(uid, (counts.get(uid) ?? 0) + 1)
  }
  const mapped = stores.map((store) => ({
    ...store,
    product_count: counts.get(Number(store.user_id)) ?? 0,
  }))
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(mapped as Record<string, unknown>[])
}

const STORE_OPEN_PRODUCT_LIMIT = 100

/** นำเฉพาะสินค้าที่ลูกค้าเลือกจากแคตตาล็อกแอดมินเข้าร้าน */
async function dbSeedStoreProductsByIds(
  uid: number,
  shopName: string,
  productIds: number[],
): Promise<number> {
  const ids = [...new Set(productIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
  if (!ids.length) return 0
  if (ids.length > STORE_OPEN_PRODUCT_LIMIT) {
    throw new Error(`เลือกได้สูงสุด ${STORE_OPEN_PRODUCT_LIMIT} รายการต่อครั้ง`)
  }

  const sb = getSupabase()
  const { data: catalogProducts, error: catalogError } = await sb
    .from("store_products")
    .select("*")
    .in("id", ids)
  if (catalogError) throw new Error(catalogError.message)
  if (!catalogProducts?.length) return 0

  const { data: existing } = await sb
    .from("customer_store_products_mirror")
    .select("source_product_id, catalog_source")
    .eq("user_id", uid)
    .eq("catalog_source", "admin")

  const existingIds = new Set(
    (existing ?? []).map((row) => Number(row.source_product_id)).filter((id) => id > 0),
  )
  const byId = new Map(catalogProducts.map((p) => [Number(p.id), p]))

  const rows = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && !existingIds.has(Number(p.id)))
    .map((p) => ({
      user_id: uid,
      source_product_id: p.id,
      catalog_source: "admin",
      product_name: p.product_name,
      shop_name: shopName,
      product_category: p.product_category,
      product_image: p.product_image,
      product_images: p.product_images,
      product_price: p.product_price,
      product_stock: p.product_stock ?? 0,
      view_count: p.view_count ?? 0,
      trust_score: p.trust_score ?? 0,
      sales_volume: p.sales_volume ?? 0,
    }))

  if (!rows.length) return 0

  const { error } = await sb.from("customer_store_products_mirror").insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}

export async function dbAddProductToMyStore(productId: number, catalogSource: string) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()

  const { data: store } = await sb.from("customer_stores").select("shop_name").eq("user_id", uid).maybeSingle()
  if (!store?.shop_name) {
    return fail("กรุณาเปิดร้านก่อนเพิ่มสินค้า (เมนู ฉันจะเปิดร้าน)")
  }

  let source: Record<string, unknown> | null = null
  if (catalogSource === "mirror") {
    const { data } = await sb.from("customer_store_products_mirror").select("*").eq("id", productId).single()
    source = data
  } else {
    const { data } = await sb.from("store_products").select("*").eq("id", productId).single()
    source = data
  }
  if (!source) return fail("ไม่พบสินค้า")

  const { data: existing } = await sb
    .from("customer_store_products_mirror")
    .select("id")
    .eq("user_id", uid)
    .eq("source_product_id", productId)
    .eq("catalog_source", catalogSource)
    .maybeSingle()
  if (existing) return fail("สินค้านี้อยู่ในร้านแล้ว")

  const { error } = await sb.from("customer_store_products_mirror").insert({
    user_id: uid,
    source_product_id: productId,
    catalog_source: catalogSource,
    product_name: source.product_name,
    shop_name: store.shop_name,
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
  return ok({ message: "เพิ่มสินค้าในร้านแล้ว" })
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

function parseIdList(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
  }
  const text = String(raw ?? "").trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    }
  } catch {
    /* fall through */
  }
  return text
    .split(/[,\s]+/)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

export async function dbSubmitStore(
  action: "save" | "update",
  fields: { shop_name: string; main_category: string; shop_image?: File | null; product_ids?: number[] | string },
) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  let imagePath: string | null = null
  const shopImage =
    fields.shop_image instanceof File && fields.shop_image.size > 0 ? fields.shop_image : null
  if (shopImage) {
    try {
      imagePath = await uploadToSupabaseStorage(shopImage, "shops")
    } catch (err) {
      return fail(err instanceof Error ? err.message : "อัปโหลดรูปร้านไม่สำเร็จ")
    }
  } else if (action === "save") {
    return fail("กรุณาเลือกรูปร้าน")
  }
  const productIds = parseIdList(fields.product_ids)
  if (action === "save" && productIds.length === 0) {
    return fail("กรุณาเลือกสินค้าที่ต้องการเข้าร้านอย่างน้อย 1 รายการ")
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

  let productsAdded = 0
  if (productIds.length) {
    try {
      productsAdded = await dbSeedStoreProductsByIds(uid, fields.shop_name, productIds)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return fail(`บันทึกร้านแล้ว แต่เพิ่มสินค้าไม่สำเร็จ: ${msg}`)
    }
  }

  let message = action === "update" ? "บันทึกข้อมูลร้านแล้ว" : "ลงทะเบียนเปิดร้านเรียบร้อยแล้ว"
  if (productsAdded > 0) {
    message += ` — เพิ่มสินค้าที่เลือก ${productsAdded} รายการ`
  } else if (action === "save") {
    message += " — ไม่พบสินค้าที่เลือกในแคตตาล็อก"
  }

  return ok({ message, products_added: productsAdded })
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
  const sbCheck = getSupabase()
  const { data: latest } = await sbCheck
    .from("identity_verifications")
    .select("status")
    .eq("user_id", uid)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  const kyc = String(latest?.status ?? "none")
  if (kyc === "pending") return fail("คำขอยืนยันตัวตนกำลังรอตรวจสอบ")
  if (kyc === "approved") return fail("ยืนยันตัวตนแล้ว")
  let front: string
  let back: string
  let selfie: string
  try {
    front = await uploadToSupabaseStorage(fields.id_card_image, "kyc")
    back = await uploadToSupabaseStorage(fields.id_card_back, "kyc")
    selfie = await uploadToSupabaseStorage(fields.selfie_image, "kyc")
  } catch (err) {
    return fail(err instanceof Error ? err.message : "อัปโหลดเอกสารไม่สำเร็จ")
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

export async function dbSetWithdrawPassword(password: string, confirm: string, currentPassword = "") {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  if (!/^\d{6}$/.test(password)) return fail("รหัสการถอนต้องเป็นตัวเลข 6 หลัก")
  if (password !== confirm) return fail("รหัสผ่านไม่ตรงกัน")
  const sb = getSupabase()
  const { data: user, error: userError } = await sb
    .from("users")
    .select("withdraw_password_hash")
    .eq("id", uid)
    .maybeSingle()
  if (userError) return fail(userError.message)
  if (!user) return fail("ไม่พบผู้ใช้")

  const hasPassword = Boolean(user.withdraw_password_hash)
  let error
  let data
  if (hasPassword) {
    if (!/^\d{6}$/.test(currentPassword)) return fail("กรุณากรอกรหัสการถอนเดิม 6 หลัก")
    const changed = await sb.rpc("change_user_withdraw_password", {
      p_user_id: uid,
      p_current_password: currentPassword,
      p_new_password: password,
    })
    data = changed.data
    error = changed.error
    if (error && (error.code === "PGRST202" || error.code === "42883")) {
      const verified = await sb.rpc("verify_withdraw_password", {
        p_user_id: uid,
        p_password: currentPassword,
      })
      if (verified.error) return fail(verified.error.message)
      if (!(verified.data as { ok?: boolean } | null)?.ok) return fail("รหัสการถอนเดิมไม่ถูกต้อง")
      const fallback = await sb.rpc("set_user_withdraw_password", {
        p_user_id: uid,
        p_password: password,
      })
      data = fallback.data
      error = fallback.error
    }
  } else {
    const created = await sb.rpc("set_user_withdraw_password", {
      p_user_id: uid,
      p_password: password,
    })
    data = created.data
    error = created.error
  }
  if (error) return fail(error.message)
  const result = data as { success?: boolean; message?: string } | null
  if (result?.success === false) return fail(result.message ?? "บันทึกรหัสการถอนไม่สำเร็จ")
  return ok({ message: result?.message ?? (hasPassword ? "เปลี่ยนรหัสการถอนแล้ว" : "บันทึกรหัสการถอนแล้ว") })
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
  const { data, error } = await sb
    .from("users")
    .select(
      "id, username, email, phone, status, role, referral_code, referred_by, registered_at, credit, wallet_balance",
    )
    .not("role", "in", "(admin,super_admin)")
    .order("id")
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffAccounts(data ?? [])
}

export async function dbSuperAdminListAdmins() {
  const actorId = requireUserId()
  if (!actorId) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: actor } = await sb.from("users").select("role").eq("id", actorId).maybeSingle()
  if (actor?.role !== "super_admin") return fail("ไม่มีสิทธิ์เข้าถึง")
  const { data } = await sb
    .from("users")
    .select("id, username, email, phone, role, status, registered_at")
    .in("role", ["admin", "super_admin"])
    .order("id")
  return ok({ accounts: data ?? [] })
}

export async function dbSuperAdminResetAdminPassword(
  targetUserId: number,
  newPassword: string,
  confirmPassword: string,
) {
  const actorId = requireUserId()
  if (!actorId) return fail("กรุณาเข้าสู่ระบบ")
  if (!newPassword.trim()) return fail("กรุณากรอกรหัสผ่านใหม่")
  if (newPassword !== confirmPassword) return fail("รหัสผ่านใหม่ไม่ตรงกัน")
  const sb = getSupabase()
  const { data, error } = await sb.rpc("super_admin_set_admin_password", {
    p_actor_id: actorId,
    p_target_user_id: targetUserId,
    p_new_password: newPassword,
  })
  if (error) return fail(error.message)
  const row = data as { success?: boolean; message?: string }
  if (row?.success === false) return fail(row.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ")
  return ok({ message: row?.message ?? "เปลี่ยนรหัสผ่านแล้ว" })
}

export async function dbFetchDeposits() {
  const sb = getSupabase()
  const { data, error } = await sb.from("deposit_requests").select("*, users(email,phone,username)").order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []).map((row) => {
    const flat = flattenUserJoin(row as Record<string, unknown>)
    return {
      ...flat,
      transaction_ref: flat.request_no ?? flat.transaction_ref,
      channel: flat.payment_method ?? flat.channel,
    }
  })
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(rows)
}

export async function dbFetchWithdrawals() {
  const sb = getSupabase()
  const { data, error } = await sb.from("withdraw_requests").select("*, users(email,phone,username)").order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>)),
  )
}

export async function dbFetchVerifications() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from("identity_verifications")
    .select("*, users(email,phone,username)")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>)),
  )
}

export async function dbFetchBankAccounts() {
  const sb = getSupabase()
  const { data, error } = await sb.from("bank_accounts").select("*, users(email,phone,username)").order("id")
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>)),
  )
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
  return {
    success: true,
    percent: pct,
    commission_percent: pct,
    line_url: String((data as { line_url?: string } | null)?.line_url ?? "").trim(),
  }
}

export async function dbFetchPlatformContact() {
  const sb = getSupabase()
  const { data, error } = await sb.from("commission_settings").select("line_url").eq("id", 1).maybeSingle()
  if (!error) {
    const fromCol = String(data?.line_url ?? "").trim()
    if (fromCol) return { success: true, line_url: fromCol }
    return { success: true, line_url: await readLineUrlFallback(sb) }
  }
  const msg = error.message.toLowerCase()
  if (msg.includes("line_url") || msg.includes("column")) {
    return { success: true, line_url: await readLineUrlFallback(sb) }
  }
  return fail(error.message)
}

const LINE_NTYPE = "line_oa"

async function readLineUrlFallback(sb: ReturnType<typeof getSupabase>) {
  const { data } = await sb
    .from("notifications")
    .select("message")
    .eq("ntype", LINE_NTYPE)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  return String(data?.message ?? "").trim()
}

async function writeLineUrlFallback(sb: ReturnType<typeof getSupabase>, url: string) {
  const { error: delErr } = await sb.from("notifications").delete().eq("ntype", LINE_NTYPE)
  if (delErr) throw new Error(delErr.message)
  if (!url) return
  const { error } = await sb.from("notifications").insert({
    ntype: LINE_NTYPE,
    title: "LINE",
    message: url,
    user_id: null,
    is_read: true,
  })
  if (error) throw new Error(error.message)
}

export async function dbSavePlatformContact(lineUrl: string) {
  if (!isAdminPanelRole()) return fail("ไม่มีสิทธิ์")
  const normalized = normalizeLineContactUrl(lineUrl)
  const sb = getSupabase()
  const { data: cur } = await sb.from("commission_settings").select("percent").eq("id", 1).maybeSingle()
  const { error } = await sb.from("commission_settings").upsert({
    id: 1,
    percent: Number(cur?.percent ?? 20),
    line_url: normalized,
    updated_at: new Date().toISOString(),
  })
  try {
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes("line_url") || msg.includes("column")) {
        await writeLineUrlFallback(sb, normalized)
        return ok({ message: normalized ? "บันทึกลิงก์ LINE แล้ว" : "ล้างลิงก์ LINE แล้ว", line_url: normalized })
      }
      return fail(error.message)
    }
    await writeLineUrlFallback(sb, normalized)
    return ok({ message: normalized ? "บันทึกลิงก์ LINE แล้ว" : "ล้างลิงก์ LINE แล้ว", line_url: normalized })
  } catch (err) {
    if (!error) {
      return ok({ message: normalized ? "บันทึกลิงก์ LINE แล้ว" : "ล้างลิงก์ LINE แล้ว", line_url: normalized })
    }
    return fail(err instanceof Error ? err.message : "บันทึกลิงก์ LINE ไม่สำเร็จ")
  }
}

export async function dbSaveCommissionSettings(percent: number) {
  const sb = getSupabase()
  const withLine = await sb.from("commission_settings").select("percent,line_url").eq("id", 1).maybeSingle()
  const payload: Record<string, unknown> = {
    id: 1,
    percent,
    updated_at: new Date().toISOString(),
  }
  if (!withLine.error && withLine.data && "line_url" in withLine.data) {
    payload.line_url = withLine.data.line_url ?? ""
  }
  const { error } = await sb.from("commission_settings").upsert(payload)
  if (error) return fail(error.message)
  return ok()
}

export async function dbAdminNotifications() {
  const sb = getSupabase()
  const { data, error } = await sb.from("notifications").select("*").order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  const rows = await (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []) as Record<string, unknown>[],
  )
  return rows
    .filter((row) => String(row.ntype ?? "") !== "line_oa")
    .map((row) => ({
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
  if (String(order.status ?? "") !== "completed") {
    return fail("รีวิวได้เฉพาะคำสั่งซื้อที่สำเร็จแล้ว")
  }
  if (order.star_rating != null) return fail("รีวิวคำสั่งซื้อนี้ไปแล้ว")
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
