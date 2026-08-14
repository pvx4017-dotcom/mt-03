import { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import {
  copyPageUrl,
  getInstallSurface,
  getInstallWaitHint,
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
  const [copied, setCopied] = useState(false)
  const [waitHint, setWaitHint] = useState("")
  const [promptReady, setPromptReady] = useState(() => Boolean(getNativeInstallPrompt()))

  const close = useCallback(() => {
    setOpen(false)
    setBusy(false)
    setError("")
    setIosGuide(false)
    setCopied(false)
    setWaitHint("")
  }, [])

  const dismiss = useCallback(() => {
    markPwaChoice("dismissed")
    close()
  }, [close])

  useEffect(() => {
    const onReady = () => {
      setPromptReady(true)
      setWaitHint("")
      setError("")
    }
    window.addEventListener("meta-pwa-prompt-ready", onReady)
    return () => window.removeEventListener("meta-pwa-prompt-ready", onReady)
  }, [])

  useEffect(() => {
    if (!shouldOfferPwaInstall(location.pathname)) {
      setOpen(false)
      return
    }

    const timer = window.setTimeout(() => setOpen(true), isIosDevice() ? 400 : 500)
    const poll = window.setInterval(() => {
      if (getNativeInstallPrompt()) {
        setPromptReady(true)
        setWaitHint("")
      }
    }, 250)
    const hintWait = window.setTimeout(() => {
      if (!getNativeInstallPrompt() && !isIosDevice()) setWaitHint(getInstallWaitHint())
    }, 8000)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(hintWait)
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

  const copyLink = async () => {
    const ok = await copyPageUrl()
    setCopied(ok)
    if (!ok) setError("คัดลอกลิงก์ไม่สำเร็จ — คัดลอกจากแถบที่อยู่แล้วเปิดใน Safari")
  }

  const install = () => {
    if (busy) return
    setError("")

    if (isIosDevice()) {
      setIosGuide(true)
      return
    }

    const pending = getNativeInstallPrompt()
    if (!pending) {
      const surface = getInstallSurface()
      if (surface === "chromium") {
        setError(
          window.isSecureContext
            ? "Chrome ยังไม่พร้อมติดตั้งในแท็บนี้ — ปิดโหมดไม่ระบุตัวตน แล้วรีเฟรชหน้านี้"
            : "ต้องเปิดผ่าน HTTPS จึงจะติดตั้งเป็นแอปได้",
        )
        return
      }
      setIosGuide(false)
      setError("ใช้เมนูติดตั้งของเบราว์เซอร์ (ไอคอนติดตั้งบนแถบที่อยู่ หรือเมนู ⋮ → ติดตั้งแอป)")
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
        setError("ยังติดตั้งไม่สำเร็จ — กดติดตั้งอีกครั้ง")
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
  const installEnabled = ios || canAutoInstall

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
                  แตะ <span className="pwa-install-share"><i className="fa-solid fa-arrow-up-from-bracket" /></span> ที่แถบด้านล่าง
                </li>
                <li>
                  เลื่อนหาแล้วเลือก <strong>เพิ่มไปยังหน้าจอโฮม</strong>
                </li>
                <li>
                  แตะ <strong>เพิ่ม</strong> แล้วเปิดจากไอคอนแอปได้เลย
                </li>
              </ol>
            ) : (
              <>
                <p>
                  บน iOS ต้องติดตั้งผ่าน <strong>Safari</strong> เท่านั้น — Chrome บน iPhone/iPad เพิ่มเป็นแอปบนหน้าจอโฮมไม่ได้
                </p>
                <ol className="pwa-install-ios">
                  <li>คัดลอกลิงก์ด้านล่าง แล้วเปิดด้วย Safari</li>
                  <li>
                    แตะ <span className="pwa-install-share"><i className="fa-solid fa-arrow-up-from-bracket" /></span> → <strong>เพิ่มไปยังหน้าจอโฮม</strong>
                  </li>
                  <li>แตะ <strong>เพิ่ม</strong></li>
                </ol>
                <button type="button" className="pwa-install-copy" onClick={() => void copyLink()}>
                  {copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์เพื่อเปิดใน Safari"}
                </button>
              </>
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
            {waitHint && !canAutoInstall && !ios ? <p className="pwa-install-hint">{waitHint}</p> : null}
            {error ? <p className="pwa-install-error">{error}</p> : null}
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss} disabled={busy}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="pwa-install-btn pwa-install-btn--primary"
                onClick={install}
                disabled={busy || !installEnabled}
              >
                {busy ? "กำลังติดตั้ง..." : !installEnabled ? "กำลังเตรียม..." : "ติดตั้ง"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
