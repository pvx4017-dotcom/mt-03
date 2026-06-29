import { useEffect, useMemo, useState } from "react"
import { CategorySidebar } from "@/components/layout/CategorySidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { Footer } from "@/components/layout/Footer"
import { HeaderRedesign } from "@/components/layout/PageHeader"
import { ScrollTopButton } from "@/components/layout/ScrollTopButton"
import { ProductFeed } from "@/components/product/ProductCard"
import { useBodyClass } from "@/hooks/useBodyClass"
import { fetchProducts, mapApiProduct } from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"

type CatalogSort = "comprehensive" | "sales" | "price"

function sortCatalog(products: Product[], sort: CatalogSort, priceAsc: boolean): Product[] {
  const list = [...products]
  if (sort === "sales") {
    return list.sort((a, b) => (b.salesVolume ?? 0) - (a.salesVolume ?? 0))
  }
  if (sort === "price") {
    return list.sort((a, b) => (priceAsc ? a.price - b.price : b.price - a.price))
  }
  return list.sort((a, b) => Number(b.id) - Number(a.id))
}

/** หน้าหมวดหมู่ — ตาม reference: โหลดสินค้าทั้งหมดจากแคตตาล็อก, sidebar เป็น UI ตกแต่ง, เรียงด้วยแท็บด้านบนเท่านั้น */
export default function CategoriesPage() {
  useBodyClass("page-categories")
  const [sort, setSort] = useState<CatalogSort>("comprehensive")
  const [priceAsc, setPriceAsc] = useState(true)
  const [apiProducts, setApiProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProducts()
      .then((rows) => {
        if (!cancelled) setApiProducts(rows.map(mapApiProduct))
      })
      .catch(() => {
        if (!cancelled) setApiProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const displayProducts = useMemo(
    () => sortCatalog(apiProducts, sort, priceAsc),
    [apiProducts, sort, priceAsc],
  )

  const onPriceTab = () => {
    if (sort === "price") setPriceAsc((v) => !v)
    else {
      setSort("price")
      setPriceAsc(true)
    }
  }

  return (
    <div id="app" className="app-shell">
      <CategorySidebar />
      <HeaderRedesign title="หมวดหมู่" backTo="/" />

      <div className="filter-bar">
        <div
          className={`filter-tab${sort === "comprehensive" ? " active" : ""}`}
          onClick={() => setSort("comprehensive")}
          role="button"
        >
          ครอบคลุม
        </div>
        <div
          className={`filter-tab${sort === "sales" ? " active" : ""}`}
          onClick={() => setSort("sales")}
          role="button"
        >
          ปริมาณการขาย
        </div>
        <div
          className={`filter-tab${sort === "price" ? " active" : ""}`}
          onClick={onPriceTab}
          role="button"
        >
          ราคา
          <i className={`fa-solid fa-sort${sort === "price" ? (priceAsc ? "-up" : "-down") : ""}`} />
        </div>
      </div>

      <div className="category-content-container">
        {loading ? (
          <p className="categories-status-msg">กำลังโหลดสินค้า…</p>
        ) : displayProducts.length === 0 ? (
          <p className="categories-status-msg">ยังไม่มีสินค้าในขณะนี้</p>
        ) : (
          <ProductFeed products={displayProducts} />
        )}
      </div>

      <div className="app-footer-zone">
        <Footer />
        <ScrollTopButton />
        <div className="spacer" />
      </div>
      <BottomNav />
    </div>
  )
}
