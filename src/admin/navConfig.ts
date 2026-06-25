export type AdminNavItem = {
  path: string
  label: string
  icon: string
  badgeKey?: "cart" | "receiving" | "chat"
  superAdminOnly?: boolean
}

export type AdminNavGroup = {
  label: string
  icon: string
  items: AdminNavItem[]
}

export const adminMainNav: (AdminNavItem | AdminNavGroup)[] = [
  { path: "/admin/customer-store-products", label: "สินค้าของลูกค้า", icon: "fa-store" },
  { path: "/admin/cart", label: "ตะกร้าสินค้า", icon: "fa-cart-shopping", badgeKey: "cart" },
  { path: "/admin/shipping-orders", label: "สินค้ารอจัดส่ง", icon: "fa-truck-fast" },
  {
    path: "/admin/receiving-orders",
    label: "สินค้าสถานะรอรับสินค้า",
    icon: "fa-box-open",
    badgeKey: "receiving",
  },
  { path: "/admin/slide-images", label: "รูปสไลด์", icon: "fa-images" },
  { path: "/admin/product-categories", label: "หมวดหมู่สินค้า", icon: "fa-layer-group" },
  { path: "/admin/recommended-shops", label: "ร้านค้าแนะนำ", icon: "fa-store" },
  { path: "/admin/general-shops", label: "ร้านค้าทั่วไป", icon: "fa-shop" },
  { path: "/admin/add-product", label: "เพิ่มสินค้า", icon: "fa-square-plus" },
  {
    label: "จัดการผู้ใช้",
    icon: "fa-users",
    items: [
      { path: "/admin/users", label: "รายชื่อผู้ใช้ทั้งหมด", icon: "fa-user" },
      { path: "/admin/credit-management", label: "จัดการเครดิต", icon: "fa-coins" },
      { path: "/admin/verification", label: "การยืนยันตัวตน", icon: "fa-id-card" },
    ],
  },
  { path: "/admin/bank-accounts", label: "ข้อมูลธนาคาร", icon: "fa-building-columns" },
  { path: "/admin/withdraw-passwords", label: "ข้อมูลรหัสถอน", icon: "fa-key" },
  { path: "/admin/customer-topup", label: "เติมเงินลูกค้า", icon: "fa-money-bill-1-wave" },
  {
    label: "การฝาก - ถอนลูกค้า",
    icon: "fa-credit-card",
    items: [
      { path: "/admin/customer-deposits", label: "ลูกค้าฝากเงิน", icon: "fa-arrow-down" },
      { path: "/admin/customer-withdrawals", label: "ลูกค้าถอนเงิน", icon: "fa-arrow-up" },
      { path: "/admin/payment-limits", label: "ฝาก-ถอนขั้นต่ำ", icon: "fa-sliders" },
    ],
  },
  { path: "/admin/notifications", label: "การแจ้งเตือน", icon: "fa-bell" },
  { path: "/admin/chat", label: "แชท์", icon: "fa-headset", badgeKey: "chat" },
  {
    path: "/admin/settings",
    label: "ตั้งค่าระบบ",
    icon: "fa-gear",
    superAdminOnly: true,
  },
]

export function isNavGroup(item: AdminNavItem | AdminNavGroup): item is AdminNavGroup {
  return "items" in item
}
