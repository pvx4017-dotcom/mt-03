import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { asset, formatPrice } from "@/lib/assets"
import {
  confirmProductOrders,
  deleteProductOrder,
  fetchCartOrders,
  fmtMoney,
  parseCustomerImage,
  setProductOrderQty,
  updateProductOrderQty,
  type ProductOrderRow,
} from "@/lib/customerApi"
import { BottomNav } from "@/components/layout/BottomNav"
import { Footer } from "@/components/layout/Footer"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/cart-style.css"

export default function CartPage() {
  useBodyClass("page-cart")
  const { refreshCartCount, requireLogin } = useApp()
  const [rows, setRows] = useState<ProductOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [contactName, setContactName] = useState("")
  const [contactAddress, setContactAddress] = useState("")
  const [contactPhone, setContactPhone] = useState("")

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

  const totalCount = rows.reduce((s, r) => s + Math.max(1, Number(r.quantity ?? 1)), 0)
  const totalPrice = rows.reduce((s, r) => s + Number(r.total_price ?? 0), 0)
  const hasItems = rows.length > 0

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
      const res = await confirmProductOrders(fd)
      if (!res.success) {
        showNotice(res.message ?? "ยืนยันคำสั่งซื้อไม่สำเร็จ")
        return
      }
      showNotice("คำสั่งซื้อเสร็จแล้ว")
      setCheckoutOpen(false)
      setContactName("")
      setContactAddress("")
      setContactPhone("")
      await load()
    } catch {
      showNotice("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div id="app">
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
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="cart-qty-input"
                            value={qty}
                            min={1}
                            onChange={(e) => setQtyDirect(row.id, Number(e.target.value))}
                          />
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => changeQty(row.id, "increase")}
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

      <Footer variant="dark" />
      <div className="spacer" />
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
            <span>ยอดเงินที่ต้องชำระ</span>
            <strong>${fmtMoney(totalPrice)}</strong>
          </div>
        </div>
        <div className="checkout-sheet-foot">
          <button
            type="button"
            className="checkout-confirm-btn"
            disabled={processing}
            onClick={confirmCheckout}
          >
            {processing ? "กำลังยืนยัน..." : "ยืนยัน"}
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
