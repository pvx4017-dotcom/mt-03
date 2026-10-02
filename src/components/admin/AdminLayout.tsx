import { Fragment, useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { adminMainNav, isNavGroup } from "@/admin/navConfig"
import { fetchAdminBadges } from "@/lib/adminApi"
import { useApp } from "@/context/AppContext"
import { isSuperAdmin, getSessionRole } from "@/lib/session"

type Badges = { cart: number; receiving: number; chat: number }

function MenuBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="al-badge">
      {count > 99 ? "99+" : count}
    </span>
  )
}

function ChatDot() {
  return <span className="al-chat-dot" aria-hidden />
}

function NavItem({
  item,
  badges,
  onClick,
}: {
  item: (typeof adminMainNav)[0]
  badges: Badges
  onClick?: () => void
}) {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (isNavGroup(item)) {
    const isChildActive = item.items.some((sub) =>
      location.pathname.startsWith(sub.path),
    )
    const isOpen = open || isChildActive

    return (
      <div className={`al-nav-group${isOpen ? " open" : ""}`}>
        <button
          type="button"
          className={`al-nav-item al-nav-group-btn${isChildActive ? " active" : ""}`}
          onClick={() => setOpen((p) => !p)}
          aria-expanded={isOpen}
        >
          <span className="al-nav-item-inner">
            <i className={`fa-solid ${item.icon} al-nav-icon`} />
            <span className="al-nav-label">{item.label}</span>
          </span>
          <i className="fa-solid fa-chevron-down al-nav-arrow" />
        </button>
        {isOpen && (
          <div className="al-nav-submenu">
            {item.items.map((sub) => {
              const isActive = location.pathname === sub.path
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  className={`al-nav-subitem${isActive ? " active" : ""}`}
                  onClick={onClick}
                >
                  <i className={`fa-solid ${sub.icon}`} />
                  {sub.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActive =
    item.path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(item.path)

  return (
    <Link
      to={item.path}
      className={`al-nav-item${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <span className="al-nav-item-inner">
        <i className={`fa-solid ${item.icon} al-nav-icon`} />
        <span className="al-nav-label">{item.label}</span>
      </span>
      {item.badgeKey === "chat" && badges.chat > 0 ? (
        <ChatDot />
      ) : (
        <MenuBadge count={item.badgeKey ? badges[item.badgeKey] : 0} />
      )}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { logout } = useApp()
  const location = useLocation()
  const [badges, setBadges] = useState<Badges>({ cart: 0, receiving: 0, chat: 0 })
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const role = getSessionRole()
  const roleLabel = role === "super_admin" ? "Super Admin" : "Admin"

  useEffect(() => {
    const load = () => fetchAdminBadges().then(setBadges).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mobileOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [mobileOpen])

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const visibleNav = adminMainNav.filter((item) => {
    if (isNavGroup(item)) return true
    if (item.superAdminOnly) return isSuperAdmin()
    return true
  })

  // Group sections for the sidebar
  const sections: { label: string; items: (typeof visibleNav) }[] = []
  for (const item of visibleNav) {
    const sec = item.section ?? "อื่นๆ"
    const existing = sections.find((s) => s.label === sec)
    if (existing) existing.items.push(item)
    else sections.push({ label: sec, items: [item] })
  }

  const renderSidebar = (isMobile = false) => (
    <>
      {/* Brand */}
      <div className="al-sidebar-brand">
        <div className="al-brand-logo">
          <i className="fa-solid fa-gauge-high" />
        </div>
        <div className="al-brand-text">
          <span className="al-brand-title">Meta Admin</span>
          <span className="al-brand-role">{roleLabel}</span>
        </div>
        {isMobile && (
          <button
            type="button"
            className="al-brand-close"
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="al-sidebar-nav" aria-label="เมนูผู้ดูแล">
        {/* Dashboard link always first */}
        <Link
          to="/admin"
          className={`al-nav-item${location.pathname === "/admin" ? " active" : ""}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="al-nav-item-inner">
            <i className="fa-solid fa-chart-pie al-nav-icon" />
            <span className="al-nav-label">ภาพรวม</span>
          </span>
        </Link>

        {sections.map((sec) => (
          <Fragment key={sec.label}>
            <p className="al-nav-section-label">{sec.label}</p>
            {sec.items.map((item) => (
              <NavItem
                key={isNavGroup(item) ? item.label : item.path}
                item={item}
                badges={badges}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </Fragment>
        ))}
      </nav>

      {/* Logout */}
      <div className="al-sidebar-footer">
        <button type="button" className="al-logout-btn" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="al-root">
      {/* ── Desktop Sidebar ── */}
      <aside className="al-sidebar al-sidebar--desktop" aria-label="ซ้ายบาร์เนวิเกชัน">
        {renderSidebar(false)}
      </aside>

      {/* ── Mobile: overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="al-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile: slide-in drawer (right) ── */}
      <div
        ref={drawerRef}
        className={`al-sidebar al-sidebar--mobile${mobileOpen ? " open" : ""}`}
        aria-label="เมนูมือถือ"
        aria-hidden={!mobileOpen}
      >
        {renderSidebar(true)}
      </div>

      {/* ── Main area ── */}
      <div className="al-main">
        {/* Top header */}
        <header className="al-header">
          <div className="al-header-left">
            {/* Back button (non-dashboard pages) */}
            {location.pathname !== "/admin" && (
              <button
                type="button"
                className="al-header-back-btn"
                onClick={() => navigate(-1)}
                aria-label="กลับ"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
            )}
            <nav className="al-breadcrumb" aria-label="breadcrumb">
              <Link to="/admin" className="al-breadcrumb-home">
                <i className="fa-solid fa-house" />
              </Link>
              {location.pathname !== "/admin" && (
                <>
                  <i className="fa-solid fa-chevron-right al-breadcrumb-sep" />
                  <span className="al-breadcrumb-current">
                    {getBreadcrumbLabel(location.pathname)}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="al-header-right">
            {/* Open frontend shop in new tab */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="al-header-store-link"
              title="เปิดหน้าร้านค้าลูกค้า"
            >
              <i className="fa-solid fa-arrow-up-right-from-square" />
              <span className="al-header-store-text">หน้าร้านค้า</span>
            </a>

            {/* Badge indicators */}
            {badges.cart > 0 && (
              <Link to="/admin/cart" className="al-header-badge-btn" title="ตะกร้าสินค้า">
                <i className="fa-solid fa-cart-shopping" />
                <span className="al-header-badge">{badges.cart}</span>
              </Link>
            )}
            {badges.chat > 0 && (
              <Link to="/admin/chat" className="al-header-badge-btn" title="แชท Support">
                <i className="fa-solid fa-comment-dots" />
                <span className="al-header-badge al-header-badge--red">{badges.chat}</span>
              </Link>
            )}

            {/* Admin status pill */}
            <div className="al-header-admin-pill">
              <span className="al-admin-dot" />
              <span className="al-admin-name">{roleLabel}</span>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="al-hamburger"
              onClick={() => setMobileOpen((p) => !p)}
              aria-label="เปิดเมนู"
              aria-expanded={mobileOpen}
            >
              <span className="al-hamburger-line" />
              <span className="al-hamburger-line" />
              <span className="al-hamburger-line" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="al-content">
          {children}
        </main>
      </div>
    </div>
  )
}

function getBreadcrumbLabel(pathname: string): string {
  const map: Record<string, string> = {
    "/admin/customer-store-products": "สินค้าของลูกค้า",
    "/admin/cart": "ตะกร้าสินค้า",
    "/admin/shipping-orders": "สินค้ารอจัดส่ง",
    "/admin/receiving-orders": "รอรับสินค้า",
    "/admin/slide-images": "รูปสไลด์",
    "/admin/product-categories": "หมวดหมู่สินค้า",
    "/admin/recommended-shops": "ร้านค้าแนะนำ",
    "/admin/general-shops": "ร้านค้าทั่วไป",
    "/admin/user-shops": "ร้านค้าของลูกค้า",
    "/admin/add-product": "เพิ่มสินค้า",
    "/admin/users": "รายชื่อผู้ใช้",
    "/admin/customer-shipping-addresses": "ที่อยู่จัดส่ง",
    "/admin/credit-management": "จัดการเครดิต",
    "/admin/verification": "ยืนยันตัวตน",
    "/admin/bank-accounts": "ข้อมูลธนาคาร",
    "/admin/withdraw-passwords": "รหัสถอน",
    "/admin/customer-topup": "เติมเงินลูกค้า",
    "/admin/customer-deposits": "ลูกค้าฝากเงิน",
    "/admin/customer-withdrawals": "ลูกค้าถอนเงิน",
    "/admin/receiving-accounts": "บัญชีรับเงิน",
    "/admin/payment-limits": "ฝาก-ถอนขั้นต่ำ",
    "/admin/seller-levels": "จัดการระดับ",
    "/admin/loans": "คำขอสินเชื่อ",
    "/admin/coupons": "คูปอง",
    "/admin/feedback": "ข้อเสนอแนะ",
    "/admin/notifications": "การแจ้งเตือน",
    "/admin/chat": "แชท",
    "/admin/settings": "ตั้งค่าระบบ",
  }
  return map[pathname] ?? pathname.split("/").pop() ?? "หน้า"
}
