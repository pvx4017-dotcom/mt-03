import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  fetchPaymentLimits,
  fetchPayoutWallets,
  fetchUserInfo,
  fmtMoney,
  submitWithdrawRequest,
  type PayoutWallets,
} from "@/lib/customerApi"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import "@/styles/original-extra.css"

type WithdrawMethod = "bank" | "usdt_trc20" | "usdt_erc20" | "eth"

const methods: { id: WithdrawMethod; label: string }[] = [
  { id: "bank", label: "บัญชีธนาคาร" },
  { id: "usdt_trc20", label: "USDT TRC20" },
  { id: "usdt_erc20", label: "USDT ERC20" },
  { id: "eth", label: "ETH" },
]

export default function WithdrawPage() {
  useBodyClass("page-withdraw")
  const navigate = useNavigate()
  const { requireLogin, sessionChecked, user } = useApp()
  const [balance, setBalance] = useState(0)
  const [minWithdraw, setMinWithdraw] = useState(100)
  const [amount, setAmount] = useState("")
  const [password, setPassword] = useState("")
  const [method, setMethod] = useState<WithdrawMethod | "">("")
  const [methodOpen, setMethodOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState("")
  const [linked, setLinked] = useState(false)
  const [hasWithdrawPassword, setHasWithdrawPassword] = useState(false)
  const [wallets, setWallets] = useState<{ usdt_trc20?: string; usdt_erc20?: string; eth?: string }>({})
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
        setLinked(!!userData.user.is_bank_linked && !!userData.user.bank_account)
        const fromProfile = userData.user.bank_account ?? {}
        const fromDb = await fetchPayoutWallets().catch(() => ({}) as PayoutWallets)
        setWallets({
          usdt_trc20: String(fromDb.usdt_trc20 || fromProfile.usdt_trc20 || ""),
          usdt_erc20: String(fromDb.usdt_erc20 || fromProfile.usdt_erc20 || ""),
          eth: String(fromDb.eth || fromProfile.eth || ""),
        })
      }
      const min = Number(limitsData.min_withdraw ?? limitsData.limits?.min_withdraw ?? 100)
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

  const methodReady = (selected: WithdrawMethod | "") => {
    if (selected === "bank") return linked
    if (selected === "usdt_trc20") return Boolean(wallets.usdt_trc20?.trim())
    if (selected === "usdt_erc20") return Boolean(wallets.usdt_erc20?.trim())
    if (selected === "eth") return Boolean(wallets.eth?.trim())
    return false
  }

  const destinationFor = (selected: WithdrawMethod) => {
    if (selected === "bank") return String(user?.bank_account?.account_number ?? "")
    if (selected === "usdt_trc20") return wallets.usdt_trc20 ?? ""
    if (selected === "usdt_erc20") return wallets.usdt_erc20 ?? ""
    return wallets.eth ?? ""
  }

  const submitWithdraw = async (passwordValue: string) => {
    const amt = Number(amount)
    const pinValue = passwordValue.trim()
    await load()
    if (!method) {
      setPinOpen(false)
      showToast("กรุณาเลือกวิธีการรับเงิน", true)
      return
    }
    if (!methodReady(method)) {
      setPinOpen(false)
      showToast("กรุณาผูกข้อมูลบัญชีให้ครบก่อน", true)
      setTimeout(() => navigate("/link-account"), 900)
      return
    }
    if (!amt || amt <= 0) {
      setPinOpen(false)
      showToast("กรุณากรอกจำนวนเงินที่ต้องการถอน", true)
      return
    }
    if (amt < minWithdraw) {
      setPinOpen(false)
      showToast(`ถอนเงินขั้นต่ำ $${fmtMoney(minWithdraw)}`, true)
      return
    }
    if (amt > balance) {
      setPinOpen(false)
      showToast("จำนวนเงินถอนเกินยอดคงเหลือ", true)
      return
    }
    if (!hasWithdrawPassword) {
      setPinOpen(false)
      showToast("คุณยังไม่ได้ตั้งรหัสผ่านถอน", true)
      setTimeout(() => navigate("/withdraw-password"), 900)
      return
    }
    if (!/^\d{5,6}$/.test(pinValue)) {
      showToast("กรุณากรอกรหัสผ่านถอน 5-6 หลัก", true)
      setPin("")
      return
    }
    setSubmitting(true)
    try {
      const data = await submitWithdrawRequest(amt, pinValue, {
        withdraw_method: method,
        payout_destination: destinationFor(method),
      })
      if (!data.success) throw new Error(data.message ?? "ถอนเงินไม่สำเร็จ")
      setPinOpen(false)
      showToast(data.message ?? "ส่งคำขอแล้ว รอแอดมินอนุมัติ")
      setAmount("")
      setPassword("")
      setPin("")
      await load()
      setTimeout(() => navigate("/wallet"), 1200)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "ถอนเงินไม่สำเร็จ", true)
      setPin("")
    } finally {
      setSubmitting(false)
    }
  }

  const confirm = async () => {
    if (!amount || Number(amount) <= 0) {
      showToast("กรุณากรอกจำนวนเงินที่ต้องการถอน", true)
      return
    }
    if (!method) {
      showToast("กรุณาเลือกวิธีการรับเงิน", true)
      return
    }
    if (password.trim()) {
      await submitWithdraw(password)
      return
    }
    setPin("")
    setPinOpen(true)
  }

  const methodLabel = methods.find((row) => row.id === method)?.label
    ?? `จำนวนเงินที่ถอนออกต้องมากกว่า ${minWithdraw}$`

  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <button type="button" className="ox-back" onClick={() => navigate(-1)} aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </button>
      </header>
      <main className="ox-pad ox-form">
        <label>ถอนเงิน</label>
        <input
          type="number"
          placeholder="กรุณาระบุยอดเงินถอน"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <label>รหัสผ่านถอนเงิน</label>
        <input
          type="password"
          placeholder="กรุณากรอกรหัสผ่านการถอนเงิน"
          maxLength={6}
          inputMode="numeric"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
        />
        <label>วิธีการรับเงิน</label>
        <button type="button" className="ox-select" onClick={() => setMethodOpen(true)}>
          <span className={method ? "" : "ox-muted"}>{methodLabel}</span>
          <i className="fa-solid fa-caret-down" />
        </button>
        <p className="ox-note">ยอดคงเหลือปัจจุบัน: {fmtMoney(balance)}</p>
        <button type="button" className="ox-primary-btn" disabled={submitting} onClick={confirm}>
          ยืนยัน
        </button>
      </main>

      {methodOpen ? (
        <div className="ox-sheet-overlay" onClick={() => setMethodOpen(false)}>
          <div className="ox-method-sheet" onClick={(e) => e.stopPropagation()}>
            {methods.map((row) => (
              <button
                key={row.id}
                type="button"
                className="ox-sheet-option"
                onClick={() => {
                  setMethod(row.id)
                  setMethodOpen(false)
                }}
              >
                {row.label}
              </button>
            ))}
            <button type="button" className="ox-sheet-cancel" onClick={() => setMethodOpen(false)}>
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {pinOpen ? (
        <div className="ox-sheet-overlay" onClick={() => !submitting && setPinOpen(false)}>
          <div className="ox-pin-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ox-pay-head">
              <h2>ป้อนรหัสการถอน</h2>
              <button type="button" className="ox-back" onClick={() => setPinOpen(false)} aria-label="ปิด">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="ox-pin-row">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`ox-pin-box${i < pin.length ? " filled" : ""}`} />
              ))}
            </div>
            <p className="ox-note">กรุณากรอกรหัสชำระเงิน</p>
            <div className="ox-keypad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key) =>
                key === "" ? (
                  <span key="spacer" />
                ) : (
                  <button
                    key={key}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      if (key === "back") {
                        setPin((prev) => prev.slice(0, -1))
                        return
                      }
                      const next = pin.length >= 6 ? pin : pin + key
                      setPin(next)
                      if (next.length === 6) submitWithdraw(next)
                    }}
                  >
                    {key === "back" ? <i className="fa-solid fa-delete-left" /> : key}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`ox-toast${toast.error ? " error" : ""}`}>{toast.msg}</div>
      ) : null}
    </div>
  )
}
