import { useCallback, useEffect, useMemo, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import {
  AdminConfirmModal,
  AdminEmptyRow,
  AdminLoadingRow,
  AdminSearchBar,
  useAdminToast,
} from "@/components/admin/AdminUi"
import {
  adminPost,
  fetchAdminDeposits,
  fetchAdminPaymentLimits,
  fetchAdminWithdrawals,
  formatAdminDate,
} from "@/lib/adminApi"
import { adminFmtMoney } from "@/lib/adminUtils"
import { useBodyClass } from "@/hooks/useBodyClass"

function statusBadgeClass(status: unknown) {
  const s = String(status ?? "").toLowerCase()
  if (s === "approved") return "admin-status-badge admin-finance-status-approved"
  if (s === "cancelled" || s === "rejected") return "admin-status-badge admin-finance-status-cancelled"
  return "admin-status-badge admin-finance-status-pending"
}

function FinanceTablePage({
  title,
  barTitle,
  icon,
  type,
}: {
  title: string
  barTitle: string
  icon: string
  type: "deposit" | "withdraw"
}) {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [confirm, setConfirm] = useState<{ id: unknown; status: string } | null>(null)

  const apiPath = type === "deposit" ? API.adminDepositRequests : API.adminWithdrawRequests

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = type === "deposit" ? await fetchAdminDeposits() : await fetchAdminWithdrawals()
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = rows
    if (statusFilter !== "all") {
      list = list.filter((r) => String(r.status ?? "").toLowerCase() === statusFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        String(r.user_id ?? "").includes(q) ||
        String(r.transaction_ref ?? r.reference_no ?? r.ref ?? "").toLowerCase().includes(q) ||
        String(r.phone ?? "").toLowerCase().includes(q) ||
        String(r.email ?? "").toLowerCase().includes(q),
      )
    }
    return list
  }, [rows, search, statusFilter])

  const applyAction = async () => {
    if (!confirm) return
    const fd = new FormData()
    fd.append("action", "update_status")
    fd.append("id", String(confirm.id))
    fd.append("status", confirm.status)
    const res = await adminPost<{ success: boolean; message?: string }>(apiPath, fd)
    if (res.success) {
      showToast("ดำเนินการสำเร็จ")
      setConfirm(null)
      load()
    } else showToast(res.message ?? "ดำเนินการไม่สำเร็จ", "error")
  }

  const isWithdraw = type === "withdraw"

  return (
    <AdminPageShell barTitle={barTitle} pageTitle={title} icon={icon}>
      <div className="admin-finance-toolbar">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="ค้นหาผู้ใช้ / เลขรายการ…" />
        <select className="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">สถานะทั้งหมด</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="cancelled">ยกเลิก</option>
          <option value="rejected">ปฏิเสธ</option>
        </select>
        <span className="admin-finance-count">{filtered.length} รายการ</span>
      </div>

      <div className="admin-card admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ผู้ใช้</th>
              <th>เลขรายการ</th>
              <th>จำนวนเงิน</th>
              <th>{isWithdraw ? "หมายเหตุ" : "ช่องทาง"}</th>
              <th>สถานะ</th>
              <th>เวลา</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminLoadingRow cols={8} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={8} message="ไม่มีรายการ" />
            ) : (
              filtered.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  <td>{String(row.id ?? "-")}</td>
                  <td>
                    <div className="admin-user-cell-main">ID: {String(row.user_id ?? "-")}</div>
                    <div className="admin-user-cell-sub">{String(row.phone ?? row.email ?? row.username ?? "-")}</div>
                  </td>
                  <td>{String(row.transaction_ref ?? row.reference_no ?? row.request_no ?? row.ref ?? row.transaction_id ?? "-")}</td>
                  <td>${adminFmtMoney(row.amount)}</td>
                  <td>{String(isWithdraw ? (row.note ?? row.remark ?? "-") : (row.channel ?? row.payment_channel ?? row.payment_method ?? "-"))}</td>
                  <td>
                    <span className={statusBadgeClass(row.status)}>{String(row.status ?? "-")}</span>
                  </td>
                  <td>{formatAdminDate(String(row.created_at ?? row.requested_at ?? ""))}</td>
                  <td>
                    {String(row.status).toLowerCase() === "pending" ? (
                      <div className="admin-manage-actions">
                        <button type="button" className="admin-action-btn approve" onClick={() => setConfirm({ id: row.id, status: "approved" })}>
                          อนุมัติ
                        </button>
                        <button type="button" className="admin-action-btn cancel" onClick={() => setConfirm({ id: row.id, status: "cancelled" })}>
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminConfirmModal
        open={!!confirm}
        title="ยืนยันการดำเนินการ"
        message={`ยืนยัน${confirm?.status === "approved" ? "อนุมัติ" : "ยกเลิก"}รายการนี้ใช่หรือไม่?`}
        onCancel={() => setConfirm(null)}
        onConfirm={applyAction}
      />
      {Toast}
    </AdminPageShell>
  )
}

export function AdminCustomerDepositsPage() {
  return <FinanceTablePage title="ลูกค้าฝากเงิน" barTitle="ลูกค้าฝากเงิน" icon="fa-arrow-down" type="deposit" />
}

export function AdminCustomerWithdrawalsPage() {
  return <FinanceTablePage title="ลูกค้าถอนเงิน" barTitle="ลูกค้าถอนเงิน" icon="fa-arrow-up" type="withdraw" />
}

export function AdminPaymentLimitsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [minDeposit, setMinDeposit] = useState("")
  const [minWithdraw, setMinWithdraw] = useState("")
  const [history, setHistory] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminPaymentLimits()
      setMinDeposit(String(data.min_deposit ?? ""))
      setMinWithdraw(String(data.min_withdraw ?? ""))
      setHistory(data.limits ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    const fd = new FormData()
    fd.append("min_deposit", minDeposit)
    fd.append("min_withdraw", minWithdraw)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminPaymentLimits, fd)
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      load()
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="ฝาก-ถอนขั้นต่ำ" pageTitle="ตั้งค่าฝาก-ถอนขั้นต่ำ" icon="fa-sliders">
      <div className="admin-card">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>ฝากขั้นต่ำ (USD)</label>
            <input className="admin-form-control" type="number" step="0.01" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>ถอนขั้นต่ำ (USD)</label>
            <input className="admin-form-control" type="number" step="0.01" value={minWithdraw} onChange={(e) => setMinWithdraw(e.target.value)} />
          </div>
          <div className="admin-form-group admin-form-group-action">
            <label>.</label>
            <button type="button" className="admin-submit-btn" onClick={save}>บันทึก</button>
          </div>
        </div>
      </div>

      <div className="admin-card admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>ฝากขั้นต่ำ</th>
              <th>ถอนขั้นต่ำ</th>
              <th>อัปเดตล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminLoadingRow cols={3} />
            ) : history.length === 0 ? (
              <AdminEmptyRow cols={3} message="ยังไม่มีประวัติ" />
            ) : (
              history.map((row, i) => (
                <tr key={i}>
                  <td>{String(row.min_deposit ?? "-")}</td>
                  <td>{String(row.min_withdraw ?? "-")}</td>
                  <td>{formatAdminDate(String(row.updated_at ?? row.created_at ?? ""))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {Toast}
    </AdminPageShell>
  )
}
