const base = "https://ffshoppingx9.bigselashoping.org/marketting"

const adminPages = [
  "index.html",
  "cart.html",
  "customer-store-products.html",
  "shipping-orders.html",
  "receiving-orders.html",
  "add-product.html",
  "product-categories.html",
  "recommended-shops.html",
  "general-shops.html",
  "slide-images.html",
  "users.html",
  "credit-management.html",
  "verification.html",
  "bank-accounts.html",
  "withdraw-passwords.html",
  "customer-topup.html",
  "customer-deposits.html",
  "customer-withdrawals.html",
  "payment-limits.html",
  "commission.html",
  "notifications.html",
  "chat.html",
  "settings.html",
]

const customerPages = [
  "index.html",
  "categories.html",
  "cart.html",
  "profile.html",
  "product-detail.html",
  "shop-detail.html",
  "category-detail.html",
  "pending-payment.html",
  "to-ship.html",
  "to-receive.html",
  "completed.html",
  "order-list.html",
  "deposit.html",
  "withdraw.html",
  "deposit-history.html",
  "withdraw-history.html",
  "open-store.html",
  "my-store-products.html",
  "reviews.html",
  "help-center.html",
  "chat-detail.html",
  "notifications.html",
  "settings.html",
  "address.html",
  "verification.html",
  "checkin.html",
  "coupon.html",
  "after-sales.html",
  "following-shops.html",
  "collections.html",
  "feedback.html",
  "about.html",
]

function extractApis(html) {
  return [...new Set([...html.matchAll(/api\/[a-zA-Z0-9_./?=&%-]+/g)].map((m) => m[0]))]
}

console.log("=== ADMIN PAGES ===")
for (const p of adminPages) {
  try {
    const html = await (await fetch(`${base}/admin/${p}`)).text()
    const apis = extractApis(html)
    console.log(`${p}: ${apis.length ? apis.join(" | ") : "(inline/none in html)"}`)
  } catch (e) {
    console.log(`${p}: ERR ${e.message}`)
  }
}

console.log("\n=== CUSTOMER PAGES (APIs in HTML) ===")
for (const p of customerPages) {
  try {
    const url = p === "index.html" ? `${base}/` : `${base}/page/${p}`
    const html = await (await fetch(url)).text()
    const apis = extractApis(html)
    if (apis.length) console.log(`${p}: ${apis.join(" | ")}`)
  } catch (e) {
    console.log(`${p}: ERR ${e.message}`)
  }
}
