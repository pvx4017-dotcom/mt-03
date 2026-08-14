const STORAGE_KEY = "meta_pwa_install_choice_v2"

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

export function captureInstallPrompt(event: Event) {
  event.preventDefault()
  window.__pwaInstallPrompt = event as BeforeInstallPromptEvent
  window.dispatchEvent(new Event("meta-pwa-prompt-ready"))
}

export function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  void navigator.serviceWorker.register("/sw.js", { scope: "/" })
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

/** Must run directly from a click — do not await anything before prompt(). */
export function promptNativeInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const pending = getNativeInstallPrompt()
  if (!pending) return Promise.resolve("unavailable")
  return pending
    .prompt()
    .then(() => pending.userChoice)
    .then((choice) => {
      window.__pwaInstallPrompt = null
      return choice.outcome
    })
}
