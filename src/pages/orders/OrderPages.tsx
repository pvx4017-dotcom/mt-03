import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  calcOrderDue,
  fetchAllCustomerOrders,
  fetchCommissionPercent,
  fetchCompletedOrders,
  fetchPendingPaymentOrders,
  fetchToReceiveOrders,
  fetchToShipOrders,
  fmtDateTime,
  fmtMoney,
  maskPhone,
  parseCustomerImage,
  payPendingOrdersWithWallet,
} from "@/lib/customerApi"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import "@/styles/order-list-style.css"

type HubVariant = "pending" | "ship" | "receive" | "completed"

export default function OrderHistoryPage() {
  return (
    <OrderHubPage
      title="คำสั่งซื้อทั้งหมด"
      activeKey="all"
      loadOrders={fetchAllCustomerOrders}
      statusLabel="ทั้งหมด"
      variant="mixed"
      emptyTitle="ยังไม่มีคำสั่งซื้อ"
      emptyDesc="เมื่อคุณสั่งซื้อแล้ว รายการทุกสถานะจะปรากฏที่นี่"
      emptyAction={{ label: "ไปช้อปปิ้ง", to: "/" }}
    />
  )
}

type OrderTab = {
  label: string
  to: string
  key: string
}

const orderTabs: OrderTab[] = [
  { label: "ทั้งหมด", to: "/orders", key: "all" },
  { label: "รอชำระเงิน", to: "/pending-payment", key: "pending" },
  { label: "รอจัดส่ง", to: "/to-ship", key: "ship" },
  { label: "รอรับสินค้า", to: "/to-receive", key: "receive" },
  { label: "สำเร็จ", to: "/completed", key: "completed" },
]

const hubStatusLabel: Record<HubVariant, string> = {
  pending: "รอชำระเงิน",
  ship: "รอจัดส่ง",
  receive: "รอรับสินค้า",
  completed: "สำเร็จ",
}

type OrderLoader = () => Promise<Record<string, unknown>[]>

