import { Link } from "react-router-dom"

type Props = {
  title: string
  backTo?: string
  rightAction?: React.ReactNode
}

export function OrderTopNavbar({ title, backTo = "/profile", rightAction }: Props) {
  return (
    <nav className="top-navbar">
      <Link to={backTo} className="back-btn">
        <i className="fa-solid fa-chevron-left" />
      </Link>
      <div className="nav-title">{title}</div>
      {rightAction ?? <span style={{ width: 40 }} />}
    </nav>
  )
}

export function SimpleTopbar({
  title,
  backTo = "/profile",
  rightSlot,
}: {
  title: string
  backTo?: string
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="topbar">
      <Link to={backTo} className="back-btn">
        <i className="fa-solid fa-angle-left" />
      </Link>
      <div className="title">{title}</div>
      {rightSlot ?? <span style={{ width: 34 }} />}
    </div>
  )
}
