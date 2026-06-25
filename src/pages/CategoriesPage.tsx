import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { categoryGroups } from "@/data/categories"
import { CategorySidebar } from "@/components/layout/CategorySidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { Footer } from "@/components/layout/Footer"
import { HeaderRedesign } from "@/components/layout/PageHeader"
import { ScrollTopButton } from "@/components/layout/ScrollTopButton"
import { ProductFeed } from "@/components/product/ProductCard"
import { useBodyClass } from "@/hooks/useBodyClass"
import { fetchProducts, mapApiProduct } from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"

export default function CategoriesPage() {
  useBodyClass("page-categories")
  const [params] = useSearchParams()
  const catSlug = params.get("cat") || "all"
  const [filter, setFilter] = useState("comprehensive")
  const [apiProducts, setApiProducts] = useState<Product[]>([])

  useEffect(() => {
    let cancelled = false
    fetchProducts()
      .then((rows) => {
        if (!cancelled) setApiProducts(rows.map(mapApiProduct))
      })
      .catch(() => {
        if (!cancelled) setApiProducts([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categoryLabel =
    categoryGroups.find((g) => g.subcategories.some((s) => s.slug === catSlug))?.label ?? "หมวดหมู่"

  const source = apiProducts

  const filteredProducts = useMemo(() => {
    if (catSlug === "all" || catSlug === "new" || catSlug === "popular") return source
    const slugNorm = catSlug.toLowerCase()
    return source.filter((p) => {
      const cat = String(p.category ?? "").toLowerCase()
      return cat.includes(slugNorm) || slugNorm.includes(cat.replace(/\s+/g, ""))
    })
  }, [catSlug, source])

  const displayProducts =
    filter === "price"
      ? [...filteredProducts].sort((a, b) => a.price - b.price)
      : filteredProducts

  return (
    <div id="app" className="app-shell">
      <CategorySidebar />
      <HeaderRedesign title={categoryLabel} backTo="/" />

      <div className="filter-bar">
        <div
          className={`filter-tab${filter === "comprehensive" ? " active" : ""}`}
          onClick={() => setFilter("comprehensive")}
          role="button"
        >
          ครอบคลุม
        </div>
        <div
          className={`filter-tab${filter === "sales" ? " active" : ""}`}
          onClick={() => setFilter("sales")}
          role="button"
        >
          ปริมาณการขาย
        </div>
        <div
          className={`filter-tab${filter === "price" ? " active" : ""}`}
          onClick={() => setFilter("price")}
          role="button"
        >
          ราคา
          <i className="fa-solid fa-sort" />
        </div>
      </div>

      <div className="category-content-container">
        <ProductFeed products={displayProducts} />
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
