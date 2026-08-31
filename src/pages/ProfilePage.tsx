import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { fmtMoney, fetchPlatformContactUrl, resetAfterSalesBadge } from "@/lib/customerApi"
import { BottomNav } from "@/components/layout/BottomNav"
import { Footer } from "@/components/layout/Footer"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"

function OrderBadge({ count, afterSales }: { count?: number; afterSales?: boolean }) {
  const n = Math.max(0, Number(count ?? 0))
  if (n <= 0) return null
  return (
    <span
      className={`order-status-badge${afterSales ? " order-status-badge--after-sales" : ""}`}
      aria-hidden="true"
    >
      {n > 99 ? "99+" : n}
    </span>
  )
}

export default function ProfilePage() {
  useBodyClass("page-profile")
  const navigate = useNavigate()
  const { user, isLoggedIn, hasStore, storeInfo, orderHubCounts, refreshUser, refreshOrderHubCounts } = useApp()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [storeToast, setStoreToast] = useState(false)
  const [lineUrl, setLineUrl] = useState("")
  const [lineToast, setLineToast] = useState("")

  useEffect(() => {
    if (!isLoggedIn) return
    void refreshUser()
    void refreshOrderHubCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once when opening profile
  }, [isLoggedIn])

  useEffect(() => {
    void fetchPlatformContactUrl()
      .then((url) => setLineUrl(url))
      .catch(() => setLineUrl(""))
  }, [])

  const balance = Number(user?.wallet_balance ?? 0)
  const credit = user?.credit ?? 0
  const displayId = user?.id ? `รหัส ID: ${user.id}` : "เข้าสู่ระบบ / ลงทะเบียน"
  const contact = user?.phone || user?.email || "-"

  const openCollections = (e: React.MouseEvent) => {
    if (!isLoggedIn) return
    e.preventDefault()
    if (hasStore) navigate("/collections")
    else {
      setStoreToast(true)
      setTimeout(() => setStoreToast(false), 2200)
    }
  }

  const goHelpCenter = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await resetAfterSalesBadge()
    } catch {
      /* ignore */
    }
    navigate("/help-center")
  }

  const orderItems = [
    { to: "/pending-payment", icon: "fa-wallet", label: "รอชำระเงิน", badge: orderHubCounts.pending_payment },
    { to: "/to-ship", icon: "fa-box", label: "รอจัดส่ง", badge: orderHubCounts.to_ship },
    { to: "/to-receive", icon: "fa-truck", label: "รอรับสินค้า", badge: orderHubCounts.to_receive },
    { to: "/reviews", icon: "fa-comment-dots", label: "รอรีวิว", badge: orderHubCounts.pending_review, regular: true },
    { to: "/help-center", icon: "fa-headset", label: "ฝ่ายบริการ", badge: orderHubCounts.after_sales, afterSales: true, onClick: goHelpCenter },
  ]

  return (
    <div id="app" className="app-shell">
      <header className="profile-hero">
        <div className="hero-overlay" />
        <div className="hero-top-bar">
          <div className="top-actions">
            <Link to="/notifications" className="top-action-btn">
              <i className="fa-regular fa-bell" />
            </Link>
            <button type="button" className="top-action-btn" onClick={() => setDrawerOpen(true)}>
              <i className="fa-solid fa-bars" />
            </button>
          </div>
        </div>

        <div className="profile-main-info">
          <div className="profile-pic-wrapper">
            <div className="profile-pic-container">
              <img src={logoAsset()} alt="Profile" className="profile-pic" />
            </div>
            <div className="profile-online-dot" />
          </div>
          <div className="profile-text-info">
            <Link to={isLoggedIn ? "/settings" : "/login"} style={{ textDecoration: "none", color: "inherit" }}>
              <h2 className="profile-name">{displayId}</h2>
              <div className="profile-uid">{isLoggedIn ? `เบอร์/อีเมล: ${contact}` : "กรุณาเข้าสู่ระบบ"}</div>
              <div className="profile-credit">เครดิต: {credit}</div>
            </Link>
          </div>
        </div>

        <div className="profile-stats-row">
          <Link to="/collections" className="stat-item" style={{ textDecoration: "none", color: "inherit" }} onClick={openCollections}>
            <i className="fa-solid fa-star" />
            <span>คอลเลกชันสินค้า</span>
          </Link>
          <div className="stat-divider" />
          <Link to="/following-shops" className="stat-item" style={{ textDecoration: "none", color: "inherit" }}>
            <i className="fa-solid fa-heart" />
            <span>ติดตามร้านค้า</span>
          </Link>
        </div>
      </header>

      <main className="profile-content">
        <section className="profile-card wallet-card">
          <p className="section-label">ยอดคงเหลือในบัญชี</p>
          <h1 className="balance-amount">
            <span className="currency">$</span>
            {fmtMoney(balance)}
          </h1>
          <div className="wallet-actions">
            <Link to="/wallet" className="btn btn-outline">
              <i className="fa-solid fa-arrow-up-from-bracket" />
              ถอนเงิน
            </Link>
            <Link to="/wallet" className="btn btn-solid" style={{ textDecoration: "none" }}>
              <i className="fa-solid fa-plus" />
              เติมเงิน
            </Link>
          </div>
        </section>

        <section className="profile-card orders-card">
          <div className="card-header">
            <h3>คำสั่งซื้อของฉัน</h3>
            <Link to="/orders" className="see-all">
              ทั้งหมด <i className="fa-solid fa-chevron-right" />
            </Link>
          </div>
          <div className="order-status-grid">
            {orderItems.map((item) =>
              item.onClick ? (
                <a
                  key={item.label}
                  href={item.to}
                  className="order-status-item"
                  style={{ textDecoration: "none" }}
                  onClick={item.onClick}
                >
                  <span className="order-status-icon-wrap">
                    <i className={`${item.regular ? "fa-regular" : "fa-solid"} ${item.icon}`} />
                    <OrderBadge count={item.badge} afterSales={item.afterSales} />
                  </span>
                  <span>{item.label}</span>
                </a>
              ) : (
                <Link key={item.to} to={item.to} className="order-status-item" style={{ textDecoration: "none" }}>
                  <span className="order-status-icon-wrap">
                    <i className={`${item.regular ? "fa-regular" : "fa-solid"} ${item.icon}`} />
                    <OrderBadge count={item.badge} afterSales={item.afterSales} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ),
            )}
          </div>
        </section>

        {hasStore && storeInfo?.shop_name ? (
          <Link to="/my-store-products" className="store-banner store-banner--active" style={{ textDecoration: "none" }}>
            <div className="banner-left">
              <div className="store-banner-icon">
                <i className="fa-solid fa-store" />
              </div>
              <div>
                <div className="store-banner-title">{storeInfo.shop_name}</div>
                <div className="store-banner-sub">
                  {storeInfo.product_count ?? 0} สินค้า · ขายแล้ว {storeInfo.sold_count ?? 0} · แตะเพื่อจัดการร้าน
                </div>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right store-banner-arrow" />
          </Link>
        ) : (
          <Link to="/select-shop-type" className="store-banner" style={{ textDecoration: "none" }}>
            <div className="banner-left">
              <div className="store-banner-icon">
                <i className="fa-solid fa-store" />
              </div>
              <div>
                <div className="store-banner-title">ฉันจะเปิดร้าน</div>
                <div className="store-banner-sub">เริ่มต้นธุรกิจของคุณวันนี้</div>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right store-banner-arrow" />
          </Link>
        )}

        <Link to="/loan-application" className="store-banner loan-banner" style={{ textDecoration: "none" }}>
          <div className="banner-left">
            <div className="store-banner-icon">
              <i className="fa-solid fa-file-invoice-dollar" />
            </div>
            <div>
              <div className="store-banner-title">การสมัครสินเชื่อ</div>
              <div className="store-banner-sub">สินเชื่อธุรกิจสำหรับผู้ประกอบการ</div>
            </div>
          </div>
          <i className="fa-solid fa-chevron-right store-banner-arrow" />
        </Link>

        <section className="menu-list-card">
          {lineUrl ? (
            <a
              href={lineUrl}
              className="menu-list-item line-menu-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="item-inner">
                <div className="menu-icon-wrap line-menu-icon">
                  <i className="fa-brands fa-line" />
                </div>
                <span>LINE</span>
              </div>
              <i className="fa-solid fa-chevron-right menu-arrow" />
            </a>
          ) : (
            <button
              type="button"
              className="menu-list-item line-menu-item"
              onClick={() => {
                setLineToast("ยังไม่ได้ตั้งค่าช่องทาง LINE")
                window.setTimeout(() => setLineToast(""), 2200)
              }}
            >
              <div className="item-inner">
                <div className="menu-icon-wrap line-menu-icon">
                  <i className="fa-brands fa-line" />
                </div>
                <span>LINE</span>
              </div>
              <i className="fa-solid fa-chevron-right menu-arrow" />
            </button>
          )}
          {[
            { to: "/help-center", icon: "fa-headset", label: "ฝ่ายบริการลูกค้า" },
            { to: "/help-manual", icon: "fa-circle-question", label: "คู่มือช่วยเหลือ", regular: true },
            { to: "/reviews", icon: "fa-pen-to-square", label: "การรีวิวของฉัน", regular: true },
            { to: "/settings", icon: "fa-gear", label: "การตั้งค่า" },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="menu-list-item">
              <div className="item-inner">
                <div className="menu-icon-wrap">
                  <i className={`${item.regular ? "fa-regular" : "fa-solid"} ${item.icon}`} />
                </div>
                <span>{item.label}</span>
              </div>
              <i className="fa-solid fa-chevron-right menu-arrow" />
            </Link>
          ))}
        </section>
      </main>

      <div className="app-footer-zone">
        <Footer variant="dark" />
      </div>
      <BottomNav />

      <div
        className={`side-menu-overlay${drawerOpen ? " active" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div className={`side-menu-drawer${drawerOpen ? " active" : ""}`}>
        <div className="drawer-content">
          <Link to="/checkin" className="drawer-item checkin-highlight" onClick={() => setDrawerOpen(false)}>
            <div className="checkin-main">
              <div className="drawer-icon-wrap checkin-icon">
                <i className="fa-regular fa-calendar-check" />
              </div>
              <div className="checkin-text">
                <span className="checkin-title">เช็กอินรายวัน</span>
                <span className="checkin-subtitle">รับโบนัสทันที +20 พอยท์</span>
              </div>
            </div>
            <span className="checkin-cta">เช็กอิน</span>
          </Link>
          {[
            { to: "/coupon", icon: "fa-ticket", label: "คูปอง" },
            { to: "/points-center", icon: "fa-coins", label: "คะแนนร้านค้า" },
            { to: "/address", icon: "fa-location-dot", label: "ที่อยู่รับสินค้า" },
            { to: "/feedback", icon: "fa-shield-halved", label: "ข้อเสนอแนะการร้องเรียน" },
            { to: "/about", icon: "fa-user", label: "เกี่ยวกับเรา", regular: true },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="drawer-item"
              onClick={() => setDrawerOpen(false)}
            >
              <div className="drawer-icon-wrap">
                <i className={`${item.regular ? "fa-regular" : "fa-solid"} ${item.icon}`} />
              </div>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {storeToast ? (
        <div className="profile-store-toast">
          ⚠ กรุณาเปิดร้านก่อน
        </div>
      ) : null}
      {lineToast ? <div className="profile-store-toast">{lineToast}</div> : null}
    </div>
  )
}
