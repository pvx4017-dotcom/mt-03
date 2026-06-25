import { useCallback, useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import { AdminEditModal, AdminTableWrap, useAdminToast } from "@/components/admin/AdminUi"
import {
  fetchSuperAdminAccounts,
  formatAdminDate,
  superAdminResetAdminPassword,
  type AdminPanelAccount,
} from "@/lib/adminApi"
import { runAdminListLoad, showAdminTableLoading } from "@/lib/adminLoadHelper"
import { useBodyClass } from "@/hooks/useBodyClass"
import { isSuperAdmin } from "@/lib/session"

function roleLabel(role: string) {
  if (role === "super_admin") return "Super Admin"
  if (role === "admin") return "Admin"
  return role
}

export default function AdminSettingsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<AdminPanelAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState<AdminPanelAccount | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchSuperAdminAccounts,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  if (!isSuperAdmin()) {
    return <Navigate to="/admin" replace />
  }

  const openReset = (row: AdminPanelAccount) => {
    setEditRow(row)
    setNewPassword("")
    setConfirmPassword("")
  }

  const savePassword = async () => {
    if (!editRow) return
    if (newPassword.length < 6) {
      showToast("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", "error")
      return
    }
    if (newPassword !== confirmPassword) {
      showToast("รหัสผ่านใหม่ไม่ตรงกัน", "error")
      return
    }
    setBusy(true)
    try {
      const res = await superAdminResetAdminPassword(Number(editRow.id), newPassword, confirmPassword)
      if (res.success) {
        showToast(res.message ?? "เปลี่ยนรหัสผ่านแล้ว")
        setEditRow(null)
      } else {
        showToast(res.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ", "error")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminPageShell
      barTitle="ตั้งค่าระบบ"
      pageTitle="ตั้งค่าระบบ (Super Admin)"
      icon="fa-gear"
    >
      <p className="admin-settings-intro">
        จัดการรหัสผ่านของบัญชีผู้ดูแล (Admin) — เฉพาะ Super Admin เท่านั้นที่เห็นเมนูนี้
      </p>

      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>บัญชี</th>
              <th>บทบาท</th>
              <th>สถานะ</th>
              <th>วันที่สร้าง</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <tr>
                <td colSpan={6} className="admin-empty-row">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty-row">
                  ไม่พบบัญชีผู้ดูแล
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <div className="admin-user-cell-main">{row.username || "-"}</div>
                    <div className="admin-user-cell-sub">{row.email || row.phone || "-"}</div>
                  </td>
                  <td>
                    <span
                      className={`admin-role-badge${
                        row.role === "super_admin" ? " admin-role-badge--super" : ""
                      }`}
                    >
                      {roleLabel(row.role)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-status-badge ${
                        row.status === "active" ? "admin-status-active" : "admin-status-banned"
                      }`}
                    >
                      {row.status === "active" ? "ปกติ" : "ระงับ"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {formatAdminDate(row.registered_at)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-settings-reset-btn"
                      onClick={() => openReset(row)}
                    >
                      <i className="fa-solid fa-key" /> เปลี่ยนรหัสผ่าน
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal
        open={!!editRow}
        title={`เปลี่ยนรหัสผ่าน — ${editRow?.username ?? editRow?.email ?? `#${editRow?.id}`}`}
        onClose={() => setEditRow(null)}
        onSave={savePassword}
      >
        <p className="admin-settings-modal-note">
          บทบาท: <strong>{editRow ? roleLabel(editRow.role) : "-"}</strong>
        </p>
        <div className="admin-form-group">
          <label htmlFor="admin-new-password">รหัสผ่านใหม่</label>
          <input
            id="admin-new-password"
            className="admin-form-control"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="admin-confirm-password">ยืนยันรหัสผ่านใหม่</label>
          <input
            id="admin-confirm-password"
            className="admin-form-control"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={busy}
          />
        </div>
      </AdminEditModal>

      {Toast}
    </AdminPageShell>
  )
}
