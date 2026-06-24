import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchDepositHistory, fmtDateTime, fmtMoney } from "@/lib/customerApi"
import { useApp } from "@/context/AppContext"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/deposit-style.css"

export default function DepositHistoryPage() {
  useBodyClass("page-deposit")
  const { requireLogin } = useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requireLogin()) return
    fetchDepositHistory()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [requireLogin])

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
        {loading ? (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>กำลังโหลด…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>ยังไม่มีประวัติการเติมเงิน</div>
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
              <div style={{ fontSize: 13, color: "#374151" }}>
                เลขรายการ: {String(row.request_no ?? row.id ?? "-")}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                {fmtDateTime(row.created_at)}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
