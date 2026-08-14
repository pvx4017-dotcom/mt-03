import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { asset } from "@/lib/assets"
import { HERO_BANNER_LABEL, SEARCH_PLACEHOLDER } from "@/lib/brand"
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
import { ScrollTopButton } from "@/components/layout/ScrollTopButton"
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

function HomeSectionTitle({ children }: { children: string }) {
  return <h3 className="section-title home-section-title">{children}</h3>
}

export default function HomePage() {
  useBodyClass("page-home")
  const [slide, setSlide] = useState(0)
  const [catalogVisible, setCatalogVisible] = useState(CATALOG_PAGE_SIZE)
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

  const visibleCatalog = useMemo(
    () => catalogProducts.slice(0, catalogVisible),
    [catalogProducts, catalogVisible],
  )
  const hasMoreCatalog = catalogVisible < catalogProducts.length
  const sliderCategories = categories.slice(0, 16)

  return (
    <div id="app" className="home-shell">
      <CategorySidebar />
      <LanguageMenu />

      <div className="home-masthead">
        <MainHeader />

        <section className="home-search-section">
          <Link to="/search" className="home-search-link">
            <div className="search-container search-container--ref">
              <div className="search-inner">
                <i className="fa-solid fa-magnifying-glass search-icon-img" aria-hidden />
                <span className="search-placeholder-text">{SEARCH_PLACEHOLDER}</span>
              </div>
            </div>
          </Link>
        </section>
      </div>

      <main className="home-main">
        <section className="hero-section">
          <div className="banner-slider-container banner-slider-container--ref">
            <span className="hero-banner-label">{HERO_BANNER_LABEL}</span>
            <div className="banner-wrapper" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {banners.map((b, i) => (
                <div className={`hero-banner${slide === i ? " is-active" : ""}`} key={`${b}-${i}`}>
                  <img src={asset(b)} alt="" className="banner-img" loading={i === 0 ? "eager" : "lazy"} />
                </div>
              ))}
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

        <section className="categories-section home-categories-slider">
          <div className="category-slider-container">
            <div className="category-track">
              {loading && categories.length === 0
                ? Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="category-item category-item--skeleton" aria-hidden="true">
                      <div className="category-icon" />
                      <span />
                    </div>
                  ))
                : (
                  <>
                    {sliderCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category-detail?cat=${encodeURIComponent(cat.category_name)}`}
                        className="category-item"
                      >
                        <span className="category-icon">
                          <img src={asset(cat.category_image)} alt="" loading="lazy" />
                        </span>
                        <span>{cat.category_name}</span>
                      </Link>
                    ))}
                    <Link to="/categories" className="category-item">
                      <span className="category-icon category-icon--more">
                        <i className="fa-solid fa-ellipsis" aria-hidden />
                      </span>
                      <span>ดูทั้งหมด</span>
                    </Link>
                  </>
                )}
            </div>
          </div>
        </section>

        <section className="products-section home-panel home-panel--flush">
          <HomeSectionTitle>อัพนิวส์ทุกวัน</HomeSectionTitle>
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

        <section className="shop-section home-panel">
          <HomeSectionTitle>ร้านค้าแนะนำ</HomeSectionTitle>
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

        <section className="home-catalog-section home-panel home-panel--catalog" aria-label="สินค้าทั้งหมด">
          <HomeSectionTitle>สินค้าทั้งหมด</HomeSectionTitle>
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
                visibleCatalog.map((p: Product) => (
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
                  โหลดเพิ่มเติม
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="guess-you-like home-panel home-panel--tinted">
          <HomeSectionTitle>เดาคุณชอบ</HomeSectionTitle>
          <div className="recommend-grid recommend-grid--home product-feed home-product-feed">
            {loading && guessProducts.length === 0 ? (
              <ProductSkeleton count={4} variant="feed" />
            ) : guessProducts.length === 0 && !loading ? (
              <div className="home-empty-state home-empty-state--inline">
                <p>ยังไม่มีสินค้าแนะนำ</p>
              </div>
            ) : (
              guessProducts.slice(0, 8).map((p) => (
                <ProductCard key={`guess-${p.id}`} product={p} variant="feed" />
              ))
            )}
          </div>
        </section>
      </main>

      <div className="home-footer-zone">
        <div className="bottom-spacer bottom-spacer--home" />
      </div>

      <ScrollTopButton />
      <BottomNav />
    </div>
  )
}
