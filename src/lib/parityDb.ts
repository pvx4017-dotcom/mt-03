import { getSupabase } from "@/lib/supabase"
import { uploadToSupabaseStorage } from "@/lib/storageUpload"
import { requireUserId } from "@/lib/session"
import { DEFAULT_SELLER_LEVELS, type SellerLevel } from "@/lib/engagement"

type Result<T> = { success: boolean; message?: string } & T

function fail<T>(message: string, extra?: T): Result<T> {
  return { success: false, message, ...(extra ?? ({} as T)) }
}

function ok<T>(extra?: T): Result<T> {
  return { success: true, ...(extra ?? ({} as T)) }
}

function flattenUserJoin(row: Record<string, unknown>): Record<string, unknown> {
  const joined = row.users as { username?: string; phone?: string; email?: string } | null
  const { users: _users, ...rest } = row
  return {
    ...rest,
    username: (rest.username as string | undefined) ?? joined?.username,
    phone: (rest.phone as string | undefined) ?? joined?.phone,
    email: (rest.email as string | undefined) ?? joined?.email,
  }
}

export type ReceivingAccount = {
  id?: number
  channel?: string
  account_name?: string
  account_number?: string
  network?: string
  note?: string
  qr_image?: string
  is_active?: boolean
  sort_order?: number
}

const RECEIVING_QR_MARKER = /\n?\[\[QR_IMAGE:([^\]]+)\]\]\s*$/i

function normalizeReceivingAccount(row: Record<string, unknown>): ReceivingAccount {
  const rawNote = String(row.note ?? "")
  const marker = rawNote.match(RECEIVING_QR_MARKER)
  return {
    ...row,
    note: rawNote.replace(RECEIVING_QR_MARKER, "").trim(),
    qr_image: String(row.qr_image ?? marker?.[1] ?? "").trim(),
  } as ReceivingAccount
}

function receivingFallbackNote(note: string, qrImage: string) {
  const cleanNote = note.replace(RECEIVING_QR_MARKER, "").trim()
  return qrImage ? `${cleanNote}${cleanNote ? "\n" : ""}[[QR_IMAGE:${qrImage}]]` : cleanNote
}

function isMissingQrColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return error.code === "42703" || error.code === "PGRST204" || /qr_image.*(column|schema cache)|column.*qr_image/i.test(error.message ?? "")
}

export async function dbFetchReceivingAccounts(activeOnly = false) {
  const sb = getSupabase()
  let q = sb.from("platform_receiving_accounts").select("*").order("sort_order").order("id")
  if (activeOnly) q = q.eq("is_active", true)
  const { data, error } = await q
  if (error) return fail(error.message, { accounts: [] as ReceivingAccount[] })
  return ok({ accounts: (data ?? []).map((row) => normalizeReceivingAccount(row as Record<string, unknown>)) })
}

export async function dbSaveReceivingAccount(row: ReceivingAccount) {
  const sb = getSupabase()
  const payload = {
    channel: String(row.channel ?? "bank").trim() || "bank",
    account_name: String(row.account_name ?? "").trim(),
    account_number: String(row.account_number ?? "").trim(),
    network: String(row.network ?? "").trim(),
    note: String(row.note ?? "").trim(),
    qr_image: String(row.qr_image ?? "").trim() || null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    updated_at: new Date().toISOString(),
  }
  const fallbackPayload = {
    ...payload,
    note: receivingFallbackNote(payload.note, payload.qr_image ?? ""),
  }
  delete (fallbackPayload as Partial<typeof fallbackPayload>).qr_image
  if (row.id) {
    let { error } = await sb.from("platform_receiving_accounts").update(payload).eq("id", row.id)
    if (isMissingQrColumn(error)) {
      const fallback = await sb.from("platform_receiving_accounts").update(fallbackPayload).eq("id", row.id)
      error = fallback.error
    }
    if (error) return fail(error.message)
  } else {
    let { error } = await sb.from("platform_receiving_accounts").insert(payload)
    if (isMissingQrColumn(error)) {
      const fallback = await sb.from("platform_receiving_accounts").insert(fallbackPayload)
      error = fallback.error
    }
    if (error) return fail(error.message)
  }
  return ok({ message: "บันทึกบัญชีรับเงินแล้ว" })
}

