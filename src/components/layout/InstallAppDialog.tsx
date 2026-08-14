import { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { installPwaNow, markPwaChoice, shouldOfferPwaInstall } from "@/lib/pwaInstall"
import "@/styles/install-app.css"

export function InstallAppDialog() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const close = useCallback(() => {
    setOpen(false)
    setBusy(false)
    setError("")
  }, [])

  const dismiss = useCallback(() => {
    markPwaChoice("dismissed")
    close()
  }, [close])

  useEffect(() => {
    if (!shouldOfferPwaInstall(location.pathname)) {
      setOpen(false)
      return
    }
    const timer = window.setTimeout(() => setOpen(true), 500)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    const onInstalled = () => {
      markPwaChoice("installed")
      close()
    }
    window.addEventListener("appinstalled", onInstalled)
    return () => window.removeEventListener("appinstalled", onInstalled)
  }, [close])

  const install = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const outcome = await installPwaNow()
      if (outcome === "accepted") {
        markPwaChoice("installed")
        close()
        return
      }
      if (outcome === "dismissed") {
        dismiss()
        return
      }
      setError("ติดตั้งอัตโนมัติได้บน Google Chrome — กรุณาเปิดด้วย Chrome แล้วกดติดตั้งอีกครั้ง")
    } catch {
      setError("ติดตั้งไม่สำเร็จ กรุณากดติดตั้งอีกครั้ง")
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <div className="pwa-install-card">
        <div className="pwa-install-logo">
          <img src={logoAsset()} alt="" />
        </div>
        <h2 id="pwa-install-title">ติดตั้ง {APP_NAME}</h2>
        <p>ติดตั้งลงมือถือทันทีเพื่อเปิดใช้งานเหมือนแอป หรือกดยกเลิกเพื่อใช้ต่อในเบราว์เซอร์</p>
        <p className="pwa-install-tagline">{APP_TAGLINE}</p>
        {error ? <p className="pwa-install-error">{error}</p> : null}
        <div className="pwa-install-actions">
          <button type="button" className="pwa-install-btn pwa-install-btn--ghost" onClick={dismiss} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className="pwa-install-btn pwa-install-btn--primary" onClick={install} disabled={busy}>
            {busy ? "กำลังติดตั้ง..." : "ติดตั้ง"}
          </button>
        </div>
      </div>
    </div>
  )
}
