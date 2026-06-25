import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { asset } from "@/lib/assets"
import {
  formatCompactCount,
  mapApiShopImage,
  shopPath,
  trustScoreToRating,
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
import type { Product } from "@/data/products"

const fallbackBanners = [
  "images/banner_hot_product_1775719595992.png",
  "images/banner_smart_home_2_1775724145981.png",
  "images/banner_luxury_furniture_3_1775724161606.png",
]

const CATALOG_PAGE_SIZE = 24

const HERO_CTA = [
  { tag: "Hot Deal", title: "ช้อปสินค้าคุณภาพ ราคาพิเศษ", to: "/search" },
  { tag: "New In", title: "สินค้าใหม่ อัพเดตทุกวัน", to: "/categories" },
  { tag: "Top Shop", title: "ร้านค้ายอดนิยม น่าเชื่อถือ", to: "/following-shops" },
]

const QUICK_LINKS = [
  { label: "โปรโมชั่น", icon: "fa-solid fa-percent", to: "/search", color: "#ef4444" },
  { label: "หมวดหมู่", icon: "fa-solid fa-table-cells", to: "/categories", color: "#0062e0" },
  { label: "ร้านแนะนำ", icon: "fa-solid fa-store", to: "/following-shops", color: "#8b5cf6" },
  { label: "ช่วยเหลือ", icon: "fa-solid fa-circle-question", to: "/help-center", color: "#0ea5e9" },
]

type CatalogSort = "default" | "popular" | "price-asc" | "price-desc"

function sortCatalog(products: Product[], sort: CatalogSort): Product[] {
  const list = [...products]
  if (sort === "popular") {
    return list.sort((a, b) => (b.salesVolume ?? 0) - (a.salesVolume ?? 0))
  }
  if (sort === "price-asc") {
    return list.sort((a, b) => a.price - b.price)
  }
  if (sort === "price-desc") {
    return list.sort((a, b) => b.price - a.price)
  }
  return list
}

export default function HomePage() {
  useBodyClass("page-home")
  const [slide, setSlide] = useState(0)
  const [catalogVisible, setCatalogVisible] = useState(CATALOG_PAGE_SIZE)
  const [catalogSort, setCatalogSort] = useState<CatalogSort>("default")
  const {
    categories,
    shops,
    banners: slideBanners,
    dailyProducts,
    catalogProducts,
    guessProducts,
    loading,
    error,
  } = useHomeData()

  const banners = slideBanners.length ? slideBanners : fallbackBanners

  useEffect(() => {
    if (!banners.length) return
    const timer = setInterval(() => setSlide((s) => (s + 1) % banners.length), 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  useEffect(() => {
    setCatalogVisible(CATALOG_PAGE_SIZE)
  }, [catalogSort])

  const sortedCatalog = useMemo(
    () => sortCatalog(catalogProducts, catalogSort),
    [catalogProducts, catalogSort],
  )
  const visibleCatalog = sortedCatalog.slice(0, catalogVisible)
  const hasMoreCatalog = catalogVisible < sortedCatalog.length
  const hotCategories = categories.slice(0, 6)
  const gridCategories = categories.slice(0, 7)

  return (
    <div id="app" className="home-shell">
      <CategorySidebar />
      <LanguageMenu />

      <div className="home-masthead">
        <MainHeader />

        <section className="home-search-section">
          <Link to="/search" className="home-search-link">
            <div className="search-container search-container--modern">
              <span className="search-container__icon-wrap">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <span className="search-input search-input--fake">ค้นหาสินค้า แบรนด์ หรือร้านค้า</span>
              <span className="search-container__scan">
                <i className="fa-solid fa-sliders" aria-hidden />
              </span>
            </div>
          </Link>
          {hotCategories.length > 0 ? (
            <div className="home-search-chips">
              <span className="home-search-chips__label">ฮิต:</span>
              {hotCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category-detail?cat=${encodeURIComponent(cat.category_name)}`}
                  className="home-search-chip"
                >
                  {cat.category_name}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <main className="home-main">
        <section className="hero-section">
          <div className="banner-slider-container banner-slider-container--modern">
            <div className="banner-wrapper" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {banners.map((b, i) => {
                const cta = HERO_CTA[i % HERO_CTA.length]
                return (
                  <div className={`hero-banner${slide === i ? " is-active" : ""}`} key={`${b}-${i}`}>
                    <img src={asset(b)} alt="" className="banner-img" loading={i === 0 ? "eager" : "lazy"} />
                    <div className="hero-banner__overlay">
                      <span className="hero-banner__tag">{cta.tag}</span>
                      <h2 className="hero-banner__title">{cta.title}</h2>
                      <Link to={cta.to} className="hero-banner__cta">
                        ช้อปเลย
                        <i className="fa-solid fa-arrow-right" aria-hidden />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="slider-dots slider-dots--modern">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`dot${slide === i ? " active" : ""}`}
                  onClick={() => setSlide(i)}
                  aria-label={`สไลด์ ${i + 1}`}
                >
                  <span className="dot__fill" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <nav className="home-quick-nav" aria-label="เมนูด่วน">
          {QUICK_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="home-quick-nav__item">
              <span className="home-quick-nav__icon" style={{ "--quick-color": item.color } as CSSProperties}>
                <i className={item.icon} aria-hidden />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <section className="home-panel home-panel--categories">
          <SectionHeader
            title="หมวดหมู่สินค้า"
            subtitle="เลือกช้อปตามหมวด"
            iconClass="fa-solid fa-tags"
            actionLabel="ทั้งหมด"
            actionTo="/categories"
          />
          <div className="home-category-grid">
            {loading && categories.length === 0
              ? Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="home-category-cell home-category-cell--skeleton" aria-hidden="true">
                    <div className="product-skeleton__image" />
                    <div className="product-skeleton__line" style={{ width: "70%", margin: "8px auto 0" }} />
                  </div>
                ))
              : (
                <>
                  {gridCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category-detail?cat=${encodeURIComponent(cat.category_name)}`}
                      className="home-category-cell"
                    >
                      <span className="home-category-cell__icon">
                        <img src={asset(cat.category_image)} alt="" loading="lazy" />
                      </span>
                      <span className="home-category-cell__label">{cat.category_name}</span>
                    </Link>
                  ))}
                  <Link to="/categories" className="home-category-cell home-category-cell--more">
                    <span className="home-category-cell__icon home-category-cell__icon--more">
                      <i className="fa-solid fa-ellipsis" aria-hidden />
                    </span>
                    <span className="home-category-cell__label">ดูทั้งหมด</span>
                  </Link>
                </>
              )}
          </div>
        </section>

        <section className="home-panel home-panel--flush">
          <SectionHeader
            title="อัพนิวส์ทุกวัน"
            subtitle="ดีลใหม่ อัพเดตทุกวัน"
            iconClass="fa-solid fa-bolt"
            actionLabel="ดูทั้งหมด"
            actionTo="/search"
          />
          <div className="product-slider-container product-slider-container--modern">
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

        <section className="home-panel home-panel--tinted">
          <SectionHeader
            title="เดาคุณชอบ"
            subtitle="สินค้าขายดีที่คุณอาจชอบ"
            iconClass="fa-solid fa-wand-magic-sparkles"
            actionLabel="เพิ่มเติม"
            actionTo="/search"
          />
          <div className="recommend-grid recommend-grid--home">
            {loading && guessProducts.length === 0 ? (
              <ProductSkeleton count={4} variant="recommend" />
            ) : guessProducts.length === 0 && !loading ? (
              <div className="home-empty-state home-empty-state--inline">
                <p>ยังไม่มีสินค้าแนะนำ</p>
              </div>
            ) : (
              guessProducts.slice(0, 8).map((p) => (
                <ProductCard key={`guess-${p.id}`} product={p} variant="recommend" />
              ))
            )}
          </div>
        </section>

        <section className="home-panel">
          <SectionHeader
            title="ร้านค้าแนะนำ"
            subtitle="ร้านค้าได้รับความนิยม"
            iconClass="fa-solid fa-store"
            actionLabel="ดูทั้งหมด"
            actionTo="/following-shops"
          />
          <div className="shop-carousel">
            {loading && shops.length === 0 ? (
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="shop-carousel-card shop-carousel-card--skeleton" aria-hidden="true">
                  <div className="product-skeleton__line product-skeleton__line--title" />
                  <div className="product-skeleton__line" style={{ width: "55%", marginTop: 10 }} />
                </div>
              ))
            ) : (
              shops.map((shop) => {
                const rating = trustScoreToRating(Number(shop.trust_score))
                return (
                  <Link
                    key={shop.id}
                    to={shopPath(shop.shop_name)}
                    className="shop-carousel-card"
                  >
                    <div className="shop-carousel-card__head">
                      <img
                        src={mapApiShopImage(shop.shop_image)}
                        alt=""
                        className="shop-carousel-card__logo"
                        loading="lazy"
                      />
                      <div className="shop-carousel-card__info">
                        <h4>{shop.shop_name}</h4>
                        {rating > 0 ? (
                          <p className="shop-carousel-card__rating">
                            <i className="fa-solid fa-star" aria-hidden />
                            {rating.toFixed(1)}
                            <span>· {formatCompactCount(shop.review_count)} รีวิว</span>
                          </p>
                        ) : (
                          <p>{formatCompactCount(shop.review_count)} รีวิว</p>
                        )}
                      </div>
                    </div>
                    <div className="shop-carousel-card__stats">
                      <span>
                        <i className="fa-regular fa-eye" aria-hidden />
                        {formatCompactCount(shop.view_count)}
                      </span>
                      <span>
                        <i className="fa-solid fa-bag-shopping" aria-hidden />
                        {formatCompactCount(shop.sales_volume)}
                      </span>
                    </div>
                    <span className="shop-carousel-card__cta">
                      เข้าชมร้าน
                      <i className="fa-solid fa-arrow-right" aria-hidden />
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        <section className="home-panel home-panel--catalog" aria-label="สินค้าทั้งหมด">
          <SectionHeader
            title="สินค้าทั้งหมด"
            subtitle="ค้นพบจากทุกร้านค้า"
            iconClass="fa-solid fa-bag-shopping"
            actionLabel="ค้นหา"
            actionTo="/search"
          />
          {catalogProducts.length > 0 ? (
            <div className="catalog-toolbar catalog-toolbar--modern">
              <span className="catalog-toolbar__count">
                {visibleCatalog.length.toLocaleString("th-TH")} / {sortedCatalog.length.toLocaleString("th-TH")} รายการ
              </span>
              <div className="catalog-sort-pills">
                {(
                  [
                    ["default", "แนะนำ"],
                    ["popular", "ขายดี"],
                    ["price-asc", "ราคา ↑"],
                    ["price-desc", "ราคา ↓"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`catalog-sort-pill${catalogSort === key ? " active" : ""}`}
                    onClick={() => setCatalogSort(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="home-catalog-feed-wrap home-catalog-feed-wrap--modern">
            <div className="product-feed home-product-feed" id="homeProductFeed">
              {loading && catalogProducts.length === 0 ? (
                <ProductSkeleton count={6} variant="feed" />
              ) : catalogProducts.length === 0 ? (
                <div className="home-empty-state">
                  <div className="home-empty-state__icon">
                    <i className="fa-solid fa-box-open" />
                  </div>
                  <p>{error ? "โหลดสินค้าไม่สำเร็จ กรุณาลองใหม่ภายหลัง" : "ยังไม่มีสินค้าในขณะนี้"}</p>
                  <Link to="/categories" className="home-empty-state__cta">
                    เลือกดูหมวดหมู่
                  </Link>
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
                  className="catalog-load-more-btn catalog-load-more-btn--modern"
                  onClick={() => setCatalogVisible((n) => n + CATALOG_PAGE_SIZE)}
                >
                  <i className="fa-solid fa-plus" aria-hidden />
                  โหลดเพิ่ม {Math.min(CATALOG_PAGE_SIZE, sortedCatalog.length - catalogVisible)} รายการ
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <div className="home-footer-zone">
        <section className="home-trust-bar home-trust-bar--modern" aria-label="ความน่าเชื่อถือ">
          {[
            { icon: "fa-solid fa-shield-halved", label: "ช้อปปลอดภัย" },
            { icon: "fa-solid fa-truck-fast", label: "จัดส่งรวดเร็ว" },
            { icon: "fa-solid fa-rotate-left", label: "คืนสินค้าง่าย" },
            { icon: "fa-solid fa-headset", label: "ดูแล 24 ชม." },
          ].map((item) => (
            <div key={item.label} className="home-trust-item">
              <i className={item.icon} aria-hidden />
              <span>{item.label}</span>
            </div>
          ))}
        </section>
        <div className="bottom-spacer bottom-spacer--home" />
      </div>

      <ScrollTopButton />
      <BottomNav />
      <LoginModal />
    </div>
  )
}