export async function dbDeleteReceivingAccount(id: number) {
  const sb = getSupabase()
  const { error } = await sb.from("platform_receiving_accounts").delete().eq("id", id)
  if (error) return fail(error.message)
  return ok({ message: "ลบแล้ว" })
}

export async function dbFetchPayoutWallets() {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data } = await sb.from("user_payout_wallets").select("*").eq("user_id", uid).maybeSingle()
  return ok({
    wallets: {
      usdt_trc20: String(data?.usdt_trc20 ?? ""),
      usdt_erc20: String(data?.usdt_erc20 ?? ""),
      eth: String(data?.eth ?? ""),
    },
  })
}

export async function dbSavePayoutWallets(wallets: { usdt_trc20?: string; usdt_erc20?: string; eth?: string }) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { error } = await sb.from("user_payout_wallets").upsert({
    user_id: uid,
    usdt_trc20: String(wallets.usdt_trc20 ?? "").trim(),
    usdt_erc20: String(wallets.usdt_erc20 ?? "").trim(),
    eth: String(wallets.eth ?? "").trim(),
    updated_at: new Date().toISOString(),
  })
  if (error) return fail(error.message)
  return ok({ message: "บันทึกวอลเล็ตแล้ว" })
}

export async function dbFetchDefaultAddress() {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data } = await sb
    .from("user_addresses")
    .select("*")
    .eq("user_id", uid)
    .order("is_default", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  return ok({ address: data ?? null })
}

export async function dbSaveUserAddress(addr: {
  receiver_name: string
  receiver_phone: string
  receiver_address: string
}) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const name = addr.receiver_name.trim()
  const phone = addr.receiver_phone.trim()
  const address = addr.receiver_address.trim()
  if (!name || !phone || !address) return fail("กรุณากรอกที่อยู่ให้ครบ")
  const sb = getSupabase()
  const now = new Date().toISOString()
  const { data: existing } = await sb
    .from("user_addresses")
    .select("id")
    .eq("user_id", uid)
    .eq("is_default", true)
    .maybeSingle()
  if (existing?.id) {
    const { error } = await sb
      .from("user_addresses")
      .update({
        receiver_name: name,
        receiver_phone: phone,
        receiver_address: address,
        is_default: true,
        updated_at: now,
      })
      .eq("id", existing.id)
    if (error) return fail(error.message)
  } else {
    const { error } = await sb.from("user_addresses").insert({
      user_id: uid,
      receiver_name: name,
      receiver_phone: phone,
      receiver_address: address,
      is_default: true,
      created_at: now,
      updated_at: now,
    })
    if (error) return fail(error.message)
  }
  return ok({ message: "บันทึกที่อยู่แล้ว" })
}

export async function dbFetchUserAddressesAdmin() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from("user_addresses")
    .select("*, users(username,phone,email)")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>)),
  )
}

export async function dbFetchCheckinState(): Promise<
  Result<{ dates: string[]; total: number; checked_today: boolean }>
> {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ", { dates: [] as string[], total: 0, checked_today: false })
  const sb = getSupabase()
  const [{ data: dates }, { data: user }] = await Promise.all([
    sb.from("daily_checkins").select("checkin_date").eq("user_id", uid).order("checkin_date"),
    sb.from("users").select("points").eq("id", uid).single(),
  ])
  const list = (dates ?? []).map((row) => String(row.checkin_date))
  const today = new Date().toISOString().slice(0, 10)
  return ok({
    dates: list,
    total: Number(user?.points ?? list.length * 20),
    checked_today: list.includes(today),
  })
}

export async function dbPerformCheckin(points = 20) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const today = new Date().toISOString().slice(0, 10)
  const sb = getSupabase()
  const { error } = await sb.from("daily_checkins").insert({
    user_id: uid,
    checkin_date: today,
    points,
  })
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const state = await dbFetchCheckinState()
      return fail("วันนี้คุณเช็กอินแล้ว", { dates: state.dates, total: state.total, checked_today: true })
    }
    return fail(error.message)
  }
  const { data: user } = await sb.from("users").select("points").eq("id", uid).single()
  const nextPoints = Number(user?.points ?? 0) + points
  await sb.from("users").update({ points: nextPoints }).eq("id", uid)
  const state = await dbFetchCheckinState()
  return ok({
    message: `เช็กอินสำเร็จ +${points} พอยท์`,
    dates: state.dates,
    total: nextPoints,
    checked_today: true,
  })
}

