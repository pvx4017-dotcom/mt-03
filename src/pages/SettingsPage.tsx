import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import "@/styles/extracted/settings.css"

export default function SettingsPage() {
  useBodyClass("page-settings")
  const { logout, user, refreshUser, isLoggedIn } = useApp()
  const [copiedInvite, setCopiedInvite] = useState(false)

  const copyInviteCode = async () => {
    const code = String(user?.referral_code ?? "").trim()
    if (!code) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        const input = document.createElement("input")
        input.value = code
        document.body.appendChild(input)
        input.select()
        document.execCommand("copy")
        input.remove()
      }
      setCopiedInvite(true)
      window.setTimeout(() => setCopiedInvite(false), 1800)
    } catch {
      setCopiedInvite(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) refreshUser()
  }, [isLoggedIn, refreshUser])

  if (!isLoggedIn) {
    return (
      <div className="settings-container">
        <nav className="top-navbar">
          <Link to="/profile" className="back-link">
            <i className="fa-solid fa-chevron-left" />
          </Link>
          <div className="page-title">การตั้งค่า</div>
        </nav>
        <div className="settings-group" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "#65676b", marginBottom: 16 }}>กรุณาเข้าสู่ระบบเพื่อใช้งานการตั้งค่า</p>
          <Link to="/login" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            ไปเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-container">
      <nav className="top-navbar">
        <Link to="/profile" className="back-link">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="page-title">การตั้งค่า</div>
      </nav>
      {user?.referral_code ? (
        <div className="settings-group invite-card">
          <div className="invite-card-row">
            <div className="invite-card-text">
              <div className="invite-card-label">รหัสเชิญของคุณ</div>
              <div className="invite-card-code">{user.referral_code}</div>
              <div className="invite-card-hint">แชร์รหัสนี้ให้เพื่อนเพื่อลงทะเบียน</div>
            </div>
            <button type="button" className="invite-copy-btn" onClick={() => void copyInviteCode()}>
              <i className={`fa-solid ${copiedInvite ? "fa-check" : "fa-copy"}`} aria-hidden />
              {copiedInvite ? "คัดลอกแล้ว" : "คัดลอก"}
            </button>
          </div>
        </div>
      ) : null}
      <div className="settings-group">
        {[
          {
            to: "/verification",
            icon: "fa-id-card",
            label: "ยืนยันตัวตนระดับสูง (KYC)",
            regular: true,
            badge:
              user?.kyc_status === "approved"
                ? "ยืนยันแล้ว"
                : user?.kyc_status === "pending"
                  ? "รอตรวจสอบ"
                  : user?.kyc_status === "rejected"
                    ? "ไม่ผ่าน"
                    : "ยังไม่ได้ยืนยัน",
            linked: user?.kyc_status === "approved",
          },
          {
            to: "/link-account",
            icon: "fa-building-columns",
            label: "ตั้งค่าบัญชีรับเงิน",
            badge: user?.is_bank_linked ? "ผูกแล้ว" : "ยังไม่ได้ผูก",
            linked: user?.is_bank_linked,
          },
          { to: "/change-password", icon: "fa-shield-halved", label: "รหัสผ่านและความปลอดภัย" },
          { to: "/withdraw-password", icon: "fa-key", label: "ตั้งค่ารหัสการถอน" },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="settings-item">
            <div className="item-left">
              <div className="icon-box">
                <i className={`${item.regular ? "fa-regular" : "fa-solid"} ${item.icon}`} />
              </div>
              <span className="item-label">{item.label}</span>
            </div>
            <div className="item-right">
              {item.badge && (
                <span className={`status-badge${item.linked ? " linked" : ""}`}>{item.badge}</span>
              )}
              <i className="fa-solid fa-chevron-right chevron" />
            </div>
          </Link>
        ))}
      </div>
      <div className="logout-wrapper">
        <button type="button" className="logout-btn" onClick={logout}>
          <i className="fa-solid fa-right-from-bracket" /> ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
