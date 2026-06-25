import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { asset } from "@/lib/assets"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import { FollowToast } from "@/components/customer/FollowToast"
import { ProductCard } from "@/components/product/ProductCard"
import {
  fetchFollowStatus,
  fetchStoreCustomerStatus,
  toggleFollowShop,
} from "@/lib/customerApi"
import {
  fetchCustomerStoreByShop,
  fetchMirrorProducts,
  fetchProducts,
  fetchShopsForLookup,
  formatNumberText,
  mapApiProduct,
  mapApiShopImage,
  normalizeShopName,
  productPath,
  type ApiProduct,
  type ApiShop,
} from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"

type ShopSort = "default" | "sales" | "price-asc" | "price-desc" | "newest"

function filterProductsByShop(rows: ApiProduct[], shopName: string): ApiProduct[] {
  const target = normalizeShopName(shopName)
  const exact = rows.filter((row) => normalizeShopName(String(row.shop_name ?? "")) === target)
  if (exact.length) return exact
  return rows.filter((row) => {
    const name = normalizeShopName(String(row.shop_name ?? ""))
    return name.includes(target) || target.includes(name)
  })
}

function sortShopProducts(products: Product[], sort: ShopSort): Product[] {
  const list = [...products]
  if (sort === "sales") {
    return list.sort((a, b) => (b.salesVolume ?? 0) - (a.salesVolume ?? 0))
  }
  if (sort === "price-asc") return list.sort((a, b) => a.price - b.price)
  if (sort === "price-desc") return list.sort((a, b) => b.price - a.price)
  if (sort === "newest") return list.reverse()
  return list
}

