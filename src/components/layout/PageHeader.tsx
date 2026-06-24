import { Link } from "react-router-dom"

type Props = {
  title: string
  backTo?: string
  rightAction?: React.ReactNode
}

export function PageHeader({ title, backTo = "/", rightAction }: Props) {
  return (
    <header className="page-header">
      <Link to={backTo} className="back-btn">
        <i className="fa-solid fa-angle-left" />
      </Link>
      <h1>{title}</h1>
      {rightAction}
    </header>
  )
}

export function HeaderRedesign({
  title,
  backTo = "/",
  showSearch = true,
}: {
  title: string
  backTo?: string
  showSearch?: boolean
}) {
  return (
    <header className="header-redesign">
      <div className="header-side">
        <Link to={backTo} className="header-icon">
          <i className="fa-solid fa-chevron-left" />
        </Link>
      </div>
      <div className="header-center">
        <h2>{title}</h2>
      </div>
      <div className="header-side">
        {showSearch && (
          <Link to="/search" className="header-icon">
            <i className="fa-solid fa-magnifying-glass" />
          </Link>
        )}
      </div>
    </header>
  )
}
