import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { fmtMoney, fetchMyCoupons, fetchSellerLevels } from "@/lib/customerApi"
import { memberLevelForBalance, type SellerLevel } from "@/lib/engagement"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/original-extra.css"

export default function WalletPage() {
  useBodyClass("page-wallet")
  const navigate = useNavigate()
  const { user, isLoggedIn, requireLogin, sessionChecked, refreshUser } = useApp()
  const [points, setPoints] = useState(0)
  const [couponCount, setCouponCount] = useState(0)
  const [levels, setLevels] = useState<SellerLevel[]>([])

  useEffect(() => {
    if (!sessionChecked) return
    if (!requireLogin()) return
    void refreshUser()
    setPoints(Number(user?.points ?? 0))
    void fetchMyCoupons()
      .then((rows) => setCouponCount(rows.filter((row) => String(row.user_status) === "available").length))
      .catch(() => setCouponCount(0))
    void fetchSellerLevels().then(setLevels).catch(() => {})
  }, [requireLogin, sessionChecked, user?.id, user?.points, refreshUser])

  if (!isLoggedIn) return null

  const balance = Number(user?.wallet_balance ?? 0)
  const bankCount = user?.is_bank_linked ? "1ใบ" : "0ใบ"

  return (
    <div className="ox-page">
      <header className="ox-topbar">
        <button type="button" className="ox-back" onClick={() => navigate(-1)} aria-label="กลับ">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <h1>กระเป๋าสตางค์ของฉัน</h1>
      </header>
      <main className="ox-wallet-main">
        <section className="ox-wallet-card">
          <div className="ox-wallet-head">ทรัพย์สินของฉัน</div>
          <div className="ox-wallet-mid">
            <div>
              <p className="ox-muted">ยอดคงเหลือ</p>
              <p className="ox-wallet-balance">${fmtMoney(balance)}</p>
            </div>
            <Link to="/link-account" className="ox-wallet-bank">
              <p className="ox-muted">บัญชีธนาคาร</p>
              <p>{bankCount}</p>
            </Link>
          </div>
          <div className="ox-wallet-stats">
            <div>
              <p className="ox-muted">คูปอง</p>
              <p>{couponCount}ใบ</p>
            </div>
            <div>
              <p className="ox-muted">คะแนน</p>
              <p>{points.toLocaleString("th-TH")}</p>
            </div>
            <div>
              <p className="ox-muted">ระดับสมาชิก</p>
              <p>{memberLevelForBalance(balance, levels)}</p>
            </div>
          </div>
        </section>
        <nav className="ox-wallet-actions">
          <Link to="/deposit">
            <i className="fa-solid fa-plus" />
            <span>เติมเงิน</span>
          </Link>
          <Link to="/withdraw">
            <i className="fa-solid fa-arrow-up-from-bracket" />
            <span>ถอนเงิน</span>
          </Link>
          <Link to="/points-center">
            <i className="fa-solid fa-gift" />
            <span>รับคะแนน</span>
          </Link>
        </nav>
        <section className="ox-list-card">
          <Link to="/deposit-history">ประวัติเติมเงิน</Link>
          <Link to="/withdraw-history">ประวัติถอนเงิน</Link>
        </section>
      </main>
    </div>
  )
}
