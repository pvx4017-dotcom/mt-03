import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  fetchAdminBadges,
  fetchAdminUsers,
  fetchAdminDeposits,
  fetchAdminWithdrawals,
  fetchAdminCart,
  fetchCustomerStores,
} from "@/lib/adminApi"
import { useBodyClass } from "@/hooks/useBodyClass"

type Stats = {
  totalUsers: number
  activeUsers: number
  cartPending: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalStores: number
  chatUnread: number
  receivingPending: number
}

const QUICK_LINKS = [
  { path: "/admin/customer-store-products", icon: "fa-store", label: "สินค้าของลูกค้า", color: "blue" },
  { path: "/admin/cart", icon: "fa-cart-shopping", label: "ตะกร้าสินค้า", color: "amber" },
  { path: "/admin/shipping-orders", icon: "fa-truck-fast", label: "รอจัดส่ง", color: "orange" },
  { path: "/admin/receiving-orders", icon: "fa-box-open", label: "รอรับสินค้า", color: "purple" },
  { path: "/admin/customer-deposits", icon: "fa-arrow-down-to-bracket", label: "ฝากเงิน", color: "green" },
  { path: "/admin/customer-withdrawals", icon: "fa-arrow-up-from-bracket", label: "ถอนเงิน", color: "red" },
  { path: "/admin/users", icon: "fa-users", label: "จัดการผู้ใช้", color: "indigo" },
  { path: "/admin/chat", icon: "fa-headset", label: "แชท Support", color: "teal" },
]

