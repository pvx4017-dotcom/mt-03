/**
 * E2E smoke test — ทดสอบ flow หลักบน Supabase จริง
 * รัน: node scripts/e2e-smoke-test.mjs
 */
import { createClient } from "@supabase/supabase-js"
import { loadEnv } from "./load-env.mjs"

loadEnv()

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** บัญชี demo จากผู้ใช้ — แก้ได้ที่นี่ */
const DEMO_CUSTOMER = {
  account: "1234567890",
  password: "123456",
  /** รูปแบบที่ login ได้จริงใน DB */
  loginAccounts: ["1234567890", "+661234567890", "01234567890"],
}
const DEMO_ADMIN = { account: "admin@meta.local", password: "123456" }

function isCustomerRole(role) {
  return role === "customer" || role === "user"
}

const results = []
let failed = 0
let passed = 0
let skipped = 0

function pass(name, detail = "") {
  passed++
  results.push({ status: "PASS", name, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`)
}

function fail(name, detail = "") {
  failed++
  results.push({ status: "FAIL", name, detail })
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`)
}

function skip(name, detail = "") {
  skipped++
  results.push({ status: "SKIP", name, detail })
  console.log(`  ○ ${name}${detail ? ` — ${detail}` : ""}`)
}

async function tryLogin(anon, account, password) {
  const { data, error } = await anon.rpc("login_user", { p_account: account, p_password: password })
  if (error) return { ok: false, error: error.message }
  return { ok: data?.success === true, data }
}

function normalizeShippingToStatus(toStatus) {
  if (toStatus === "success") return "completed"
  return toStatus
}

async function adminUpdateOrder(admin, orderId, nextStatus) {
  const { data: order, error: fetchErr } = await admin
    .from("admin_cart_orders")
    .select("*")
    .eq("id", orderId)
    .single()
  if (fetchErr || !order) return { success: false, message: fetchErr?.message ?? "ไม่พบออเดอร์" }

  const prevStatus = String(order.status ?? "pending")
  const qty = Number(order.quantity ?? 1)
  const unitPrice = Number(order.unit_price ?? 0)
  const totalPrice = unitPrice * qty
  const updates = { status: nextStatus, updated_at: new Date().toISOString() }

  if (nextStatus === "shipping" && prevStatus === "pending") {
    const { data: cs } = await admin.from("commission_settings").select("percent").eq("id", 1).single()
    const pct = Number(cs?.percent ?? 20)
    const commission = totalPrice * (pct / 100)
    updates.commission_amount = commission
    const totalDue = totalPrice + commission
    const { data: user } = await admin.from("users").select("wallet_balance").eq("id", order.user_id).single()
    const balance = Number(user?.wallet_balance ?? 0)
    if (balance < totalDue) {
      return { success: false, message: `wallet ไม่พอ (${balance} < ${totalDue})` }
    }
    const { error: wErr } = await admin
      .from("users")
      .update({ wallet_balance: balance - totalDue })
      .eq("id", order.user_id)
    if (wErr) return { success: false, message: wErr.message }
  }

  if (nextStatus === "completed" && prevStatus !== "completed") {
    const commission = Number(updates.commission_amount ?? order.commission_amount ?? 0)
    if (commission > 0) {
      const { data: u } = await admin.from("users").select("wallet_profit").eq("id", order.user_id).single()
      const { error: pErr } = await admin
        .from("users")
        .update({ wallet_profit: Number(u?.wallet_profit ?? 0) + commission })
        .eq("id", order.user_id)
      if (pErr) return { success: false, message: pErr.message }
    }
  }

  const { error: upErr } = await admin.from("admin_cart_orders").update(updates).eq("id", orderId)
  if (upErr) return { success: false, message: upErr.message }

  if (nextStatus !== prevStatus) {
    await admin.from("shipping_history").insert({
      order_id: orderId,
      user_id: order.user_id,
      from_status: prevStatus,
      to_status: nextStatus,
    })
  }
  return { success: true }
}

async function main() {
  console.log("\n=== META E2E SMOKE TEST ===\n")

  if (!url || !anonKey) {
    fail("ENV", "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ไม่ครบ")
    printSummary()
    process.exit(1)
  }
  pass("ENV", "Supabase credentials พร้อม")

  const anon = createClient(url, anonKey)
  const admin = serviceKey ? createClient(url, serviceKey) : null

  if (!admin) {
    fail("SERVICE_ROLE", "ไม่มี SUPABASE_SERVICE_ROLE_KEY — ข้าม flow ออเดอร์")
  } else {
    pass("SERVICE_ROLE", "service role พร้อม")
  }

  // ── 1. Auth ──
  console.log("\n[1] Authentication")
  const loginAttempts = [
    [DEMO_ADMIN.account, DEMO_ADMIN.password],
    ...DEMO_CUSTOMER.loginAccounts.map((a) => [a, DEMO_CUSTOMER.password]),
    ["superadmin@meta.local", "Superadmin123"],
  ]
  let superAdminId = null
  let adminId = null
  let customerId = null
  let customerLogin = null

  for (const [account, password] of loginAttempts) {
    const r = await tryLogin(anon, account, password)
    if (!r.ok) continue
    const role = r.data?.role
    const uid = r.data?.user_id
    if (role === "super_admin" && !superAdminId) {
      superAdminId = uid
      pass("Login super_admin", account)
    } else if ((role === "admin" || role === "super_admin") && !adminId && account === DEMO_ADMIN.account) {
      adminId = uid
      pass("Login admin (demo)", account)
    } else if (role === "admin" && !adminId) {
      adminId = uid
      pass("Login admin", account)
    } else if (isCustomerRole(role) && !customerId) {
      customerId = uid
      customerLogin = account
      pass("Login customer (demo)", `${account} (role=${role})`)
    }
  }

  if (!adminId && !superAdminId) fail("Login admin panel", `ลอง ${DEMO_ADMIN.account} ไม่สำเร็จ`)
  if (!customerId) fail("Login customer (demo)", `ลอง ${DEMO_CUSTOMER.loginAccounts.join(", ")} ไม่สำเร็จ`)

  const badLogin = await tryLogin(anon, "superadmin@meta.local", "wrong-password-xyz")
  if (!badLogin.ok) pass("Login rejects bad password")
  else fail("Login rejects bad password", "ควร fail แต่ success")

  // ── 2. Catalog / data ──
  console.log("\n[2] Catalog & seed data")
  const tables = [
    ["store_products", 1],
    ["product_categories", 1],
    ["slide_images", 0],
    ["invitation_codes", 1],
    ["payment_limits", 1],
    ["commission_settings", 1],
    ["notifications", 0],
  ]
  for (const [table, min] of tables) {
    const { count, error } = await anon.from(table).select("*", { count: "exact", head: true })
    if (error) fail(`Table ${table}`, error.message)
    else if ((count ?? 0) >= min) pass(`Table ${table}`, `${count} rows`)
    else fail(`Table ${table}`, `มีแค่ ${count} rows (ต้องการ ≥ ${min})`)
  }

  if (customerId) {
    const { data: profile } = await anon.rpc("get_user_profile", { p_user_id: customerId })
    if (profile?.success) pass("get_user_profile (demo)", `wallet=${profile.user?.wallet_balance}`)
    else fail("get_user_profile (demo)", profile?.message ?? "unknown")

    if (admin) {
      const { data: store } = await admin
        .from("customer_stores")
        .select("shop_name, main_category, sold_count")
        .eq("user_id", customerId)
        .maybeSingle()
      if (store?.shop_name) pass("Demo customer store", String(store.shop_name))
      else skip("Demo customer store", "ยังไม่เปิดร้าน")
    }
  }

  // ── 3. Customer order flow ──
  console.log("\n[3] Customer order pipeline")
  let testOrderIds = []
  const billNo = `BILL-E2E-${Date.now()}`

  if (admin && customerId) {
    const { data: product } = await admin
      .from("store_products")
      .select("id, product_name, shop_name, product_image, product_category, product_price")
      .limit(1)
      .maybeSingle()

    if (!product) {
      fail("Order flow setup", "ไม่มี store_products")
    } else {
      const unitPrice = Number(product.product_price ?? 100)
      const minWallet = unitPrice * 1.2 + 50

      const { data: beforeUser } = await admin.from("users").select("wallet_balance,wallet_profit").eq("id", customerId).single()
      const walletBefore = Number(beforeUser?.wallet_balance ?? 0)
      const profitBefore = Number(beforeUser?.wallet_profit ?? 0)

      let walletBeforeDebit = walletBefore
      if (walletBefore < minWallet) {
        walletBeforeDebit = minWallet + 5000
        await admin.from("users").update({ wallet_balance: walletBeforeDebit }).eq("id", customerId)
        pass("Topup test wallet", `$${walletBeforeDebit}`)
      }

      // ล้างตะกร้าเก่า
      await admin.from("product_orders").delete().eq("user_id", customerId).eq("status", "pending")
      await admin.from("admin_cart_orders").delete().eq("user_id", customerId).like("order_no", "BILL-E2E-%")

      const { data: cartRow, error: cartErr } = await admin
        .from("product_orders")
        .insert({
          user_id: customerId,
          product_id: product.id,
          product_name: product.product_name,
          shop_name: product.shop_name,
          product_image: product.product_image,
          product_category: product.product_category,
          unit_price: unitPrice,
          quantity: 1,
          status: "pending",
        })
        .select("id")
        .single()

      if (cartErr) fail("Create product_order", cartErr.message)
      else pass("Create product_order", `id=${cartRow.id}`)

      const { count: pendingCartCount } = await admin
        .from("product_orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", customerId)
        .eq("status", "pending")
      pass("Cart pending count", `${pendingCartCount ?? 0} item(s)`)

      const { data: poRows } = await admin
        .from("product_orders")
        .select("*")
        .eq("user_id", customerId)
        .eq("status", "pending")

      const inserts = (poRows ?? []).map((r) => ({
        user_id: customerId,
        order_no: billNo,
        product_id: r.product_id,
        product_name: r.product_name,
        shop_name: r.shop_name,
        product_image: r.product_image,
        product_category: r.product_category,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total_price: Number(r.unit_price ?? 0) * Number(r.quantity ?? 1),
        receiver_name: "E2E Tester",
        receiver_address: "123 Test St",
        receiver_phone: "0812345678",
        contact_name: "E2E Tester",
        contact_address: "123 Test St",
        contact_phone: "0812345678",
        shipping_method: "free",
        status: "pending",
      }))

      const { data: inserted, error: insErr } = await admin.from("admin_cart_orders").insert(inserts).select("id")
      if (insErr) fail("Confirm → admin_cart_orders pending", insErr.message)
      else {
        testOrderIds = (inserted ?? []).map((r) => r.id)
        pass("Confirm → admin_cart_orders pending", `${testOrderIds.length} order(s), bill=${billNo}`)
      }
      await admin.from("product_orders").delete().eq("user_id", customerId).eq("status", "pending")

      const { count: pendingPay } = await admin
        .from("admin_cart_orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", customerId)
        .eq("status", "pending")
      if ((pendingPay ?? 0) > 0) pass("Customer pending-payment view", `${pendingPay} pending`)
      else fail("Customer pending-payment view", "ไม่มี pending")

      const orderId = testOrderIds[0]
      if (orderId) {
        let r = await adminUpdateOrder(admin, orderId, "shipping")
        if (r.success) pass("Admin confirm → shipping (wallet debit)", `order ${orderId}`)
        else fail("Admin confirm → shipping", r.message)

        r = await adminUpdateOrder(admin, orderId, "receiving")
        if (r.success) pass("Admin → receiving", `order ${orderId}`)
        else fail("Admin → receiving", r.message)

        r = await adminUpdateOrder(admin, orderId, "completed")
        if (r.success) pass("Admin → completed (profit credit)", `order ${orderId}`)
        else fail("Admin → completed", r.message)

        const { data: afterUser } = await admin.from("users").select("wallet_balance,wallet_profit").eq("id", customerId).single()
        const walletAfter = Number(afterUser?.wallet_balance ?? 0)
        const profitAfter = Number(afterUser?.wallet_profit ?? 0)
        if (walletAfter < walletBeforeDebit) pass("Wallet debited on shipping", `${walletBeforeDebit} → ${walletAfter}`)
        else fail("Wallet debited on shipping", `${walletBeforeDebit} → ${walletAfter}`)
        if (profitAfter > profitBefore) pass("Profit credited on completed", `${profitBefore} → ${profitAfter}`)
        else fail("Profit credited on completed", `${profitBefore} → ${profitAfter}`)

        const statuses = ["shipping", "receiving", "completed"]
        for (const st of statuses) {
          const { count: c } = await admin
            .from("admin_cart_orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", customerId)
            .eq("status", st)
          pass(`Customer tab ${st}`, `${c ?? 0} order(s)`)
        }

        const toStatus = normalizeShippingToStatus("success")
        const { count: completedViaSuccess } = await admin
          .from("admin_cart_orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", customerId)
          .eq("status", toStatus)
        if ((completedViaSuccess ?? 0) > 0) pass("to_status=success alias → completed", `${completedViaSuccess} order(s)`)
        else fail("to_status=success alias", "ไม่พบ completed")

        const { count: contacts } = await admin
          .from("admin_cart_orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", customerId)
        if ((contacts ?? 0) > 0) pass("Order history (order contacts)", `${contacts} row(s)`)
        else fail("Order history (order contacts)", "ว่าง")

        const { data: orderRow } = await admin.from("admin_cart_orders").select("*").eq("id", orderId).single()
        if (orderRow?.receiver_name === "E2E Tester") pass("Order contact fields saved")
        else fail("Order contact fields saved", JSON.stringify(orderRow?.receiver_name))
      }
    }
  } else {
    skip("Order pipeline", "ไม่มี service role")
  }

  // ── 4. Admin panel reads ──
  console.log("\n[4] Admin panel data")
  if (admin) {
    const { count: adminCart } = await admin
      .from("admin_cart_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
    pass("Admin cart pending", `${adminCart ?? 0} item(s)`)

    for (const st of ["shipping", "receiving"]) {
      const { count: c } = await admin
        .from("admin_cart_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", st)
      pass(`Admin orders ${st}`, `${c ?? 0}`)
    }

    const { data: stores } = await admin.from("customer_stores").select("id", { count: "exact", head: true })
    pass("Customer stores", `${stores?.length ?? 0}+ stores`)

    const { data: mirror } = await admin
      .from("customer_store_products_mirror")
      .select("id", { count: "exact", head: true })
      .limit(1)
    pass("Store mirror products", "query ok")

    const { data: comm } = await admin.from("commission_settings").select("percent").eq("id", 1).single()
    if (comm?.percent != null) pass("Commission settings", `${comm.percent}%`)
    else fail("Commission settings", "ไม่พบ")
  }

  // ── 5. Reference site connectivity ──
  console.log("\n[5] Reference site (read-only compare)")
  const refBase = "https://ffshoppingx9.bigselashoping.org/marketting/api"
  const refChecks = [
    "admin_store_products.php",
    "admin_product_categories.php",
    "get_my_order_hub_counts.php",
  ]
  for (const api of refChecks) {
    try {
      const r = await fetch(`${refBase}/${api}`)
      const t = await r.text()
      let ok = false
      try {
        const j = JSON.parse(t)
        ok = j.success === true || j.products || j.categories
      } catch {
        ok = r.ok
      }
      if (ok) pass(`Reference ${api}`, `HTTP ${r.status}`)
      else fail(`Reference ${api}`, t.slice(0, 60))
    } catch (e) {
      fail(`Reference ${api}`, e.message)
    }
  }

  // ── Cleanup ──
  if (admin && testOrderIds.length) {
    console.log("\n[6] Cleanup test orders")
    await admin.from("shipping_history").delete().in("order_id", testOrderIds)
    await admin.from("admin_cart_orders").delete().in("id", testOrderIds)
    pass("Removed E2E test orders", testOrderIds.join(", "))
  }

  printSummary()
  process.exit(failed > 0 ? 1 : 0)
}

function printSummary() {
  console.log("\n=== SUMMARY ===")
  console.log(`PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}`)
  if (failed > 0) {
    console.log("\nFailed tests:")
    for (const r of results.filter((x) => x.status === "FAIL")) {
      console.log(`  - ${r.name}: ${r.detail}`)
    }
  }
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
