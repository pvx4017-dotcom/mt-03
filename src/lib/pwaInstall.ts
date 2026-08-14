const STORAGE_KEY = "meta_pwa_install_choice"

type PromptWaiter = (event: BeforeInstallPromptEvent) => void

const waiters: PromptWaiter[] = []

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function captureInstallPrompt(event: Event) {
  event.preventDefault()
  const next = event as BeforeInstallPromptEvent
  window.__pwaInstallPrompt = next
  waiters.splice(0).forEach((fn) => fn(next))
}

export function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  void navigator.serviceWorker.register("/sw.js")
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
  if (choice === "dismissed") {
    window.__pwaInstallPrompt = null
  }
}

function waitForNativePrompt(timeoutMs: number) {
  const existing = window.__pwaInstallPrompt
  if (existing) return Promise.resolve(existing)

  return new Promise<BeforeInstallPromptEvent | null>((resolve) => {
    const timer = window.setTimeout(() => {
      const idx = waiters.indexOf(onReady)
      if (idx >= 0) waiters.splice(idx, 1)
      resolve(window.__pwaInstallPrompt ?? null)
    }, timeoutMs)

    const onReady = (event: BeforeInstallPromptEvent) => {
      window.clearTimeout(timer)
      resolve(event)
    }
    waiters.push(onReady)
  })
}

/** Triggers the browser's native install sheet. No manual how-to. */
export async function installPwaNow(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.ready
    } catch {
      /* continue — prompt may still be available */
    }
  }
  const pending = await waitForNativePrompt(10000)
  if (!pending) return "unavailable"
  await pending.prompt()
  const choice = await pending.userChoice
  window.__pwaInstallPrompt = null
  return choice.outcome
}
