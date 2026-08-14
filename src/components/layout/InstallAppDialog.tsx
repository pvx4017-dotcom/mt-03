import { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import {
  getNativeInstallPrompt,
  isIosDevice,
  isIosSafari,
  markPwaChoice,
  promptNativeInstall,
  shouldOfferPwaInstall,
} from "@/lib/pwaInstall"
import "@/styles/install-app.css"

export function InstallAppDialog() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [iosGuide, setIosGuide] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [promptReady, setPromptReady] = useState(() => Boolean(getNativeInstallPrompt()))

  const close = useCallback(() => {
    setOpen(false)
    setBusy(false)
    setError("")
    setIosGuide(false)
  }, [])

  const dismiss = useCallback(() => {
    markPwaChoice("dismissed")
    close()
  }, [close])

  useEffect(() => {
    const onReady = () => setPromptReady(true)
    window.addEventListener("meta-pwa-prompt-ready", onReady)
    return () => window.removeEventListener("meta-pwa-prompt-ready", onReady)
  }, [])

  useEffect(() => {
    if (!shouldOfferPwaInstall(location.pathname)) {
      setOpen(false)
      return
    }

    if (isIosDevice() || getNativeInstallPrompt()) {
      const timer = window.setTimeout(() => setOpen(true), 400)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setOpen(true), 600)
    const readyWait = window.setTimeout(() => setPromptReady(true), 12000)
    const poll = window.setInterval(() => {
      if (getNativeInstallPrompt()) setPromptReady(true)
    }, 300)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(readyWait)
      window.clearInterval(poll)
    }
  }, [location.pathname])

  useEffect(() => {
    const onInstalled = () => {
      markPwaChoice("installed")
      close()
    }
    window.addEventListener("appinstalled", onInstalled)
    return () => window.removeEventListener("appinstalled", onInstalled)
  }, [close])

  const install = () => {
    if (busy) return
    setError("")

    if (isIosDevice()) {
      setIosGuide(true)
      return
    }

    const outcomePromise = promptNativeInstall()
    setBusy(true)
    void outcomePromise
      .then((outcome) => {
        if (outcome === "accepted") {
          markPwaChoice("installed")
          close()
          return
        }
        if (outcome === "dismissed") {
          dismiss()
          return
        }
        setError("กรุณาเปิดด้วย Google Chrome แล้วกดติดตั้งอีกครั้ง")
      })
      .catch(() => {
        setError("ติดตั้งไม่สำเร็จ กรุณากดติดตั้งอีกครั้ง")
      })
      .finally(() => setBusy(false))
  }

  if (!open) return null

  const ios = isIosDevice()
  const safari = isIosSafari()
  const canAutoInstall = Boolean(promptReady || getNativeInstallPrompt())

  return (
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <div className="pwa-install-card">
        <div className="pwa-install-logo">
          <img src={logoAsset()} alt="" />
        </div>

        {iosGuide ? (
          <>
            <h2 id="pwa-install-title">ติดตั้งบน iPhone / iPad</h2>
            {safari ? (
              <ol className="pwa-install-ios">
                <li>
                  แตะ <span className="pwa-install-share"><i className="fa-solid fa-arrow-up-from-bracket" /></span> ด้านล่าง
                </li>
                <li>เลือก <strong>เพิ่มไปยังหน้าจอโฮม</strong></li>
                <li>แตะ <strong>เพิ่ม</strong> — จากนั้นเปิดจากไอคอนแอปได้เลย</li>
              </ol>
            ) : (
              <p>
                บน iOS ต้องเปิดเว็บนี้ด้วย <strong>Safari</strong> แล้วกดติดตั้งอีกครั้ง จึงจะเพิ่มเป็นแอปบนหน้าจอโฮมได้
              </p>
            )}
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss}>
                ยกเลิก
              </button>
              <button type="button" className="pwa-install-btn pwa-install-btn--primary" onClick={dismiss}>
                ตกลง
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="pwa-install-title">ติดตั้ง {APP_NAME}</h2>
            <p>
              {ios
                ? "ติดตั้งลงหน้าจอโฮมเพื่อเปิดเหมือนแอปมือถือ หรือกดยกเลิกเพื่อใช้ในเบราว์เซอร์ต่อ"
                : "กดติดตั้งเพื่อเพิ่มเป็นแอปบนมือถือทันที หรือกดยกเลิกเพื่อใช้ในเบราว์เซอร์ต่อ"}
            </p>
            <p className="pwa-install-tagline">{APP_TAGLINE}</p>
            {error ? <p className="pwa-install-error">{error}</p> : null}
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss} disabled={busy}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="pwa-install-btn pwa-install-btn--primary"
                onClick={install}
                disabled={busy || (!ios && !canAutoInstall)}
              >
                {busy ? "กำลังติดตั้ง..." : !ios && !canAutoInstall ? "กำลังเตรียม..." : "ติดตั้ง"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
