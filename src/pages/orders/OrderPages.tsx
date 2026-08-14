import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  fetchCompletedOrders,
  fetchOrderContacts,
  fetchPendingPaymentOrders,
  fetchToReceiveOrders,
  fetchToShipOrders,
  fmtDateTime,
  fmtMoney,
  maskPhone,
  parseCustomerImage,
} from "@/lib/customerApi"
import { logoAsset } from "@/lib/assets"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import { BottomNav } from "@/components/layout/BottomNav"
import "@/styles/order-list-style.css"

type BillGroup = {
  billNo: string
  rows: Record<string, unknown>[]
}

function groupByBill(rows: Record<string, unknown>[]): BillGroup[] {
  const map = new Map<string, BillGroup>()
  for (const row of rows) {
    const bill = String(row.bill_no ?? row.order_no ?? "").trim() || `NO-BILL-${String(row.id ?? "")}`
    const existing = map.get(bill)
    if (existing) {
      existing.rows.push(row)
    } else {
      map.set(bill, { billNo: bill, rows: [row] })
    }
  }
  return Array.from(map.values())
}

function lineTotal(row: Record<string, unknown>) {
  const total = Number(row.total_price ?? 0)
  if (Number.isFinite(total) && total > 0) return total
  return Number(row.unit_price ?? 0) * Math.max(1, Number(row.quantity ?? 1))
}

