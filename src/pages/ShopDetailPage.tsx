import { Link, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { asset } from "@/lib/assets"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import {
  fetchFollowStatus,
  toggleFollowShop,
} from "@/lib/customerApi"
import {
  fetchProducts,
  fetchShops,
  formatNumberText,
  mapApiProduct,
  mapApiShopImage,
  type ApiShop,
} from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"
import "@/styles/extracted/shop-detail.css"
import "@/styles/store-mobile.css"

export default function ShopDetailPage() {
  useBodyClass("page-shop-detail")
  const { id } = useParams()
  const { isLoggedIn, requireLogin } = useApp()
  const shopKey = decodeURIComponent(id ?? "")
  const [shop, setShop] = useState<ApiShop | null>(null)
  const [shopProducts, setShopProducts] = useState<Product[]>([])
  const [following, setFollowing] = useState(false)
  const [toast, setToast] = useState("")
  const [toastOpen, setToastOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [shops, apiProducts] = await Promise.all([fetchShops(), fetchProducts()])
      if (cancelled) return

      const found = shops.find((s) => s.shop_name === shopKey || String(s.id) === shopKey)

      if (found) {
        setShop(found)
        setShopProducts(
          apiProducts.filter((p) => p.shop_name === found.shop_name).map(mapApiProduct).slice(0, 12),
        )
        if (isLoggedIn) {
          const status = await fetchFollowStatus(found.shop_name)
          if (!cancelled) setFollowing(Boolean(status.following))
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [shopKey, isLoggedIn])

  const showNotice = (message: string) => {
    setToast(message)
    setToastOpen(true)
    window.setTimeout(() => setToastOpen(false), 1500)
  }

  const handleFollow = async () => {
    if (!shop) return
    if (!requireLogin()) return
    try {
      const res = await toggleFollowShop({
        shop_name: shop.shop_name,
        shop_image: shop.shop_image,
        review_count: shop.review_count,
        view_count: shop.view_count,
        trust_score: Number(shop.trust_score) || 0,
        sales_volume: shop.sales_volume,
      })
      if (!res.success) {
        showNotice("บันทึกการติดตามไม่สำเร็จ")
        return
      }
      setFollowing(Boolean(res.following))
      showNotice(res.following ? "ติดตามร้านค้านี้แล้ว" : "ยกเลิกติดตามร้านค้านี้แล้ว")
    } catch {
      showNotice("บันทึกการติดตามไม่สำเร็จ")
    }
  }

  const displayName = shop?.shop_name ?? shopKey
  const displayProducts = shopProducts

  return (
    <>
      <header className="shop-header">
        <Link to="/" className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <h1 className="header-title">{displayName}</h1>
        <div className="header-spacer" />
      </header>
      <main>
        <section className="profile-container">
          <div className="shop-profile-card">
            <div className="shop-profile-header">
              <div className="shop-logo-wrap">
                <img
                  src={shop ? mapApiShopImage(shop.shop_image) : asset("logo/shop logo.webp")}
                  alt="Shop"
                  className="shop-logo"
                />
              </div>
              <div
                className={`follow-btn-wrap${following ? " is-following" : ""}`}
                role="button"
                onClick={handleFollow}
              >
                <i className={`${following ? "fa-solid fa-heart" : "fa-regular fa-heart"} follow-icon`} />
                <span className="follow-label">{following ? "ติดตามแล้ว" : "ติดตาม"}</span>
              </div>
            </div>
            <div className="shop-info-main">
              <div className="shop-name">
                {displayName}
                <span className="brand-badge">แบรนด์ขายตรง</span>
              </div>
              <div className="shop-metrics">
                คะแนนความน่าเชื่อถือ : {shop?.trust_score ?? "—"}
                <br />
                ความคิดเห็นที่ดี : {shop ? formatNumberText(shop.review_count) : "—"}
              </div>
              <div className="shop-stats-grid">
                <span>ปริมาณซื้อขาย : {shop ? formatNumberText(shop.sales_volume) : "—"}</span>
                <span>ยอดวิว : {shop ? formatNumberText(shop.view_count) : "—"}</span>
              </div>
              <div className="shop-metrics-grid">
                <div className="metric-chip">
                  <div className="label">คะแนนความน่าเชื่อถือ</div>
                  <div className="value">{shop?.trust_score ?? "—"}</div>
                </div>
                <div className="metric-chip">
                  <div className="label">ความคิดเห็นที่ดี</div>
                  <div className="value">{shop ? formatNumberText(shop.review_count) : "—"}</div>
                </div>
                <div className="metric-chip">
                  <div className="label">ปริมาณซื้อขาย</div>
                  <div className="value">{shop ? formatNumberText(shop.sales_volume) : "—"}</div>
                </div>
                <div className="metric-chip">
                  <div className="label">ยอดวิว</div>
                  <div className="value">{shop ? formatNumberText(shop.view_count) : "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <nav className="filter-tabs">
          <div className="tab-item active">การเรียงลำดับที่ครอบคลุม</div>
          <div className="tab-item">ยอดขายเป็นอันดับแรก</div>
          <div className="tab-item price-tab">
            ราคา <i className="fa-solid fa-sort" />
          </div>
          <div className="tab-item">สินค้าใหม่</div>
        </nav>
        <section className="product-grid">
          {displayProducts.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`}>
              <div className="product-card">
                <div className="product-img-wrap">
                  <img src={p.image} alt={p.title} className="product-img" />
                </div>
                <div className="product-info">
                  <div className="product-title">{p.title}</div>
                  <div className="product-price">{p.price.toFixed(2)}</div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
      <div className={`follow-toast-overlay${toastOpen ? " show" : ""}`} onClick={() => setToastOpen(false)} />
      <div className={`follow-toast toast-success${toastOpen ? " show" : ""}`}>
        <div className="follow-toast-inner">
          <div className="follow-toast-icon">
            <i className="fa-solid fa-circle-check" />
          </div>
          <div className="follow-toast-message">{toast}</div>
        </div>
      </div>
    </>
  )
}
