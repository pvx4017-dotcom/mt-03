const USER_ID_KEY = "meta_user_id"
const USER_ROLE_KEY = "meta_user_role"
const LOGGED_IN_KEY = "meta_logged_in"
const LAST_ACTIVITY_KEY = "meta_session_last_activity"
const IDLE_LOGOUT_FLAG = "meta_idle_logout"

/** ไม่ได้กลับมาใช้งานเกิน 30 วัน → ให้เข้าสู่ระบบใหม่ (จำสถานะจนกว่าจะกดออก) */
export const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000

export function touchSessionActivity(at = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
}

export function getSessionLastActivity(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function isSessionExpired(now = Date.now()): boolean {
  if (!getSessionUserId()) return false
  const last = getSessionLastActivity()
  if (!last) {
    touchSessionActivity(now)
    return false
  }
  return now - last > SESSION_IDLE_MS
}

export function restoreSessionActivity(now = Date.now()) {
  if (!getSessionUserId() || isSessionExpired(now)) return false
  touchSessionActivity(now)
  return true
}

export function markIdleLogout() {
  sessionStorage.setItem(IDLE_LOGOUT_FLAG, "1")
}

export function consumeIdleLogoutFlag(): boolean {
  const flagged = sessionStorage.getItem(IDLE_LOGOUT_FLAG) === "1"
  if (flagged) sessionStorage.removeItem(IDLE_LOGOUT_FLAG)
  return flagged
}

export function getSessionUserId(): number | null {
  const raw = localStorage.getItem(USER_ID_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function getSessionRole(): string | null {
  return localStorage.getItem(USER_ROLE_KEY)
}

export function isAdminPanelRole(role = getSessionRole()): boolean {
  return role === "admin" || role === "super_admin"
}

export function isSuperAdmin(role = getSessionRole()): boolean {
  return role === "super_admin"
}

export function setSession(userId: number, role: string) {
  localStorage.setItem(USER_ID_KEY, String(userId))
  localStorage.setItem(USER_ROLE_KEY, role)
  localStorage.setItem(LOGGED_IN_KEY, "true")
  touchSessionActivity()
}

export function clearSession() {
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_ROLE_KEY)
  localStorage.removeItem(LOGGED_IN_KEY)
  localStorage.removeItem(LAST_ACTIVITY_KEY)
}

export function requireUserId(): number | null {
  return getSessionUserId()
}
