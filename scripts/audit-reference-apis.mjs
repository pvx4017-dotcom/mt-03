const base = "https://ffshoppingx9.bigselashoping.org/marketting"

const refApis = [
  "process_auth.php",
  "get_user_info.php",
  "admin_slide_images.php",
  "admin_product_categories.php",
  "admin_store_products.php",
  "admin_recommended_shops.php",
  "admin_general_shops.php",
  "create_product_order.php",
  "get_product_orders.php",
  "confirm_product_orders.php",
  "delete_product_order.php",
  "update_product_order_quantity.php",
  "set_product_order_quantity.php",
  "get_pending_order_count.php",
  "admin_cart.php",
  "admin_cart_orders.php",
  "admin_shipping_history.php",
  "get_my_order_hub_counts.php",
  "get_product_order_contacts.php",
  "submit_store_customer.php",
  "get_store_customer_status.php",
  "get_store_customer_by_shop.php",
  "customer_store_products_mirror.php",
  "get_customer_shop_products.php",
  "get_other_store_products.php",
  "shop_follows.php",
  "submit_deposit_request.php",
  "submit_withdraw.php",
  "admin_deposit_requests.php",
  "admin_withdraw_requests.php",
  "admin_customer_topup.php",
  "admin_payment_limits.php",
  "commission_settings.php",
  "admin_users.php",
  "admin_identity_verifications.php",
  "admin_bank_accounts.php",
  "admin_withdraw_passwords.php",
  "admin_notifications.php",
  "support_chat.php",
  "user_notifications.php",
  "get_reviews.php",
  "submit_review.php",
  "submit_review_admin.php",
  "submit_verification.php",
  "set_withdraw_password.php",
  "update_password.php",
]

console.log("=== REFERENCE API PROBE ===")
for (const api of refApis) {
  try {
    const r = await fetch(`${base}/api/${api}`, { credentials: "omit" })
    const t = await r.text()
    let ok = false
    try {
      const j = JSON.parse(t)
      ok = j.success === true || Array.isArray(j.orders) || Array.isArray(j.items) || j.categories || j.products || j.shops
    } catch {}
    console.log(`${ok ? "OK" : "??"} ${api} -> ${r.status} ${t.slice(0, 80).replace(/\n/g, " ")}`)
  } catch (e) {
    console.log(`ERR ${api}`, e.message)
  }
}
