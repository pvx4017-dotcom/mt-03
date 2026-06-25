import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useApp } from "@/context/AppContext"
import { getSessionUserId, isAdminPanelRole } from "@/lib/session"

type Props = {
  children: ReactNode
}

export function AdminRouteGuard({ children }: Props) {
  const { sessionChecked } = useApp()

  if (!sessionChecked) {
    return (
      <div
        className="admin-order-empty"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        กำลังตรวจสอบสิทธิ์…
      </div>
    )
  }

  if (!getSessionUserId()) {
    return <Navigate to="/login" replace />
  }

  if (!isAdminPanelRole()) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
