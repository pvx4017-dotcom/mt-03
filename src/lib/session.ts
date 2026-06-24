const USER_ID_KEY = "meta_user_id"
const USER_ROLE_KEY = "meta_user_role"

export function getSessionUserId(): number | null {
  const raw = localStorage.getItem(USER_ID_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function getSessionRole(): string | null {
  return localStorage.getItem(USER_ROLE_KEY)
}

export function setSession(userId: number, role: string) {
  localStorage.setItem(USER_ID_KEY, String(userId))
  localStorage.setItem(USER_ROLE_KEY, role)
  localStorage.setItem("meta_logged_in", "true")
}

export function clearSession() {
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_ROLE_KEY)
  localStorage.removeItem("meta_logged_in")
}

export function requireUserId(): number | null {
  return getSessionUserId()
}
