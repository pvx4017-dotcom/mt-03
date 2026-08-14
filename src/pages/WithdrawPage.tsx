import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  fetchPaymentLimits,
  fetchUserInfo,
  fmtMoney,
  submitWithdrawRequest,
} from "@/lib/customerApi"
import { useBodyClass } from "@/hooks/useBodyClass"
import { OrderTopNavbar } from "@/components/layout/OrderTopNavbar"
import { useApp } from "@/context/AppContext"
import "@/styles/withdraw-style.css"

function maskAccountNumber(value: unknown) {
  const s = String(value ?? "").trim()
  if (!s) return "-"
  if (s.length <= 4) return "****"
  return s.slice(0, -4) + "****"
}

export default function WithdrawPage() {
  useBodyClass("page-withdraw")
  const navigate = useNavigate()
  const { requireLogin, sessionChecked } = useApp()
  const [balance, setBalance] = useState(0)
  const [minWithdraw, setMinWithdraw] = useState(10)
  const [amount, setAmount] = useState("")
  const [password, setPassword] = useState("")
  const [linked, setLinked] = useState(false)
  const [accountName, setAccountName] = useState("-")
  const [accountNumber, setAccountNumber] = useState("ยังไม่ได้ผูกบัญชี")
  const [hasWithdrawPassword, setHasWithdrawPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 2200)
  }

  const load = useCallback(async () => {
    try {
      const [userData, limitsData] = await Promise.all([fetchUserInfo(), fetchPaymentLimits()])
      if (userData.success && userData.user) {
        setBalance(Number(userData.user.wallet_balance ?? 0))
        setHasWithdrawPassword(!!userData.user.has_withdraw_password)
        if (userData.user.is_bank_linked && userData.user.bank_account) {
          setLinked(true)
          setAccountName(String(userData.user.bank_account.account_name ?? "-"))
          setAccountNumber(maskAccountNumber(userData.user.bank_account.account_number))
        } else {
          setLinked(false)
          setAccountName("-")
          setAccountNumber("ยังไม่ได้ผูกบัญชี")
        }
      }
      const min = Number(limitsData.min_withdraw ?? limitsData.limits?.min_withdraw ?? 10)
      if (Number.isFinite(min) && min >= 0) setMinWithdraw(min)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    load()
  }, [load, requireLogin, sessionChecked])

  const submit = async () => {
    if (!hasWithdrawPassword) {
      showToast("คุณยังไม่ได้ตั้งรหัสผ่านถอน", true)
      setTimeout(() => navigate("/withdraw-password"), 900)
      return
    }
    const amt = Number(amount)
    const pin = password.trim()
    await load()
    if (!amt || amt <= 0) {
      showToast("กรุณากรอกจำนวนเงินที่ต้องการถอน", true)
      return
    }
    if (amt < minWithdraw) {
      showToast(`ถอนเงินขั้นต่ำ $${fmtMoney(minWithdraw)}`, true)
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      showToast("กรุณากรอกรหัสผ่านถอน 6 หลัก", true)
      return
    }
    setSubmitting(true)
    try {
      const data = await submitWithdrawRequest(amt, pin)
      if (!data.success) throw new Error(data.message ?? "ถอนเงินไม่สำเร็จ")
      showToast(data.message ?? "ส่งคำขอแล้ว รอแอดมินอนุมัติ")
      setAmount("")
      setPassword("")
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "ถอนเงินไม่สำเร็จ", true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="app">
      <OrderTopNavbar
        title="ถอนเงิน"
        rightAction={
          <Link to="/withdraw-history" className="history-btn" aria-label="ประวัติ">
            <i className="fa-solid fa-clock-rotate-left" />
          </Link>
        }
      />
      <main className="withdraw-content">
        <section className="balance-banner">
          <div className="banner-overlay" />
          <div className="banner-content">
            <p className="balance-label">ยอดคงเหลือในบัญชี</p>
            <h1 className="balance-amount">
              <span className="currency">$</span>
              {fmtMoney(balance)}
            </h1>
          </div>
        </section>
        <section className="withdraw-form-card">
          <div className="input-group">
            <label className="input-label">จำนวนเงินที่ต้องการถอน</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                placeholder="กรุณากรอกจำนวนเงิน"
                className="withdraw-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">บัญชีธนาคาร</label>
            <div className="bank-info-box">
              <div className="bank-row">
                <span className="info-label">หมายเลขบัญชี:</span>
                <span className="info-value">{accountNumber}</span>
              </div>
              <div className="bank-row">
                <span className="info-label">ชื่อเจ้าของบัญชี:</span>
                <span className="info-value">{accountName}</span>
              </div>
              <Link to="/link-account" className={`edit-bank-btn ${linked ? "link-mode" : "bind-mode"}`}>
                {linked ? "แก้ไขข้อมูล" : "ผูกบัญชี"}
              </Link>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">รหัสผ่านการถอนเงิน</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder={
                  hasWithdrawPassword ? "กรุณากรอกรหัสผ่าน 6 หลัก" : "ยังไม่ได้ตั้งรหัสผ่านถอน"
                }
                className="withdraw-input"
                maxLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <button type="button" className="submit-withdraw-btn" disabled={submitting} onClick={submit}>
            {submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอถอนเงิน"}
          </button>
        </section>
        <section className="withdraw-instructions">
          <h3>
            <i className="fa-solid fa-circle-info" /> คำแนะนำการถอนเงิน
          </h3>
          <ul>
            <li>ถอนเงินขั้นต่ำ ${fmtMoney(minWithdraw)}</li>
            <li>เวลาดำเนินการถอนเงินคือ 24/7</li>
            <li>หากพบปัญหา โปรดติดต่อฝ่ายบริการลูกค้าออนไลน์</li>
          </ul>
        </section>
      </main>
      {toast ? (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: toast.error ? "#dc2626" : "#16a34a",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 12,
            zIndex: 9999,
          }}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  )
}