export default function OrderHistoryPage() {
  useBodyClass("page-orders")
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderContacts()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  const bills = groupByBill(rows)

  return (
    <>
      <header className="history-header">
        <h2>ประวัติคำสั่งซื้อ</h2>
      </header>
      <main className="history-wrap">
        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : bills.length === 0 ? (
          <div className="empty-state">ยังไม่มีประวัติคำสั่งซื้อ</div>
        ) : (
          bills.map((group) => {
            const first = group.rows[0] ?? {}
            const billTotal = group.rows.reduce((sum, row) => sum + lineTotal(row), 0)
            return (
              <section className="bill-card" key={group.billNo}>
                <div className="bill-head">
                  <span>บิล: {group.billNo}</span>
                  <span>{fmtDateTime(first.created_at)}</span>
                </div>
                <div className="bill-items">
                  {group.rows.map((row, i) => {
                    const meta: string[] = []
                    if (row.selected_color) meta.push(`สี: ${String(row.selected_color)}`)
                    if (row.selected_size) meta.push(`ไซซ์: ${String(row.selected_size)}`)
                    return (
                      <article className="order-item" key={String(row.id ?? i)}>
                        <img
                          src={parseCustomerImage(row.product_image)}
                          alt={String(row.product_name ?? "สินค้า")}
                          onError={(e) => {
                            e.currentTarget.src = logoAsset()
                          }}
                        />
                        <div className="order-info">
                          <div className="order-name">{String(row.product_name ?? "สินค้า")}</div>
                          <div className="order-meta">ร้าน: {String(row.shop_name ?? "-")}</div>
                          {meta.length > 0 ? (
                            <div className="order-meta">{meta.join(" | ")}</div>
                          ) : null}
                          <div className="order-price">
                            <span>จำนวน {Math.max(1, Number(row.quantity ?? 1))}</span>
                            <strong>{fmtMoney(lineTotal(row))}</strong>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <div className="bill-foot">
                  ผู้รับ: {String(first.receiver_name ?? first.contact_name ?? "-")} | โทร:{" "}
                  {maskPhone(first.receiver_phone ?? first.contact_phone)}
                  <br />
                  ที่อยู่: {String(first.receiver_address ?? first.contact_address ?? "-")}
                  <div className="bill-total-row">
                    <span>ยอดรวมบิล</span>
                    <strong>{fmtMoney(billTotal)}</strong>
                  </div>
                </div>
              </section>
            )
          })
        )}
      </main>
      <BottomNav />
    </>
  )
}

type OrderTab = {
  label: string
  to: string
  key: string
}

const orderTabs: OrderTab[] = [
  { label: "รอชำระเงิน", to: "/pending-payment", key: "pending" },
  { label: "รอจัดส่ง", to: "/to-ship", key: "ship" },
  { label: "รอรับสินค้า", to: "/to-receive", key: "receive" },
  { label: "สำเร็จ", to: "/completed", key: "completed" },
]

type OrderLoader = () => Promise<Record<string, unknown>[]>

function orderTotal(row: Record<string, unknown>) {
  const total = Number(row.total_price ?? 0)
  if (Number.isFinite(total) && total > 0) return total
  const unit = Number(row.unit_price ?? 0)
  const qty = Math.max(1, Number(row.quantity ?? 1))
  return unit * qty
}

function shippingLabel(method: unknown) {
  return method === "free" ? "ส่งฟรี" : String(method ?? "-")
}

function buildOrderNumber(id: unknown) {
  const n = Number(id ?? 0)
  if (!Number.isFinite(n) || n <= 0) return "-"
  return `34646761346${n}`
}

function cardShopName(variant: "pending" | "ship" | "receive" | "completed", row: Record<string, unknown>) {
  if (variant === "receive") return String(row.shop_name ?? "ร้านค้า")
  return String(row.shop_name ?? "ลูกค้าทั่วไป")
}

function OrderCardList({
  rows,
  statusLabel,
  variant,
}: {
  rows: Record<string, unknown>[]
  statusLabel: string
  statusColor?: string
  variant: "pending" | "ship" | "receive" | "completed"
}) {
  return (
    <div className="order-list">
      {rows.map((row, i) => {
        const qty = Math.max(1, Number(row.quantity ?? 1))
        const total = orderTotal(row)

        return (
          <div
            className={`order-card${variant === "pending" ? " order-card--pending" : ""}`}
            key={String(row.id ?? i)}
          >
            <div className="order-header">
              <div className="shop-info">
                <i className="fa-solid fa-store" aria-hidden />
                <span className="shop-name">{cardShopName(variant, row)}</span>
              </div>
              <span className={`order-status order-status--${variant}`}>
                {statusLabel}
              </span>
            </div>

            <div className="product-item">
              <div className="product-img">
                <img src={parseCustomerImage(row.product_image)} alt="" loading="lazy" />
              </div>
              <div className="product-info">
                <h4 className="product-title">{String(row.product_name ?? "-")}</h4>
                {variant === "pending" && row.product_category ? (
                  <p className="product-variant">หมวด: {String(row.product_category)}</p>
                ) : null}
                <div className="price-row">
                  <span className="price">${fmtMoney(total)}</span>
                  <span className="quantity">x{qty}</span>
                </div>
              </div>
            </div>

            <div className="info-box">
              {variant === "pending" ? (
                <>
                  <div className="info-row">
                    <span className="info-label">เวลาสั่งซื้อ:</span>
                    <span className="info-value">{fmtDateTime(row.added_at ?? row.created_at)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">ราคา/ต่อชิ้น:</span>
                    <span className="info-value">${fmtMoney(row.unit_price)}</span>
                  </div>
                </>
              ) : null}
              {variant === "ship" ? (
                <>
                  <div className="info-row">
                    <span className="info-label">เวลาสั่งซื้อ:</span>
                    <span className="info-value">{fmtDateTime(row.ordered_at ?? row.created_at)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">ชื่อผู้รับ:</span>
                    <span className="info-value">{String(row.receiver_name ?? "-")}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">ที่อยู่:</span>
                    <span className="info-value">{String(row.receiver_address ?? "-")}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">เบอร์ติดต่อ:</span>
                    <span className="info-value">{maskPhone(row.receiver_phone)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">การจัดส่ง:</span>
                    <span className="info-value">{shippingLabel(row.shipping_method)}</span>
                  </div>
                </>
              ) : null}
              {variant === "receive" ? (
                <>
                  <div className="info-row">
                    <span className="info-label">เวลาสั่งซื้อ:</span>
                    <span className="info-value">
                      {fmtDateTime(row.ordered_at ?? row.created_at)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">ราคา/หน่วย:</span>
                    <span className="info-value">${fmtMoney(row.unit_price)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">การจัดส่ง:</span>
                    <span className="info-value">ถึงปลายทางแล้ว</span>
                  </div>
                </>
              ) : null}
              {variant === "completed" ? (
                <>
                  <div className="info-row">
                    <span className="info-label">หมายเลขคำสั่งซื้อ:</span>
                    <span className="info-value">
                      {buildOrderNumber(row.order_id ?? row.id)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">ถึงปลายทาง:</span>
                    <span className="info-value info-value--highlight">รับสินค้าแล้ว</span>
                  </div>
                </>
              ) : null}
            </div>

            {variant === "pending" ? (
              <div className="order-footer order-footer--action">
                <Link to="/help-center" className="btn-order-pay">
                  ชำระสินค้า
                </Link>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function OrderHubPage({
  title,
  activeKey,
  loadOrders,
  statusLabel,
  statusColor,
  variant,
  emptyTitle,
  emptyDesc,
  emptyAction,
}: {
  title: string
  activeKey: string
  loadOrders: OrderLoader
  statusLabel: string
  statusColor?: string
  variant: "pending" | "ship" | "receive" | "completed"
  emptyTitle: string
  emptyDesc: string
  emptyAction?: { label: string; to: string }
}) {
  useBodyClass("page-orders")
  const { requireLogin } = useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)

  const load = useCallback(async () => {
    if (!requireLogin()) {
      setNeedLogin(true)
      setRows([])
      setLoading(false)
      return
    }
    setNeedLogin(false)
    setLoading(true)
    try {
      setRows(await loadOrders())
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [loadOrders, requireLogin])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div id="app" className="order-hub-shell">
      <nav className="top-navbar order-hub-navbar">
        <Link to="/profile" className="back-btn" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">{title}</div>
        <span className="order-hub-navbar__spacer" aria-hidden />
      </nav>
      <main className="order-content">
        <div className="order-tabs" role="tablist" aria-label="สถานะคำสั่งซื้อ">
          {orderTabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.to}
              className={`tab-item${activeKey === tab.key ? " active" : ""}`}
              role="tab"
              aria-selected={activeKey === tab.key}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {needLogin ? (
          <div className="empty-state order-empty-state">
            <div className="empty-icon-wrap">
              <i className="fa-regular fa-user" />
            </div>
            <h3 className="empty-title">กรุณาเข้าสู่ระบบ</h3>
            <p className="empty-desc">เข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ</p>
            <Link to="/login" className="go-shopping-btn">
              ไปเข้าสู่ระบบ
            </Link>
          </div>
        ) : loading ? (
          <div className="order-list order-list--loading">
            <div className="order-list-loading" role="status" aria-live="polite">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              <span>กำลังโหลด...</span>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state order-empty-state">
            <div className="empty-icon-wrap">
              <i className="fa-solid fa-receipt" />
            </div>
            <h3 className="empty-title">{emptyTitle}</h3>
            <p className="empty-desc">{emptyDesc}</p>
            {emptyAction ? (
              <Link to={emptyAction.to} className="go-shopping-btn">
                {emptyAction.label}
              </Link>
            ) : null}
          </div>
        ) : (
          <OrderCardList
            rows={rows}
            statusLabel={statusLabel}
            statusColor={statusColor}
            variant={variant}
          />
        )}
      </main>
    </div>
  )
}

export function PendingPaymentPage() {
  return (
    <OrderHubPage
      title="รอชำระเงิน"
      activeKey="pending"
      loadOrders={fetchPendingPaymentOrders}
      statusLabel="รอชำระเงิน"
      variant="pending"
      emptyTitle="ยังไม่มีรายการรอชำระเงิน"
      emptyDesc="เมื่อคุณสั่งซื้อและยืนยันคำสั่งซื้อแล้ว รายการจะปรากฏที่นี่"
    />
  )
}

export function ToShipPage() {
  return (
    <OrderHubPage
      title="รอจัดส่ง"
      activeKey="ship"
      loadOrders={fetchToShipOrders}
      statusLabel="รอจัดส่ง"
      statusColor="#2563eb"
      variant="ship"
      emptyTitle="ยังไม่มีรายการรอจัดส่ง"
      emptyDesc="เมื่อชำระเงินแล้ว รายการจะปรากฏที่นี่"
    />
  )
}

export function ToReceivePage() {
  return (
    <OrderHubPage
      title="รอรับสินค้า"
      activeKey="receive"
      loadOrders={fetchToReceiveOrders}
      statusLabel="รอรับสินค้า"
      statusColor="#2563eb"
      variant="receive"
      emptyTitle="ยังไม่มีรายการรอรับสินค้า"
      emptyDesc="เมื่อสินค้าจัดส่งแล้ว รายการจะปรากฏที่นี่"
    />
  )
}

export function CompletedOrdersPage() {
  return (
    <OrderHubPage
      title="สำเร็จ"
      activeKey="completed"
      loadOrders={fetchCompletedOrders}
      statusLabel="สำเร็จ"
      statusColor="#28a745"
      variant="completed"
      emptyTitle="ยังไม่มีรายการสำเร็จ"
      emptyDesc="คำสั่งซื้อที่เสร็จสมบูรณ์จะปรากฏที่นี่"
    />
  )
}
