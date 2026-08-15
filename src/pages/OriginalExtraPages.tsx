import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { logoAsset } from "@/lib/assets"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import { fmtMoney, fetchMyLoans, submitLoanApplication, fetchCheckinState } from "@/lib/customerApi"
import "@/styles/original-extra.css"

export function SelectShopTypePage() {
  useBodyClass("page-select-shop")
  const navigate = useNavigate()
  const { hasStore, requireLogin, sessionChecked } = useApp()
  const [shopType, setShopType] = useState<"personal" | "corporate" | "">("")

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    if (hasStore) navigate("/my-store-products", { replace: true })
  }, [hasStore, navigate, requireLogin, sessionChecked])

  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <Link to="/profile" className="ox-back" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <h1>เลือกประเภทร้านค้า</h1>
      </header>
      <main className="ox-pad">
        <button
          type="button"
          className={`ox-choice${shopType === "personal" ? " active" : ""}`}
          onClick={() => setShopType("personal")}
        >
          <span className="ox-radio"><i className="fa-solid fa-check" /></span>
          ร้านค้าบุคคล
        </button>
        <button
          type="button"
          className={`ox-choice${shopType === "corporate" ? " active" : ""}`}
          onClick={() => setShopType("corporate")}
        >
          <span className="ox-radio"><i className="fa-solid fa-check" /></span>
          ร้านค้าขององค์กรจำเป็นต้องอัปโหลดใบอนุญาตประกอบธุรกิจ
        </button>
        <button
          type="button"
          className="ox-primary-btn"
          disabled={!shopType}
          onClick={() => {
            sessionStorage.setItem("open_store_shop_type", shopType)
            navigate(`/open-store?type=${shopType}`)
          }}
        >
          ยืนยัน
        </button>
        <p className="ox-note">ไม่สามารถเปลี่ยนแปลงได้หลังจากเลือกประเภทการรับรอง โปรดเลือกให้แน่ใจ</p>
      </main>
    </div>
  )
}

export function LoanApplicationPage() {
  useBodyClass("page-loan")
  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <Link to="/profile" className="ox-back" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <h1>การสมัครสินเชื่อ</h1>
      </header>
      <section className="ox-loan-hero">
        <p>สินเชื่อธุรกิจแก้ปัญหาความกังวลเรื่องการกู้ยืมเงิน</p>
        <p className="ox-muted-on-blue">ให้บริการสินเชื่อผู้ประกอบการและบริการหมุนเวียนเงินทุน</p>
        <div className="ox-loan-actions">
          <Link to="/loan-apply" className="ox-primary-btn">ใบสมัครออนไลน์</Link>
          <Link to="/loan-my" className="ox-ghost-btn">เงินกู้ของฉัน</Link>
        </div>
      </section>
      <main className="ox-pad">
        <h2 className="ox-h2">สินเชื่อไร้กังวล</h2>
        <article className="ox-info-card">
          <strong>ขีดจำกัดที่ยืดหยุ่น</strong>
          <p>1000 ถึง 500,000 วงเงินยืดหยุ่น ระยะเวลาเงินกู้สูงสุดหนึ่งปี</p>
        </article>
        <article className="ox-info-card">
          <strong>สินเชื่อด่วน</strong>
          <p>ผ่านการตรวจสอบภายในหนึ่งชั่วโมง และชำระเงินทันทีหลังจากผ่านการตรวจสอบ</p>
        </article>
        <article className="ox-info-card">
          <strong>ปลอดภัยไร้กังวล</strong>
          <p>เงินกู้ไม่มีหลักประกัน ไม่ต้องใช้เงินฝาก ไม่ต้องโทรเพื่อสอบถาม</p>
        </article>
      </main>
    </div>
  )
}

