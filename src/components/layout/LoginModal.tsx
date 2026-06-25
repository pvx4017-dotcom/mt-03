import { Link } from "react-router-dom"
import { useApp } from "@/context/AppContext"

export function LoginModal() {
  const { loginModalOpen, hideLoginModal } = useApp()

  if (!loginModalOpen) return null

  return (
    <div
      id="loginRequiredOverlay"
      style={{
        display: "flex",
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        backdropFilter: "blur(4px)",
        zIndex: 4200,
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) hideLoginModal()
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 24px",
          width: "min(88vw, 320px)",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,.2)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: "#eff6ff",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <i className="fa-solid fa-lock" style={{ fontSize: 22, color: "#2563eb" }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          กรุณาเข้าสู่ระบบก่อน
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          คุณต้องเข้าสู่ระบบเพื่อใช้งานส่วนนี้
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={hideLoginModal}
            style={{
              flex: 1,
              padding: 10,
              border: "1px solid #d1d5db",
              borderRadius: 10,
              background: "#fff",
              fontSize: 13,
              fontFamily: "Kanit, sans-serif",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            ยกเลิก
          </button>
          <Link
            to="/login"
            onClick={hideLoginModal}
            style={{
              flex: 1,
              padding: 10,
              border: "none",
              borderRadius: 10,
              background: "#2563eb",
              color: "#fff",
              fontSize: 13,
              fontFamily: "Kanit, sans-serif",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}
