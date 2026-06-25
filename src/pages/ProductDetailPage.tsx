import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { asset, formatPrice, staticAsset } from "@/lib/assets"
import { createProductOrder } from "@/lib/customerApi"
import {
  fetchProducts,
  fetchShops,
  formatNumberText,
  getPrimaryImagePath,
  getProductImageUrls,
  mapApiProduct,
  mapApiShopImage,
  shopPath,
  type ApiProduct,
  type ApiShop,
} from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"

type TabKey = "product" | "review" | "detail"

export default function ProductDetailPage() {
  useBodyClass("page-product-detail")
  const { id } = useParams()
  const { requireLogin, refreshCartCount } = useApp()
  const sliderRef = useRef<HTMLDivElement>(null)
  const [product, setProduct] = useState<Product>({
    id: "",
    title: "กำลังโหลด…",
    price: 0,
    image: asset("logo/shop logo.webp"),
    category: "",
  })
  const [rawProduct, setRawProduct] = useState<ApiProduct | null>(null)
  const [images, setImages] = useState<string[]>([asset("logo/shop logo.webp")])
  const [shopMeta, setShopMeta] = useState<ApiShop | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>("product")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProducts(), fetchShops()]).then(([rows, shops]) => {
      if (cancelled) return
      const found = rows.find((row) => String(row.id) === id)
      if (!found) return
      setProduct(mapApiProduct(found))
      setRawProduct(found)
      setImages(getProductImageUrls(found))
      const shop = shops.find((s) => s.shop_name === found.shop_name)
      if (shop) setShopMeta(shop)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const shopName = product.shopName ?? "ร้านค้า"
  const description =
    String(rawProduct?.product_description ?? "").trim() || product.title
  const stock = Math.max(0, Number(rawProduct?.product_stock ?? 99))
  const sizes = String(rawProduct?.product_sizes ?? "").trim()
  const colors = String(rawProduct?.product_colors ?? "").trim()

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 1800)
  }

  const scrollToSection = (tab: TabKey, sectionId: string) => {
    setActiveTab(tab)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const onSliderScroll = useCallback(() => {
    const el = sliderRef.current
    if (!el || !el.clientWidth) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveSlide(Math.max(0, Math.min(index, images.length - 1)))
  }, [images.length])

  const scrollToSlide = (index: number) => {
    const el = sliderRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
    setActiveSlide(index)
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

  const priceParts = formatPrice(product.price)
  const priceValue = priceParts.replace(/^\$/, "")

  return (
    <div className="product-detail-shell">
      <header className="product-header">
        <Link to="/" className="back-btn" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="tab-nav">
          <button
            type="button"
            className={`tab-item${activeTab === "product" ? " active" : ""}`}
            onClick={() => scrollToSection("product", "imageSlider")}
          >
            สินค้า
          </button>
          <button
            type="button"
            className={`tab-item${activeTab === "review" ? " active" : ""}`}
            onClick={() => scrollToSection("review", "review-section")}
          >
            รีวิว
          </button>
          <button
            type="button"
            className={`tab-item${activeTab === "detail" ? " active" : ""}`}
            onClick={() => scrollToSection("detail", "detail-section")}
          >
            รายละเอียด
          </button>
        </div>
        <button type="button" className="share-btn" aria-label="แชร์">
          <i className="fa-regular fa-share-from-square" />
        </button>
      </header>

      <section className="image-section" id="imageSlider">
        <div className="slider-wrapper" ref={sliderRef} onScroll={onSliderScroll}>
          {images.map((src, i) => (
            <div className="pd-slide" key={`${src}-${i}`}>
              <div className="pd-slide__frame">
                <img src={src} alt={`${product.title} — รูปที่ ${i + 1}`} className="main-image" loading={i === 0 ? "eager" : "lazy"} />
              </div>
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <div className="pd-image-counter">
              {activeSlide + 1} / {images.length}
            </div>
            <div className="image-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`dot${i === activeSlide ? " active" : ""}`}
                  aria-label={`รูปที่ ${i + 1}`}
                  onClick={() => scrollToSlide(i)}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="info-card">
        <div className="price-row">
          <span className="current-price">
            <small>$</small>
            {priceValue}
          </span>
        </div>
        <h1 className="product-title">{product.title}</h1>
        {product.category ? (
          <div className="section-item">
            <span className="item-label">หมวดหมู่</span>
            <span className="item-value">{product.category}</span>
            <i className="fa-solid fa-chevron-right chevron" />
          </div>
        ) : null}
        {sizes ? (
          <div className="section-item">
            <span className="item-label">ไซส์</span>
            <span className="item-value">{sizes.replace(/,/g, ", ")}</span>
          </div>
        ) : null}
        {colors ? (
          <div className="section-item">
            <span className="item-label">สี</span>
            <span className="item-value">{colors.replace(/,/g, ", ")}</span>
          </div>
        ) : null}
      </section>

      <section className="empty-review" id="review-section">
        <img src={staticAsset("partner/noCart.png")} alt="" />
        <p>ยังไม่มีรีวิวสำหรับสินค้านี้</p>
      </section>

      <section className="store-card">
        <div className="store-header">
          <div className="store-profile">
            <img
              src={shopMeta ? mapApiShopImage(shopMeta.shop_image) : product.image}
              alt={shopName}
              className="store-avatar"
            />
            <div className="store-name-wrap">
              <h4>{shopName}</h4>
              <div className="store-verify">ร้านค้าแนะนำ · ยืนยันแล้ว</div>
            </div>
          </div>
          <Link to={shopPath(shopName)} className="visit-btn">
            เข้าชมร้านค้า
          </Link>
        </div>
        <div className="store-stats">
          <div>
            <span className="stat-val">
              {formatNumberText(shopMeta?.review_count ?? rawProduct?.review_count ?? 0)}
            </span>
            <span className="stat-label">รีวิว</span>
          </div>
          <div>
            <span className="stat-val">
              {formatNumberText(shopMeta?.view_count ?? rawProduct?.view_count ?? 0)}
            </span>
            <span className="stat-label">เข้าชม</span>
          </div>
          <div>
            <span className="stat-val">
              {formatNumberText(shopMeta?.sales_volume ?? rawProduct?.sales_volume ?? 0)}
            </span>
            <span className="stat-label">ขายแล้ว</span>
          </div>
        </div>
      </section>

      <section className="detail-section" id="detail-section">
        <h3 className="detail-header">รายละเอียดสินค้า</h3>
        <p className="detail-body">{description}</p>
      </section>

      <footer className="pd-bottom-bar">
        <div className="pd-bottom-bar__inner">
          <div className="pd-bottom-bar__icons">
            <Link to="/help-center" className="pd-icon-btn" aria-label="บริการลูกค้า">
              <i className="fa-solid fa-headset" />
              <span>บริการ</span>
            </Link>
            <Link to={shopPath(shopName)} className="pd-icon-btn" aria-label="ร้านค้า">
              <i className="fa-solid fa-store" />
              <span>ร้านค้า</span>
            </Link>
          </div>
          <button type="button" className="pd-btn pd-btn--cart" onClick={openDrawer}>
            <i className="fa-solid fa-cart-plus" aria-hidden />
            ตะกร้า
          </button>
          <button type="button" className="pd-btn pd-btn--buy" onClick={openDrawer}>
            ซื้อเลย
          </button>
        </div>
      </footer>

      <div
        className={`drawer-overlay${drawerOpen ? " active" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <div className={`variant-drawer${drawerOpen ? " active" : ""}`}>
        <div className="drawer-header">
          <img src={images[0]} alt="" className="drawer-product-img" />
          <div>
            <div className="share-price">{formatPrice(product.price)}</div>
            <div className="store-verify">คงเหลือ: {stock > 0 ? stock : "—"}</div>
          </div>
          <button type="button" className="close-drawer" onClick={() => setDrawerOpen(false)} aria-label="ปิด">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="quantity-row">
          <span className="variant-label">จำนวน</span>
          <div className="qty-controls">
            <button type="button" className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>
              −
            </button>
            <span className="qty-val">{qty}</span>
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty(Math.min(stock || 99, qty + 1))}
            >
              +
            </button>
          </div>
        </div>
        <div className="total-info-row">
          <span className="total-label">ยอดรวม</span>
          <span className="total-price-val">{formatPrice(product.price * qty)}</span>
        </div>
        <button type="button" className="confirm-btn" disabled={submitting} onClick={submitOrder}>
          {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
        </button>
      </div>

      {notice ? <div className="pd-toast">{notice}</div> : null}
    </div>
  )
}
