import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  getSessionUserId,
  isSessionExpired,
  markIdleLogout,
  touchSessionActivity,
} from "@/lib/session"

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const
const CHECK_INTERVAL_MS = 60_000

type Options = {
  onIdleLogout: () => void
}

export function useSessionIdleTimeout({ onIdleLogout }: Options) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const uid = getSessionUserId()
    if (!uid) return

    const expireSession = () => {
      if (!getSessionUserId() || !isSessionExpired()) return
      markIdleLogout()
      onIdleLogout()
      navigate("/login", { replace: true, state: { reason: "idle" } })
    }

    const onActivity = () => {
      if (getSessionUserId()) touchSessionActivity()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }

    expireSession()
    const interval = window.setInterval(expireSession, CHECK_INTERVAL_MS)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      window.clearInterval(interval)
    }
  }, [location.pathname, navigate, onIdleLogout])
}