export default function ShopDetailPage() {
  useBodyClass("page-shop-detail")
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoggedIn, requireLogin } = useApp()
  const shopKey = decodeURIComponent(id ?? "")
  const sourceParam = String(searchParams.get("source") ?? "").trim().toLowerCase()

  const [shop, setShop] = useState<ApiShop | null>(null)
  const [shopProducts, setShopProducts] = useState<Product[]>([])
  const [catalogSource, setCatalogSource] = useState<"admin" | "mirror">("admin")
  const [following, setFollowing] = useState(false)
  const [hideFollow, setHideFollow] = useState(false)
  const [sort, setSort] = useState<ShopSort>("default")
  const [toast, setToast] = useState("")
  const [toastOpen, setToastOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!shopKey) return

      const [allShops, adminProducts, mirrorProducts] = await Promise.all([
        fetchShopsForLookup(),
        fetchProducts(),
        fetchMirrorProducts(),
      ])
      if (cancelled) return

      let ownStoreName = ""
      if (isLoggedIn) {
        const ownStatus = await fetchStoreCustomerStatus()
        ownStoreName = String(ownStatus.store?.shop_name ?? "").trim()
      }
      if (cancelled) return

      const isMirrorSource = sourceParam === "mirror"
      const isOwnShop =
        isMirrorSource ||
        (ownStoreName !== "" && normalizeShopName(ownStoreName) === normalizeShopName(shopKey))
      setHideFollow(isOwnShop)
      setCatalogSource(isMirrorSource ? "mirror" : "admin")

      let productRows: ApiProduct[] = []
      let displayShop: ApiShop | null =
        allShops.find((s) => normalizeShopName(s.shop_name) === normalizeShopName(shopKey)) ?? null

      if (isMirrorSource) {
        productRows = filterProductsByShop(mirrorProducts, shopKey)
        const customerStore = await fetchCustomerStoreByShop(shopKey)
        if (cancelled) return

        if (customerStore) {
          displayShop = {
            id: Number(customerStore.user_id ?? 0),
            shop_name: String(customerStore.shop_name ?? shopKey),
            shop_image: String(customerStore.shop_image ?? ""),
            review_count: Number(customerStore.product_count ?? productRows.length),
            view_count: 0,
            trust_score: "0",
            sales_volume: Number(customerStore.sales_volume ?? 0),
          }
        } else if (productRows[0]) {
          displayShop = {
            id: Number(productRows[0].user_id ?? 0),
            shop_name: shopKey,
            shop_image: String(productRows[0].product_image ?? ""),
            review_count: productRows.length,
            view_count: 0,
            trust_score: "0",
            sales_volume: Number(productRows[0].sales_volume ?? 0),
          }
        }
      } else {
        productRows = filterProductsByShop(adminProducts, shopKey)
        const customerStore = await fetchCustomerStoreByShop(shopKey)
        if (cancelled) return

        if (!displayShop && customerStore) {
          displayShop = {
            id: Number(customerStore.user_id ?? 0),
            shop_name: String(customerStore.shop_name ?? shopKey),
            shop_image: String(customerStore.shop_image ?? ""),
            review_count: Number(customerStore.product_count ?? 0),
            view_count: 0,
            trust_score: "0",
            sales_volume: Number(customerStore.sales_volume ?? 0),
          }
        } else if (!displayShop && productRows[0]) {
          displayShop = {
            id: 0,
            shop_name: shopKey,
            shop_image: "",
            review_count: Number(productRows[0].review_count ?? 0),
            view_count: Number(productRows[0].view_count ?? 0),
            trust_score: String(productRows[0].trust_score ?? 0),
            sales_volume: Number(productRows[0].sales_volume ?? 0),
          }
        }
      }

      setShop(displayShop)
      setShopProducts(productRows.map(mapApiProduct))

      if (!isOwnShop && isLoggedIn && (displayShop?.shop_name || shopKey)) {
        const status = await fetchFollowStatus(displayShop?.shop_name ?? shopKey)
        if (!cancelled) setFollowing(Boolean(status.following))
      } else if (!cancelled) {
        setFollowing(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [shopKey, sourceParam, isLoggedIn])

  const showNotice = (message: string) => {
    setToast(message)
    setToastOpen(true)
    window.setTimeout(() => setToastOpen(false), 1500)
  }

  const handleFollow = async () => {
    if (hideFollow) return
    if (!requireLogin()) return

    const payload = shop ?? {
      shop_name: shopKey,
      shop_image: "",
      review_count: shopProducts.length,
      view_count: 0,
      trust_score: "0",
      sales_volume: 0,
    }

    try {
      const res = await toggleFollowShop({
        shop_name: payload.shop_name,
        shop_image: payload.shop_image,
        review_count: Number(payload.review_count ?? 0),
        view_count: Number(payload.view_count ?? 0),
        trust_score: Number(payload.trust_score ?? 0),
        sales_volume: Number(payload.sales_volume ?? 0),
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
  const sortedProducts = useMemo(
    () => sortShopProducts(shopProducts, sort),
    [shopProducts, sort],
  )

  return (
    <div className="shop-detail-shell">
      <header className="shop-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="ย้อนกลับ">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <h1 className="header-title">{displayName}</h1>
        <div className="header-spacer" />
      </header>
      <main>
        <section className="profile-container">
          <div className="shop-profile-card">
            <div className="shop-logo-wrap">
              <img
                src={shop ? mapApiShopImage(shop.shop_image) : asset("logo/shop logo.webp")}
                alt={displayName}
                className="shop-logo"
              />
            </div>
            <div className="shop-info-main">
              <div className="shop-name">
                {displayName}
                <span className="brand-badge">แบรนด์ขายตรง</span>
              </div>
              <div className="shop-metrics">
                คะแนนความน่าเชื่อถือ : {shop?.trust_score ?? "0"}
                <br />
                ความคิดเห็นที่ดี : {shop ? formatNumberText(shop.review_count) : "0"}
              </div>
              <div className="shop-stats-grid">
                <span>ปริมาณซื้อขาย : {shop ? formatNumberText(shop.sales_volume) : "0"}</span>
                <span>ยอดวิว : {shop ? formatNumberText(shop.view_count) : "0"}</span>
              </div>
            </div>
            {!hideFollow ? (
              <div
                className={`follow-btn-wrap${following ? " is-following" : ""}`}
                role="button"
                tabIndex={0}
                onClick={handleFollow}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleFollow()
                  }
                }}
              >
                <i className={`${following ? "fa-solid" : "fa-regular"} fa-heart follow-icon`} />
                <span className="follow-label">{following ? "ติดตามแล้ว" : "ติดตาม"}</span>
              </div>
            ) : null}
          </div>
        </section>
        <nav className="filter-tabs">
          <button
            type="button"
            className={`tab-item${sort === "default" ? " active" : ""}`}
            onClick={() => setSort("default")}
          >
            การเรียงลำดับที่ครอบคลุม
          </button>
          <button
            type="button"
            className={`tab-item${sort === "sales" ? " active" : ""}`}
            onClick={() => setSort("sales")}
          >
            ยอดขายเป็นอันดับแรก
          </button>
          <button
            type="button"
            className={`tab-item price-tab${sort === "price-asc" || sort === "price-desc" ? " active" : ""}`}
            onClick={() => setSort((s) => (s === "price-asc" ? "price-desc" : "price-asc"))}
          >
            ราคา{" "}
            <i
              className={`fa-solid ${
                sort === "price-desc" ? "fa-sort-down" : sort === "price-asc" ? "fa-sort-up" : "fa-sort"
              }`}
            />
          </button>
          <button
            type="button"
            className={`tab-item${sort === "newest" ? " active" : ""}`}
            onClick={() => setSort("newest")}
          >
            สินค้าใหม่
          </button>
        </nav>
        <section className="shop-product-grid">
          {sortedProducts.length ? (
            sortedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                variant="shop"
                showShop={false}
                linkTo={productPath(p.id, {
                  shop: displayName,
                  source: catalogSource === "mirror" ? "mirror" : undefined,
                })}
              />
            ))
          ) : (
            <div className="shop-product-empty">
              <img src={asset("partner/noCart.png")} alt="" className="shop-product-empty__img" />
              <p className="shop-product-empty__title">ยังไม่มีสินค้าในร้านนี้</p>
              <p className="shop-product-empty__sub">ลองกลับมาดูอีกครั้งในภายหลัง</p>
            </div>
          )}
        </section>
      </main>
      <FollowToast open={toastOpen} message={toast} onClose={() => setToastOpen(false)} />
    </div>
  )
}
