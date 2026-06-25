import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import {
  fetchWithdrawHistory,
  fmtDateTime,
  fmtMoney,
  setWithdrawPassword,
  submitBankAccount,
  submitVerification,
  updatePassword,
} from "@/lib/customerApi"
import "@/styles/extracted/settings.css"

function SettingsFormPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  useBodyClass("page-settings")

  return (
    <div className="settings-container">
      <nav className="top-navbar">
        <Link to="/settings" className="back-link">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="page-title">{title}</div>
      </nav>
      <div className="settings-group" style={{ padding: "16px" }}>
        {children}
      </div>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontFamily: "Kanit",
  boxSizing: "border-box",
}


export function VerificationPage() {
  const { refreshUser } = useApp()
  const [fullName, setFullName] = useState("")
  const [idCard, setIdCard] = useState("")
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const submit = async () => {
    if (!fullName.trim() || !idCard.trim()) {
      setMsg("กรุณากรอกชื่อ-นามสกุลและเลขบัตรประชาชน")
      return
    }
    if (!front || !back || !selfie) {
      setMsg("กรุณาอัปโหลดเอกสารครบทั้ง 3 รูป")
      return
    }
    setBusy(true)
    setMsg("")
    try {
      const res = await submitVerification({
        full_name: fullName.trim(),
        id_card_number: idCard.trim(),
        id_card_image: front,
        id_card_back: back,
        selfie_image: selfie,
      })
      setMsg(res.message ?? (res.success ? "ส่งคำขอยืนยันตัวตนแล้ว" : "ส่งไม่สำเร็จ"))
      if (res.success) await refreshUser()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsFormPage title="ยืนยันตัวตน (KYC)">
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
        อัปโหลดเอกสารเพื่อยืนยันตัวตนและเพิ่มวงเงินถอน
      </p>
      <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="ชื่อ-นามสกุลตามบัตรประชาชน"
          style={fieldStyle}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="text"
          placeholder="เลขบัตรประชาชน 13 หลัก"
          style={fieldStyle}
          value={idCard}
          onChange={(e) => setIdCard(e.target.value)}
        />
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {(
          [
            ["บัตรประชาชน (ด้านหน้า)", (f: File | null) => setFront(f)] as const,
            ["บัตรประชาชน (ด้านหลัง)", (f: File | null) => setBack(f)] as const,
            ["รูปถ่ายคู่บัตร", (f: File | null) => setSelfie(f)] as const,
          ] as const
        ).map(([label, setter]) => (
          <label
            key={String(label)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
              border: "2px dashed #ddd",
              borderRadius: 12,
              background: "#fff",
              fontSize: 13,
              color: "#666",
              cursor: "pointer",
            }}
          >
            <span>
              <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: 8 }} />
              {label}
            </span>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setter(e.target.files?.[0] ?? null)}
            />
          </label>
        ))}
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#444" }}>{msg}</p>}
      <button type="button" className="settings-submit-btn" disabled={busy} onClick={submit}>
        {busy ? "กำลังส่ง..." : "ส่งคำขอยืนยันตัวตน"}
      </button>
    </SettingsFormPage>
  )
}

