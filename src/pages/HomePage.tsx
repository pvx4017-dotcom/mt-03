import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { asset } from "@/lib/assets"
import {
  formatNumberText,
  mapApiShopImage,
  shopPath,
} from "@/lib/marketplaceApi"
import { useHomeData } from "@/hooks/useHomeData"
import { MainHeader } from "@/components/layout/MainHeader"
import { CategorySidebar } from "@/components/layout/CategorySidebar"
import { LanguageMenu } from "@/components/layout/LanguageMenu"
import { BottomNav } from "@/components/layout/BottomNav"
import { LoginModal } from "@/components/layout/LoginModal"
import { ScrollTopButton } from "@/components/layout/ScrollTopButton"
import { SectionHeader } from "@/components/home/SectionHeader"
import { ProductSkeleton } from "@/components/home/ProductSkeleton"
import { ProductCard } from "@/components/product/ProductCard"
import { useBodyClass } from "@/hooks/useBodyClass"

const fallbackBanners = [
  "images/banner_hot_product_1775719595992.png",
  "images/banner_smart_home_2_1775724145981.png",
  "images/banner_luxury_furniture_3_1775724161606.png",
]

const CATALOG_PAGE_SIZE = 24

function StatusLine({ message }: { message: string }) {
  if (!message) return null
  return <p className="home-api-status">{message}</p>
}