export async function dbFetchSellerLevels() {
  const sb = getSupabase()
  const { data, error } = await sb.from("seller_levels").select("*").order("sort_order").order("id")
  if (error || !data?.length) return ok({ levels: DEFAULT_SELLER_LEVELS })
  return ok({
    levels: data.map((row) => ({
      id: Number(row.id),
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      min_topup: Number(row.min_topup ?? 0),
      commission_rate: String(row.commission_rate ?? ""),
      referral_reward: String(row.referral_reward ?? ""),
      sort_order: Number(row.sort_order ?? 0),
      is_active: Boolean(row.is_active),
    })) as SellerLevel[],
  })
}

export async function dbSaveSellerLevel(row: SellerLevel) {
  const sb = getSupabase()
  const { error } = await sb
    .from("seller_levels")
    .update({
      code: row.code,
      name: row.name,
      min_topup: row.min_topup,
      commission_rate: row.commission_rate,
      referral_reward: row.referral_reward,
      sort_order: row.sort_order,
      is_active: row.is_active,
    })
    .eq("id", row.id)
  if (error) return fail(error.message)
  return ok({ message: "บันทึกระดับผู้ขายแล้ว" })
}

export async function dbSubmitLoan(fields: { amount: number; full_name: string; phone: string }) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const amount = Math.round(Number(fields.amount) * 100) / 100
  const fullName = fields.full_name.trim()
  const phone = fields.phone.trim()
  const phoneDigits = phone.replace(/\D/g, "")
  if (!Number.isFinite(amount) || amount < 1000 || amount > 500000) {
    return fail("วงเงินสินเชื่อต้องอยู่ระหว่าง $1,000 ถึง $500,000")
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return fail("กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง")
  }
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return fail("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง")
  }
  const sb = getSupabase()
  const { data: user, error: userError } = await sb
    .from("users")
    .select("id,role,status")
    .eq("id", uid)
    .maybeSingle()
  if (userError) return fail(userError.message)
  if (!user || user.status !== "active") return fail("บัญชีนี้ไม่สามารถสมัครสินเชื่อได้")
  if (user.role === "admin" || user.role === "super_admin") {
    return fail("บัญชีผู้ดูแลไม่สามารถสมัครสินเชื่อได้")
  }

  const { data: activeLoan, error: activeLoanError } = await sb
    .from("loan_applications")
    .select("id,status")
    .eq("user_id", uid)
    .in("status", ["pending", "reviewing"])
    .limit(1)
    .maybeSingle()
  if (activeLoanError) return fail(activeLoanError.message)
  if (activeLoan) return fail("คุณมีคำขอสินเชื่อที่กำลังรอตรวจสอบอยู่แล้ว")

  const { data, error } = await sb.from("loan_applications").insert({
    user_id: uid,
    amount,
    full_name: fullName,
    phone,
    status: "pending",
  }).select("id").single()
  if (error) {
    if (error.code === "23505") return fail("คุณมีคำขอสินเชื่อที่กำลังรอตรวจสอบอยู่แล้ว")
    return fail(error.message)
  }
  return ok({ message: "ส่งใบสมัครสินเชื่อแล้ว", id: data.id })
}

export async function dbFetchMyLoans() {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data, error } = await sb
    .from("loan_applications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
  if (error) return fail(error.message, { items: [] })
  return ok({ items: data ?? [] })
}

export async function dbFetchAdminLoans() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from("loan_applications")
    .select("*, users!loan_applications_user_id_fkey(email,phone,username)")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>)),
  )
}

