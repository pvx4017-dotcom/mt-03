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
import { useBodyClass } from "@/hooks/useBodyClass"
import { BottomNav } from "@/components/layout/BottomNav"
import "@/styles/order-list-style.css"

export default function OrderHistoryPage() {
  useBodyClass("page-orders")
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderContacts()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <header className="history-header">
        <h2>ประวัติคำสั่งซื้อ</h2>
      </header>
      <main className="history-wrap">
        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">ยังไม่มีประวัติคำสั่งซื้อ</div>
        ) : (
          rows.map((row, i) => (
            <div className="order-card" key={String(row.bill_no ?? row.id ?? i)}>
              <div className="order-header">
                <span>เลขที่: {String(row.bill_no ?? "-")}</span>
                <span>{fmtDateTime(row.created_at)}</span>
              </div>
              <div className="info-box">
                <div className="info-row">
                  <span className="info-label">ผู้รับ:</span>
                  <span className="info-value">{String(row.receiver_name ?? "-")}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">ที่อยู่:</span>
                  <span className="info-value">{String(row.receiver_address ?? "-")}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">เบอร์:</span>
                  <span className="info-value">{String(row.receiver_phone ?? "-")}</span>
                </div>
              </div>
            </div>
          ))
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

function OrderCardList({
  rows,
  statusLabel,
  statusColor,
  variant,
}: {
  rows: Record<string, unknown>[]
  statusLabel: string
  statusColor?: string
  variant: "pending" | "ship" | "receive" | "completed"
}) {
  return (
    <div className="order-list">
      {rows.map((row, i) => (
        <div className="order-card" key={String(row.id ?? i)}>
          <div className="order-header">
            <div className="shop-info">
              <i className="fa-solid fa-store" />
              <span className="shop-name">
                {variant === "receive" || variant === "completed"
                  ? String(row.shop_name ?? "ร้านค้า")
                  : "ลูกค้าทั่วไป"}
              </span>
            </div>
            <span className="order-status" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          </div>
          <div className="product-item">
            <div className="product-img">
              <img src={parseCustomerImage(row.product_image)} alt="" />
            </div>
            <div className="product-info">
              <h4 className="product-title">{String(row.product_name ?? "-")}</h4>
              {row.product_category ? (
                <p className="product-variant">หมวด: {String(row.product_category)}</p>
              ) : null}
              <div className="price-row">
                <span className="price">${fmtMoney(row.total_price)}</span>
                <span className="quantity">x{String(row.quantity ?? 1)}</span>
              </div>
            </div>
          </div>
          <div className="info-box">
            <div className="info-row">
              <span className="info-label">เวลาสั่งซื้อ:</span>
              <span className="info-value">
                {fmtDateTime(row.added_at ?? row.ordered_at ?? row.created_at)}
              </span>
            </div>
            {variant === "pending" ? (
              <div className="info-row">
                <span className="info-label">ราคา/หน่วย:</span>
                <span className="info-value">${fmtMoney(row.unit_price)}</span>
              </div>
            ) : null}
            {variant === "ship" ? (
              <>
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
                  <span className="info-value">
                    {row.shipping_method === "free" ? "ส่งฟรี" : String(row.shipping_method ?? "-")}
                  </span>
                </div>
              </>
            ) : null}
            {variant === "receive" || variant === "completed" ? (
              <>
                <div className="info-row">
                  <span className="info-label">ราคา/หน่วย:</span>
                  <span className="info-value">${fmtMoney(row.unit_price)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">การจัดส่ง:</span>
                  <span className="info-value">
                    {variant === "completed" ? "สำเร็จ" : "ถึงปลายทางแล้ว"}
                  </span>
                </div>
              </>
            ) : null}
          </div>
          {variant === "pending" ? (
            <div
              className="order-footer"
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #f8f9fa",
                textAlign: "center",
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              รอแอดมินดำเนินการชำระและจัดส่ง
            </div>
          ) : null}
        </div>
      ))}
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
}: {
  title: string
  activeKey: string
  loadOrders: OrderLoader
  statusLabel: string
  statusColor?: string
  variant: "pending" | "ship" | "receive" | "completed"
  emptyTitle: string
  emptyDesc: string
}) {
  useBodyClass("page-orders")
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await loadOrders())
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [loadOrders])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div id="app">
      <nav className="top-navbar">
        <Link to="/profile" className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">{title}</div>
      </nav>
      <main className="order-content">
        <div className="order-tabs">
          {orderTabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.to}
              className={`tab-item${activeKey === tab.key ? " active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>กำลังโหลด...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ display: "block" }}>
            <div className="empty-icon-wrap">
              <i className="fa-solid fa-receipt" />
            </div>
            <h3 className="empty-title">{emptyTitle}</h3>
            <p className="empty-desc">{emptyDesc}</p>
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
      emptyTitle="ยังไม่มีรายการชำระเงิน"
      emptyDesc="เมื่อคุณสั่งซื้อสินค้า รายการที่รอชำระเงินจะปรากฏที่นี่"
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
      statusColor="#16a34a"
      variant="completed"
      emptyTitle="ยังไม่มีรายการสำเร็จ"
      emptyDesc="คำสั่งซื้อที่เสร็จสมบูรณ์จะปรากฏที่นี่"
    />
  )
}