export function LinkAccountPage() {
  const { refreshUser } = useApp()
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const submit = async () => {
    if (!bankName || !accountNumber.trim() || !accountName.trim()) {
      setMsg("กรุณากรอกข้อมูลบัญชีให้ครบ")
      return
    }
    setBusy(true)
    setMsg("")
    try {
      const res = await submitBankAccount({
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        phone_number: phone.trim() || undefined,
      })
      setMsg(res.message ?? (res.success ? "บันทึกข้อมูลแล้ว" : "บันทึกไม่สำเร็จ"))
      if (res.success) await refreshUser()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsFormPage title="ตั้งค่าบัญชีรับเงิน">
      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#444" }}>
          ธนาคาร
          <select
            style={{ ...fieldStyle, marginTop: 6 }}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          >
            <option value="">กรุณาเลือกธนาคาร</option>
            <option value="กสิกรไทย">กสิกรไทย</option>
            <option value="ไทยพาณิชย์">ไทยพาณิชย์</option>
            <option value="กรุงเทพ">กรุงเทพ</option>
            <option value="กรุงไทย">กรุงไทย</option>
            <option value="ทหารไทยธนชาต">ทหารไทยธนชาต</option>
          </select>
        </label>
        <label style={{ fontSize: 13, color: "#444" }}>
          เลขที่บัญชี
          <input
            type="text"
            placeholder="กรอกเลขที่บัญชี"
            style={{ ...fieldStyle, marginTop: 6 }}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </label>
        <label style={{ fontSize: 13, color: "#444" }}>
          ชื่อเจ้าของบัญชี
          <input
            type="text"
            placeholder="ชื่อ-นามสกุลตามบัญชี"
            style={{ ...fieldStyle, marginTop: 6 }}
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </label>
        <label style={{ fontSize: 13, color: "#444" }}>
          เบอร์โทร (ถ้ามี)
          <input
            type="text"
            placeholder="เบอร์ติดต่อ"
            style={{ ...fieldStyle, marginTop: 6 }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#444" }}>{msg}</p>}
      <button type="button" className="settings-submit-btn" disabled={busy} onClick={submit}>
        {busy ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
      </button>
    </SettingsFormPage>
  )
}

export function ChangePasswordPage() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const submit = async () => {
    if (!current || !next || !confirm) {
      setMsg("กรุณากรอกข้อมูลให้ครบ")
      return
    }
    if (next !== confirm) {
      setMsg("รหัสผ่านใหม่ไม่ตรงกัน")
      return
    }
    setBusy(true)
    setMsg("")
    try {
      const res = await updatePassword(current, next, confirm)
      setMsg(res.message ?? (res.success ? "เปลี่ยนรหัสผ่านแล้ว" : "เปลี่ยนไม่สำเร็จ"))
      if (res.success) {
        setCurrent("")
        setNext("")
        setConfirm("")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsFormPage title="รหัสผ่านและความปลอดภัย">
      <div style={{ display: "grid", gap: 14 }}>
        <input
          type="password"
          placeholder="รหัสผ่านปัจจุบัน"
          style={fieldStyle}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          type="password"
          placeholder="รหัสผ่านใหม่"
          style={fieldStyle}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <input
          type="password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          style={fieldStyle}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#444" }}>{msg}</p>}
      <button type="button" className="settings-submit-btn" disabled={busy} onClick={submit}>
        {busy ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
      </button>
    </SettingsFormPage>
  )
}

export function WithdrawPasswordPage() {
  const { refreshUser } = useApp()
  const [pwd, setPwd] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const submit = async () => {
    if (!pwd || pwd.length !== 6) {
      setMsg("กรุณาตั้งรหัสผ่าน 6 หลัก")
      return
    }
    if (pwd !== confirm) {
      setMsg("รหัสผ่านไม่ตรงกัน")
      return
    }
    setBusy(true)
    setMsg("")
    try {
      const res = await setWithdrawPassword(pwd, confirm)
      setMsg(res.message ?? (res.success ? "บันทึกรหัสการถอนแล้ว" : "บันทึกไม่สำเร็จ"))
      if (res.success) await refreshUser()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsFormPage title="ตั้งค่ารหัสการถอน">
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        ตั้งรหัสผ่าน 6 หลักสำหรับยืนยันการถอนเงิน
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        <input
          type="password"
          placeholder="รหัสผ่านการถอน 6 หลัก"
          maxLength={6}
          style={fieldStyle}
          value={pwd}
          onChange={(e) => setPwd(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <input
          type="password"
          placeholder="ยืนยันรหัสผ่านการถอน"
          maxLength={6}
          style={fieldStyle}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#444" }}>{msg}</p>}
      <button type="button" className="settings-submit-btn" disabled={busy} onClick={submit}>
        {busy ? "กำลังบันทึก..." : "บันทึกรหัสการถอน"}
      </button>
    </SettingsFormPage>
  )
}

export function WithdrawHistoryPage() {
  useBodyClass("page-withdraw")
  const { requireLogin } = useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requireLogin()) return
    fetchWithdrawHistory()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [requireLogin])

  return (
    <div id="app">
      <nav className="top-navbar">
        <Link to="/withdraw" className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">ประวัติการถอนเงิน</div>
        <span style={{ width: 40 }} />
      </nav>
      <main style={{ padding: 16, minHeight: "60vh" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>กำลังโหลด…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>ยังไม่มีประวัติการถอนเงิน</div>
        ) : (
          rows.map((row, i) => (
            <div
              key={String(row.id ?? i)}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong>${fmtMoney(row.amount)}</strong>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{String(row.status ?? "-")}</span>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDateTime(row.created_at)}</div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
