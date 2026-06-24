import { Link } from "react-router-dom"

type Props = {
  title: string
  backTo?: string
  homeIcon?: boolean
}

export function AdminTopBar({ title, backTo = "/admin", homeIcon }: Props) {
  return (
    <nav className="top-bar">
      <div className="admin-badge">
        <i className="fa-solid fa-user-shield" />
        {title}
        {!homeIcon ? (
          <i className="fa-solid fa-pen-to-square" style={{ fontSize: 12 }} />
        ) : null}
      </div>
      <Link to={backTo} className="logout-btn" title={backTo === "/admin" ? "กลับหน้าหลัก Admin" : "กลับ"}>
        <i className={`fa-solid ${backTo === "/" ? "fa-right-from-bracket" : "fa-circle-left"}`} />
      </Link>
    </nav>
  )
}
