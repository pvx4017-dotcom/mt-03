import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  fetchPaymentLimits,
  fetchReceivingAccounts,
  fmtMoney,
  submitDepositRequest,
} from "@/lib/customerApi"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import { asset } from "@/lib/assets"
import "@/styles/original-extra.css"

type DepositChannel = "usdt" | "eth" | "btc" | "bank_card"
type PayMethod = "bank_account" | "bank_transfer"

const channels: { id: DepositChannel; label: string; icon: string }[] = [
  { id: "usdt", label: "USDT", icon: "fa-coins" },
  { id: "eth", label: "ETH", icon: "fa-gem" },
  { id: "btc", label: "BTC", icon: "fa-bitcoin-sign" },
  { id: "bank_card", label: "Bank card", icon: "fa-building-columns" },
]

export default function DepositPage() {
  useBodyClass("page-deposit")
  const navigate = useNavigate()
  const { requireLogin, sessionChecked } = useApp()
  const [minDeposit, setMinDeposit] = useState(100)
  const [channel, setChannel] = useState<DepositChannel | "">("")
  const [amount, setAmount] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [recvOpen, setRecvOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod>("bank_transfer")
  const [bankAccountNo, setBankAccountNo] = useState("")
  const [payerName, setPayerName] = useState("")
  const [orderNo, setOrderNo] = useState("-")
  const [accounts, setAccounts] = useState<Record<string, unknown>[]>([])
  const [recv, setRecv] = useState<Record<string, unknown> | null>(null)
  const [qrViewer, setQrViewer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 2200)
  }

  const load = useCallback(async () => {
    try {
      const [limitsData, recvRows] = await Promise.all([fetchPaymentLimits(), fetchReceivingAccounts()])
      const min = Number(limitsData.min_deposit ?? limitsData.limits?.min_deposit ?? 100)
      if (Number.isFinite(min) && min >= 0) setMinDeposit(min)
      setAccounts(recvRows)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    load()
  }, [load, requireLogin, sessionChecked])

  const closeAll = () => {
    setSheetOpen(false)
    setPayOpen(false)
    setInfoOpen(false)
    setRecvOpen(false)
    setQrViewer(null)
  }

  const selectedMethod = () => {
    if (channel === "usdt" || channel === "eth" || channel === "btc") return channel
    return payMethod
  }

  const goHelpCenter = (payload: { user_id?: number | null; amount?: string; request_no?: string | null }) => {
    sessionStorage.setItem("pendingDepositRequest", JSON.stringify(payload))
    navigate("/help-center")
  }

  const channelKey = () => {
    if (channel === "usdt" || channel === "eth" || channel === "btc") return channel
    return "bank"
  }

  const openReceiving = () => {
    const key = channelKey()
    const found = accounts.find((row) => String(row.channel ?? "") === key) ?? null
    setRecv(found)
    setRecvOpen(true)
  }

  const submit = async (toHelpCenter = false) => {
    const amt = parseFloat(amount || "0")
    if (!amt || amt < minDeposit) {
      showToast(`กรุณากรอกจำนวนเงินอย่างน้อย $${fmtMoney(minDeposit)}`, true)
      return
    }
    setSubmitting(true)
    try {
      const [data] = await Promise.all([
        submitDepositRequest(amt, selectedMethod(), {
          payer_name: payerName.trim() || undefined,
          payer_account: bankAccountNo.trim() || undefined,
        }),
        new Promise((r) => setTimeout(r, toHelpCenter ? 0 : 3000)),
      ])
      const payload = {
        user_id: data.user_id ?? null,
        amount: data.amount ?? amt.toFixed(2),
        request_no: data.request_no ?? null,
      }
      if (data.success || data.has_pending) {
        closeAll()
        if (data.has_pending) showToast("คุณยังมีรายการที่ยังรอดำเนินอยู่", true)
        else if (!toHelpCenter) showToast("ส่งคำขอฝากเงินเรียบร้อยแล้ว")
        goHelpCenter(payload)
      } else {
        showToast(data.message ?? "ส่งคำขอไม่สำเร็จ", true)
      }
    } catch {
      showToast("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ", true)
    } finally {
      setSubmitting(false)
    }
  }

  const openAmount = (id: DepositChannel) => {
    setChannel(id)
    setAmount(String(Math.max(1, minDeposit)))
    setSheetOpen(true)
  }

  const confirmAmount = async () => {
    await load()
    const amt = parseFloat(amount || "0")
    if (!amt || amt < minDeposit) {
      showToast(`กรุณากรอกจำนวนเงินอย่างน้อย $${fmtMoney(minDeposit)}`, true)
      return
    }
    setSheetOpen(false)
    if (channel === "usdt" || channel === "eth" || channel === "btc") {
      openReceiving()
      return
    }
    setPayOpen(true)
  }

  const confirmPay = async () => {
    if (payMethod === "bank_account") {
      setOrderNo(`C${Date.now()}${Math.random().toString(16).slice(2, 10)}`)
      setBankAccountNo("")
      setPayerName("")
      setPayOpen(false)
      setInfoOpen(true)
      return
    }
    setPayOpen(false)
    openReceiving()
  }

  const confirmInfo = async () => {
    if (!bankAccountNo.trim()) {
      showToast("กรุณากรอกเลขบัญชีธนาคาร", true)
      return
    }
    if (!payerName.trim()) {
      showToast("กรุณากรอกชื่อผู้ใช้บัญชี", true)
      return
    }
    setInfoOpen(false)
    openReceiving()
  }

  const confirmReceiving = async () => {
    await submit(true)
  }

  const receivingQrPath = String(recv?.qr_image ?? "").trim()
  const receivingQrUrl = receivingQrPath ? asset(receivingQrPath) : ""

  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <Link to="/wallet" className="ox-back" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <h1>การเติมเงินบัญชี</h1>
        <Link to="/deposit-history" className="ox-history-link">
          ประวัติ
        </Link>
      </header>
      <main className="ox-deposit-main">
        <p className="ox-deposit-notice">
          กรุณากรอกจำนวนเงินที่โอนจริงตามความเป็นจริง ไม่เช่นนั้นระบบอาจล้มเหลวในการตรวจสอบและส่งผลต่อความคืบหน้าในการเติมเงิน
        </p>
        <div className="ox-method-list">
          {channels.map((item) => (
            <button key={item.id} type="button" className="ox-method-item" onClick={() => openAmount(item.id)}>
              <span className="ox-method-icon">
                <i className={`fa-solid ${item.icon}`} />
              </span>
              <span>{item.label}</span>
              <i className="fa-solid fa-chevron-right" />
            </button>
          ))}
        </div>
      </main>

      {sheetOpen ? (
        <div className="ox-sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div className="ox-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ox-sheet-handle" />
            <label className="ox-sheet-row">
              <span>จำนวนเงินที่เติม</span>
              <span className="ox-amount-wrap">
                <span>$</span>
                <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </span>
            </label>
            <button type="button" className="ox-primary-btn" disabled={submitting} onClick={confirmAmount}>
              ยืนยัน
            </button>
          </div>
        </div>
      ) : null}

      {payOpen ? (
        <div className="ox-sheet-overlay" onClick={() => setPayOpen(false)}>
          <div className="ox-pay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ox-pay-head">
              <h2>เคาน์เตอร์ชำระเงิน</h2>
              <button type="button" className="ox-back" onClick={() => setPayOpen(false)} aria-label="ปิด">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="ox-wallet-balance">${fmtMoney(Number(amount || 0))}</div>
            <button
              type="button"
              className={`ox-pay-method${payMethod === "bank_account" ? " active" : ""}`}
              onClick={() => setPayMethod("bank_account")}
            >
              <span>บัญชีธนาคาร</span>
              {payMethod === "bank_account" ? <i className="fa-solid fa-check" /> : null}
            </button>
            <button
              type="button"
              className={`ox-pay-method${payMethod === "bank_transfer" ? " active" : ""}`}
              onClick={() => setPayMethod("bank_transfer")}
            >
              <span>
                <strong>Bank</strong>
                <small> บัญชีธนาคาร</small>
              </span>
              {payMethod === "bank_transfer" ? <i className="fa-solid fa-check" /> : null}
            </button>
            <button type="button" className="ox-primary-btn" disabled={submitting} onClick={confirmPay}>
              ยืนยันชำระเงิน
            </button>
          </div>
        </div>
      ) : null}

      {infoOpen ? (
        <div className="ox-sheet-overlay" onClick={() => setInfoOpen(false)}>
          <div className="ox-sheet ox-form" onClick={(e) => e.stopPropagation()}>
            <h2 className="ox-h2">กรุณากรอกและส่งข้อมูลการชำระเงิน</h2>
            <label>เลขบัญชีธนาคาร</label>
            <input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} />
            <label>ชื่อ-นามสกุล</label>
            <input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            <p className="ox-note">หมายเลขการสั่งซื้อ {orderNo}</p>
            <button type="button" className="ox-primary-btn" disabled={submitting} onClick={confirmInfo}>
              ยืนยัน
            </button>
          </div>
        </div>
      ) : null}

      {recvOpen ? (
        <div className="ox-sheet-overlay" onClick={() => setRecvOpen(false)}>
          <div className="ox-sheet ox-form ox-receiving-sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="ox-h2">โอนเข้าบัญชีบริษัท</h2>
            {recv ? (
              <>
                <p className="ox-note">กรุณาโอนยอด ${fmtMoney(Number(amount || 0))} ตามช่องทางที่เลือก</p>
                <label>ช่องทาง</label>
                <input readOnly value={String(recv.channel ?? channelKey())} />
                <label>ชื่อบัญชี</label>
                <input readOnly value={String(recv.account_name ?? "-")} />
                <label>เลขบัญชี / ที่อยู่</label>
                <input readOnly value={String(recv.account_number ?? "-")} />
                <label>เครือข่าย / ธนาคาร</label>
                <input readOnly value={String(recv.network ?? "-")} />
                {receivingQrUrl ? (
                  <div className="ox-receiving-qr-card">
                    <strong><i className="fa-solid fa-qrcode" aria-hidden /> สแกน QR Code เพื่อโอนเงิน</strong>
                    <button
                      type="button"
                      className="ox-receiving-qr-button"
                      onClick={() => setQrViewer(receivingQrUrl)}
                      aria-label="ดู QR Code ขนาดใหญ่"
                    >
                      <img src={receivingQrUrl} alt={`QR Code สำหรับ ${String(recv.channel ?? channelKey())}`} />
                    </button>
                    <small>แตะที่รูปเพื่อดูขนาดใหญ่ และตรวจสอบชื่อบัญชีก่อนโอนทุกครั้ง</small>
                  </div>
                ) : null}
                {recv.note ? <p className="ox-note">{String(recv.note)}</p> : null}
              </>
            ) : (
              <p className="ox-note">ยังไม่มีบัญชีรับเงินช่องทางนี้ — แจ้งแอดมินในแชทได้หลังยืนยัน</p>
            )}
            <button type="button" className="ox-primary-btn" disabled={submitting} onClick={confirmReceiving}>
              โอนแล้ว แจ้งแชท
            </button>
          </div>
        </div>
      ) : null}

      {qrViewer ? (
        <div className="ox-qr-viewer" onClick={() => setQrViewer(null)} role="presentation">
          <button type="button" className="ox-qr-viewer-close" onClick={() => setQrViewer(null)} aria-label="ปิด QR Code">
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
          <img src={qrViewer} alt="QR Code รับเงินขนาดใหญ่" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}

      {toast ? (
        <div className={`ox-toast${toast.error ? " error" : ""}`}>{toast.msg}</div>
      ) : null}
    </div>
  )
}
