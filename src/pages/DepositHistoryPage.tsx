import { Link } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/deposit-style.css"

export default function DepositHistoryPage() {
  useBodyClass("page-deposit")

  return (
    <div id="app">
      <nav className="top-navbar">
        <Link to="/deposit" className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">ประวัติการเติมเงิน</div>
        <span style={{ width: 40 }} />
      </nav>
      <main style={{ padding: 16, minHeight: "60vh", background: "#f5f6f8" }}>
        <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
          ยังไม่มีประวัติการเติมเงิน
        </div>
      </main>
    </div>
  )
}