export default function AdminOverviewPage() {
  useBodyClass("admin-page")
  const [stats, setStats] = useState<Stats | null>(null)
  const [trendData, setTrendData] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [badges, users, deposits, withdrawals, cart, stores] = await Promise.all([
          fetchAdminBadges(),
          fetchAdminUsers(),
          fetchAdminDeposits(),
          fetchAdminWithdrawals(),
          fetchAdminCart("pending"),
          fetchCustomerStores(),
        ])
        const pendingDep = (deposits as Record<string, unknown>[]).filter(
          (d) => String(d.status ?? "").toLowerCase() === "pending",
        ).length
        const pendingWith = (withdrawals as Record<string, unknown>[]).filter(
          (w) => String(w.status ?? "").toLowerCase() === "pending",
        ).length
        setStats({
          totalUsers: users.length,
          activeUsers: users.filter((u) => u.status === "active").length,
          cartPending: cart.count ?? cart.items?.length ?? 0,
          pendingDeposits: pendingDep,
          pendingWithdrawals: pendingWith,
          totalStores: (stores as Record<string, unknown>[]).length,
          chatUnread: badges.chat,
          receivingPending: badges.receiving,
        })

        // Generate 7-day trend activity points directly from REAL database records
        const dNow = new Date()
        const days = Array.from({ length: 7 }).map((_, idx) => {
          const d = new Date()
          d.setDate(dNow.getDate() - (6 - idx))
          const dayPrefix = d.toISOString().slice(0, 10)
          const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
          const label = `${d.getDate()} ${thaiMonths[d.getMonth()]}`

          // Genuine matching from actual database records (registered_at / created_at)
          const matchedUsers = (users as Record<string, unknown>[]).filter((u) => {
            const dateStr = String(u.registered_at ?? u.created_at ?? "")
            return dateStr.startsWith(dayPrefix)
          }).length

          const matchedDeps = (deposits as Record<string, unknown>[]).filter((dp) => {
            const dateStr = String(dp.created_at ?? "")
            return dateStr.startsWith(dayPrefix)
          }).length

          const matchedWiths = (withdrawals as Record<string, unknown>[]).filter((w) => {
            const dateStr = String(w.created_at ?? "")
            return dateStr.startsWith(dayPrefix)
          }).length

          const value = matchedUsers + matchedDeps + matchedWiths

          return { label, value, matchedUsers, matchedDeps, matchedWiths }
        })
        setTrendData(days)
      } catch {
        // fail silently — show zeros
        setStats({ totalUsers: 0, activeUsers: 0, cartPending: 0, pendingDeposits: 0, pendingWithdrawals: 0, totalStores: 0, chatUnread: 0, receivingPending: 0 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = stats
    ? [
        { label: "ผู้ใช้ทั้งหมด", value: stats.totalUsers, icon: "fa-users", color: "blue", path: "/admin/users" },
        { label: "ผู้ใช้ที่ใช้งานอยู่", value: stats.activeUsers, icon: "fa-user-check", color: "green", path: "/admin/users" },
        { label: "ร้านค้าลูกค้า", value: stats.totalStores, icon: "fa-shop", color: "amber", path: "/admin/customer-store-products" },
        { label: "ตะกร้ารอดำเนินการ", value: stats.cartPending, icon: "fa-cart-shopping", color: "orange", path: "/admin/cart", urgent: stats.cartPending > 0 },
        { label: "รอรับสินค้า", value: stats.receivingPending, icon: "fa-box-open", color: "purple", path: "/admin/receiving-orders", urgent: stats.receivingPending > 0 },
        { label: "คำขอฝากเงิน", value: stats.pendingDeposits, icon: "fa-money-bill-wave", color: "emerald", path: "/admin/customer-deposits", urgent: stats.pendingDeposits > 0 },
        { label: "คำขอถอนเงิน", value: stats.pendingWithdrawals, icon: "fa-hand-holding-dollar", color: "red", path: "/admin/customer-withdrawals", urgent: stats.pendingWithdrawals > 0 },
        { label: "แชทที่ยังไม่ตอบ", value: stats.chatUnread, icon: "fa-comment-dots", color: "teal", path: "/admin/chat", urgent: stats.chatUnread > 0 },
      ]
    : []

  // 100% Real Live Data for Donut Chart
  const donutItems = stats
    ? [
        { label: "ผู้ใช้ที่ใช้งานอยู่", count: stats.activeUsers, color: "#16a34a" },
        { label: "ร้านค้าลูกค้า", count: stats.totalStores, color: "#f59e0b" },
        { label: "ตะกร้ารอดำเนินการ", count: stats.cartPending, color: "#ea580c" },
        { label: "คำขอธุรกรรม", count: stats.pendingDeposits + stats.pendingWithdrawals, color: "#2563eb" },
      ]
    : []

  return (
    <div className="ao-page">
      {/* Page title */}
      <div className="ao-header">
        <div>
          <h1 className="ao-title">ภาพรวมระบบ</h1>
          <p className="ao-subtitle">ข้อมูลสรุปสถานะปัจจุบัน</p>
        </div>
        <div className="ao-header-time">
          <i className="fa-regular fa-clock" />
          {new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="ao-stats-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ao-stat-card ao-stat-card--skeleton">
                <div className="ao-skeleton-icon" />
                <div className="ao-skeleton-text" />
                <div className="ao-skeleton-num" />
              </div>
            ))
          : statCards.map((card) => (
              <Link
                key={card.path + card.label}
                to={card.path}
                className={`ao-stat-card ao-stat-card--${card.color}${card.urgent ? " urgent" : ""}`}
              >
                <div className="ao-stat-icon-wrap">
                  <i className={`fa-solid ${card.icon}`} />
                </div>
                <div className="ao-stat-body">
                  <span className="ao-stat-label">{card.label}</span>
                  <span className="ao-stat-value">{card.value.toLocaleString("th-TH")}</span>
                </div>
                {card.urgent && card.value > 0 && (
                  <span className="ao-urgent-dot" />
                )}
              </Link>
            ))}
      </div>

      {/* Charts Section: Real Live Data */}
      <div className="ao-charts-row">
        {/* Trend Area Chart (กราฟขึ้น-ลง จากข้อมูลจริง) */}
        <div className="ao-chart-card ao-chart-card--trend">
          <div className="ao-chart-card-header">
            <div>
              <h2 className="ao-chart-title">
                <i className="fa-solid fa-chart-line ao-chart-title-icon" />
                แนวโน้มกิจกรรมและผู้ใช้ใหม่ (7 วันล่าสุด)
              </h2>
              <p className="ao-chart-subtitle">ข้อมูลจริงจากการลงทะเบียนและธุรกรรมในระบบ</p>
            </div>
            <div className="ao-chart-trend-pill up">
              <i className="fa-solid fa-arrow-trend-up" />
              <span>วันนี้ +{trendData[trendData.length - 1]?.value ?? 0} บัญชีใหม่</span>
            </div>
          </div>
          <AdminTrendChart data={trendData} loading={loading} />
        </div>

        {/* Circular Donut Chart (กราฟวงกลมประกอบ จากข้อมูลจริง) */}
        <div className="ao-chart-card ao-chart-card--donut">
          <div className="ao-chart-card-header">
            <div>
              <h2 className="ao-chart-title">
                <i className="fa-solid fa-chart-pie ao-chart-title-icon" />
                สัดส่วนสถานะระบบ
              </h2>
              <p className="ao-chart-subtitle">คำนวณจากข้อมูลจริงในฐานข้อมูลปัจจุบัน</p>
            </div>
          </div>
          <AdminDonutChart
            items={donutItems}
            total={stats?.totalUsers ?? 0}
            loading={loading}
          />
        </div>
      </div>

      {/* Order workflow guide */}
      <div className="ao-workflow-card">
        <div className="ao-workflow-header">
          <i className="fa-solid fa-route" />
          <span>เส้นทางคำสั่งซื้อ (Admin ดำเนินการ)</span>
        </div>
        <div className="ao-workflow-steps">
          <div className="ao-workflow-step">
            <div className="ao-workflow-step-num">1</div>
            <div>
              <strong>สินค้าของลูกค้า</strong>
              <p>เลือกสินค้าจากร้านลูกค้า → เพิ่มลงตะกร้า</p>
            </div>
          </div>
          <div className="ao-workflow-arrow"><i className="fa-solid fa-arrow-right" /></div>
          <div className="ao-workflow-step">
            <div className="ao-workflow-step-num">2</div>
            <div>
              <strong>ตะกร้าสินค้า</strong>
              <p>ยืนยันคำสั่งซื้อ → หักกระเป๋าลูกค้า</p>
            </div>
          </div>
          <div className="ao-workflow-arrow"><i className="fa-solid fa-arrow-right" /></div>
          <div className="ao-workflow-step">
            <div className="ao-workflow-step-num">3</div>
            <div>
              <strong>รอจัดส่ง → รอรับ → สำเร็จ</strong>
              <p>คืนราคาสินค้า + บวกค่าคอม</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <h2 className="ao-section-title">เมนูด่วน</h2>
      <div className="ao-quick-links">
        {QUICK_LINKS.map((link) => (
          <Link key={link.path} to={link.path} className={`ao-quick-link ao-quick-link--${link.color}`}>
            <i className={`fa-solid ${link.icon}`} />
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function AdminTrendChart({
  data,
  loading,
}: {
  data: { label: string; value: number }[]
  loading: boolean
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (loading || data.length === 0) {
    return (
      <div className="ao-chart-skeleton">
        <div className="ao-skeleton-chart-line" />
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values, minVal + 1)
  const range = maxVal - minVal || 1

  const width = 520
  const height = 180
  const padLeft = 35
  const padRight = 20
  const padTop = 25
  const padBottom = 30
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW
    const y = padTop + plotH - ((d.value - minVal) / range) * (plotH - 24) - 10
    return { x, y, ...d }
  })

  // Smooth bezier curve
  let linePath = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const mx = (p0.x + p1.x) / 2
    linePath += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
  }
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`

  return (
    <div className="ao-chart-svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="ao-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="aoTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = padTop + plotH * (1 - ratio)
          return (
            <line
              key={i}
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#f1f5f9"
              strokeDasharray="4 4"
            />
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#aoTrendGrad)" />

        {/* Line stroke */}
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />

        {/* Points & text */}
        {points.map((pt, i) => {
          const isHovered = hoveredIdx === i
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Vertical hover guide */}
              {isHovered && (
                <line
                  x1={pt.x}
                  y1={padTop}
                  x2={pt.x}
                  y2={padTop + plotH}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
              )}

              {/* Data circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill="#fff"
                stroke="#2563eb"
                strokeWidth={isHovered ? 3 : 2.5}
              />

              {/* Value pill / text */}
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                fontSize={isHovered ? "12" : "10"}
                fontWeight="700"
                fill={isHovered ? "#1d4ed8" : "#2563eb"}
              >
                {pt.value}
              </text>

              {/* X Axis Label */}
              <text
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="11"
                fill={isHovered ? "#1e293b" : "#94a3b8"}
                fontWeight={isHovered ? "600" : "400"}
              >
                {pt.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AdminDonutChart({
  items,
  total,
  loading,
}: {
  items: { label: string; count: number; color: string }[]
  total: number
  loading: boolean
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="ao-chart-skeleton">
        <div className="ao-skeleton-donut" />
      </div>
    )
  }

  const radius = 62
  const circ = 2 * Math.PI * radius // ~389.56
  const sum = items.reduce((s, it) => s + it.count, 0)

  let accumulatedOffset = 0
  const segments = items.map((it) => {
    const fraction = sum > 0 ? it.count / sum : 0
    const strokeDash = fraction * circ
    const isFullCircle = fraction >= 0.999
    const dasharray = isFullCircle ? `${circ} 0` : `${Math.max(0, strokeDash - 3)} ${circ}`
    const dashoffset = -accumulatedOffset
    if (it.count > 0) {
      accumulatedOffset += strokeDash
    }
    const percent = Math.round(fraction * 100)
    return { ...it, fraction, dasharray, dashoffset, percent, isFullCircle }
  })

  return (
    <div className="ao-donut-layout">
      {/* SVG Donut */}
      <div className="ao-donut-svg-wrap">
        <svg viewBox="0 0 180 180" className="ao-donut-svg">
          {/* Base background circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="20"
          />

          {/* Slices */}
          {segments.map((seg, idx) => {
            if (seg.count <= 0) return null
            const isHovered = hoveredIdx === idx
            return (
              <circle
                key={idx}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? 24 : 20}
                strokeDasharray={seg.dasharray}
                strokeDashoffset={seg.dashoffset}
                strokeLinecap={seg.isFullCircle ? "butt" : "round"}
                transform="rotate(-90 90 90)"
                style={{
                  transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                  cursor: "pointer",
                  opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            )
          })}

          {/* Center text */}
          <text
            x="90"
            y="86"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill="#0f172a"
          >
            {hoveredIdx !== null ? segments[hoveredIdx].count : total}
          </text>
          <text
            x="90"
            y="106"
            textAnchor="middle"
            fontSize="10"
            fontWeight="500"
            fill="#64748b"
          >
            {hoveredIdx !== null ? segments[hoveredIdx].label : "ผู้ใช้ทั้งหมด"}
          </text>
        </svg>
      </div>

      {/* Legend list */}
      <div className="ao-donut-legend">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className={`ao-donut-legend-item${hoveredIdx === idx ? " active" : ""}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span
              className="ao-donut-legend-dot"
              style={{ backgroundColor: seg.color }}
            />
            <span className="ao-donut-legend-label">{seg.label}</span>
            <span className="ao-donut-legend-val">
              {seg.count} <small>({seg.percent}%)</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
