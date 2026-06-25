import { useCallback } from "react"
import { useSessionIdleTimeout } from "@/hooks/useSessionIdleTimeout"
import { useApp } from "@/context/AppContext"

export function SessionIdleGuard() {
  const { logout } = useApp()

  const onIdleLogout = useCallback(() => {
    logout()
  }, [logout])

  useSessionIdleTimeout({ onIdleLogout })
  return null
}
