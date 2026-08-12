import { asset } from "@/lib/assets"

export type CartItem = Record<string, unknown>

export function adminParseImage(img: unknown): string {
  const s = String(img ?? "").trim()
  if (!s) return asset("logo/shop logo.webp")
  if (/^https?:\/\//i.test(s) && !/\/storage\/v1\/object\/public\//i.test(s)) return s
  return asset(s)
}

export function adminFmtMoney(v: unknown) {
  return Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function adminFmtNum(v: unknown) {
  return Number(v || 0).toLocaleString("th-TH")
}

export function adminStatusBadge(status: unknown) {
  const s = String(status ?? "")
  if (s === "pending") return { label: "รอชำระเงิน", className: "admin-order-status admin-order-status--pending" }
  if (s === "shipping") return { label: "รอจัดส่ง", className: "admin-order-status admin-order-status--shipping" }
  if (s === "receiving") return { label: "รอรับสินค้า", className: "admin-order-status admin-order-status--receiving" }
  if (s === "processed" || s === "completed")
    return { label: "ดำเนินการแล้ว", className: "admin-order-status admin-order-status--done" }
  if (s === "cancelled") return { label: "ยกเลิก", className: "admin-order-status admin-order-status--cancel" }
  return { label: s || "-", className: "admin-order-status" }
}

export function filterByUserOrShop(rows: CartItem[], q: string) {
  const query = q.trim().toLowerCase()
  if (!query) return rows
  return rows.filter(
    (r) =>
      String(r.user_id ?? "").toLowerCase().includes(query) ||
      String(r.shop_name ?? "").toLowerCase().includes(query) ||
      String(r.product_name ?? "").toLowerCase().includes(query),
  )
}

export function filterProductsByNameOrShop(rows: CartItem[], q: string) {
  const query = q.trim().toLowerCase()
  if (!query) return rows
  return rows.filter(
    (r) =>
      String(r.product_name ?? "").toLowerCase().includes(query) ||
      String(r.shop_name ?? "").toLowerCase().includes(query),
  )
}
