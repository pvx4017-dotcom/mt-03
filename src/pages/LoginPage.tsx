import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { APP_NAME } from "@/lib/brand"
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
      msg: "เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่",
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
      if (password.length < 6) {
        showNotice("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", "error")
        return
      }
      if (password !== confirmPassword) {
        showNotice("รหัสผ่านไม่ตรงกัน", "error")
        return
      }
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
      <header className="topbar login-topbar">
        <Link to="/" className="login-back-btn" aria-label="กลับหน้าหลัก">
          <i className="fa-solid fa-chevron-left" aria-hidden />
        </Link>
        <div className="title">{mode === "register" ? "ลงทะเบียน" : "เข้าสู่ระบบ"}</div>
        <span className="login-topbar__spacer" aria-hidden />
      </header>

      <main className="container">
        <div className="auth-hero">
          <div className="logo-wrap">
            <div className="logo-circle">
              <img src={logoAsset()} alt={APP_NAME} />
            </div>
          </div>
          <h1 className="auth-hero__title">
            {mode === "register" ? "สร้างบัญชีใหม่" : "ยินดีต้อนรับกลับ"}
          </h1>
          <p className="auth-hero__subtitle">
            {mode === "register"
              ? `กรอกข้อมูลเพื่อเริ่มช้อปกับ ${APP_NAME}`
              : "เข้าสู่ระบบเพื่อช้อปและติดตามคำสั่งซื้อ"}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-mode-switch">
            <button
              type="button"
              className={`auth-mode-btn${mode === "login" ? " active" : ""}`}
              onClick={() => setMode("login")}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              className={`auth-mode-btn${mode === "register" ? " active" : ""}`}
              onClick={() => setMode("register")}
            >
              ลงทะเบียน
            </button>
          </div>

          <div className="tab-switch">
            <button
              type="button"
              className={`tab-btn${method === "phone" ? " active" : ""}`}
              onClick={() => setMethod("phone")}
            >
              <i className="fa-solid fa-mobile-screen-button" aria-hidden />
              เบอร์โทรศัพท์
            </button>
            <button
              type="button"
              className={`tab-btn${method === "email" ? " active" : ""}`}
              onClick={() => setMethod("email")}
            >
              <i className="fa-solid fa-envelope" aria-hidden />
              อีเมล
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{method === "email" ? "อีเมล" : "เบอร์โทรศัพท์"}</label>
              {method === "phone" ? (
                <div className="phone-row">
                  <button type="button" className="country-code-btn" aria-label="รหัสประเทศ">
                    <i className="fa-solid fa-earth-asia" aria-hidden />
                    <span>{countryCode}</span>
                    <i className="fa-solid fa-chevron-down" aria-hidden />
                  </button>
                  <div className="input-wrap input-wrap--leading">
                    <i className="fa-solid fa-phone input-leading" aria-hidden />
                    <input
                      className="input input--with-leading"
                      type="tel"
                      placeholder="กรุณากรอกหมายเลขโทรศัพท์มือถือ"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="input-wrap input-wrap--leading">
                  <i className="fa-solid fa-envelope input-leading" aria-hidden />
                  <input
                    className="input input--with-leading"
                    type="email"
                    placeholder="กรุณากรอกอีเมล"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>{mode === "register" ? "รหัสผ่าน" : "รหัสผ่านเข้าสู่ระบบ"}</label>
              <div className="input-wrap input-wrap--leading">
                <i className="fa-solid fa-lock input-leading" aria-hidden />
                <input
                  className="input input--with-leading input--with-trailing"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรุณากรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="input-toggle"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden />
                </button>
              </div>
            </div>

            {mode === "register" && (
              <>
                <div className="form-group register-only">
                  <label>ยืนยันรหัสผ่าน</label>
                  <div className="input-wrap input-wrap--leading">
                    <i className="fa-solid fa-lock input-leading" aria-hidden />
                    <input
                      className="input input--with-leading"
                      type="password"
                      placeholder="กรุณายืนยันรหัสผ่าน"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group register-only">
                  <label>รหัสเชิญ</label>
                  <div className="input-wrap input-wrap--leading">
                    <i className="fa-solid fa-ticket input-leading" aria-hidden />
                    <input
                      className="input input--with-leading"
                      type="text"
                      inputMode="numeric"
                      placeholder="กรอกรหัส 5 ตัวเลข"
                      maxLength={5}
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    />
                  </div>
                  <p className="field-hint">ใช้รหัสเชิญ 5 หลักที่ได้รับจากผู้ใช้หรือผู้ดูแล</p>
                </div>
              </>
            )}

            {mode === "login" && (
              <div className="helper-link login-only">
                <Link
                  to="/help-center"
                  onClick={() => sessionStorage.setItem("pendingForgotPassword", "1")}
                >
                  ลืมรหัสผ่าน?
                </Link>
              </div>
            )}

            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                  กำลังดำเนินการ...
                </>
              ) : mode === "register" ? (
                <>
                  <i className="fa-solid fa-user-plus" aria-hidden />
                  ลงทะเบียน
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" aria-hidden />
                  เข้าสู่ระบบ
                </>
              )}
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
        </div>
      </main>

      {notice ? (
        <div className={`auth-notice auth-notice--${notice.type}`} role="alert">
          <i
            className={`fa-solid ${notice.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`}
            aria-hidden
          />
          <span>{notice.msg}</span>
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
