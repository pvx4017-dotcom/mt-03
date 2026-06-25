import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { asset } from "@/lib/assets"
import { processAuth } from "@/lib/customerApi"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import { consumeIdleLogoutFlag } from "@/lib/session"
import { normalizeLoginAccount } from "@/lib/authUtils"

export default function LoginPage() {
  useBodyClass("page-login")
  const navigate = useNavigate()
  const { login, refreshUser } = useApp()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [method, setMethod] = useState<"phone" | "email">("email")
  const [showPassword, setShowPassword] = useState(false)
  const [countryCode] = useState("+66")
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [invitationCode, setInvitationCode] = useState("")
  const [notice, setNotice] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const showNotice = (msg: string, type: "success" | "error" = "success") => {
    setNotice({ msg, type })
    setTimeout(() => setNotice(null), 2200)
  }

  useEffect(() => {
    if (!consumeIdleLogoutFlag()) return
    setNotice({
      msg: "ออกจากระบบอัตโนมัติ — ไม่มีการใช้งานเกิน 30 นาที กรุณาเข้าสู่ระบบใหม่",
      type: "error",
    })
    const t = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const accountValue = normalizeLoginAccount(account, method, countryCode)

    if (!accountValue) {
      showNotice(
        method === "email" ? "กรุณากรอกอีเมล" : "กรุณากรอกหมายเลขโทรศัพท์มือถือ",
        "error",
      )
      return
    }

    if (method === "phone" && account.trim().includes("@")) {
      showNotice("บัญชีนี้เป็นอีเมล — กรุณาเลือกแท็บ「อีเมล」", "error")
      return
    }

    const fd = new FormData()
    if (mode === "register") {
      const code = invitationCode.replace(/\D/g, "")
      if (code.length !== 5) {
        showNotice("กรุณากรอกรหัสเชิญ 5 ตัวเลข", "error")
        return
      }
      fd.append("action", "register")
      if (method === "email") fd.append("email", accountValue)
      else fd.append("phone", accountValue)
      fd.append("password", password)
      fd.append("confirm_password", confirmPassword)
      fd.append("invitation_code", code)
    } else {
      fd.append("action", "login")
      fd.append("account", accountValue)
      fd.append("password", password)
    }

    setSubmitting(true)
    try {
      const result = await processAuth(fd)
      showNotice(result.message ?? (result.success ? "สำเร็จ" : "ไม่สำเร็จ"), result.success ? "success" : "error")
      if (result.success) {
        if (result.redirect) {
          await refreshUser()
          setTimeout(() => {
            window.location.href = result.redirect!
          }, 400)
          return
        }
        if (mode === "register") {
          setMode("login")
          setPassword("")
          setConfirmPassword("")
          setInvitationCode("")
          return
        }
        await refreshUser()
        login()
        navigate("/")
      }
    } catch {
      showNotice("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`login-page ${mode === "register" ? "mode-register" : "mode-login"}`}>
      <header className="topbar">
        <div className="title">{mode === "register" ? "ลงทะเบียน" : "เข้าสู่ระบบ"}</div>
      </header>

      <main className="container">
        <div className="logo-wrap">
          <div className="logo-circle">
            <img src={asset("logo/logo meatt.webp")} alt="logo" />
          </div>
        </div>

        <div className="tab-switch">
          <button
            type="button"
            className={`tab-btn${method === "phone" ? " active" : ""}`}
            onClick={() => setMethod("phone")}
          >
            เบอร์โทรศัพท์
          </button>
          <button
            type="button"
            className={`tab-btn${method === "email" ? " active" : ""}`}
            onClick={() => setMethod("email")}
          >
            อีเมล
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{method === "email" ? "อีเมล" : "เบอร์โทรศัพท์"}</label>
            {method === "phone" ? (
              <div className="phone-row">
                <button type="button" className="country-code-btn">
                  <span>{countryCode}</span>
                  <i className="fa-solid fa-chevron-down" />
                </button>
                <input
                  className="input"
                  type="tel"
                  placeholder="กรุณากรอกหมายเลขโทรศัพท์มือถือ"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              </div>
            ) : (
              <input
                className="input"
                type="email"
                placeholder="กรุณากรอกอีเมล"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            )}
          </div>

          <div className="form-group">
            <label>{mode === "register" ? "รหัสผ่าน" : "รหัสผ่านเข้าสู่ระบบ"}</label>
            <div className="input-wrap">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="กรุณากรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <i
                className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"} input-icon`}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          {mode === "register" && (
            <>
              <div className="form-group register-only">
                <label>ยืนยันรหัสผ่าน</label>
                <input
                  className="input"
                  type="password"
                  placeholder="กรุณายืนยันรหัสผ่าน"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="form-group register-only">
                <label>รหัสเชิญ</label>
                <input
                  className="input"
                  type="text"
                  placeholder="กรอกรหัส 5 ตัวเลข"
                  maxLength={5}
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                />
              </div>
            </>
          )}

          {mode === "login" && (
            <div className="helper-link login-only">
              <a href="#">ลืมรหัสผ่าน?</a>
            </div>
          )}

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? "กำลังดำเนินการ..." : mode === "register" ? "ลงทะเบียน" : "เข้าสู่ระบบ"}
          </button>
        </form>

        {mode === "login" ? (
          <div className="bottom-text login-only">
            ยังไม่มีบัญชีผู้ใช้?{" "}
            <button type="button" onClick={() => setMode("register")}>
              ไปลงทะเบียน
            </button>
          </div>
        ) : (
          <div className="bottom-text register-only">
            มีบัญชีอยู่แล้ว?{" "}
            <button type="button" onClick={() => setMode("login")}>
              เข้าสู่ระบบ
            </button>
          </div>
        )}
      </main>

      {notice ? (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: notice.type === "error" ? "#dc2626" : "#16a34a",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 12,
            zIndex: 9999,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {notice.msg}
        </div>
      ) : null}

      <div className="wave-bg">
        <svg className="wave-svg-3" viewBox="0 0 2880 220" preserveAspectRatio="none">
          <path d="M0,80 C240,115 480,45 720,80 C960,115 1200,45 1440,80 C1680,115 1920,45 2160,80 C2400,115 2640,45 2880,80 L2880,220 L0,220 Z" fill="#7aaef5" />
        </svg>
        <svg className="wave-svg" viewBox="0 0 2880 220" preserveAspectRatio="none">
          <path d="M0,72 C160,108 320,36 480,72 C1120,108 1280,36 1440,72 C2080,108 2240,36 2400,72 C2720,108 2880,36 2880,72 L2880,220 L0,220 Z" fill="#5d95ea" />
        </svg>
        <svg className="wave-svg-2" viewBox="0 0 2880 220" preserveAspectRatio="none">
          <path d="M0,85 C140,118 300,52 460,85 C1100,118 1260,52 1440,85 C2060,118 2220,52 2380,85 C2700,118 2880,52 2880,85 L2880,220 L0,220 Z" fill="#a8cbff" />
        </svg>
      </div>
    </div>
  )
}
