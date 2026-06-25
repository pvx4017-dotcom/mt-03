import { Link, useNavigate } from "react-router-dom"
import { useApp } from "@/context/AppContext"

type Props = {
  title: string
  backTo?: string
  homeIcon?: boolean
}

export function AdminTopBar({ title, backTo = "/admin", homeIcon }: Props) {
  const navigate = useNavigate()
  const { logout } = useApp()
  const isLogout = backTo === "/"
  const backLabel = isLogout ? "ออกจากระบบ" : backTo === "/admin" ? "กลับหน้าหลัก Admin" : "กลับ"

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <nav className="top-bar admin-top-bar" aria-label="แถบนำทางผู้ดูแล">
      {isLogout ? (
        <button
          type="button"
          className="logout-btn admin-top-bar-back admin-top-bar-back--logout"
          title={backLabel}
          aria-label={backLabel}
          onClick={handleLogout}
        >
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      ) : (
        <Link
          to={backTo}
          className="logout-btn admin-top-bar-back"
          title={backLabel}
          aria-label={backLabel}
        >
          <i className="fa-solid fa-arrow-left" />
        </Link>
      )}
      <div className="admin-badge admin-top-bar-title">
        <i className={`fa-solid ${homeIcon ? "fa-gauge-high" : "fa-user-shield"}`} aria-hidden />
        <span>{title}</span>
      </div>
    </nav>
  )
}
