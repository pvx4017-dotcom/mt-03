import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { asset, formatPrice, staticAsset } from "@/lib/assets"
import { createProductOrder, fetchFollowStatus, toggleFollowShop } from "@/lib/customerApi"
import {
  fetchMirrorProducts,
  fetchProducts,
  fetchShopsForLookup,
  formatNumberText,
  getPrimaryImagePath,
  getProductImageUrls,
  mapApiProduct,
  mapApiShopImage,
  parseVariantValues,
  resolveProductForDetail,
  shopPath,
  type ApiProduct,
  type ApiShop,
} from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"
import { FollowToast } from "@/components/customer/FollowToast"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"

type TabKey = "product" | "review" | "detail"

export default function ProductDetailPage() {
  useBodyClass("page-product-detail")
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { requireLogin, refreshCartCount, isLoggedIn } = useApp()
  const sliderRef = useRef<HTMLDivElement>(null)
  const autoPauseUntilRef = useRef(0)
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
  const [following, setFollowing] = useState(false)
  const [catalogSource, setCatalogSource] = useState<"admin" | "mirror">("admin")
  const [followToast, setFollowToast] = useState("")
  const [followToastOpen, setFollowToastOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedSize, setSelectedSize] = useState("")
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [shareCopied, setShareCopied] = useState(false)

  const sourceParam = searchParams.get("source") ?? ""
  const shopParam = searchParams.get("shop") ?? ""

  useEffect(() => {
    let cancelled = false
    const productId = Number(id ?? 0)
    if (!productId) return

    Promise.all([fetchProducts(), fetchMirrorProducts(), fetchShopsForLookup()]).then(
      ([adminRows, mirrorRows, shops]) => {
        if (cancelled) return
        const { product: found, catalogSource: resolvedSource } = resolveProductForDetail(
          productId,
          adminRows,
          mirrorRows,
          { source: sourceParam, shop: shopParam },
        )
        if (!found) return
        setCatalogSource(resolvedSource)
        setProduct(mapApiProduct(found))
        setRawProduct(found)
        setImages(getProductImageUrls(found))
        const shop = shops.find((s) => s.shop_name === found.shop_name)
        if (shop) setShopMeta(shop)
      },
    )
    return () => {
      cancelled = true
    }
  }, [id, sourceParam, shopParam])

  useEffect(() => {
    let cancelled = false
    const name = rawProduct?.shop_name ?? product.shopName
    if (!isLoggedIn || !name) {
      setFollowing(false)
      return
    }
    fetchFollowStatus(String(name)).then((res) => {
      if (!cancelled) setFollowing(Boolean(res.following))
    })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, rawProduct?.shop_name, product.shopName])

  const shopName = product.shopName ?? "ร้านค้า"
  const description =
    String(rawProduct?.product_description ?? "").trim() || product.title
  const stock = Math.max(0, Number(rawProduct?.product_stock ?? 99))
  const colorOptions = useMemo(
    () => parseVariantValues(String(rawProduct?.product_colors ?? "")),
    [rawProduct?.product_colors],
  )
  const sizeOptions = useMemo(
    () => parseVariantValues(String(rawProduct?.product_sizes ?? "")),
    [rawProduct?.product_sizes],
  )

  useEffect(() => {
    setSelectedColor(colorOptions[0] ?? "")
    setSelectedSize(sizeOptions[0] ?? "")
  }, [colorOptions, sizeOptions, rawProduct?.id])

  const variantSummary = [selectedColor, selectedSize].filter(Boolean).join(" ; ")

  useEffect(() => {
    if (!shareOpen) {
      setShareCopied(false)
      return
    }
    setShareUrl(window.location.href)
  }, [shareOpen])

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 1800)
  }

  const showFollowToast = (msg: string) => {
    setFollowToast(msg)
    setFollowToastOpen(true)
    window.setTimeout(() => setFollowToastOpen(false), 1500)
  }

  const shopLink = shopPath(shopName, {
    source: catalogSource === "mirror" ? "mirror" : undefined,
  })

  const scrollToSection = (tab: TabKey, sectionId: string) => {
    setActiveTab(tab)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const onSliderScroll = useCallback(() => {
    const el = sliderRef.current
    if (!el || !el.clientWidth) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveSlide(Math.max(0, Math.min(index, images.length - 1)))
    autoPauseUntilRef.current = Date.now() + 6000
  }, [images.length])

  const scrollToSlide = useCallback((index: number) => {
    const el = sliderRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
    setActiveSlide(index)
  }, [])

  useEffect(() => {
    if (images.length <= 1) return
    const timer = window.setInterval(() => {
      if (Date.now() < autoPauseUntilRef.current) return
      setActiveSlide((prev) => {
        const next = (prev + 1) % images.length
        const el = sliderRef.current
        if (el?.clientWidth) {
          el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" })
        }
        return next
      })
    }, 3000)
    return () => window.clearInterval(timer)
  }, [images.length])

  const openDrawer = () => {
    setQty(1)
    setDrawerOpen(true)
  }

  const handleFollow = async () => {
    if (!requireLogin()) return
    const payloadShop = shopMeta ?? {
      shop_name: shopName,
      shop_image: "",
      review_count: Number(rawProduct?.review_count ?? 0),
      view_count: Number(rawProduct?.view_count ?? 0),
      trust_score: String(rawProduct?.trust_score ?? 0),
      sales_volume: Number(rawProduct?.sales_volume ?? 0),
    }
    if (!payloadShop.shop_name) {
      showNotice("ยังไม่พบข้อมูลร้านค้า")
      return
    }
    try {
      const res = await toggleFollowShop({
        shop_name: payloadShop.shop_name,
        shop_image: payloadShop.shop_image,
        review_count: Number(payloadShop.review_count ?? 0),
        view_count: Number(payloadShop.view_count ?? 0),
        trust_score: Number(payloadShop.trust_score ?? 0),
        sales_volume: Number(payloadShop.sales_volume ?? 0),
      })
      if (!res.success) {
        showFollowToast("บันทึกการติดตามไม่สำเร็จ")
        return
      }
      setFollowing(Boolean(res.following))
      showFollowToast(res.following ? "ติดตามร้านค้านี้แล้ว" : "ยกเลิกติดตามร้านค้านี้แล้ว")
    } catch {
      showFollowToast("บันทึกการติดตามไม่สำเร็จ")
    }
  }

  const copyShareLink = async () => {
    const url = shareUrl || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      showNotice("คัดลอกไม่สำเร็จ")
    }
  }

  const submitOrder = async () => {
    if (!requireLogin()) return
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
      fd.append("product_category", String(rawProduct.product_category ?? ""))
      fd.append("product_image", getPrimaryImagePath(rawProduct))
      fd.append("unit_price", String(rawProduct.product_price ?? 0))
      fd.append("quantity", String(qty))
      fd.append("selected_color", selectedColor)
      fd.append("selected_size", selectedSize)
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
        <button type="button" className="share-btn" aria-label="แชร์" onClick={() => setShareOpen(true)}>
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
                  onClick={() => {
                    autoPauseUntilRef.current = Date.now() + 6000
                    scrollToSlide(i)
                  }}
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
        {sizeOptions.length ? (
          <div className="section-item">
            <span className="item-label">ไซส์</span>
            <span className="item-value">{sizeOptions.join(", ")}</span>
          </div>
        ) : null}
        {colorOptions.length ? (
          <div className="section-item">
            <span className="item-label">สี</span>
            <span className="item-value">{colorOptions.join(", ")}</span>
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
          <Link to={shopLink} className="visit-btn">
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
            <Link to={shopLink} className="pd-icon-btn" aria-label="ร้านค้า">
              <i className="fa-solid fa-shop" />
              <span>ร้านค้า</span>
            </Link>
            <button
              type="button"
              className={`pd-icon-btn pd-icon-btn--follow${following ? " is-following" : ""}`}
              aria-label={following ? "ติดตามร้านค้าแล้ว" : "ติดตามร้านค้า"}
              onClick={handleFollow}
            >
              <i className={`${following ? "fa-solid" : "fa-regular"} fa-star`} />
              <span>{following ? "ติดตามแล้ว" : "ติดตาม"}</span>
            </button>
          </div>
          <button type="button" className="pd-btn pd-btn--cart pd-btn--compact" onClick={openDrawer}>
            <i className="fa-solid fa-cart-plus" aria-hidden />
            ตะกร้า
          </button>
          <button type="button" className="pd-btn pd-btn--buy pd-btn--compact" onClick={openDrawer}>
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
            <div className="store-verify">คงเหลือ: {stock > 0 ? stock.toLocaleString("th-TH") : "—"} ชิ้น</div>
            <div className="store-verify pd-drawer-select">
              {variantSummary ? `เลือกแล้ว: ${variantSummary}` : "กรุณาเลือกสี/ไซส์ (ถ้ามี)"}
            </div>
          </div>
          <button type="button" className="close-drawer" onClick={() => setDrawerOpen(false)} aria-label="ปิด">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {colorOptions.length ? (
          <div className="variant-group">
            <span className="variant-label">สี (Color)</span>
            <div className="variant-options">
              {colorOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`variant-pill${selectedColor === value ? " active" : ""}`}
                  onClick={() => setSelectedColor(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {sizeOptions.length ? (
          <div className="variant-group">
            <span className="variant-label">ไซส์ (Size)</span>
            <div className="variant-options">
              {sizeOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`variant-pill${selectedSize === value ? " active" : ""}`}
                  onClick={() => setSelectedSize(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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

      <FollowToast
        open={followToastOpen}
        message={followToast}
        onClose={() => setFollowToastOpen(false)}
      />

      <div
        className={`drawer-overlay share-overlay${shareOpen ? " active" : ""}`}
        onClick={() => setShareOpen(false)}
        aria-hidden={!shareOpen}
      />
      <div
        className={`share-modal${shareOpen ? " active" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        <div className="share-modal__header">
          <h2 id="share-dialog-title" className="share-modal__heading">
            แชร์สินค้า
          </h2>
          <button type="button" className="close-share" onClick={() => setShareOpen(false)} aria-label="ปิด">
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>

        <div className="share-content">
          <div className="share-product">
            <img src={images[0]} alt="" className="share-img" />
            <div className="share-product__meta">
              <h3 className="share-title">{product.title}</h3>
              <p className="share-price">{formatPrice(product.price)}</p>
              <p className="share-shop">{shopName}</p>
            </div>
          </div>

          {description ? (
            <p className="share-desc">{description}</p>
          ) : null}

          <div className="share-link-field">
            <span className="share-link-label">ลิงก์สินค้า</span>
            <div className="share-link-row">
              <input
                type="text"
                className="share-link-input"
                readOnly
                value={shareUrl}
                aria-label="ลิงก์สินค้า"
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <button
            type="button"
            className={`copy-btn${shareCopied ? " copied" : ""}`}
            onClick={copyShareLink}
          >
            <i className={`fa-solid ${shareCopied ? "fa-check" : "fa-link"}`} aria-hidden />
            {shareCopied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </button>
        </div>
      </div>
    </div>
  )
}
