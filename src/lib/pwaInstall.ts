const STORAGE_KEY = "meta_pwa_install_choice_v3"

export type NativeInstallOutcome = "accepted" | "dismissed" | "unavailable"
export type InstallSurface = "ios-safari" | "ios-other" | "chromium" | "other"

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function isIosDevice() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

export function isIosSafari() {
  if (!isIosDevice()) return false
  const ua = navigator.userAgent
  const isOther = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(ua)
  return /Safari/i.test(ua) && !isOther
}

export function getInstallSurface(): InstallSurface {
  if (isIosDevice()) return isIosSafari() ? "ios-safari" : "ios-other"
  const ua = navigator.userAgent
  if (/Firefox/i.test(ua)) return "other"
  if (/Chrome|Chromium|Edg|SamsungBrowser|OPR\//i.test(ua)) return "chromium"
  return "other"
}

export function captureInstallPrompt(event: Event) {
  event.preventDefault()
  window.__pwaInstallPrompt = event as BeforeInstallPromptEvent
  window.dispatchEvent(new Event("meta-pwa-prompt-ready"))
}

export function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return

  const start = () => {
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => undefined)
  }

  if (document.readyState === "complete") start()
  else window.addEventListener("load", start, { once: true })
}

export function getNativeInstallPrompt() {
  return window.__pwaInstallPrompt ?? null
}

export function shouldOfferPwaInstall(pathname: string) {
  if (isStandaloneDisplay()) return false
  if (pathname.startsWith("/admin")) return false
  const choice = localStorage.getItem(STORAGE_KEY)
  if (choice === "dismissed" || choice === "installed") return false
  return true
}

export function markPwaChoice(choice: "dismissed" | "installed") {
  localStorage.setItem(STORAGE_KEY, choice)
  if (choice === "dismissed") window.__pwaInstallPrompt = null
}

export function getInstallWaitHint() {
  if (!window.isSecureContext) {
    return "ต้องเปิดผ่าน HTTPS หรือ localhost จึงจะติดตั้งเป็นแอปได้"
  }
  const surface = getInstallSurface()
  if (surface === "chromium") {
    return "Chrome กำลังเตรียมหน้าต่างติดตั้ง — หากค้างนาน ให้ปิดโหมดไม่ระบุตัวตนแล้วเปิดหน้านี้อีกครั้ง"
  }
  return "เบราว์เซอร์นี้ไม่มีหน้าต่างติดตั้งอัตโนมัติ — กดติดตั้งเพื่อดูวิธีเพิ่มลงหน้าจอโฮม"
}

/** Must run directly from a click — do not await anything before prompt(). */
export function promptNativeInstall(): Promise<NativeInstallOutcome> {
  const pending = getNativeInstallPrompt()
  if (!pending?.prompt) return Promise.resolve("unavailable")
  return pending
    .prompt()
    .then(() => pending.userChoice)
    .then((choice) => {
      window.__pwaInstallPrompt = null
      return choice.outcome
    })
}

export async function copyPageUrl() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}
