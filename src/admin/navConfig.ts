export type AdminNavItem = {
  path: string
  label: string
  icon: string
  badgeKey?: "cart" | "receiving" | "chat"
  superAdminOnly?: boolean
  section?: string
}

export type AdminNavGroup = {
  label: string
  icon: string
  items: AdminNavItem[]
  section?: string
}

export const adminMainNav: (AdminNavItem | AdminNavGroup)[] = [
  { path: "/admin/customer-store-products", label: "สินค้าของลูกค้า", icon: "fa-store", section: "สินค้า & คำสั่งซื้อ" },
  { path: "/admin/cart", label: "ตะกร้าสินค้า", icon: "fa-cart-shopping", badgeKey: "cart", section: "สินค้า & คำสั่งซื้อ" },
  { path: "/admin/shipping-orders", label: "สินค้ารอจัดส่ง", icon: "fa-truck-fast", section: "สินค้า & คำสั่งซื้อ" },
  {
    path: "/admin/receiving-orders",
    label: "สินค้าสถานะรอรับสินค้า",
    icon: "fa-box-open",
    badgeKey: "receiving",
    section: "สินค้า & คำสั่งซื้อ",
  },
  { path: "/admin/slide-images", label: "รูปสไลด์", icon: "fa-images", section: "จัดการเนื้อหา" },
  { path: "/admin/product-categories", label: "หมวดหมู่สินค้า", icon: "fa-layer-group", section: "จัดการเนื้อหา" },
  { path: "/admin/recommended-shops", label: "ร้านค้าแนะนำ", icon: "fa-store", section: "จัดการเนื้อหา" },
  { path: "/admin/general-shops", label: "ร้านค้าทั่วไป", icon: "fa-shop", section: "จัดการเนื้อหา" },
  { path: "/admin/user-shops", label: "ร้านค้าของผู้ใช้ (ลูกค้า)", icon: "fa-store", section: "จัดการเนื้อหา" },
  { path: "/admin/add-product", label: "เพิ่มสินค้า", icon: "fa-square-plus", section: "จัดการเนื้อหา" },
  {
    label: "จัดการผู้ใช้",
    icon: "fa-users",
    section: "ผู้ใช้ & การเงิน",
    items: [
      { path: "/admin/users", label: "รายชื่อผู้ใช้ทั้งหมด", icon: "fa-user" },
      { path: "/admin/customer-shipping-addresses", label: "ที่อยู่จัดส่งของลูกค้า", icon: "fa-location-dot" },
      { path: "/admin/credit-management", label: "จัดการเครดิต", icon: "fa-coins" },
      { path: "/admin/verification", label: "การยืนยันตัวตน", icon: "fa-id-card" },
    ],
  },
  { path: "/admin/bank-accounts", label: "ข้อมูลธนาคาร", icon: "fa-building-columns", section: "ผู้ใช้ & การเงิน" },
  { path: "/admin/withdraw-passwords", label: "ข้อมูลรหัสถอน", icon: "fa-key", section: "ผู้ใช้ & การเงิน" },
  { path: "/admin/customer-topup", label: "เติมเงินลูกค้า", icon: "fa-money-bill-1-wave", section: "ผู้ใช้ & การเงิน" },
  {
    label: "การฝาก - ถอนลูกค้า",
    icon: "fa-credit-card",
    section: "ผู้ใช้ & การเงิน",
    items: [
      { path: "/admin/customer-deposits", label: "ลูกค้าฝากเงิน", icon: "fa-arrow-down" },
      { path: "/admin/customer-withdrawals", label: "ลูกค้าถอนเงิน", icon: "fa-arrow-up" },
      { path: "/admin/receiving-accounts", label: "บัญชีรับเงินบริษัท", icon: "fa-building-columns" },
      { path: "/admin/payment-limits", label: "ฝาก-ถอนขั้นต่ำ", icon: "fa-sliders" },
    ],
  },
  { path: "/admin/seller-levels", label: "จัดการระดับ", icon: "fa-ranking-star", section: "อื่นๆ" },
  { path: "/admin/loans", label: "คำขอสินเชื่อ", icon: "fa-hand-holding-dollar", section: "อื่นๆ" },
  { path: "/admin/coupons", label: "คูปอง", icon: "fa-ticket", section: "อื่นๆ" },
  { path: "/admin/feedback", label: "ข้อเสนอแนะ", icon: "fa-inbox", section: "อื่นๆ" },
  { path: "/admin/notifications", label: "การแจ้งเตือน", icon: "fa-bell", section: "อื่นๆ" },
  { path: "/admin/chat", label: "แชท์", icon: "fa-headset", badgeKey: "chat", section: "อื่นๆ" },
  { path: "/admin/settings", label: "ตั้งค่าระบบ", icon: "fa-gear", section: "อื่นๆ" },
]

export function isNavGroup(item: AdminNavItem | AdminNavGroup): item is AdminNavGroup {
  return "items" in item
}
