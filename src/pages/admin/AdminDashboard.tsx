import { Fragment, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { adminMainNav, isNavGroup } from "@/admin/navConfig"
import { fetchAdminBadges } from "@/lib/adminApi"
import { AdminTopBar } from "@/components/admin/AdminTopBar"
import { useBodyClass } from "@/hooks/useBodyClass"
import { isSuperAdmin } from "@/lib/session"

type Badges = { cart: number; receiving: number; chat: number }

function MenuBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="admin-menu-badge" style={{ display: "inline-flex" }}>
      {count > 99 ? "99+" : count}
    </span>
  )
}

function ChatDot() {
  return <span className="admin-chat-dot" aria-hidden="true" />
}

export default function AdminDashboard() {
  useBodyClass("admin-page")
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [badges, setBadges] = useState<Badges>({ cart: 0, receiving: 0, chat: 0 })

  useEffect(() => {
    const load = () => fetchAdminBadges().then(setBadges).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const badgeCount = (key?: "cart" | "receiving" | "chat") => {
    if (!key) return 0
    return badges[key]
  }

  const visibleNav = adminMainNav.filter((item) => {
    if (isNavGroup(item)) return true
    if (item.superAdminOnly) return isSuperAdmin()
    return true
  })

  return (
    <>
      <AdminTopBar title="Admin Panel" backTo="/" homeIcon />
      <main className="admin-container">
        <p className="admin-dashboard-intro">เมนูจัดการระบบ</p>
        <div className="admin-workflow-card">
          <p className="admin-workflow-title">เส้นทางคำสั่งซื้อ (Admin เป็นผู้ดำเนินการ)</p>
          <ol className="admin-workflow-steps">
            <li>
              <strong>สินค้าของลูกค้า</strong> — เลือกสินค้าจากร้านลูกค้า → เพิ่มลงตะกร้า (ผูก user_id เจ้าของร้าน)
            </li>
            <li>
              <strong>ตะกร้าสินค้า</strong> — ยืนยันคำสั่งซื้อ → หักกระเป๋าลูกค้า (ราคาสินค้า + ค่าคอม) → สถานะ รอจัดส่ง
            </li>
            <li>
              <strong>สินค้ารอจัดส่ง</strong> → <strong>รอรับสินค้า</strong> → <strong>สำเร็จ</strong> (คืนราคาสินค้าเข้ากระเป๋า + บวกค่าคอมเข้ากำไร)
            </li>
          </ol>
          <p className="admin-workflow-note">
            ลูกค้าสั่งเองจากตะกร้าได้เช่นกัน — ถ้ายอดในระบบพอจะชำระได้ทันที ถ้ายอดไม่พอรายการจะเข้าตะกร้าสินค้าให้แอดมินยืนยัน
          </p>
        </div>
        {visibleNav.map((item, index) => {
          const section = item.section
          const prevSection = index > 0 ? visibleNav[index - 1]?.section : undefined
          const heading =
            section && section !== prevSection ? (
              <p className="dash-section-label">{section}</p>
            ) : null

          if (isNavGroup(item)) {
            const groupOpen =
              openGroups[item.label] ??
              (item.label === "จัดการผู้ใช้"
                ? ["/admin/users", "/admin/customer-shipping-addresses", "/admin/credit-management", "/admin/verification"].some((p) =>
                    location.pathname.startsWith(p),
                  )
                : ["/admin/customer-deposits", "/admin/customer-withdrawals", "/admin/payment-limits"].some(
                    (p) => location.pathname.startsWith(p),
                  ))

            return (
              <Fragment key={item.label}>
                {heading}
                <div className={`menu-group${groupOpen ? " active" : ""}`}>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => toggleGroup(item.label)}
                  style={{ border: "none" }}
                >
                  <div className="item-left">
                    <i className={`fa-solid ${item.icon} item-icon`} />
                    <span className="item-label">{item.label}</span>
                  </div>
                  <i className="fa-solid fa-caret-down item-arrow" />
                </button>
                <div className={`submenu${groupOpen ? " open" : ""}`}>
                  {item.items.map((sub) => (
                    <Link key={sub.path} to={sub.path} className="submenu-item">
                      {sub.label}
                    </Link>
                  ))}
                </div>
                </div>
              </Fragment>
            )
          }

          return (
            <Fragment key={item.path}>
              {heading}
              <Link
                to={item.path}
                className="menu-item"
                style={{ position: "relative" }}
              >
              <div className="item-left">
                <i className={`fa-solid ${item.icon} item-icon`} />
                <span className="item-label">{item.label}</span>
              </div>
              {item.badgeKey === "chat" && badges.chat > 0 ? (
                <ChatDot />
              ) : (
                <MenuBadge count={badgeCount(item.badgeKey)} />
              )}
            </Link>
            </Fragment>
          )
        })}
      </main>
    </>
  )
}