export default function HomePage() {
  useBodyClass("page-home")
  const [slide, setSlide] = useState(0)
  const [catalogVisible, setCatalogVisible] = useState(CATALOG_PAGE_SIZE)
  const {
    categories,
    categoriesStatus,
    shops,
    shopsStatus,
    banners: slideBanners,
    dailyProducts,
    dailyStatus,
    catalogProducts,
    guessProducts,
    guessStatus,
    loading,
  } = useHomeData()

  const banners = slideBanners.length ? slideBanners : fallbackBanners

  useEffect(() => {
    if (!banners.length) return
    const timer = setInterval(() => setSlide((s) => (s + 1) % banners.length), 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  const visibleCatalog = catalogProducts.slice(0, catalogVisible)
  const hasMoreCatalog = catalogVisible < catalogProducts.length

  return (
    <div id="app">
      <CategorySidebar />
      <LanguageMenu />
      <MainHeader />

      <section className="search-section">
        <Link to="/search" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div className="search-container">
            <i className="fa-solid fa-magnifying-glass search-icon" />
            <input
              type="text"
              placeholder="กรุณาใส่คีย์เวิร์ดของสินค้า/ร้านค้า"
              className="search-input"
              readOnly
            />
          </div>
        </Link>
      </section>

      <section className="hero-section">
        <div className="banner-slider-container">
          <div className="banner-wrapper" style={{ transform: `translateX(-${slide * 100}%)` }}>
            {banners.map((b, i) => (
              <div className="hero-banner" key={`${b}-${i}`}>
                <img src={asset(b)} alt={`Banner ${i + 1}`} className="banner-img" />
              </div>
            ))}
          </div>
          <div className="slider-dots">
            {banners.map((_, i) => (
              <div
                key={i}
                className={`dot${slide === i ? " active" : ""}`}
                onClick={() => setSlide(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSlide(i)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="categories-section">
        <SectionHeader title="หมวดหมู่สินค้า" subtitle="เลือกดูตามหมวดที่สนใจ" icon="🏷️" actionLabel="ทั้งหมด" actionTo="/categories" />
        <StatusLine message={categoriesStatus} />
        <div className="category-slider-container">
          <div className="category-track">
            {loading && categories.length === 0 ? (
              Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="category-item-new" aria-hidden="true">
                  <div className="icon-circle product-skeleton__image" style={{ width: 64, height: 64, borderRadius: 10 }} />
                  <span style={{ opacity: 0.3 }}>…</span>
                </div>
              ))
            ) : (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category-detail?cat=${encodeURIComponent(cat.category_name)}`}
                  className="category-anchor"
                >
                  <div className="category-item-new">
                    <div className="icon-circle">
                      <img src={asset(cat.category_image)} alt={cat.category_name} loading="lazy" />
                    </div>
                    <span>{cat.category_name}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="products-section">
        <SectionHeader title="อัพนิวส์ทุกวัน" subtitle="สินค้าใหม่และมาแรง" icon="✨" />
        <StatusLine message={dailyStatus} />
        <div className="product-slider-container">
          <div className="product-track">
            {loading && dailyProducts.length === 0 ? (
              <ProductSkeleton count={4} variant="slider" />
            ) : (
              dailyProducts.map((p) => (
                <ProductCard key={p.id} product={p} variant="slider" showShop={false} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="shop-section">
        <SectionHeader title="ร้านค้าแนะนำ" subtitle="ร้านค้าที่ได้รับความนิยม" icon="🏪" actionLabel="ดูทั้งหมด" actionTo="/following-shops" />
        <StatusLine message={shopsStatus} />
        <div id="recommendedShopList">
          {shops.map((shop) => (
            <div className="shop-card shop-card--pro" key={shop.id}>
              <div className="shop-header">
                <div className="shop-info">
                  <div className="shop-icon">
                    <img
                      src={mapApiShopImage(shop.shop_image)}
                      alt={shop.shop_name}
                      className="shop-logo-img"
                      loading="lazy"
                    />
                  </div>
                  <div className="shop-details">
                    <h4>{shop.shop_name}</h4>
                    <p>ความคิดเห็นที่ดี: {formatNumberText(shop.review_count)}</p>
                    <p>ยอดวิว: {formatNumberText(shop.view_count)}</p>
                  </div>
                </div>
                <Link to={shopPath(shop.shop_name)} className="visit-shop-btn" style={{ textDecoration: "none" }}>
                  เข้าชมร้านค้า &gt;
                </Link>
              </div>
              <div className="shop-stats shop-stats--pro">
                <div className="shop-stat-pill">
                  คะแนนความน่าเชื่อถือ
                  <strong>{shop.trust_score}</strong>
                </div>
                <div className="shop-stat-pill">
                  ปริมาณซื้อขาย
                  <strong>{formatNumberText(shop.sales_volume)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-catalog-section" aria-label="สินค้าทั้งหมด">
        <SectionHeader title="สินค้าทั้งหมด" subtitle="ค้นพบสินค้าจากทุกร้าน" icon="🛍️" actionLabel="ค้นหา" actionTo="/search" />
        {catalogProducts.length > 0 ? (
          <div className="catalog-toolbar">
            <span>แสดง {visibleCatalog.length.toLocaleString("th-TH")} จาก {catalogProducts.length.toLocaleString("th-TH")} รายการ</span>
          </div>
        ) : null}
        <div className="home-catalog-feed-wrap">
          <div className="product-feed home-product-feed" id="homeProductFeed">
            {loading && catalogProducts.length === 0 ? (
              <ProductSkeleton count={6} variant="feed" />
            ) : catalogProducts.length === 0 ? (
              <div className="home-empty-state">
                <div className="home-empty-state__icon">
                  <i className="fa-solid fa-box-open" />
                </div>
                <p>ยังไม่มีสินค้าในขณะนี้</p>
              </div>
            ) : (
              visibleCatalog.map((p) => (
                <ProductCard key={p.id} product={p} variant="feed" />
              ))
            )}
          </div>
          {hasMoreCatalog ? (
            <div className="catalog-load-more-wrap">
              <button
                type="button"
                className="catalog-load-more-btn"
                onClick={() => setCatalogVisible((n) => n + CATALOG_PAGE_SIZE)}
              >
                โหลดเพิ่ม ({Math.min(CATALOG_PAGE_SIZE, catalogProducts.length - catalogVisible)} รายการ)
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="guess-you-like">
        <SectionHeader title="เดาคุณชอบ" subtitle="แนะนำจากความนิยม" icon="💡" />
        <StatusLine message={guessStatus} />
        <div className="recommend-grid">
          {loading && guessProducts.length === 0 ? (
            <ProductSkeleton count={4} variant="recommend" />
          ) : (
            guessProducts.map((p) => (
              <ProductCard key={`guess-${p.id}`} product={p} variant="recommend" />
            ))
          )}
        </div>
      </section>

      <ScrollTopButton />
      <div className="bottom-spacer" />
      <BottomNav />
      <LoginModal />
    </div>
  )
}
