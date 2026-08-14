import { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import "@/styles/install-app.css"

const STORAGE_KEY = "meta_pwa_install_choice"

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

function isIosDevice() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

type Step = "ask" | "ios" | "manual"

export function InstallAppDialog() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("ask")
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    () => window.__pwaInstallPrompt ?? null,
  )

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "dismissed")
    window.__pwaInstallPrompt = null
    setPromptEvent(null)
    setOpen(false)
    setStep("ask")
  }, [])

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      setOpen(false)
      return
    }
    if (isStandaloneDisplay()) return
    if (localStorage.getItem(STORAGE_KEY) === "dismissed") return
    if (localStorage.getItem(STORAGE_KEY) === "installed") return

    const timer = window.setTimeout(() => setOpen(true), 700)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      const next = event as BeforeInstallPromptEvent
      window.__pwaInstallPrompt = next
      setPromptEvent(next)
    }
    const onInstalled = () => {
      localStorage.setItem(STORAGE_KEY, "installed")
      window.__pwaInstallPrompt = null
      setPromptEvent(null)
      setOpen(false)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = async () => {
    const pending = promptEvent ?? window.__pwaInstallPrompt ?? null
    if (pending) {
      try {
        await pending.prompt()
        const choice = await pending.userChoice
        window.__pwaInstallPrompt = null
        setPromptEvent(null)
        if (choice.outcome === "accepted") {
          localStorage.setItem(STORAGE_KEY, "installed")
          setOpen(false)
        } else {
          dismiss()
        }
      } catch {
        setStep(isIosDevice() ? "ios" : "manual")
      }
      return
    }
    setStep(isIosDevice() ? "ios" : "manual")
  }

  if (!open) return null

  return (
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <div className="pwa-install-card">
        <div className="pwa-install-logo">
          <img src={logoAsset()} alt="" />
        </div>
        {step === "ask" ? (
          <>
            <h2 id="pwa-install-title">ติดตั้ง {APP_NAME}</h2>
            <p>
              เพิ่มไปยังหน้าจอหลักเพื่อเปิดใช้งานเหมือนแอปมือถือ หรือกดยกเลิกเพื่อใช้ต่อในเบราว์เซอร์
            </p>
            <p className="pwa-install-tagline">{APP_TAGLINE}</p>
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss}>
                ยกเลิก
              </button>
              <button type="button" className="pwa-install-btn pwa-install-btn--primary" onClick={install}>
                ติดตั้ง
              </button>
            </div>
          </>
        ) : step === "ios" ? (
          <>
            <h2 id="pwa-install-title">ติดตั้งบน iPhone / iPad</h2>
            <ol className="pwa-install-steps">
              <li>
                แตะปุ่มแชร์ <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden /> ด้านล่าง
              </li>
              <li>เลื่อนหาแล้วเลือก “เพิ่มไปยังหน้าจอโฮม”</li>
              <li>แตะ “เพิ่ม” เพื่อเปิดเป็นแอป</li>
            </ol>
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss}>
                ยกเลิก
              </button>
              <button type="button" className="pwa-install-btn pwa-install-btn--primary" onClick={dismiss}>
                เข้าใจแล้ว
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="pwa-install-title">ติดตั้งเป็นแอป</h2>
            <ol className="pwa-install-steps">
              <li>
                เปิดเมนูเบราว์เซอร์ <i className="fa-solid fa-ellipsis-vertical" aria-hidden />
              </li>
              <li>เลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก”</li>
              <li>ยืนยันเพื่อเปิดเหมือนแอปมือถือ</li>
            </ol>
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss}>
                ยกเลิก
              </button>
              <button type="button" className="pwa-install-btn pwa-install-btn--primary" onClick={dismiss}>
                เข้าใจแล้ว
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
