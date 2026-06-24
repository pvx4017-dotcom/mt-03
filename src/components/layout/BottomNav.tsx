import { Link, useLocation, useNavigate } from "react-router-dom"
import { staticAsset } from "@/lib/assets"
import { useApp } from "@/context/AppContext"

type NavKey = "home" | "categories" | "cart" | "profile"

const navItems: { key: NavKey; to: string; label: string; icon: string; protected?: boolean }[] = [
  { key: "home", to: "/", label: "หน้าหลัก", icon: "menu/home.png" },
  { key: "categories", to: "/categories", label: "หมวดหมู่", icon: "menu/category.png", protected: true },
  { key: "cart", to: "/cart", label: "ตะกร้าสินค้า", icon: "menu/cart.png", protected: true },
  { key: "profile", to: "/profile", label: "ของฉัน", icon: "menu/personal.png", protected: true },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cartCount, requireLogin } = useApp()

  const activeKey = (): NavKey => {
    const path = location.pathname
    if (path.startsWith("/categories")) return "categories"
    if (path.startsWith("/cart")) return "cart"
    if (path.startsWith("/profile")) return "profile"
    return "home"
  }

  const current = activeKey()

  const handleNav = (item: (typeof navItems)[0], e: React.MouseEvent) => {
    if (item.protected) {
      e.preventDefault()
      requireLogin(() => navigate(item.to))
    }
  }

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.key}
          to={item.to}
          className={`nav-item${current === item.key ? " active" : ""}`}
          onClick={(e) => handleNav(item, e)}
        >
          {item.key === "cart" ? (
            <span className="nav-icon-wrap">
              <img src={staticAsset(item.icon)} alt={item.label} />
              {cartCount > 0 && (
                <span className="cart-count-badge">{cartCount}</span>
              )}
            </span>
          ) : (
            <img src={staticAsset(item.icon)} alt={item.label} />
          )}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
