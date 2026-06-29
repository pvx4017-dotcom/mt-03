const base = "https://ffshoppingx9.bigselashoping.org/marketting"

async function get(path) {
  const r = await fetch(base + path)
  return { path, status: r.status, body: await r.text() }
}

function extractApis(html) {
  const apis = new Set()
  for (const m of html.matchAll(/api\/[a-zA-Z0-9_./?=&%-]+/g)) apis.add(m[0].split("'")[0].split('"')[0])
  for (const m of html.matchAll(/fetch\(\s*['"]([^'"]+)['"]/g)) apis.add(m[1])
  return [...apis]
}

const pages = [
  "/",
  "/page/categories.html",
  "/page/category-detail.html",
  "/page/cart.html",
  "/page/product-detail.html",
  "/page/open-store.html",
  "/page/profile.html",
  "/admin/",
  "/admin/customer-store-products.html",
  "/admin/admin-cart.html",
  "/admin/shipping-orders.html",
]

for (const p of pages) {
  const { status, body } = await get(p)
  const apis = extractApis(body).filter((a) => a.includes("api") || a.includes(".php"))
  console.log(`\n=== ${p} (${status}) ===`)
  console.log(apis.slice(0, 15).join("\n") || "(no api in html)")
}

// probe live APIs
const apiTests = [
  "/api/admin_store_products.php?limit=3",
  "/api/admin_product_categories.php",
  "/api/get_product_orders.php",
  "/api/admin_cart.php?status=pending",
]
console.log("\n=== LIVE API ===")
for (const p of apiTests) {
  try {
    const r = await fetch(base + p, { credentials: "omit" })
    const t = await r.text()
    console.log(p, r.status, t.slice(0, 200))
  } catch (e) {
    console.log(p, "ERR", e.message)
  }
}
