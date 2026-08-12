import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  fetchPaymentLimits,
  fetchUserInfo,
  fmtMoney,
  submitDepositRequest,
} from "@/lib/customerApi"
import { useBodyClass } from "@/hooks/useBodyClass"
import { OrderTopNavbar } from "@/components/layout/OrderTopNavbar"
import "@/styles/deposit-style.css"

const quickAmounts = [10, 50, 100, 500, 1000, 5000]

export default function DepositPage() {
  useBodyClass("page-deposit")
  const navigate = useNavigate()
  const [amount, setAmount] = useState("")
  const [activeQuick, setActiveQuick] = useState<number | null>(null)
  const [balance, setBalance] = useState(0)
  const [minDeposit, setMinDeposit] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 2200)
  }

  const load = useCallback(async () => {
    try {
      const [userData, limitsData] = await Promise.all([fetchUserInfo(), fetchPaymentLimits()])
      if (userData.user) setBalance(Number(userData.user.wallet_balance ?? 0))
      const min = Number(limitsData.limits?.min_deposit ?? 10)
      if (Number.isFinite(min) && min >= 0) setMinDeposit(min)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    await load()
    const amt = parseFloat(amount || "0")
    if (!amt || amt < minDeposit) {
      showToast(`กรุณากรอกจำนวนเงินอย่างน้อย $${fmtMoney(minDeposit)}`, true)
      return
    }
    setSubmitting(true)
    try {
      const [data] = await Promise.all([
        submitDepositRequest(amt),
        new Promise((r) => setTimeout(r, 3000)),
      ])
      if (data.success) {
        showToast("ส่งคำขอฝากเงินเรียบร้อยแล้ว")
        const payload = {
          user_id: data.user_id ?? null,
          amount: data.amount ?? amt.toFixed(2),
          request_no: data.request_no ?? null,
        }
        sessionStorage.setItem("pendingDepositRequest", JSON.stringify(payload))
        setTimeout(() => {
          // เก็บรายละเอียดใน sessionStorage อย่างเดียว — ไม่ใส่ query เพื่อลดการส่งแชทซ้ำตอนรีเฟรช
          navigate("/help-center")
        }, 2100)
        setAmount("")
        setActiveQuick(null)
      } else if (data.has_pending) {
        showToast("คุณยังมีรายการที่ยังรอดำเนินอยู่", true)
      } else {
        showToast(data.message ?? "ส่งคำขอไม่สำเร็จ", true)
      }
    } catch {
      showToast("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ", true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="app">
      <OrderTopNavbar
        title="เติมเงิน"
        rightAction={
          <Link to="/deposit-history" className="history-btn" aria-label="ประวัติการฝากเงิน">
            <i className="fa-solid fa-clock-rotate-left" />
          </Link>
        }
      />
      <main className="deposit-content">
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
        <section className="deposit-form-card">
          <div className="input-group">
            <label className="input-label">จำนวนเงินที่ต้องการเติม</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                placeholder="กรุณากรอกจำนวนเงิน"
                className="deposit-input"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setActiveQuick(null)
                }}
              />
            </div>
          </div>
          <div className="quick-select-grid">
            {quickAmounts.map((val) => (
              <button
                key={val}
                type="button"
                className={`quick-btn${activeQuick === val ? " active" : ""}`}
                onClick={() => {
                  setAmount(String(val))
                  setActiveQuick(val)
                }}
              >
                ${val}
              </button>
            ))}
          </div>
          <div className="input-group">
            <label className="input-label">ช่องทางการชำระเงิน</label>
            <div className="payment-method-card active">
              <div className="method-icon">
                <i className="fa-solid fa-building-columns" />
              </div>
              <div className="method-info">
                <div className="method-name">โอนจากธนาคาร</div>
                <div className="method-desc">รองรับทุกธนาคารชั้นนำ</div>
              </div>
              <div className="method-check">
                <i className="fa-solid fa-circle-check" />
              </div>
            </div>
          </div>
          <button type="button" className="submit-deposit-btn" disabled={submitting} onClick={submit}>
            {submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอเติมเงิน"}
          </button>
        </section>
        <section className="deposit-instructions">
          <h3>
            <i className="fa-solid fa-circle-info" /> คำแนะนำการเติมเงิน
          </h3>
          <ul>
            <li>เติมเงินขั้นต่ำ ${fmtMoney(minDeposit)}</li>
            <li>กรุณาใช้บัญชีธนาคารที่มีชื่อตรงกับที่ลงทะเบียนไว้</li>
            <li>หลังจากโอนเงินเสร็จแล้ว ยอดเงินจะเข้าสู่บัญชีภายใน 1-5 นาที</li>
            <li>หากยอดเงินไม่เข้าภายในเวลาที่กำหนด โปรดติดต่อฝ่ายบริการลูกค้า</li>
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
