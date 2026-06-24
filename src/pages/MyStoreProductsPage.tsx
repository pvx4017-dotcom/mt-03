import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { asset } from "@/lib/assets"
import { BottomNav } from "@/components/layout/BottomNav"
import { useBodyClass } from "@/hooks/useBodyClass"
import {
  deleteMirrorProduct,
  fetchCustomerShopProducts,
  fetchStoreCustomerStatus,
  fmtMoney,
  parseProductRowImage,
  updateMirrorProduct,
  type StoreProductRow,
} from "@/lib/customerApi"
import "@/styles/extracted/collections.css"
import "@/styles/store-mobile.css"

function formatCount(v: unknown) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n.toLocaleString("th-TH") : "0"
}

export default function MyStoreProductsPage() {
  useBodyClass("page-collections page-my-store")
  const [rows, setRows] = useState<StoreProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [storeName, setStoreName] = useState("ยังไม่ได้เปิดร้าน")
  const [storeThumb, setStoreThumb] = useState("")
  const [productCount, setProductCount] = useState(0)
  const [soldCount, setSoldCount] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletProfit, setWalletProfit] = useState(0)
  const [editRow, setEditRow] = useState<StoreProductRow | null>(null)
  const [editForm, setEditForm] = useState({ stock: 0, views: 0, trust: 0, sales: 0 })
  const [toast, setToast] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, storeData] = await Promise.all([
        fetchCustomerShopProducts(),
        fetchStoreCustomerStatus(),
      ])
      setRows(products)
      if (storeData.success && storeData.has_store && storeData.store) {
        const shop = storeData.store
        setStoreName(String(shop.shop_name ?? "ร้านของคุณ"))
        setStoreThumb(parseProductRowImage({ product_image: String(shop.shop_image ?? "") }))
        const mirror = Number(
          storeData.store_products_mirror_count ?? shop.store_products_mirror_count ?? products.length,
        )
        setProductCount(Number.isFinite(mirror) ? mirror : products.length)
        setSoldCount(Number(storeData.sold_count ?? 0))
      } else {
        setStoreName("ยังไม่ได้เปิดร้าน")
        setStoreThumb("")
        setProductCount(products.length)
        setSoldCount(0)
      }
      setWalletBalance(Number(storeData.wallet_balance ?? 0))
      setWalletProfit(Number(storeData.wallet_profit ?? 0))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => String(r.product_name ?? "").toLowerCase().includes(q))
  }, [query, rows])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2000)
  }

  const openEdit = (row: StoreProductRow) => {
    setEditRow(row)
    setEditForm({
      stock: Number(row.product_stock ?? 0),
      views: Number(row.view_count ?? 0),
      trust: Number(row.trust_score ?? 0),
      sales: Number(row.sales_volume ?? 0),
    })
  }

  const saveEdit = async () => {
    if (!editRow?.id) return
    const res = await updateMirrorProduct(Number(editRow.id), {
      product_stock: editForm.stock,
      view_count: editForm.views,
      trust_score: editForm.trust,
      sales_volume: editForm.sales,
    })
    if (res.success) {
      setEditRow(null)
      showToast("บันทึกแล้ว")
      await load()
    } else {
      window.alert(res.message || "บันทึกไม่สำเร็จ")
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("ลบสินค้านี้ออกจากร้าน?")) return
    const res = await deleteMirrorProduct(id)
    if (res.success) {
      showToast("ลบแล้ว")
      await load()
    } else {
      window.alert(res.message || "ลบไม่สำเร็จ")
    }
  }

  return (
    <>
      <header className="topbar">
        <Link to="/open-store" className="back-btn" aria-label="back">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="title">สินค้าในร้านของฉัน</div>
      </header>
      <main className="container">
        <section className="store-summary">
          <div className="store-summary-top">
            <div>
              <div className="store-summary-title">ร้านของฉัน</div>
              <div className="store-summary-head">
                <img
                  className="store-summary-thumb"
                  src={storeThumb || asset("logo/shop logo.webp")}
                  alt="shop"
                />
                <div className="store-summary-name">{storeName}</div>
              </div>
            </div>
            <div className="store-summary-actions">
              <Link to="/open-store" className="store-summary-view-btn" style={{ textDecoration: "none" }}>
                <i className="fa-solid fa-gear" />
                <span>จัดการร้าน</span>
              </Link>
            </div>
          </div>
          <div className="store-summary-stats">
            <div className="store-summary-stat">
              <div className="k">จำนวนสินค้า</div>
              <div className="v">{formatCount(productCount)}</div>
            </div>
            <div className="store-summary-stat">
              <div className="k">จำนวนที่ขาย</div>
              <div className="v">{formatCount(soldCount)}</div>
            </div>
            <div className="store-summary-stat">
              <div className="k">ยอดคงเหลือ</div>
              <div className="v">${fmtMoney(walletBalance)}</div>
            </div>
            <div className="store-summary-stat">
              <div className="k">กำไร</div>
              <div className="v" style={{ color: "#16a34a" }}>
                ${fmtMoney(walletProfit)}
              </div>
            </div>
          </div>
        </section>
        <div className="search-wrap">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            className="search-input"
            type="text"
            placeholder="ค้นหาชื่อสินค้าในร้าน"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <section className="my-store-grid">
          {loading ? (
            <div className="empty my-store-grid-empty">กำลังโหลดข้อมูล...</div>
          ) : filtered.length === 0 ? (
            <div className="empty my-store-grid-empty">
              ยังไม่มีสินค้าในร้าน
              <Link to="/collections" className="my-store-empty-link">
                ไปคอลเลกชันเพื่อเพิ่มสินค้า
              </Link>
            </div>
          ) : (
            filtered.map((row) => {
              const id = Number(row.id ?? 0)
              const productTo = `/product/${id}?shop=${encodeURIComponent(String(row.shop_name ?? ""))}`
              return (
                <article key={id} className="my-store-product-card">
                  <Link to={productTo} className="my-store-product-media">
                    <img
                      src={parseProductRowImage(row)}
                      alt={String(row.product_name ?? "product")}
                      loading="lazy"
                    />
                    {row.product_category ? (
                      <span className="my-store-product-cat">{row.product_category}</span>
                    ) : null}
                  </Link>
                  <div className="my-store-product-body">
                    <Link to={productTo} className="my-store-product-title">
                      {row.product_name || "-"}
                    </Link>
                    <div className="my-store-product-price">${fmtMoney(row.product_price)}</div>
                    <div className="my-store-product-mini-stats">
                      <span>
                        <i className="fa-solid fa-box" aria-hidden />
                        {formatCount(row.product_stock)}
                      </span>
                      <span>
                        <i className="fa-solid fa-eye" aria-hidden />
                        {formatCount(row.view_count)}
                      </span>
                      <span>
                        <i className="fa-solid fa-chart-line" aria-hidden />
                        {formatCount(row.sales_volume)}
                      </span>
                    </div>
                    <div className="my-store-product-actions">
                      <Link to={productTo} className="my-store-act view">
                        ดู
                      </Link>
                      <button type="button" className="my-store-act edit" onClick={() => openEdit(row)}>
                        <i className="fa-solid fa-pen-to-square" aria-hidden />
                      </button>
                      <button type="button" className="my-store-act delete" onClick={() => handleDelete(id)}>
                        <i className="fa-solid fa-trash-can" aria-hidden />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
      <BottomNav />

      {editRow && (
        <div className="store-sheet-overlay" onClick={() => setEditRow(null)}>
          <div className="store-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="store-sheet-handle" />
            <h3 className="store-sheet-title">แก้ไขสินค้า</h3>
            {[
              ["stock", "สต็อก"],
              ["views", "ยอดวิว"],
              ["trust", "คะแนน"],
              ["sales", "ยอดขาย"],
            ].map(([key, label]) => (
              <label key={key} className="store-sheet-field">
                <span>{label}</span>
                <input
                  type="number"
                  value={editForm[key as keyof typeof editForm]}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
            <div className="store-sheet-actions">
              <button type="button" className="btn-cancel" onClick={() => setEditRow(null)}>
                ยกเลิก
              </button>
              <button type="button" className="btn-save" onClick={saveEdit}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="follow-toast toast-success show" style={{ pointerEvents: "none" }}>
          <div className="follow-toast-inner">
            <div className="follow-toast-message">{toast}</div>
          </div>
        </div>
      )}
    </>
  )
}
