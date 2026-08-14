import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  getSessionUserId,
  isSessionExpired,
  markIdleLogout,
  restoreSessionActivity,
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

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      restoreSessionActivity()
      expireSession()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }
    window.addEventListener("focus", onActivity)
    document.addEventListener("visibilitychange", onVisible)

    restoreSessionActivity()
    expireSession()
    const interval = window.setInterval(expireSession, CHECK_INTERVAL_MS)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      window.removeEventListener("focus", onActivity)
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(interval)
    }
  }, [location.pathname, navigate, onIdleLogout])
}
