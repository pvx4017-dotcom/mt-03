import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { asset } from "@/lib/assets"
import { useBodyClass } from "@/hooks/useBodyClass"
import { SimpleTopbar } from "@/components/layout/OrderTopNavbar"
import { BottomNav } from "@/components/layout/BottomNav"
import { CustomerChatPanel } from "@/components/chat/CustomerChatPanel"
import { useApp } from "@/context/AppContext"
import {
  addProductToMyStore,
  fetchFollowingShops,
  fetchMyReviews,
  fetchPendingReviewOrders,
  fetchOtherStoreProducts,
  fetchProductCategoryNames,
  fetchStoreCustomerStatus,
  fmtMoney,
  parseCustomerImage,
  parseProductRowImage,
  submitCustomerReview,
  submitStoreCustomer,
  unfollowShop,
  type FollowShopRow,
  type StoreProductRow,
} from "@/lib/customerApi"
import { shopPath } from "@/lib/marketplaceApi"

export function CheckinPage() {
  useBodyClass("page-checkin")
  const [done, setDone] = useState(false)

  return (
    <>
      <SimpleTopbar title="เช็กอินรายวัน" />
      <main className="page">
        <section className="hero-card">
          <div className="hero-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="hero-badge"><i className="fa-regular fa-calendar-check" /></div>
              <div className="hero-text">
                <h2>เช็กอินวันนี้ รับโบนัสทันที</h2>
                <p>เช็กอินเพื่อรับ 20 พอยท์ และสะสมต่อเนื่องทุกวัน</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={`checkin-btn${done ? " done" : ""}`}
            onClick={() => setDone(true)}
            disabled={done}
          >
            {done ? "เช็กอินแล้ววันนี้" : "เช็กอินรับ +20 พอยท์"}
          </button>
        </section>
        <section className="section-card">
          <div className="section-title">
            <h3>รางวัลเช็กอิน 7 วัน</h3>
            <span>สะสม {done ? 1 : 0} วัน</span>
          </div>
          <div className="reward-grid">
            {["+20", "+20", "+30", "+30", "+40", "+40", "+80"].map((pts, i) => (
              <div key={i} className={`day-item${done && i === 0 ? " checked" : ""}`}>
                <strong>Day {i + 1}</strong>
                <small>{pts}</small>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

export function CouponPage() {
  useBodyClass("page-coupon")
  const [tab, setTab] = useState<"available" | "used" | "expired">("available")

  return (
    <>
      <SimpleTopbar title="คูปองของฉัน" />
      <main className="page">
        <section className="summary-card">
          <div className="summary-left">
            <h2>คูปองพร้อมใช้งาน</h2>
            <p>ใช้เป็นส่วนลดตอนชำระเงินได้ทันที</p>
          </div>
          <div className="summary-badge"><strong>2</strong><span>ใบ</span></div>
        </section>
        <section className="tabs">
          {([
            ["available", "ใช้งานได้"],
            ["used", "ใช้แล้ว"],
            ["expired", "หมดอายุ"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab${tab === key ? " active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </section>
        <section className="coupon-list">
          {tab === "available" ? (
            <>
              <article className="coupon-card">
                <div className="coupon-main">
                  <div className="coupon-value"><strong>50฿</strong><span>OFF</span></div>
                  <div className="coupon-content">
                    <div className="coupon-title">ส่วนลดสินค้าในร้าน</div>
                    <div className="coupon-desc">ขั้นต่ำ 499 บาท ใช้ได้กับสินค้าที่ร่วมรายการ</div>
                    <div className="coupon-meta">
                      <span><i className="fa-regular fa-clock" /> หมดอายุ 30 เม.ย. 2026</span>
                      <span className="coupon-tag">ใหม่</span>
                    </div>
                  </div>
                </div>
                <div className="coupon-footer">
                  <div className="coupon-code">โค้ด: <strong>MEATT50</strong></div>
                  <button type="button" className="use-btn">ใช้งาน</button>
                </div>
              </article>
              <article className="coupon-card">
                <div className="coupon-main">
                  <div className="coupon-value"><strong>10%</strong><span>OFF</span></div>
                  <div className="coupon-content">
                    <div className="coupon-title">ส่วนลดทั้งร้าน</div>
                    <div className="coupon-desc">สูงสุด 200 บาท</div>
                    <div className="coupon-meta">
                      <span><i className="fa-regular fa-clock" /> หมดอายุ 15 พ.ค. 2026</span>
                    </div>
                  </div>
                </div>
                <div className="coupon-footer">
                  <div className="coupon-code">โค้ด: <strong>SAVE10</strong></div>
                  <button type="button" className="use-btn">ใช้งาน</button>
                </div>
              </article>
            </>
          ) : (
            <div className="empty-state" style={{ display: "block" }}>
              <i className="fa-regular fa-face-smile" />
              <p>ไม่มีคูปองในหมวดนี้</p>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export function ReviewsPage() {
  useBodyClass("page-reviews")
  const { refreshOrderHubCounts, sessionChecked, isLoggedIn } = useApp()
  const [items, setItems] = useState<{ product_image?: string; review_text?: string; star_rating?: number }[]>([])
  const [pending, setPending] = useState<Record<string, unknown>[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)
  const [drafts, setDrafts] = useState<Record<number, { stars: number; text: string }>>({})
  const [submittingId, setSubmittingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!sessionChecked) return
    if (!isLoggedIn) {
      setNeedLogin(true)
      setItems([])
      setPending([])
      setMessage("กรุณาเข้าสู่ระบบ")
      setLoading(false)
      return
    }
    setNeedLogin(false)
    setLoading(true)
    setMessage("")
    try {
      const [data, pendingRows] = await Promise.all([fetchMyReviews(), fetchPendingReviewOrders()])
      if (!data.success) {
        if (String(data.message ?? "").includes("เข้าสู่ระบบ")) {
          setNeedLogin(true)
          setItems([])
          setPending([])
          setMessage(String(data.message))
          return
        }
        setMessage(String(data.message ?? "ไม่สามารถโหลดรีวิวได้"))
        setItems([])
        setPending([])
        return
      }
      setItems(data.items ?? [])
      setPending(pendingRows)
    } catch {
      setMessage("ไม่สามารถโหลดรีวิวได้")
      setItems([])
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [sessionChecked, isLoggedIn])

  useEffect(() => {
    load()
  }, [load])

  const submitReview = async (orderId: number) => {
    const draft = drafts[orderId] ?? { stars: 5, text: "" }
    setSubmittingId(orderId)
    try {
      const res = await submitCustomerReview(orderId, draft.text.trim(), draft.stars)
      if (res.success) {
        await load()
        await refreshOrderHubCounts()
      }
    } finally {
      setSubmittingId(null)
    }
  }

  const renderStars = (rating: unknown, interactive?: boolean, onPick?: (n: number) => void) => {
    const n = Math.max(1, Math.min(5, Number(rating ?? 5)))
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`fa-solid fa-star${i < n ? " active" : ""}`}
        style={{ cursor: interactive ? "pointer" : undefined }}
        onClick={interactive && onPick ? () => onPick(i + 1) : undefined}
      />
    ))
  }

  return (
    <div className="reviews-shell">
      <nav className="top-navbar">
        <Link to="/profile" className="back-btn" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">
          <i className="fa-solid fa-star" style={{ color: "#f59e0b", marginRight: 6 }} />
          การรีวิวของฉัน
        </div>
        <div className="nav-spacer" aria-hidden />
      </nav>
      <main className="page-wrap" id="reviewsWrap">
        {needLogin ? (
          <div className="empty-state">
            <i className="fa-regular fa-user" />
            <p>{message}</p>
            <div className="login-hint-box">
              <Link to="/login">ไปเข้าสู่ระบบ</Link>
            </div>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>กำลังโหลดรีวิว…</p>
          </div>
        ) : (
          <>
            {pending.length > 0 ? (
              <>
                <div className="reviews-section-label">รอรีวิว ({pending.length})</div>
                {pending.map((row) => {
                  const orderId = Number(row.id)
                  const draft = drafts[orderId] ?? { stars: 5, text: "" }
                  return (
                    <div key={orderId} className="rev-card rev-card--pending">
                      <div className="rc-body">
                        <div className="rc-avatar">
                          <img src={parseCustomerImage(row.product_image)} alt="" />
                        </div>
                        <div className="rc-content">
                          <div className="rp-name">{String(row.product_name ?? "สินค้า")}</div>
                          <textarea
                            className="review-textarea"
                            placeholder="เขียนรีวิวของคุณ…"
                            value={draft.text}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [orderId]: { ...draft, text: e.target.value } }))
                            }
                          />
                        </div>
                      </div>
                      <div className="rc-stars">
                        {renderStars(draft.stars, true, (stars) =>
                          setDrafts((prev) => ({ ...prev, [orderId]: { ...draft, stars } })),
                        )}
                      </div>
                      <button
                        type="button"
                        className="submit-btn review-submit-btn"
                        disabled={submittingId === orderId}
                        onClick={() => submitReview(orderId)}
                      >
                        {submittingId === orderId ? "กำลังบันทึก…" : "ส่งรีวิว"}
                      </button>
                    </div>
                  )
                })}
              </>
            ) : null}
            {items.length > 0 ? (
              <>
                {pending.length > 0 ? (
                  <div className="reviews-section-label reviews-section-label--spaced">รีวิวที่โพสต์แล้ว</div>
                ) : (
                  <div className="reviews-section-label">รีวิวที่โพสต์แล้ว</div>
                )}
                {items.map((r, idx) => (
                  <div key={idx} className="rev-card">
                    <div className="rc-head">
                      <div className="rc-shop">
                        <i className="fa-solid fa-store" /> รีวิวของฉัน
                      </div>
                      <span className="rc-label">
                        {(() => {
                          const raw = String((r as { created_at?: string }).created_at ?? "")
                          if (!raw) return "—"
                          const d = new Date(raw)
                          return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("th-TH")
                        })()}
                      </span>
                    </div>
                    <div className="rc-body">
                      <div className="rc-avatar">
                        <img src={parseCustomerImage(r.product_image)} alt="" />
                      </div>
                      <div className="rc-content">
                        <div className={`rp-comment${String(r.review_text ?? "").trim() ? "" : " empty"}`}>
                          {String(r.review_text ?? "").trim() || "ไม่ได้ใส่ข้อความรีวิว"}
                        </div>
                      </div>
                    </div>
                    <div className="rc-stars">{renderStars(r.star_rating)}</div>
                  </div>
                ))}
              </>
            ) : null}
            {!loading && items.length === 0 && pending.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-comment-dots" />
                <p className="empty-state__title">{message || "ยังไม่มีรีวิวสินค้า"}</p>
                {!message ? (
                  <p className="empty-state__hint">
                    เมื่อคำสั่งซื้อเสร็จสมบูรณ์แล้ว คุณสามารถรีวิวสินค้าได้จากหน้านี้
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}

export function HelpCenterPage() {
  useBodyClass("page-help-center")
  return <CustomerChatPanel backTo="/profile" title="เจ้าหน้าที่ดูแลลูกค้า (Admin)" variant="help-center" />
}

export function ChatDetailPage() {
  useBodyClass("page-chat-detail")
  return <CustomerChatPanel backTo="/profile" title="เจ้าหน้าที่ดูแลลูกค้า (Admin)" variant="chat-detail" />
}

export function OpenStorePage() {
  useBodyClass("page-open-store")
  const { refreshStoreStatus } = useApp()
  const [shopName, setShopName] = useState("")
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [shopImage, setShopImage] = useState<File | null>(null)
  const [shopImagePreview, setShopImagePreview] = useState("")
  const [hasStore, setHasStore] = useState(false)
  const [currentStoreName, setCurrentStoreName] = useState("")
  const [storeThumb, setStoreThumb] = useState("")
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState("")
  const [toastError, setToastError] = useState(false)

  const showToast = (msg: string, error = false) => {
    setToast(msg)
    setToastError(error)
    window.setTimeout(() => setToast(""), 1800)
  }

  const loadStatus = useCallback(async () => {
    const [cats, status] = await Promise.all([fetchProductCategoryNames(), fetchStoreCustomerStatus()])
    setCategories(cats)
    if (status.success && status.has_store && status.store) {
      setHasStore(true)
      setCurrentStoreName(String(status.store.shop_name ?? ""))
      setStoreThumb(parseProductRowImage({ product_image: String(status.store.shop_image ?? "") }))
    } else {
      setHasStore(false)
      setCurrentStoreName("")
      setStoreThumb("")
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!shopImage) {
      setShopImagePreview("")
      return
    }
    const url = URL.createObjectURL(shopImage)
    setShopImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [shopImage])

  const fillEdit = () => {
    if (!hasStore) {
      showToast("ไม่พบข้อมูลร้านสำหรับแก้ไข", true)
      return
    }
    setShopName(currentStoreName)
    showToast("ดึงข้อมูลร้านลงฟอร์มแล้ว สามารถแก้ไขได้")
  }

  const submit = async () => {
    if (!shopName.trim()) {
      showToast("กรุณากรอกชื่อร้าน", true)
      return
    }
    if (!category) {
      showToast("กรุณาเลือกหมวดหมู่หลัก", true)
      return
    }
    if (!hasStore && !shopImage) {
      showToast("กรุณาเลือกรูปร้าน", true)
      return
    }
    setBusy(true)
    try {
      const res = await submitStoreCustomer(hasStore ? "update" : "save", {
        shop_name: shopName.trim(),
        main_category: category,
        shop_image: shopImage,
      })
      if (!res.success) {
        showToast(res.message || "บันทึกข้อมูลไม่สำเร็จ", true)
        return
      }
      showToast(res.message || "ลงทะเบียนเปิดร้านเรียบร้อยแล้ว")
      setShopName("")
      setShopImage(null)
      setShopImagePreview("")
      setCategory("")
      await loadStatus()
      await refreshStoreStatus()
    } catch {
      showToast("เกิดข้อผิดพลาดในการส่งข้อมูล", true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="app" className="open-store-container">
      <nav className="top-navbar">
        <Link to="/profile" className="back-link">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="page-title">เปิดร้านค้าใหม่</div>
      </nav>
      <section className="os-hero">
        <h1>เริ่มต้นธุรกิจของคุณวันนี้</h1>
        <div
          className={`hero-store-status${hasStore ? " has-store" : ""}`}
          role="button"
          onClick={fillEdit}
        >
          {hasStore && storeThumb ? (
            <img src={storeThumb} alt="" className="hero-store-thumb" />
          ) : (
            <i className="fa-solid fa-store" />
          )}
          <span>{hasStore ? `ร้านของคุณ: ${currentStoreName}` : "คุณยังไม่ได้เปิดร้าน"}</span>
        </div>
        {hasStore && (
          <Link to="/my-store-products" className="hero-manage-btn show" style={{ textDecoration: "none" }}>
            <i className="fa-solid fa-gear" />
            <span>จัดการร้านค้า</span>
          </Link>
        )}
      </section>
      <div className="form-wrapper">
        <section className="registration-form">
          <div className="form-section-title">
            <i className="fa-solid fa-id-card" />
            ข้อมูลเบื้องต้นของร้านค้า
          </div>
          <div className="input-group">
            <label>ชื่อร้านค้าของคุณ</label>
            <input
              type="text"
              placeholder="ระบุชื่อร้านตามที่คุณต้องการ"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>รูปร้านค้า</label>
            <label className="shop-image-upload">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                onChange={(e) => setShopImage(e.target.files?.[0] ?? null)}
              />
              <div className={`shop-image-upload-box${shopImagePreview ? " has-preview" : ""}`}>
                {shopImagePreview ? (
                  <img src={shopImagePreview} alt="ตัวอย่างรูปร้าน" className="shop-image-preview" />
                ) : (
                  <>
                    <i className="fa-solid fa-camera shop-image-upload-icon" />
                    <span className="shop-image-upload-text">แตะเพื่อเลือกรูปร้าน</span>
                    <span className="shop-image-upload-hint">JPG, PNG, WEBP สูงสุด 5MB</span>
                  </>
                )}
              </div>
            </label>
          </div>
          <div className="input-group">
            <label>หมวดหมู่สินค้าหลัก</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>
                เลือกหมวดหมู่
              </option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <button className="submit-btn" type="button" disabled={busy} onClick={submit}>
            {busy ? "กำลังบันทึก..." : hasStore ? "บันทึกการแก้ไขร้าน" : "ลงทะเบียนเปิดร้านเลย"}
          </button>
        </section>
      </div>
      <div className="benefit-section">
        <div className="benefit-grid">
          {[
            { icon: "fa-rocket", title: "เริ่มขายได้ทันที", desc: "ลงทะเบียนง่าย อนุมัติไว เริ่มต้นได้วันนี้" },
            { icon: "fa-chart-line", title: "สถิติครบถ้วน", desc: "ดูยอดขายและวิเคราะห์กลุ่มลูกค้าได้แบบเรียลไทม์" },
            { icon: "fa-headset", title: "ทีมงานซัพพอร์ต", desc: "ปรึกษาปัญหาการขายได้ตลอด 24 ชั่วโมง" },
            { icon: "fa-shield-halved", title: "ปลอดภัย", desc: "ระบบชำระเงินและข้อมูลได้มาตรฐาน" },
          ].map((b) => (
            <div key={b.title} className="benefit-item">
              <div className="benefit-icon"><i className={`fa-solid ${b.icon}`} /></div>
              <h4>{b.title}</h4>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {toast && (
        <div className={`center-toast${toastError ? " error" : ""}`} style={{ opacity: 1 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

export function HelpManualPage() {
  useBodyClass("page-help-manual")

  return (
    <>
      <nav className="top-navbar">
        <Link to="/profile" className="back-btn" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">
          <i className="fa-regular fa-circle-question" style={{ marginRight: 6 }} />
          คู่มือช่วยเหลือ
        </div>
        <span style={{ width: 40 }} />
      </nav>
      <main className="page-wrap">
        <section className="intro">
          <h1><i className="fa-solid fa-book-open" /> ยินดีต้อนรับสู่คู่มือผู้ใช้</h1>
          <p className="lead">
            เอกสารนี้สรุปแนวทางใช้งานแพลตฟอร์ม Meta Business อย่างปลอดภัยและมีประสิทธิภาพ
          </p>
        </section>
        <section className="section-card">
          <h2><i className="fa-solid fa-mobile-screen-button" /> การใช้งานแพลตฟอร์ม</h2>
          <p>เริ่มจากการเข้าสู่ระบบด้วยบัญชีที่ลงทะเบียนไว้ จากนั้นตรวจสอบข้อมูลโปรไฟล์และเบอร์ติดต่อให้ถูกต้อง</p>
          <ul>
            <li>ตรวจยอดเงินในบัญชีและประวัติการเติม/ถอนผ่านเมนูที่เกี่ยวข้อง</li>
            <li>ใช้ศูนย์ช่วยเหลือหรือแชทกับทีมงานเมื่อมีข้อสงสัยเกี่ยวกับคำสั่งซื้อ</li>
            <li>อย่าแชร์รหัสผ่านหรือลิงก์เข้าสู่ระบบกับบุคคลอื่น</li>
          </ul>
        </section>
        <section className="section-card">
          <h2><i className="fa-solid fa-store" /> การขายของและสร้างธุรกิจ</h2>
          <p>การเปิดร้านบนแพลตฟอร์มเริ่มจากการลงทะเบียนเป็นผู้ขายและกรอกข้อมูลร้านค้าให้ชัดเจน</p>
          <div className="tip-box">
            <strong>เคล็ดลับ:</strong> ธุรกิจที่เติบโตมักเริ่มจากความสม่ำเสมอในการตอบข้อความ จัดส่งตรงเวลา
          </div>
        </section>
        <p className="footer-note">อัปเดตล่าสุดเพื่อการใช้งานทั่วไป</p>
        <div style={{ textAlign: "center" }}>
          <Link className="link-chat" to="/help-center">
            <i className="fa-solid fa-headset" />
            ต้องการคุยกับเจ้าหน้าที่? ไปหน้าฝ่ายสนับสนุนลูกค้า
          </Link>
        </div>
      </main>
    </>
  )
}

export function FollowingShopsPage() {
  useBodyClass("page-following-shops")
  const [rows, setRows] = useState<FollowShopRow[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchFollowingShops())
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
    return rows.filter((r) => String(r.shop_name ?? "").toLowerCase().includes(q))
  }, [query, rows])

  const handleUnfollow = async (shopName: string) => {
    const res = await unfollowShop(shopName)
    if (!res.success) return
    setRows((prev) => prev.filter((r) => String(r.shop_name ?? "").trim() !== shopName))
    setToast(true)
    window.setTimeout(() => setToast(false), 1500)
  }

  return (
    <>
      <header className="topbar">
        <Link to="/profile" className="back-btn" aria-label="back">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="title">ติดตามร้านค้า</div>
      </header>
      <main className="container">
        <section className="summary">
          <div className="summary-title">จำนวนร้านที่ติดตาม</div>
          <div className="summary-total">{rows.length}</div>
          <div className="summary-sub">ร้านค้าที่คุณติดตามล่าสุด</div>
        </section>
        <div className="search-wrap">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            className="search-input"
            type="text"
            placeholder="ค้นหาชื่อร้านที่ติดตาม"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <section className="list">
          {loading ? (
            <div className="empty">กำลังโหลดข้อมูล...</div>
          ) : filtered.length === 0 ? (
            <div className="empty">ยังไม่มีร้านค้าที่ติดตาม</div>
          ) : (
            filtered.map((row) => {
              const name = String(row.shop_name ?? "").trim()
              return (
                <article key={name} className="card">
                  <div className="row-top">
                    <div className="shop">
                      <img
                        className="thumb"
                        src={parseCustomerImage(row.shop_image)}
                        alt={name}
                      />
                      <div className="shop-text">
                        <div className="name">{name || "-"}</div>
                        <button
                          className="badge unfollow-btn"
                          type="button"
                          onClick={() => handleUnfollow(name)}
                        >
                          <i className="fa-solid fa-user-minus" />
                          <span>เลิกติดตาม</span>
                        </button>
                      </div>
                    </div>
                    <Link className="visit" to={shopPath(name)}>
                      เข้าชมร้านค้า
                    </Link>
                  </div>
                  <div className="stats">
                    <div className="stat">ความคิดเห็น: {Number(row.review_count ?? 0).toLocaleString("th-TH")}</div>
                    <div className="stat">ยอดวิว: {Number(row.view_count ?? 0).toLocaleString("th-TH")}</div>
                    <div className="stat">ความน่าเชื่อถือ: {Number(row.trust_score ?? 0).toLocaleString("th-TH")}</div>
                    <div className="stat">ปริมาณซื้อขาย: {Number(row.sales_volume ?? 0).toLocaleString("th-TH")}</div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
      <BottomNav />
      <div className={`follow-toast-overlay${toast ? " show" : ""}`} onClick={() => setToast(false)} />
      <div className={`follow-toast toast-success${toast ? " show" : ""}`}>
        <div className="follow-toast-inner">
          <div className="follow-toast-message">เลิกติดตามแล้ว</div>
        </div>
      </div>
    </>
  )
}

function normalizeCategoryName(value: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\u200B/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .replace(/\s+/g, "")
}

export function CollectionsPage() {
  useBodyClass("page-collections")
  const [rows, setRows] = useState<StoreProductRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [type, setType] = useState("all")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState("สินค้าที่บันทึกไว้")
  const [storeThumb, setStoreThumb] = useState(asset("logo/shop logo.webp"))
  const [productCount, setProductCount] = useState(0)
  const [soldCount, setSoldCount] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletProfit, setWalletProfit] = useState(0)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [toast, setToast] = useState("")
  const [toastError, setToastError] = useState(false)

  const showToast = (msg: string, error = false) => {
    setToast(msg)
    setToastError(error)
    window.setTimeout(() => setToast(""), 2000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, cats, storeData] = await Promise.all([
        fetchOtherStoreProducts(),
        fetchProductCategoryNames(),
        fetchStoreCustomerStatus(),
      ])
      setRows(products)
      const fromProducts = products
        .map((r) => String(r.product_category ?? "").trim())
        .filter(Boolean)
      setCategories([...new Set([...fromProducts, ...cats])])

      if (storeData.success && storeData.has_store && storeData.store) {
        const shop = storeData.store
        setStoreName(String(shop.shop_name ?? "ร้านของคุณ"))
        setStoreThumb(parseProductRowImage({ product_image: String(shop.shop_image ?? "") }))
        const mirror = Number(
          storeData.store_products_mirror_count ?? shop.store_products_mirror_count ?? 0,
        )
        setProductCount(Number.isFinite(mirror) ? mirror : products.length)
      } else {
        setStoreName("สินค้าที่บันทึกไว้")
        setStoreThumb(asset("logo/shop logo.webp"))
        setProductCount(products.length)
      }
      setSoldCount(Number(storeData.sold_count ?? 0))
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
    const activeCategory = normalizeCategoryName(type)
    return rows.filter((row) => {
      const rowCategory = normalizeCategoryName(String(row.product_category ?? ""))
      const typeOk =
        type === "all" ||
        rowCategory === activeCategory ||
        rowCategory.includes(activeCategory) ||
        activeCategory.includes(rowCategory)
      const qOk = !q || String(row.product_name ?? "").toLowerCase().includes(q)
      return typeOk && qOk
    })
  }, [query, rows, type])

  const addToShop = async (row: StoreProductRow) => {
    const productId = Number(row.id ?? 0)
    if (!productId) {
      showToast("รหัสสินค้าไม่ถูกต้อง", true)
      return
    }
    const catalogSource =
      String(row.catalog_source ?? "").trim().toLowerCase() === "mirror" ? "mirror" : "admin"
    const res = await addProductToMyStore(productId, catalogSource)
    if (res.success) {
      showToast("เพิ่มสินค้าเสร็จแล้ว")
      setOpenMenuId(null)
    } else {
      showToast(res.message || "เพิ่มไม่สำเร็จ", true)
    }
  }

  return (
    <>
      <header className="topbar">
        <Link to="/profile" className="back-btn" aria-label="back">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="title">คอลเลกชันสินค้า</div>
      </header>
      <main className="container">
        <section className="store-summary">
          <div className="store-summary-top">
            <div>
              <div className="store-summary-title">คอลเลกชันสินค้า</div>
              <div className="store-summary-head">
                <img className="store-summary-thumb" src={storeThumb} alt="collection" />
                <div className="store-summary-name">{storeName}</div>
              </div>
            </div>
            <div className="store-summary-actions">
              <Link to="/my-store-products" className="store-summary-view-btn" style={{ textDecoration: "none" }}>
                <i className="fa-solid fa-store" />
                <span>ร้านคุณ</span>
              </Link>
            </div>
          </div>
          <div className="store-summary-stats">
            <div className="store-summary-stat">
              <div className="k">จำนวนสินค้า</div>
              <div className="v">{productCount.toLocaleString("th-TH")}</div>
            </div>
            <div className="store-summary-stat">
              <div className="k">จำนวนที่ขาย</div>
              <div className="v">{soldCount.toLocaleString("th-TH")}</div>
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
            placeholder="ค้นหาชื่อสินค้าในคอลเลกชัน"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="tabs">
          <button
            className={`tab-btn${type === "all" ? " active" : ""}`}
            type="button"
            onClick={() => setType("all")}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`tab-btn${type === cat ? " active" : ""}`}
              type="button"
              onClick={() => setType(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <section className="list">
          {loading ? (
            <div className="empty">กำลังโหลดข้อมูล...</div>
          ) : filtered.length === 0 ? (
            <div className="empty">ไม่พบข้อมูลคอลเลกชันสินค้า</div>
          ) : (
            filtered.map((row) => {
              const id = Number(row.id ?? 0)
              return (
                <article key={id} className="card" style={{ position: "relative" }}>
                  <div className="row-top">
                    <div className="shop">
                      <img
                        className="thumb"
                        src={parseProductRowImage(row)}
                        alt={String(row.product_name ?? "product")}
                      />
                      <div className="shop-text">
                        <div className="name">{row.product_name || "-"}</div>
                        <span className="badge">{row.product_category || "-"}</span>
                      </div>
                    </div>
                    <div className="row-actions">
                      <Link
                        className="visit"
                        to={`/product/${id}?shop=${encodeURIComponent(String(row.shop_name ?? ""))}&source=mirror`}
                      >
                        ดูสินค้า
                      </Link>
                    </div>
                  </div>
                  <button
                    className="more-btn"
                    type="button"
                    aria-label="เพิ่มเติม"
                    onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                  >
                    <i className="fa-solid fa-circle-plus" />
                  </button>
                  {openMenuId === id && (
                    <div className="action-menu show">
                      <button className="menu-item" type="button" onClick={() => addToShop(row)}>
                        เพิ่มเข้าร้านของคุณ
                      </button>
                    </div>
                  )}
                  <div className="stats">
                    <div className="stat">ราคา: ${fmtMoney(row.product_price)}</div>
                    <div className="stat">สต็อก: {Number(row.product_stock ?? 0).toLocaleString("th-TH")}</div>
                    <div className="stat">ร้านค้า: {row.shop_name || "-"}</div>
                    <div className="stat">ปริมาณซื้อขาย: {Number(row.sales_volume ?? 0).toLocaleString("th-TH")}</div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
      <BottomNav />
      <div className="follow-toast-overlay" onClick={() => setOpenMenuId(null)} />
      <div className={`follow-toast${toastError ? " toast-error" : " toast-success"}${toast ? " show" : ""}`}>
        <div className="follow-toast-inner">
          <div className="follow-toast-message">{toast}</div>
        </div>
      </div>
    </>
  )
}

export function FeedbackPage() {
  useBodyClass("page-feedback")
  const [subject, setSubject] = useState("")

  return (
    <>
      <SimpleTopbar title="ข้อเสนอแนะการร้องเรียน" />
      <main className="page">
        <section className="hero-card">
          <h2>แจ้งปัญหา หรือเสนอแนะการใช้งาน</h2>
          <p>ทีมงานจะตรวจสอบและตอบกลับโดยเร็วที่สุด เพื่อพัฒนาประสบการณ์การใช้งานให้ดีขึ้น</p>
        </section>
        <section className="form-card">
          <div className="field">
            <label htmlFor="feedbackType">ประเภทเรื่อง</label>
            <select id="feedbackType" className="select" defaultValue="complaint">
              <option value="complaint">ร้องเรียนการใช้งาน</option>
              <option value="payment">ปัญหาการชำระเงิน</option>
              <option value="delivery">ปัญหาการจัดส่ง</option>
              <option value="suggestion">ข้อเสนอแนะ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="feedbackSubject">หัวข้อ</label>
            <input id="feedbackSubject" className="input" type="text" placeholder="ระบุหัวข้อสั้นๆ" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <div className="quick-tags">
              {["แอปช้า", "สั่งซื้อไม่ได้", "การชำระเงินมีปัญหา", "ขอปรับปรุงระบบ"].map((tag) => (
                <button key={tag} type="button" className="quick-tag" onClick={() => setSubject(tag)}>{tag}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="feedbackDetail">รายละเอียด</label>
            <textarea id="feedbackDetail" className="textarea" placeholder="อธิบายปัญหา/ข้อเสนอแนะ" />
          </div>
          <div className="field">
            <label htmlFor="contactInfo">ช่องทางติดต่อกลับ</label>
            <input id="contactInfo" className="input" type="text" placeholder="เบอร์โทร หรืออีเมล" />
          </div>
          <div className="field">
            <label>แนบหลักฐาน (ถ้ามี)</label>
            <div className="upload-box">
              <i className="fa-regular fa-image" />
              อัปโหลดรูปภาพ/สกรีนช็อตได้สูงสุด 3 รูป
              <br />
              <small>รองรับ .jpg .png .webp</small>
            </div>
          </div>
        </section>
      </main>
      <div className="submit-wrap">
        <button className="submit-btn" type="button">
          <i className="fa-regular fa-paper-plane" /> ส่งเรื่องให้ทีมงาน
        </button>
      </div>
    </>
  )
}

export function AboutPage() {
  useBodyClass("page-about")

  return (
    <>
      <SimpleTopbar title="เกี่ยวกับเรา" />
      <main className="page">
        <section className="hero">
          <div className="brand-row">
            <div className="brand-logo">
              <img src={asset("logo/logo meatt.webp")} alt="Meta Business Logo" />
            </div>
            <div>
              <h1>Meta Business</h1>
              <p>แพลตฟอร์มการค้าดิจิทัลที่มุ่งเน้นความโปร่งใส ความปลอดภัย และความน่าเชื่อถือ</p>
            </div>
          </div>
        </section>
        <section className="content-card">
          <h2>แนะนำบริษัท</h2>
          <p>Meta Business คือแพลตฟอร์มอีคอมเมิร์ซที่ออกแบบมาเพื่อเชื่อมต่อผู้ซื้อและผู้ขายเข้าด้วยกันบนโครงสร้างที่ทันสมัย ปลอดภัย และใช้งานง่าย</p>
          <p>เรามุ่งเน้นการออกแบบประสบการณ์ใช้งานที่เรียบง่าย ชัดเจน และเหมาะกับผู้ใช้งานทุกระดับ</p>
          <div className="info-grid">
            <div className="info-item"><strong>ชื่อแพลตฟอร์ม</strong><span>Meta Business Marketplace</span></div>
            <div className="info-item"><strong>จุดยืนหลัก</strong><span>ปลอดภัย โปร่งใส และตรวจสอบได้</span></div>
            <div className="info-item"><strong>การดูแลผู้ใช้งาน</strong><span>รับเรื่องและติดตามผลอย่างต่อเนื่อง</span></div>
            <div className="info-item"><strong>เป้าหมายระยะยาว</strong><span>สนับสนุนการเติบโตของธุรกิจอย่างยั่งยืน</span></div>
          </div>
        </section>
      </main>
    </>
  )
}
