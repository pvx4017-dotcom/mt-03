import { useEffect } from "react"
import { Link } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import "@/styles/extracted/settings.css"

export default function SettingsPage() {
  useBodyClass("page-settings")
  const { logout, user, refreshUser, isLoggedIn } = useApp()

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
      <div className="settings-group">
        {[
          { to: "/verification", icon: "fa-id-card", label: "ยืนยันตัวตนระดับสูง (KYC)", regular: true },
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