export async function dbUpdateLoanStatus(id: number, status: string) {
  const allowed = ["pending", "reviewing", "approved", "rejected"]
  if (!allowed.includes(status)) return fail("สถานะไม่ถูกต้อง")
  if (!Number.isInteger(id) || id <= 0) return fail("ไม่พบคำขอสินเชื่อ")
  const sb = getSupabase()
  const actorId = requireUserId()
  if (!actorId) return fail("กรุณาเข้าสู่ระบบ")

  const rpc = await sb.rpc("process_loan_application", {
    p_actor_id: actorId,
    p_loan_id: id,
    p_status: status,
    p_decision_note: null,
  })
  if (!rpc.error) {
    const result = rpc.data as { success?: boolean; message?: string; balance_after?: number } | null
    if (result?.success === false) return fail(result.message ?? "อัปเดตสินเชื่อไม่สำเร็จ")
    return ok({
      message: result?.message ?? "อัปเดตสถานะแล้ว",
      balance_after: result?.balance_after,
    })
  }
  const missingRpc = rpc.error.code === "PGRST202" || rpc.error.code === "42883"
  if (!missingRpc) return fail(rpc.error.message)

  // Compatibility path for databases that have not run patch-loan-workflow.sql yet.
  const { data: loan, error: loanError } = await sb
    .from("loan_applications")
    .select("id,user_id,amount,status")
    .eq("id", id)
    .maybeSingle()
  if (loanError) return fail(loanError.message)
  if (!loan) return fail("ไม่พบคำขอสินเชื่อ")

  const previousStatus = String(loan.status ?? "pending")
  if (previousStatus === status) return ok({ message: "รายการอยู่ในสถานะนี้แล้ว" })
  const transitions: Record<string, string[]> = {
    pending: ["reviewing", "approved", "rejected"],
    reviewing: ["approved", "rejected"],
    approved: [],
    rejected: [],
  }
  if (!(transitions[previousStatus] ?? []).includes(status)) {
    return fail("รายการนี้ดำเนินการเสร็จแล้ว ไม่สามารถเปลี่ยนสถานะย้อนหลังได้")
  }

  const { data: customer, error: customerError } = await sb
    .from("users")
    .select("id,role,status,wallet_balance")
    .eq("id", loan.user_id)
    .maybeSingle()
  if (customerError) return fail(customerError.message)
  if (!customer || customer.role === "admin" || customer.role === "super_admin") {
    return fail("ไม่สามารถดำเนินการกับบัญชีผู้ดูแลได้")
  }

  const now = new Date().toISOString()
  const { data: claimed, error: statusError } = await sb
    .from("loan_applications")
    .update({ status, updated_at: now })
    .eq("id", id)
    .eq("status", previousStatus)
    .select("id")
    .maybeSingle()
  if (statusError) return fail(statusError.message)
  if (!claimed) return fail("สถานะรายการถูกเปลี่ยนโดยผู้ดูแลคนอื่น กรุณาโหลดข้อมูลใหม่")

  if (status === "approved") {
    const balanceAfter = Number(customer.wallet_balance ?? 0) + Number(loan.amount)
    const { error: balanceError } = await sb
      .from("users")
      .update({ wallet_balance: balanceAfter })
      .eq("id", loan.user_id)
    if (balanceError) {
      await sb.from("loan_applications").update({ status: previousStatus, updated_at: now }).eq("id", id).eq("status", status)
      return fail(`อนุมัติไม่สำเร็จ: ${balanceError.message}`)
    }
    return ok({ message: "อนุมัติสินเชื่อและเพิ่มวงเงินเข้ากระเป๋าแล้ว", balance_after: balanceAfter })
  }

  return ok({ message: status === "rejected" ? "ปฏิเสธคำขอสินเชื่อแล้ว" : "เปลี่ยนสถานะเป็นกำลังพิจารณาแล้ว" })
}

export async function dbFetchCouponsForUser(): Promise<Result<{ items: Record<string, unknown>[] }>> {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ", { items: [] })
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: coupons }, { data: claimed }] = await Promise.all([
    sb.from("coupons").select("*").eq("is_active", true).order("id"),
    sb.from("user_coupons").select("*").eq("user_id", uid),
  ])
  const claimedMap = new Map((claimed ?? []).map((row) => [Number(row.coupon_id), row]))
  const items = (coupons ?? []).map((coupon) => {
    const mine = claimedMap.get(Number(coupon.id))
    const expired = coupon.expires_at ? String(coupon.expires_at) < today : false
    let status = "available"
    if (mine?.status === "used") status = "used"
    else if (expired) status = "expired"
    return { ...coupon, user_status: status, user_coupon_id: mine?.id ?? null }
  })
  return ok({ items })
}

