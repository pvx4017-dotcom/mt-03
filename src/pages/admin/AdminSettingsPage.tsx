import { useCallback, useEffect, useState } from "react"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import { AdminEditModal, AdminTableWrap, useAdminToast } from "@/components/admin/AdminUi"
import {
  fetchAdminLineContact,
  fetchSuperAdminAccounts,
  formatAdminDate,
  saveAdminLineContact,
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
  const superAdmin = isSuperAdmin()
  const [rows, setRows] = useState<AdminPanelAccount[]>([])
  const [loading, setLoading] = useState(superAdmin)
  const [editRow, setEditRow] = useState<AdminPanelAccount | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [lineUrl, setLineUrl] = useState("")
  const [lineBusy, setLineBusy] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!superAdmin) return
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchSuperAdminAccounts,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast, superAdmin],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    void fetchAdminLineContact()
      .then(setLineUrl)
      .catch(() => setLineUrl(""))
  }, [])

  const saveLineUrl = async () => {
    setLineBusy(true)
    try {
      const res = await saveAdminLineContact(lineUrl.trim())
      if (res.success) {
        setLineUrl(String(res.line_url ?? lineUrl.trim()))
        showToast(res.message ?? "บันทึกลิงก์ LINE แล้ว")
      } else {
        showToast(res.message ?? "บันทึกลิงก์ LINE ไม่สำเร็จ", "error")
      }
    } finally {
      setLineBusy(false)
    }
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
      pageTitle={superAdmin ? "ตั้งค่าระบบ (Super Admin)" : "ตั้งค่าระบบ"}
      icon="fa-gear"
    >
      <section className="admin-card admin-line-settings">
        <h3 className="admin-line-settings-title">
          <i className="fa-brands fa-line" aria-hidden /> LINE ติดต่อผู้ดูแล
        </h3>
        <p className="admin-settings-intro">
          วาง URL ของ LINE OA / lin.ee / line.me หรือใส่ @ไอดี เพื่อให้ลูกค้ากดเมนู LINE ในหน้าโปรไฟล์แล้วเปิดแอปทันที
        </p>
        <div className="admin-form-group">
          <label htmlFor="admin-line-url">ลิงก์ LINE</label>
          <input
            id="admin-line-url"
            className="admin-form-control"
            type="text"
            inputMode="url"
            placeholder="เช่น https://line.me/R/ti/p/@your-oa, https://lin.ee/xxxx หรือ @your-oa"
            value={lineUrl}
            onChange={(e) => setLineUrl(e.target.value)}
            disabled={lineBusy}
          />
        </div>
        <button type="button" className="admin-submit-btn" disabled={lineBusy} onClick={saveLineUrl}>
          {lineBusy ? "กำลังบันทึก..." : "บันทึกลิงก์ LINE"}
        </button>
      </section>

      {superAdmin ? (
        <>
          <p className="admin-settings-intro">
            จัดการรหัสผ่านของบัญชีผู้ดูแล (Admin) — เฉพาะ Super Admin เท่านั้นที่เห็นส่วนนี้
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
        </>
      ) : null}

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
