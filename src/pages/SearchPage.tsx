import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { popularSearches } from "@/data/products"
import type { Product } from "@/data/products"
import { fetchProducts, fetchShops, mapApiProduct, shopPath } from "@/lib/marketplaceApi"
import { ProductFeed } from "@/components/product/ProductCard"
import { SEARCH_PLACEHOLDER } from "@/lib/brand"

export default function SearchPage() {
  useBodyClass("page-sub")
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<"สินค้า" | "ร้านค้า">("สินค้า")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<Product[]>([])
  const [catalog, setCatalog] = useState<Product[]>([])
  const [shops, setShops] = useState<{ shop_name: string }[]>([])

  useEffect(() => {
    Promise.all([fetchProducts(), fetchShops()])
      .then(([products, shopRows]) => {
        setCatalog(products.map(mapApiProduct))
        setShops(shopRows)
      })
      .catch(() => {
        setCatalog([])
        setShops([])
      })
  }, [])

  const handleSearch = () => {
    const kw = query.trim().toLowerCase()
    if (!kw) return

    if (mode === "ร้านค้า") {
      const shop = shops.find((s) => s.shop_name.toLowerCase().includes(kw))
      if (shop) {
        navigate(shopPath(shop.shop_name))
        return
      }
      setResults([])
      setSearched(true)
      return
    }

    const match = catalog.find(
      (p) =>
        p.title.toLowerCase().includes(kw) ||
        p.category.toLowerCase().includes(kw) ||
        p.shopName?.toLowerCase().includes(kw),
    )
    if (match?.category) {
      navigate(`/category-detail?cat=${encodeURIComponent(match.category)}`)
      return
    }

    const filtered = catalog.filter(
      (p) =>
        p.title.toLowerCase().includes(kw) ||
        p.category.toLowerCase().includes(kw) ||
        p.shopName?.toLowerCase().includes(kw),
    )
    setResults(filtered)
    setSearched(true)
  }

  return (
    <div id="app" className="fade-in">
      <header className="search-header">
        <Link to="/" className="back-btn-inline">
          <i className="fa-solid fa-angle-left" style={{ fontSize: 18, color: "#333" }} />
        </Link>
        <div className="search-box-composite">
          <div className="category-wrapper">
            <div
              className="category-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              role="button"
            >
              <span>{mode}</span>
              <i className="fa-solid fa-angle-down" style={{ fontSize: 10 }} />
            </div>
            {dropdownOpen && (
              <div className="category-dropdown show">
                {(["สินค้า", "ร้านค้า"] as const).map((m) => (
                  <div
                    key={m}
                    className={`dropdown-item${mode === m ? " active" : ""}`}
                    onClick={() => {
                      setMode(m)
                      setDropdownOpen(false)
                    }}
                    role="button"
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
          <i className="fa-solid fa-magnifying-glass search-inner-icon" />
          <input
            type="text"
            className="search-inner-input"
            placeholder={SEARCH_PLACEHOLDER}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
        </div>
        <div className="search-submit-btn" onClick={handleSearch} role="button">
          ค้นหา
        </div>
      </header>

      <main className="search-sections">
        <section className="section-group">
          <h3 className="section-label">ค้นหาประวัติ</h3>
          <div className="empty-recent-text" style={{ fontSize: 12, color: "#999", padding: "10px 0" }}>
            ไม่มีประวัติการค้นหา
          </div>
        </section>

        <section className="section-group">
          <h3 className="section-label">ค้นหายอดนิยม</h3>
          <div className="tags-container">
            {popularSearches.map((tag) => (
              <a
                key={tag}
                href="#"
                className="search-tag"
                onClick={(e) => {
                  e.preventDefault()
                  setQuery(tag)
                }}
              >
                {tag}
              </a>
            ))}
          </div>
        </section>

        {searched && (
          <section className="section-group">
            <h3 className="section-label">ผลการค้นหา</h3>
            {results.length === 0 ? (
              <div style={{ fontSize: 12, color: "#666", padding: "8px 0" }}>
                ไม่พบผลลัพธ์สำหรับ &quot;{query}&quot;
              </div>
            ) : (
              <ProductFeed products={results} />
            )}
          </section>
        )}
      </main>
    </div>
  )
}
