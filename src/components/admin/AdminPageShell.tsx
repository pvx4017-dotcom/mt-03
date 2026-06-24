import { Link } from "react-router-dom"
import { AdminTopBar } from "./AdminTopBar"

type Props = {
  barTitle: string
  pageTitle: string
  icon: string
  children: React.ReactNode
  headerExtra?: React.ReactNode
}

export function AdminPageShell({ barTitle, pageTitle, icon, children, headerExtra }: Props) {
  return (
    <>
      <AdminTopBar title={barTitle} backTo="/admin" />
      <div className="admin-page-container">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            <i className={`fa-solid ${icon}`} aria-hidden />
            {pageTitle}
          </h1>
          <div className="admin-page-header-actions">
            {headerExtra}
            <Link to="/admin" className="back-btn">
              <i className="fa-solid fa-arrow-left" aria-hidden />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
        {children}
      </div>
    </>
  )
}
