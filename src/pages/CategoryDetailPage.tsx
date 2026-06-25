import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import { PageHeader } from "@/components/layout/PageHeader"
import { fetchProducts, mapApiProduct } from "@/lib/marketplaceApi"
import type { Product } from "@/data/products"
import { ProductCard } from "@/components/product/ProductCard"

export default function CategoryDetailPage() {
  useBodyClass("page-categories")
  const [params] = useSearchParams()
  const catParam = decodeURIComponent(params.get("cat") ?? "สินค้าทั้งหมด")
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    let cancelled = false
    fetchProducts().then((rows) => {
      if (cancelled) return
      const mapped = rows.map(mapApiProduct)
      const filtered =
        !catParam || catParam === "สินค้าทั้งหมด" || catParam === "ดูทั้งหมด"
          ? mapped
          : mapped.filter(
              (p) =>
                p.category === catParam ||
                p.title.includes(catParam) ||
                p.category.includes(catParam),
            )
      setItems(filtered.length ? filtered : mapped)
    })
    return () => {
      cancelled = true
    }
  }, [catParam])

  const displayProducts = items

  return (
    <div id="app" className="app-shell fade-in">
      <PageHeader title={catParam || "หมวดหมู่สินค้า"} backTo="/" />
      <main className="category-detail-main">
        <div className="product-feed home-product-feed">
          {displayProducts.map((p) => (
            <ProductCard key={p.id} product={p} variant="feed" />
          ))}
        </div>
      </main>
    </div>
  )
}
