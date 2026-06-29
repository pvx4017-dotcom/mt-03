const base = "https://ffshoppingx9.bigselashoping.org/marketting/api"
for (const q of [
  "admin_shipping_history.php?to_status=success",
  "admin_shipping_history.php?to_status=completed",
  "admin_cart_orders.php?order_status=completed",
  "admin_cart_orders.php?order_status=success",
]) {
  const r = await fetch(`${base}/${q}`)
  const t = await r.text()
  let count = 0
  try {
    const j = JSON.parse(t)
    count = (j.items || j.orders || []).length
    const st = (j.items || j.orders || [])[0]?.status
    console.log(q, "-> items:", count, "sample status:", st)
  } catch {
    console.log(q, "->", t.slice(0, 100))
  }
}
