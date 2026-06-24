import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { asset, formatPrice } from "@/lib/assets"
import { createProductOrder } from "@/lib/customerApi"
import {
  fetchProducts,
  getPrimaryImagePath,
  mapApiProduct,
  shopPath,
  type ApiProduct,
} from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/extracted/product-detail.css"

export default function ProductDetailPage() {
  useBodyClass("page-product-detail")
  const { id } = useParams()
  const { requireLogin, refreshCartCount } = useApp()
  const [product, setProduct] = useState<Product>({
    id: "",
    title: "กำลังโหลด…",
    price: 0,
    image: asset("logo/shop logo.webp"),
    category: "",
  })
  const [rawProduct, setRawProduct] = useState<ApiProduct | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProducts().then((rows) => {
      if (cancelled) return
      const found = rows.find((row) => String(row.id) === id)
      if (found) {
        setProduct(mapApiProduct(found))
        setRawProduct(found)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const shopName = product.shopName ?? "ร้านค้า"

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 1800)
  }

  const openDrawer = () => {
    if (!requireLogin()) return
    setDrawerOpen(true)
  }

  const submitOrder = async () => {
    if (!rawProduct) {
      showNotice("ยังไม่พบข้อมูลสินค้า")
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("product_id", String(rawProduct.id))
      fd.append("shop_name", String(rawProduct.shop_name ?? ""))
      fd.append("product_name", String(rawProduct.product_name ?? ""))
      fd.append("product_image", getPrimaryImagePath(rawProduct))
      fd.append("unit_price", String(rawProduct.product_price ?? 0))
      fd.append("quantity", String(qty))
      fd.append("selected_color", "")
      fd.append("selected_size", "")
      const res = await createProductOrder(fd)
      if (!res.success) {
        showNotice(res.message ?? "บันทึกออเดอร์ไม่สำเร็จ")
        return
      }
      showNotice("เพิ่มลงตะกร้าเสร็จแล้ว")
      setDrawerOpen(false)
      await refreshCartCount()
    } catch {
      showNotice("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="product-header">
        <Link to="/" className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="tab-nav">
          <a href="#imageSlider" className="tab-item active">
            สินค้า
          </a>
          <a href="#review-section" className="tab-item">
            รีวิว
          </a>
          <a href="#detail-section" className="tab-item">
            รายละเอียด
          </a>
        </div>
        <button type="button" className="share-btn" style={{ background: "none", border: "none" }}>
          <i className="fa-regular fa-share-from-square" />
        </button>
      </header>

      <main className="product-main">
        <section className="image-slider" id="imageSlider">
          <div className="slider-track">
            <div className="slide active">
              <img src={product.image} alt={product.title} className="product-main-img" />
            </div>
          </div>
        </section>

        <section className="price-section">
          <div className="price-row">
            <span className="current-price">{formatPrice(product.price)}</span>
          </div>
          <h1 className="product-title">{product.title}</h1>
        </section>

        <section className="store-card">
          <div className="store-info">
            <div className="store-logo">
              <img src={product.image} alt="store" />
            </div>
            <div>
              <div className="store-name">{shopName}</div>
              <div className="store-meta">ร้านค้าแนะนำ</div>
            </div>
          </div>
          <Link to={shopPath(shopName)} className="visit-btn">
            เข้าชมร้านค้า
          </Link>
        </section>

        <section className="detail-section" id="detail-section">
          <h3>รายละเอียดสินค้า</h3>
          <p>{product.title}</p>
        </section>
      </main>

      <footer className="product-footer">
        <div className="footer-icons">
          <Link to="/help-center" className="icon-item">
            <i className="fa-solid fa-headset" />
            <span>บริการ</span>
          </Link>
          <Link to={shopPath(shopName)} className="icon-item">
            <i className="fa-solid fa-store" />
            <span>ร้านค้า</span>
          </Link>
        </div>
        <div className="footer-actions">
          <button type="button" className="btn-action btn-add-cart" onClick={openDrawer}>
            เพิ่มลงตะกร้า
          </button>
          <button
            type="button"
            className="btn-action btn-buy-now"
            onClick={() => {
              openDrawer()
            }}
          >
            ซื้อเลย
          </button>
        </div>
      </footer>

      <div
        className={`variant-drawer-overlay${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div className={`variant-drawer${drawerOpen ? " open" : ""}`}>
        <div className="drawer-header">
          <img src={product.image} alt="" className="drawer-thumb" />
          <div>
            <div className="drawer-price">{formatPrice(product.price)}</div>
            <div className="drawer-stock">คงเหลือ: 99</div>
          </div>
          <button type="button" className="drawer-close" onClick={() => setDrawerOpen(false)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="qty-row">
          <span>จำนวน</span>
          <div className="qty-control">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>
              -
            </button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(qty + 1)}>
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          className="drawer-confirm"
          disabled={submitting}
          onClick={submitOrder}
        >
          {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
        </button>
      </div>

      {notice ? (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111827",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 999,
            zIndex: 9999,
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      ) : null}
    </>
  )
}