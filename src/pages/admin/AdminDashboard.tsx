import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { adminMainNav, isNavGroup } from "@/admin/navConfig"
import { fetchAdminBadges } from "@/lib/adminApi"
import { AdminTopBar } from "@/components/admin/AdminTopBar"
import { useBodyClass } from "@/hooks/useBodyClass"

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

  return (
    <>
      <AdminTopBar title="Admin Panel" backTo="/" homeIcon />
      <main className="admin-container">
        <p className="admin-dashboard-intro">เมนูจัดการระบบ</p>
        {adminMainNav.map((item) => {
          if (isNavGroup(item)) {
            const groupOpen =
              openGroups[item.label] ??
              (item.label === "จัดการผู้ใช้"
                ? ["/admin/users", "/admin/credit-management", "/admin/verification"].some((p) =>
                    location.pathname.startsWith(p),
                  )
                : ["/admin/customer-deposits", "/admin/customer-withdrawals", "/admin/payment-limits"].some(
                    (p) => location.pathname.startsWith(p),
                  ))

            return (
              <div key={item.label} className={`menu-group${groupOpen ? " active" : ""}`}>
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
            )
          }

          return (
            <Link
              key={item.path}
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
          )
        })}
      </main>
    </>
  )
}
