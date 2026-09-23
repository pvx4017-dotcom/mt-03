import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { asset, formatPrice } from "@/lib/assets"
import {
  calcOrderDue,
  confirmProductOrders,
  deleteProductOrder,
  fetchCartOrders,
  fetchCommissionPercent,
  fmtMoney,
  parseCustomerImage,
  resolveCheckoutAddress,
  saveShippingAddress,
  setProductOrderQty,
  updateProductOrderQty,
  writeSavedShippingAddress,
  type ProductOrderRow,
} from "@/lib/customerApi"
import { BottomNav } from "@/components/layout/BottomNav"
import { Footer } from "@/components/layout/Footer"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/cart-style.css"

export default function CartPage() {
  useBodyClass("page-cart")
  const navigate = useNavigate()
  const { refreshCartCount, refreshOrderHubCounts, refreshUser, requireLogin, user } = useApp()
  const [rows, setRows] = useState<ProductOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [contactName, setContactName] = useState("")
  const [contactAddress, setContactAddress] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [commissionPct, setCommissionPct] = useState(20)
  const [payWithWallet, setPayWithWallet] = useState(true)

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 1800)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCartOrders()
      setRows(data)
      await refreshCartCount()
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [refreshCartCount])

  useEffect(() => {
    if (!requireLogin()) return
    load()
  }, [load, requireLogin])

  useEffect(() => {
    void fetchCommissionPercent()
      .then((pct) => setCommissionPct(pct))
      .catch(() => setCommissionPct(20))
  }, [])

  useEffect(() => {
    if (!user?.id) return
    void resolveCheckoutAddress(user.id).then((addr) => {
      if (!addr) return
      setContactName((cur) => cur || addr.receiver_name)
      setContactPhone((cur) => cur || addr.receiver_phone)
      setContactAddress((cur) => cur || addr.receiver_address)
    })
  }, [user?.id])

  const totalCount = rows.reduce((s, r) => s + Math.max(1, Number(r.quantity ?? 1)), 0)
  const totalPrice = rows.reduce((s, r) => {
    const qty = Math.max(1, Number(r.quantity ?? 1))
    return s + Number(r.unit_price ?? 0) * qty
  }, 0)
  const hasItems = rows.length > 0
  const walletBalance = Number(user?.wallet_balance ?? 0)
  const due = calcOrderDue(totalPrice, commissionPct)
  const canPayWithWallet = walletBalance + 1e-9 >= due.totalDue

  const removeItem = async (orderId: number) => {
    const res = await deleteProductOrder(orderId)
    if (res.success) {
      showNotice("ลบรายการแล้ว")
      load()
    } else showNotice(res.message ?? "ลบรายการไม่สำเร็จ")
  }

  const changeQty = async (orderId: number, action: "decrease" | "increase") => {
    const delta = action === "increase" ? 1 : -1
    const res = await updateProductOrderQty(orderId, delta)
    if (res.success) load()
    else showNotice(res.message ?? "อัปเดตจำนวนไม่สำเร็จ")
  }

  const setQtyDirect = async (orderId: number, qty: number) => {
    if (qty < 1) return
    const res = await setProductOrderQty(orderId, qty)
    if (res.success) load()
  }

  const confirmCheckout = async () => {
    if (!contactName.trim() || !contactAddress.trim() || !contactPhone.trim()) {
      showNotice("กรุณากรอกชื่อ ที่อยู่ และเบอร์ติดต่อให้ครบ")
      return
    }
    setProcessing(true)
    try {
      const fd = new FormData()
      fd.append("contact_name", contactName.trim())
      fd.append("contact_address", contactAddress.trim())
      fd.append("contact_phone", contactPhone.trim())
      if (payWithWallet && canPayWithWallet) fd.append("pay_now", "1")
      const res = await confirmProductOrders(fd)
      if (!res.success) {
        showNotice(res.message ?? "ยืนยันคำสั่งซื้อไม่สำเร็จ")
        return
      }
      showNotice(res.message ?? (res.paid === true ? "ชำระเงินด้วยยอดในระบบแล้ว" : "ส่งคำสั่งซื้อแล้ว — รอชำระเงิน"))
      writeSavedShippingAddress(user?.id, {
        receiver_name: contactName.trim(),
        receiver_phone: contactPhone.trim(),
        receiver_address: contactAddress.trim(),
      })
      await Promise.all([refreshCartCount(), refreshOrderHubCounts(), refreshUser(), load()])
      await saveShippingAddress({
        receiver_name: contactName.trim(),
        receiver_phone: contactPhone.trim(),
        receiver_address: contactAddress.trim(),
      }).catch(() => {})
      setCheckoutOpen(false)
      window.setTimeout(() => navigate(res.paid === true ? "/to-ship" : "/pending-payment"), 1200)
    } catch {
      showNotice("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div id="app" className="app-shell">
      <header className="cart-header">
        <h2>ตะกร้าสินค้า</h2>
        <Link to="/orders" className="cart-history-top-btn" aria-label="ประวัติ">
          <i className="fa-solid fa-clock-rotate-left" />
        </Link>
      </header>

      {loading ? (
        <main className="empty-cart-container">
          <p className="empty-cart-text">กำลังโหลด...</p>
        </main>
      ) : !hasItems ? (
        <main className="empty-cart-container">
          <img src={asset("partner/noCart.png")} alt="Empty Cart" className="empty-cart-img" />
          <p className="empty-cart-text">ตะกร้าสินค้าของคุณว่างเปล่า</p>
          <Link to="/categories" className="shop-now-btn">
            เดินไปรอบๆ
          </Link>
        </main>
      ) : (
        <>
          <main className="cart-items-container">
            <div className="cart-items-list">
              {rows.map((row) => {
                const qty = Math.max(1, Number(row.quantity ?? 1))
                const color = String(row.selected_color ?? "").trim()
                const size = String(row.selected_size ?? "").trim()
                const variantParts: string[] = []
                if (color) variantParts.push(`สี: ${color}`)
                if (size) variantParts.push(`ไซซ์: ${size}`)
                return (
                  <article className="cart-item-card" key={row.id}>
                    <button
                      type="button"
                      className="cart-item-remove-btn"
                      aria-label="ลบรายการ"
                      onClick={() => removeItem(row.id)}
                    >
                      <i className="fa-solid fa-circle-minus" />
                    </button>
                    <img
                      src={parseCustomerImage(row.product_image)}
                      alt={String(row.product_name ?? "")}
                      className="cart-item-image"
                    />
                    <div className="cart-item-content">
                      <h3 className="cart-item-title">{row.product_name ?? "-"}</h3>
                      <p className="cart-item-shop">ร้าน: {row.shop_name ?? "-"}</p>
                      {variantParts.length ? (
                        <p className="cart-item-variant">{variantParts.join(" | ")}</p>
                      ) : null}
                      <div className="cart-item-meta">
                        <span>ราคา {formatPrice(Number(row.unit_price ?? 0))}</span>
                        <div className="cart-qty-price-box">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => changeQty(row.id, "decrease")}
                            disabled={row.product_type === "admin"}
                            style={row.product_type === "admin" ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="cart-qty-input"
                            value={qty}
                            min={1}
                            onChange={(e) => setQtyDirect(row.id, Number(e.target.value))}
                            readOnly={row.product_type === "admin"}
                            style={row.product_type === "admin" ? { opacity: 0.8, cursor: "not-allowed", backgroundColor: "#f0f0f0" } : undefined}
                          />
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => changeQty(row.id, "increase")}
                            disabled={row.product_type === "admin"}
                            style={row.product_type === "admin" ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <section className="cart-summary">
              <div className="summary-row">
                <span>จำนวนรายการ</span>
                <strong>{totalCount}</strong>
              </div>
              <div className="summary-row">
                <span>ยอดรวม</span>
                <strong>${fmtMoney(totalPrice)}</strong>
              </div>
            </section>
          </main>
          <div className="cart-confirm-bar">
            <button type="button" className="cart-confirm-btn" onClick={() => setCheckoutOpen(true)}>
              ยืนยันคำสั่งซื้อ
            </button>
          </div>
        </>
      )}

      <div className="app-footer-zone">
        <Footer variant="dark" />
        <div className="spacer" />
      </div>
      <BottomNav />

      <div
        className={`checkout-sheet-overlay${checkoutOpen ? " show" : ""}`}
        onClick={() => !processing && setCheckoutOpen(false)}
      />
      <div className={`checkout-sheet${checkoutOpen ? " show" : ""}`}>
        <div className="checkout-sheet-head">
          <strong>ข้อมูลการติดต่อ</strong>
          <button
            type="button"
            className="checkout-sheet-close"
            onClick={() => setCheckoutOpen(false)}
            disabled={processing}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="checkout-sheet-body">
          <label className="checkout-field">
            <span>ชื่อ</span>
            <input
              type="text"
              placeholder="กรอกชื่อผู้รับ"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </label>
          <label className="checkout-field">
            <span>ที่อยู่ปลายทาง</span>
            <textarea
              rows={3}
              placeholder="กรอกที่อยู่จัดส่ง"
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
            />
          </label>
          <label className="checkout-field">
            <span>เบอร์ติดต่อ</span>
            <input
              type="text"
              placeholder="กรอกเบอร์โทรศัพท์"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </label>
          <div className="checkout-total-row">
            <span>การจัดส่ง</span>
            <strong>ส่งฟรี</strong>
          </div>
          <div className="checkout-total-row">
            <span>ราคาสินค้า</span>
            <strong>${fmtMoney(due.productTotal)}</strong>
          </div>
          <div className="checkout-total-row">
            <span>ค่าคอมมิชชัน ({due.percent}%)</span>
            <strong>${fmtMoney(due.commission)}</strong>
          </div>
          <div className="checkout-total-row">
            <span>ยอดที่ต้องชำระ</span>
            <strong>${fmtMoney(due.totalDue)}</strong>
          </div>
          <div className="checkout-total-row">
            <span>ยอดเงินในระบบ</span>
            <strong>${fmtMoney(walletBalance)}</strong>
          </div>
          {canPayWithWallet ? (
            <label className="checkout-pay-wallet">
              <input
                type="checkbox"
                checked={payWithWallet}
                onChange={(e) => setPayWithWallet(e.target.checked)}
              />
              <span>ชำระด้วยยอดเงินในระบบทันที</span>
            </label>
          ) : (
            <p className="checkout-flow-note checkout-flow-note--warn">
              ยอดในระบบไม่พอ (ต้องการ ${fmtMoney(due.totalDue)}) — ยืนยันแล้วจะเข้าหน้ารอชำระเงิน กรุณาเติมเงินก่อน
            </p>
          )}
          {canPayWithWallet && payWithWallet ? (
            <p className="checkout-flow-note">
              ระบบจะหักจากกระเป๋าตามยอดที่มี และย้ายคำสั่งซื้อไปรอจัดส่งทันที
            </p>
          ) : canPayWithWallet ? (
            <p className="checkout-flow-note">
              หากไม่ชำระตอนนี้ รายการจะเข้า &quot;รอชำระเงิน&quot; และชำระด้วยยอดในระบบได้ภายหลัง
            </p>
          ) : null}
        </div>
        <div className="checkout-sheet-foot">
          <button
            type="button"
            className="checkout-confirm-btn"
            disabled={processing}
            onClick={confirmCheckout}
          >
            {processing
              ? "กำลังยืนยัน..."
              : canPayWithWallet && payWithWallet
                ? "ยืนยันและชำระด้วยยอดในระบบ"
                : "ยืนยัน"}
          </button>
        </div>
      </div>

      {processing ? (
        <div className="cart-notice-overlay show" style={{ zIndex: 2000 }}>
          <div className="cart-notice-card show">
            <div className="cart-notice-message">กำลังดำเนินการ...</div>
          </div>
        </div>
      ) : null}

      {notice && !processing ? (
        <>
          <div className="cart-notice-overlay show" />
          <div className="cart-notice-card show">
            <div className="cart-notice-message">{notice}</div>
          </div>
        </>
      ) : null}
    </div>
  )
}