function orderTotal(row: Record<string, unknown>) {
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

function cardShopName(variant: HubVariant, row: Record<string, unknown>) {
  if (variant === "receive") return String(row.shop_name ?? "ร้านค้า")
  return String(row.shop_name ?? "ลูกค้าทั่วไป")
}

function resolveHubVariant(row: Record<string, unknown>, fallback: HubVariant | "mixed"): HubVariant {
  if (fallback !== "mixed") return fallback
  const raw = String(row._hub ?? "pending")
  if (raw === "ship" || raw === "receive" || raw === "completed" || raw === "pending") return raw
  return "pending"
}

function OrderCardList({
  rows,
  statusLabel,
  variant,
  commissionPercent = 20,
  payingId,
  onPay,
  walletBalance = 0,
}: {
  rows: Record<string, unknown>[]
  statusLabel: string
  statusColor?: string
  variant: HubVariant | "mixed"
  commissionPercent?: number
  payingId?: number | "all" | null
  onPay?: (orderIds: number[]) => void
  walletBalance?: number
}) {
  return (
    <div className="order-list">
      {rows.map((row, i) => {
        const qty = Math.max(1, Number(row.quantity ?? 1))
        const total = orderTotal(row)
        const rowVariant = resolveHubVariant(row, variant)
        const rowLabel = variant === "mixed" ? hubStatusLabel[rowVariant] : statusLabel

        return (
          <div
            className={`order-card${rowVariant === "pending" ? " order-card--pending" : ""}`}
            key={String(row.id ?? i)}
          >
            <div className="order-header">
              <div className="shop-info">
                <i className="fa-solid fa-store" aria-hidden />
                <span className="shop-name">{cardShopName(rowVariant, row)}</span>
              </div>
              <span className={`order-status order-status--${rowVariant}`}>
                {rowLabel}
              </span>
            </div>

            <div className="product-item">
              <div className="product-img">
                <img src={parseCustomerImage(row.product_image)} alt="" loading="lazy" />
              </div>
              <div className="product-info">
                <h4 className="product-title">{String(row.product_name ?? "-")}</h4>
                {rowVariant === "pending" && row.product_category ? (
                  <p className="product-variant">หมวด: {String(row.product_category)}</p>
                ) : null}
                <div className="price-row">
                  <span className="price">${fmtMoney(total)}</span>
                  <span className="quantity">x{qty}</span>
                </div>
              </div>
            </div>

            <div className="info-box">
              {rowVariant === "pending" ? (
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
              {rowVariant === "ship" ? (
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
              {rowVariant === "receive" ? (
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
              {rowVariant === "completed" ? (
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

            {rowVariant === "pending" ? (
              <div className="order-footer order-footer--action">
                {onPay ? (
                  walletBalance + 1e-9 >= calcOrderDue(total, commissionPercent).totalDue ? (
                    <button
                      type="button"
                      className="btn-order-pay"
                      disabled={payingId != null}
                      onClick={() => onPay([Number(row.id)])}
                    >
                      {payingId === Number(row.id) ? "กำลังชำระ..." : "ชำระด้วยยอดในระบบ"}
                    </button>
                  ) : (
                    <Link to="/deposit" className="btn-order-pay">
                      ยอดไม่พอ — ไปเติมเงิน
                    </Link>
                  )
                ) : (
                  <Link to="/pending-payment" className="btn-order-pay">
                    ชำระสินค้า
                  </Link>
                )}
                <div className="order-pay-due">
                  รวมค่าคอม {commissionPercent}%: $
                  {fmtMoney(calcOrderDue(total, commissionPercent).totalDue)}
                </div>
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
  variant: HubVariant | "mixed"
  emptyTitle: string
  emptyDesc: string
  emptyAction?: { label: string; to: string }
}) {
  useBodyClass("page-orders")
  const { requireLogin, refreshOrderHubCounts, refreshUser, user } = useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)
  const [commissionPct, setCommissionPct] = useState(20)
  const [payingId, setPayingId] = useState<number | "all" | null>(null)
  const [payNotice, setPayNotice] = useState("")

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
      await refreshOrderHubCounts()
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [loadOrders, requireLogin, refreshOrderHubCounts])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    void fetchCommissionPercent()
      .then(setCommissionPct)
      .catch(() => setCommissionPct(20))
  }, [])

  const pendingRows = useMemo(
    () =>
      rows.filter((row) => {
        if (variant === "pending") return true
        return String(row._hub ?? row.status ?? "") === "pending"
      }),
    [rows, variant],
  )
  const pendingIds = pendingRows.map((row) => Number(row.id)).filter((id) => id > 0)
  const pendingProductTotal = pendingRows.reduce((sum, row) => sum + orderTotal(row), 0)
  const pendingDue = calcOrderDue(pendingProductTotal, commissionPct)
  const walletBalance = Number(user?.wallet_balance ?? 0)
  const canPayAll = pendingIds.length > 0 && walletBalance + 1e-9 >= pendingDue.totalDue

  const payOrders = async (orderIds: number[], asAll = false) => {
    const ids = orderIds.filter((id) => Number.isFinite(id) && id > 0)
    if (!ids.length) return
    setPayingId(asAll ? "all" : ids[0])
    setPayNotice("")
    try {
      const res = await payPendingOrdersWithWallet(ids)
      setPayNotice(res.message ?? (res.success ? "ชำระเงินแล้ว" : "ชำระไม่สำเร็จ"))
      if (res.success) {
        await Promise.all([load(), refreshUser(), refreshOrderHubCounts()])
      }
    } catch {
      setPayNotice("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
    } finally {
      setPayingId(null)
      window.setTimeout(() => setPayNotice(""), 2200)
    }
  }

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
        {pendingIds.length > 0 ? (
          <section className="order-wallet-pay-bar">
            <div>
              <p>ยอดเงินในระบบ ${fmtMoney(walletBalance)}</p>
              <p>
                ต้องชำระ {pendingIds.length} รายการ ${fmtMoney(pendingDue.totalDue)} (รวมค่าคอม {commissionPct}%)
              </p>
            </div>
            {canPayAll ? (
              <button
                type="button"
                className="btn-order-pay"
                disabled={payingId != null}
                onClick={() => payOrders(pendingIds, true)}
              >
                {payingId === "all" ? "กำลังชำระ..." : "ชำระทั้งหมดด้วยยอดในระบบ"}
              </button>
            ) : (
              <Link to="/deposit" className="btn-order-pay">
                ยอดไม่พอ — ไปเติมเงิน
              </Link>
            )}
          </section>
        ) : null}
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
            commissionPercent={commissionPct}
            payingId={payingId}
            walletBalance={walletBalance}
            onPay={(ids) => payOrders(ids)}
          />
        )}
      </main>
      {payNotice ? <div className="order-pay-toast">{payNotice}</div> : null}
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
      emptyDesc="เมื่อคุณสั่งซื้อแล้ว ถ้ายอดในระบบไม่พอ รายการจะปรากฏที่นี่เพื่อชำระด้วยยอดกระเป๋า"
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