export async function dbUseCoupon(couponId: number) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  const sb = getSupabase()
  const { data: coupon } = await sb.from("coupons").select("*").eq("id", couponId).maybeSingle()
  if (!coupon || !coupon.is_active) return fail("ไม่พบคูปอง")
  const today = new Date().toISOString().slice(0, 10)
  if (coupon.expires_at && String(coupon.expires_at) < today) return fail("คูปองหมดอายุแล้ว")
  const now = new Date().toISOString()
  const { data: existing } = await sb
    .from("user_coupons")
    .select("*")
    .eq("user_id", uid)
    .eq("coupon_id", couponId)
    .maybeSingle()
  if (existing?.status === "used") return fail("ใช้คูปองนี้ไปแล้ว")
  if (existing?.id) {
    const { error } = await sb
      .from("user_coupons")
      .update({ status: "used", used_at: now })
      .eq("id", existing.id)
    if (error) return fail(error.message)
  } else {
    const { error } = await sb.from("user_coupons").insert({
      user_id: uid,
      coupon_id: couponId,
      status: "used",
      used_at: now,
    })
    if (error) return fail(error.message)
  }
  return ok({ message: "ใช้คูปองแล้ว" })
}

export async function dbFetchAdminCoupons() {
  const sb = getSupabase()
  const { data } = await sb.from("coupons").select("*").order("id", { ascending: false })
  return data ?? []
}

export async function dbSaveCoupon(row: {
  id?: number
  code: string
  title: string
  description?: string
  value_label?: string
  expires_at?: string
  is_active?: boolean
}) {
  const sb = getSupabase()
  const payload = {
    code: row.code.trim().toUpperCase(),
    title: row.title.trim(),
    description: String(row.description ?? "").trim(),
    value_label: String(row.value_label ?? "").trim(),
    expires_at: row.expires_at || null,
    is_active: row.is_active !== false,
  }
  if (!payload.code || !payload.title) return fail("กรุณากรอกโค้ดและชื่อคูปอง")
  if (row.id) {
    const { error } = await sb.from("coupons").update(payload).eq("id", row.id)
    if (error) return fail(error.message)
  } else {
    const { error } = await sb.from("coupons").insert(payload)
    if (error) return fail(error.message)
  }
  return ok({ message: "บันทึกคูปองแล้ว" })
}

export async function dbDeleteCoupon(id: number) {
  const sb = getSupabase()
  const { error } = await sb.from("coupons").delete().eq("id", id)
  if (error) return fail(error.message)
  return ok({ message: "ลบคูปองแล้ว" })
}

export async function dbCountAvailableCoupons() {
  const uid = requireUserId()
  if (!uid) return 0
  const data = await dbFetchCouponsForUser()
  const items = data.success ? (data.items ?? []) : []
  return items.filter((row: Record<string, unknown>) => String(row.user_status) === "available").length
}

export async function dbSubmitFeedback(fields: {
  ftype: string
  subject: string
  detail: string
  contact: string
  image?: File | null
}) {
  const uid = requireUserId()
  if (!uid) return fail("กรุณาเข้าสู่ระบบ")
  if (!fields.subject.trim()) return fail("กรุณาระบุหัวข้อ")
  let imagePath = ""
  if (fields.image && fields.image.size > 0) {
    try {
      imagePath = await uploadToSupabaseStorage(fields.image, "feedback")
    } catch (err) {
      return fail(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ")
    }
  }
  const sb = getSupabase()
  const { error } = await sb.from("feedback_tickets").insert({
    user_id: uid,
    ftype: fields.ftype || "complaint",
    subject: fields.subject.trim(),
    detail: fields.detail.trim(),
    contact: fields.contact.trim(),
    image_path: imagePath || null,
    status: "open",
  })
  if (error) return fail(error.message)
  return ok({ message: "ส่งเรื่องให้ทีมงานแล้ว" })
}

export async function dbFetchAdminFeedback() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from("feedback_tickets")
    .select("*, users(email,phone,username)")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (await import("@/lib/adminUserFilter")).withoutStaffOwners(
    (data ?? []).map((row) => flattenUserJoin(row as Record<string, unknown>)),
  )
}