export function LoanApplyPage() {
  useBodyClass("page-loan")
  const navigate = useNavigate()
  const { user, requireLogin, sessionChecked } = useApp()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState("1000")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    setName((current) => current || String(user?.username ?? ""))
    setPhone((current) => current || String(user?.phone ?? ""))
  }, [requireLogin, sessionChecked, user?.phone, user?.username])

  const submit = async () => {
    const amt = Number(amount)
    const phoneDigits = phone.replace(/\D/g, "")
    if (!Number.isFinite(amt) || amt < 1000 || amt > 500000) {
      setMsg("วงเงินสินเชื่อต้องอยู่ระหว่าง $1,000 ถึง $500,000")
      return
    }
    if (name.trim().length < 2 || name.trim().length > 120) {
      setMsg("กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง")
      return
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setMsg("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง")
      return
    }
    setMsg("")
    setBusy(true)
    try {
      const ok = await submitLoanApplication({ full_name: name.trim(), phone: phone.trim(), amount: amt })
      if (!ok.success) {
        setMsg(ok.message ?? "ส่งไม่สำเร็จ")
        return
      }
      navigate("/loan-my")
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <Link to="/loan-application" className="ox-back" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <h1>ใบสมัครออนไลน์</h1>
      </header>
      <main className="ox-pad ox-form">
        <label>ชื่อ-นามสกุล</label>
        <input maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <label>เบอร์ติดต่อ</label>
        <input type="tel" inputMode="tel" maxLength={20} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label>วงเงินที่ต้องการ (USD)</label>
        <input type="number" min={1000} max={500000} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="ox-note">วงเงิน $1,000–$500,000 ต่อคำขอ และส่งคำขอที่กำลังพิจารณาได้ครั้งละหนึ่งรายการ</p>
        {msg ? <p className="ox-error">{msg}</p> : null}
        <button type="button" className="ox-primary-btn" disabled={busy} onClick={submit}>
          {busy ? "กำลังส่ง..." : "ส่งใบสมัคร"}
        </button>
      </main>
    </div>
  )
}

export function LoanMyPage() {
  useBodyClass("page-loan")
  const { requireLogin, sessionChecked } = useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    setLoading(true)
    setError("")
    void fetchMyLoans()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดข้อมูลสินเชื่อไม่สำเร็จ"))
      .finally(() => setLoading(false))
  }, [requireLogin, sessionChecked])

  const statusLabel = (status: unknown) => {
    const s = String(status ?? "pending")
    if (s === "approved") return "อนุมัติแล้ว"
    if (s === "rejected") return "ปฏิเสธ"
    if (s === "reviewing") return "กำลังพิจารณา"
    return "รอตรวจสอบ"
  }

  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <Link to="/loan-application" className="ox-back" aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <h1>เงินกู้ของฉัน</h1>
      </header>
      <main className="ox-pad">
        {loading ? (
          <p className="ox-note">กำลังโหลดข้อมูลสินเชื่อ...</p>
        ) : error ? (
          <p className="ox-error">{error}</p>
        ) : rows.length === 0 ? (
          <p className="ox-note">ยังไม่มีใบสมัครสินเชื่อ</p>
        ) : (
          rows.map((row) => (
            <article className="ox-info-card" key={String(row.id)}>
              <strong>#{String(row.id)}</strong>
              <p>ยอด ${fmtMoney(row.amount)} · {statusLabel(row.status)}</p>
              <p className="ox-note">
                ส่งคำขอเมื่อ {new Date(String(row.created_at)).toLocaleString("th-TH")}
              </p>
            </article>
          ))
        )}
      </main>
    </div>
  )
}

export function PointsCenterPage() {
  useBodyClass("page-points")
  const navigate = useNavigate()
  const { user, requireLogin, sessionChecked, isLoggedIn } = useApp()
  const [points, setPoints] = useState(0)

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    setPoints(Number(user?.points ?? 0))
    void fetchCheckinState().then((data) => {
      if (data.success) setPoints(Number(data.total ?? user?.points ?? 0))
    })
  }, [requireLogin, sessionChecked, user?.id])

  if (!isLoggedIn) return null

  return (
    <div className="ox-page">
      <section className="ox-points-hero">
        <header className="ox-topbar ox-topbar--light">
          <button type="button" className="ox-back ox-back--light" onClick={() => navigate(-1)} aria-label="กลับ">
            <i className="fa-solid fa-chevron-left" />
          </button>
          <h1>ศูนย์คะแนน</h1>
        </header>
        <div className="ox-points-summary">
          <img src={logoAsset()} alt="" />
          <div>
            <div className="ox-points-value">{points.toLocaleString("th-TH")}</div>
            <div>คะแนนสะสมปัจจุบัน</div>
          </div>
        </div>
      </section>
      <section className="ox-pad">
        <h2 className="ox-h2">ภารกิจคะแนน</h2>
        <Link to="/checkin" className="ox-task">
          <div>
            <strong>เช็กอินรายวัน</strong>
            <p>รับพอยท์ทุกวัน</p>
          </div>
          <span>ไปเช็กอิน</span>
        </Link>
        <Link to="/deposit" className="ox-task">
          <div>
            <strong>เติมเงิน</strong>
            <p>ทำรายการฝากเพื่อสะสมสิทธิ์ระดับสมาชิก</p>
          </div>
          <span>ไปเติมเงิน</span>
        </Link>
      </section>
    </div>
  )
}
