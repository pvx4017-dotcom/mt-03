import { Link } from "react-router-dom"

type Props = {
  title: string
  backTo?: string
  homeIcon?: boolean
}

export function AdminTopBar({ title, backTo = "/admin", homeIcon }: Props) {
  const isHome = backTo === "/"
  const backLabel = isHome ? "ออกจากระบบ" : backTo === "/admin" ? "กลับหน้าหลัก Admin" : "กลับ"

  return (
    <nav className="top-bar admin-top-bar" aria-label="แถบนำทางผู้ดูแล">
      <Link
        to={backTo}
        className={`logout-btn admin-top-bar-back${isHome ? " admin-top-bar-back--logout" : ""}`}
        title={backLabel}
        aria-label={backLabel}
      >
        <i className={`fa-solid ${isHome ? "fa-right-from-bracket" : "fa-arrow-left"}`} />
      </Link>
      <div className="admin-badge admin-top-bar-title">
        <i className={`fa-solid ${homeIcon ? "fa-gauge-high" : "fa-user-shield"}`} aria-hidden />
        <span>{title}</span>
      </div>
    </nav>
  )
}
