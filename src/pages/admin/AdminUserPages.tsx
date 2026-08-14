import { useCallback, useEffect, useMemo, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import {
  AdminConfirmModal,
  AdminDetailModal,
  AdminEditModal,
  AdminEmptyRow,
  AdminLoadingRow,
  AdminSearchBar,
  AdminTableWrap,
  useAdminToast,
} from "@/components/admin/AdminUi"
import {
  adminAsset,
  adminPost,
  fetchAdminBankAccounts,
  fetchAdminCredits,
  fetchAdminShippingAddresses,
  fetchAdminTopupWallets,
  fetchAdminUsers,
  fetchAdminVerifications,
  fetchAdminWithdrawPasswords,
  fetchTopupUsers,
  formatAdminDate,
  type AdminUser,
} from "@/lib/adminApi"
import { adminFmtMoney } from "@/lib/adminUtils"
import { runAdminListLoad, showAdminTableLoading } from "@/lib/adminLoadHelper"
import { useBodyClass } from "@/hooks/useBodyClass"

export default function AdminUsersPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [edit, setEdit] = useState<AdminUser | null>(null)
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("active")
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminUsers,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        String(r.id).includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    )
  }, [rows, search])

  const saveEdit = async () => {
    if (!edit) return
    const fd = new FormData()
    fd.append("action", "edit")
    fd.append("id", String(edit.id))
    fd.append("password", password)
    fd.append("status", status)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminUsers, fd)
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEdit(null)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const blockUser = async (row: AdminUser) => {
    const fd = new FormData()
    fd.append("action", "block")
    fd.append("id", String(row.id))
    fd.append("status", row.status)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminUsers, fd)
    if (res.success) {
      showToast(res.message ?? "สำเร็จ")
      load(true)
    } else showToast(res.message ?? "ดำเนินการไม่สำเร็จ", "error")
  }

  const deleteUser = async () => {
    if (deleteId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(deleteId))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminUsers, fd)
    if (res.success) {
      showToast(res.message ?? "ลบสำเร็จ")
      setDeleteId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell
      barTitle="จัดการผู้ใช้"
      pageTitle="รายชื่อผู้ใช้ทั้งหมด"
      icon="fa-users"
      headerExtra={<AdminSearchBar value={search} onChange={setSearch} placeholder="ค้นหาชื่อผู้ใช้, เบอร์โทร..." />}
    >
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อผู้ใช้ / ข้อมูล</th>
              <th>รหัสผ่าน</th>
              <th>รหัสเชิญ</th>
              <th>รหัสถูกเชิญ</th>
              <th>วันที่สมัคร</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={8} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={8} message="ไม่พบข้อมูลผู้ใช้" />
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <div className="admin-user-cell-main">{row.username}</div>
                    <div className="admin-user-cell-sub">{row.phone || row.email || "-"}</div>
                  </td>
                  <td>
                    <div className="admin-password-cell">••••••</div>
                  </td>
                  <td>
                    <span className="admin-code-pill">{row.referral_code || "-"}</span>
                  </td>
                  <td>
                    <span className="admin-code-pill admin-code-pill-warn">{row.referred_by || "-"}</span>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{formatAdminDate(row.registered_at)}</td>
                  <td>
                    <span
                      className={`admin-status-badge ${
                        row.status === "active" ? "admin-status-active" : "admin-status-banned"
                      }`}
                    >
                      {row.status === "active" ? "ปกติ" : "ระงับ"}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="action-btn icon-btn btn-edit"
                        title="แก้ไข"
                        onClick={() => {
                          setEdit(row)
                          setPassword("")
                          setStatus(row.status)
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        className="action-btn icon-btn btn-block"
                        title={row.status === "banned" ? "ยกเลิกบล็อก" : "บล็อก"}
                        onClick={() => blockUser(row)}
                      >
                        <i className="fa-solid fa-shield-halved" />
                      </button>
                      <button
                        type="button"
                        className="action-btn icon-btn btn-delete"
                        title="ลบ"
                        onClick={() => setDeleteId(row.id)}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminConfirmModal
        open={deleteId != null}
        title="ยืนยันการลบ"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        onCancel={() => setDeleteId(null)}
        onConfirm={deleteUser}
      />

      <AdminEditModal
        open={!!edit}
        title="แก้ไขผู้ใช้"
        onClose={() => setEdit(null)}
        onSave={saveEdit}
      >
        {edit ? (
          <>
            <div className="admin-form-group">
              <label>User ID</label>
              <input className="admin-form-control" value={edit.id} readOnly />
            </div>
            {edit.role === "admin" || edit.role === "super_admin" ? (
              <p className="admin-settings-modal-note">
                บัญชีผู้ดูแล — เปลี่ยนรหัสผ่านได้ที่เมนู <strong>ตั้งค่าระบบ</strong> (Super Admin)
              </p>
            ) : (
              <div className="admin-form-group">
                <label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
                <input
                  className="admin-form-control"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
                  autoComplete="new-password"
                />
              </div>
            )}
            <div className="admin-form-group">
              <label>สถานะ</label>
              <select
                className="admin-form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">ใช้งาน</option>
                <option value="banned">ระงับ</option>
              </select>
            </div>
          </>
        ) : null}
      </AdminEditModal>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminCreditManagementPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null)
  const [credit, setCredit] = useState("")

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminCredits,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, search])

  const save = async () => {
    if (!edit) return
    const fd = new FormData()
    fd.append("action", "update_credit")
    fd.append("user_id", String(edit.user_id ?? edit.id ?? ""))
    fd.append("credit", credit)
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.adminCustomerTopup,
      fd,
    )
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEdit(null)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell
      barTitle="จัดการเครดิต"
      pageTitle="จัดการเครดิตลูกค้า"
      icon="fa-coins"
      headerExtra={<AdminSearchBar value={search} onChange={setSearch} />}
    >
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>เบอร์โทร</th>
              <th>อีเมล</th>
              <th>เครดิต</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={5} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={5} message="ไม่พบข้อมูล" />
            ) : (
              filtered.map((row, i) => (
                <tr key={String(row.user_id ?? row.id ?? i)}>
                  <td>{String(row.user_id ?? row.id ?? "-")}</td>
                  <td>{String(row.phone ?? "-")}</td>
                  <td>{String(row.email ?? "-")}</td>
                  <td>{String(row.credit ?? row.balance ?? "0")}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-action-btn edit"
                      onClick={() => {
                        setEdit(row)
                        setCredit(String(row.credit ?? row.balance ?? ""))
                      }}
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal open={!!edit} title="แก้ไขเครดิต" onClose={() => setEdit(null)} onSave={save}>
        <div className="admin-form-group">
          <label>เครดิต (USD)</label>
          <input
            className="admin-form-control"
            type="number"
            step="0.01"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
          />
        </div>
      </AdminEditModal>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminVerificationPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [docRow, setDocRow] = useState<Record<string, unknown> | null>(null)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminVerifications,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id: unknown, status: string) => {
    let rejectionReason = ""
    if (status === "rejected") {
      const reason = window.prompt("กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ)", "")
      if (reason === null) return
      rejectionReason = reason.trim()
    }
    const fd = new FormData()
    fd.append("action", "update_status")
    fd.append("id", String(id))
    fd.append("status", status)
    if (rejectionReason) fd.append("rejection_reason", rejectionReason)
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.adminIdentityVerifications,
      fd,
    )
    if (res.success) {
      showToast(status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว")
      load(true)
    } else showToast(res.message ?? "ดำเนินการไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="การยืนยันตัวตน" pageTitle="การยืนยันตัวตน" icon="fa-id-card">
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>ชื่อ-นามสกุล</th>
              <th>เลขบัตร</th>
              <th>เอกสาร</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={8} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={8} message="ไม่มีคำขอยืนยันตัวตน" />
            ) : (
              rows.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  <td>{String(row.id ?? "-")}</td>
                  <td>{String(row.user_id ?? "-")}</td>
                  <td>
                    <div>
                      <div>{String(row.full_name ?? row.name ?? "-")}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{String(row.phone ?? row.email ?? "")}</div>
                    </div>
                  </td>
                  <td>{String(row.id_card_number ?? row.id_number ?? "-")}</td>
                  <td>
                    <button type="button" className="admin-action-btn edit" onClick={() => setDocRow(row)}>
                      <i className="fa-solid fa-image" /> ดู
                    </button>
                  </td>
                  <td>
                    <span
                      className={`admin-status-badge ${
                        row.status === "approved"
                          ? "admin-status-active"
                          : row.status === "rejected"
                            ? "admin-status-banned"
                            : "admin-status-pending"
                      }`}
                    >
                      {String(row.status ?? "pending")}
                    </span>
                  </td>
                  <td>{formatAdminDate(String(row.created_at ?? ""))}</td>
                  <td>
                    <div className="admin-manage-actions">
                      <button
                        type="button"
                        className="admin-action-btn approve"
                        onClick={() => setStatus(row.id, "approved")}
                      >
                        อนุมัติ
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn delete"
                        onClick={() => setStatus(row.id, "rejected")}
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminDetailModal open={!!docRow} title="เอกสารยืนยันตัวตน" onClose={() => setDocRow(null)} wide>
        {docRow ? (() => {
          const docImages = [
            docRow.id_card_image,
            docRow.selfie_image,
            docRow.document_image,
            docRow.id_card_front,
            docRow.id_card_back,
          ].filter(Boolean)
          return docImages.length ? (
            <div className="admin-doc-grid">
              {docImages.map((src, i) => (
                <img key={i} src={adminAsset(String(src))} alt="" />
              ))}
            </div>
          ) : (
            <p className="admin-empty-row">ไม่มีไฟล์เอกสาร</p>
          )
        })() : null}
      </AdminDetailModal>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminBankAccountsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminBankAccounts,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!edit) return
    const fd = new FormData()
    fd.append("action", "edit")
    fd.append("id", String(edit.id))
    fd.append("account_name", String(edit.account_name ?? ""))
    fd.append("bank_name", String(edit.bank_name ?? ""))
    fd.append("account_number", String(edit.account_number ?? ""))
    fd.append("phone_number", String(edit.phone_number ?? edit.phone ?? ""))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminBankAccounts, fd)
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEdit(null)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="ข้อมูลธนาคาร" pageTitle="ข้อมูลบัญชีธนาคารลูกค้า" icon="fa-building-columns">
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ผู้ใช้</th>
              <th>ชื่อบัญชี</th>
              <th>ธนาคาร</th>
              <th>เลขบัญชี</th>
              <th>เบอร์โทร</th>
              <th>แก้ไขล่าสุด</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={8} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={8} message="ยังไม่มีข้อมูลบัญชีธนาคาร" />
            ) : (
              rows.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  <td>{String(row.id ?? "-")}</td>
                  <td>
                    <div className="admin-user-cell-main">
                      {String(row.username ?? `user_${row.user_id ?? "-"}`)}
                    </div>
                    <div className="admin-user-cell-sub">{String(row.phone ?? row.email ?? "-")}</div>
                  </td>
                  <td>{String(row.account_name ?? "-")}</td>
                  <td>{String(row.bank_name ?? "-")}</td>
                  <td>{String(row.account_number ?? "-")}</td>
                  <td>{String(row.phone_number ?? row.phone ?? "-")}</td>
                  <td>{formatAdminDate(String(row.updated_at ?? row.created_at ?? ""))}</td>
                  <td>
                    <button
                      type="button"
                      className="action-btn icon-btn btn-edit"
                      title="แก้ไข"
                      onClick={() => setEdit({ ...row })}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal open={!!edit} title="แก้ไขข้อมูลธนาคาร" onClose={() => setEdit(null)} onSave={save}>
        {edit ? (
          <>
            {[
              { key: "account_name", label: "ชื่อบัญชี" },
              { key: "bank_name", label: "ธนาคาร" },
              { key: "account_number", label: "เลขบัญชี" },
              { key: "phone_number", label: "เบอร์โทร (ไม่บังคับ)" },
            ].map(({ key, label }) => (
              <div className="admin-form-group" key={key}>
                <label>{label}</label>
                <input
                  className="admin-form-control"
                  value={String(edit[key] ?? edit[key === "phone_number" ? "phone" : key] ?? "")}
                  onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                />
              </div>
            ))}
          </>
        ) : null}
      </AdminEditModal>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminWithdrawPasswordsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null)
  const [pin, setPin] = useState("")

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminWithdrawPasswords,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!edit) return
    if (!/^\d{6}$/.test(pin)) {
      showToast("รหัสการถอนต้องเป็นตัวเลข 6 หลัก", "error")
      return
    }
    const fd = new FormData()
    fd.append("action", "edit_password")
    fd.append("id", String(edit.id))
    fd.append("withdraw_password", pin)
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.adminWithdrawPasswords,
      fd,
    )
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEdit(null)
      setPin("")
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="ข้อมูลรหัสถอน" pageTitle="ข้อมูลรหัสถอนเงิน" icon="fa-key">
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ผู้ใช้</th>
              <th>รหัสถอน</th>
              <th>สถานะ</th>
              <th>แก้ไขล่าสุด</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={6} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={6} message="ยังไม่มีข้อมูลรหัสถอน" />
            ) : (
              rows.map((row, i) => {
                const active = Number(row.is_active) === 1
                return (
                  <tr key={String(row.id ?? i)}>
                    <td>{String(row.id ?? "-")}</td>
                    <td>
                      <div className="admin-user-cell-main">
                        {String(row.username ?? `user_${row.user_id ?? "-"}`)}
                      </div>
                      <div className="admin-user-cell-sub">{String(row.phone ?? row.email ?? "-")}</div>
                    </td>
                    <td>
                      <span className="admin-code-pill">
                        {active ? "******" : "ยังไม่ตั้ง"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-badge ${active ? "admin-status-active" : "admin-status-banned"}`}
                      >
                        {active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td>{formatAdminDate(String(row.updated_at ?? row.last_changed_at ?? ""))}</td>
                    <td>
                      <button
                        type="button"
                        className="action-btn icon-btn btn-edit"
                        title="แก้ไขรหัสถอน"
                        onClick={() => {
                          setEdit(row)
                          setPin("")
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal open={!!edit} title="แก้ไขรหัสถอน" onClose={() => { setEdit(null); setPin("") }} onSave={save}>
        <div className="admin-form-group">
          <label>รหัสถอนใหม่ (6 หลัก)</label>
          <input
            className="admin-form-control"
            value={pin}
            maxLength={6}
            inputMode="numeric"
            placeholder="กรอกรหัส 6 หลัก"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </AdminEditModal>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminCustomerTopupPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [allUsers, setAllUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [topupOpen, setTopupOpen] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [amount, setAmount] = useState("")
  const [walletEdit, setWalletEdit] = useState<{ userId: number; balance: number } | null>(null)
  const [editBalance, setEditBalance] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminTopupWallets,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  const loadUsers = useCallback(async () => {
    try {
      setAllUsers(await fetchTopupUsers())
    } catch {
      showToast("โหลดรายชื่อผู้ใช้ไม่สำเร็จ", "error")
    }
  }, [showToast])

  useEffect(() => {
    load()
    loadUsers()
  }, [load, loadUsers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const idText = String(r.user_id ?? "").toLowerCase()
      const phoneText = String(r.phone ?? "").toLowerCase()
      const emailText = String(r.email ?? "").toLowerCase()
      return idText.includes(q) || phoneText.includes(q) || emailText.includes(q)
    })
  }, [rows, search])

  const filteredTopupUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter((u) => {
      const idText = String(u.id ?? "").toLowerCase()
      const phoneText = String(u.phone ?? "").toLowerCase()
      const emailText = String(u.email ?? "").toLowerCase()
      return idText.includes(q) || phoneText.includes(q) || emailText.includes(q)
    })
  }, [allUsers, userSearch])

  useEffect(() => {
    if (topupOpen && filteredTopupUsers.length && !selectedUserId) {
      setSelectedUserId(String(filteredTopupUsers[0].id ?? ""))
    }
  }, [topupOpen, filteredTopupUsers, selectedUserId])

  const doTopup = async () => {
    const userId = Number(selectedUserId)
    const amt = Number(amount)
    if (!userId) return showToast("กรุณาเลือกผู้ใช้ก่อน", "error")
    if (!Number.isFinite(amt) || amt <= 0) return showToast("กรุณากรอกจำนวนเงินให้ถูกต้อง", "error")

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("action", "topup")
      fd.append("user_id", String(userId))
      fd.append("amount", String(amt))
      const res = await adminPost<{ success: boolean; message?: string; balance_after?: number }>(
        API.adminCustomerTopup,
        fd,
      )
      if (res.success) {
        let msg = res.message ?? "เติมเงินสำเร็จ"
        if (res.balance_after != null) msg += ` (ยอดคงเหลือ $${Number(res.balance_after).toFixed(2)})`
        showToast(msg)
        setTopupOpen(false)
        setAmount("")
        setUserSearch("")
        setSelectedUserId("")
        load(true)
      } else showToast(res.message ?? "เติมเงินไม่สำเร็จ", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const saveWalletBalance = async () => {
    if (!walletEdit) return
    const nextBalance = Number(editBalance)
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      showToast("ยอดเงินต้องเป็นตัวเลขและห้ามติดลบ", "error")
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("action", "update_wallet_balance")
      fd.append("user_id", String(walletEdit.userId))
      fd.append("balance", String(nextBalance))
      const res = await adminPost<{ success: boolean; message?: string }>(API.adminCustomerTopup, fd)
      if (res.success) {
        showToast(res.message ?? "แก้ไขยอดเงินสำเร็จ")
        setWalletEdit(null)
        load(true)
      } else showToast(res.message ?? "แก้ไขยอดเงินไม่สำเร็จ", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminPageShell barTitle="เติมเงินลูกค้า" pageTitle="เติมเงินลูกค้า" icon="fa-money-bill-1-wave">
      <div className="admin-topup-trigger-wrap">
        <button type="button" className="admin-open-topup-btn" onClick={() => setTopupOpen(true)}>
          <i className="fa-solid fa-plus" />
          เติมเงิน
        </button>
        <input
          type="text"
          className="admin-wallet-search-input"
          placeholder="ค้นหา ID / เบอร์ / อีเมล"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-card admin-wallet-card">
        <h3 className="admin-wallet-title">
          <i className="fa-solid fa-wallet" />
          ข้อมูลกระเป๋าเงินผู้ใช้
        </h3>
        <AdminTableWrap bare>
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>เบอร์/อีเมล</th>
                <th>ยอดคงเหลือ</th>
                <th>อัปเดตล่าสุด</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {showAdminTableLoading(loading, rows.length) ? (
                <AdminLoadingRow cols={5} />
              ) : filtered.length === 0 ? (
                <AdminEmptyRow
                  cols={5}
                  message={rows.length ? "ไม่พบข้อมูลตามคำค้นหา" : "ยังไม่มีข้อมูลกระเป๋าเงิน"}
                />
              ) : (
                filtered.map((row, i) => (
                  <tr key={String(row.user_id ?? row.id ?? i)}>
                    <td>{String(row.user_id ?? row.id ?? "-")}</td>
                    <td>{String(row.phone ?? row.email ?? "-")}</td>
                    <td>${adminFmtMoney(row.balance ?? row.wallet_balance)}</td>
                    <td>{formatAdminDate(String(row.updated_at ?? row.registered_at ?? ""))}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-wallet-action-btn"
                        onClick={() => {
                          setWalletEdit({
                            userId: Number(row.user_id ?? row.id),
                            balance: Number(row.balance ?? row.wallet_balance ?? 0),
                          })
                          setEditBalance(String(row.balance ?? row.wallet_balance ?? 0))
                        }}
                      >
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableWrap>
      </div>

      <div className={`admin-topup-modal admin-sheet-overlay${topupOpen ? " show" : ""}`} onClick={() => setTopupOpen(false)}>
        <div className="admin-topup-modal-content admin-card admin-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <div className="admin-topup-modal-head admin-sheet-head">
            <span className="admin-sheet-handle" aria-hidden />
            <h3>ป้อนข้อมูลการเติมเงิน</h3>
            <button type="button" className="admin-modal-close-btn" onClick={() => setTopupOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div className="admin-sheet-body">
            <div className="admin-form-group">
              <label>ค้นหาผู้ใช้ (ID / เบอร์ / อีเมล)</label>
              <input
                className="admin-form-control"
                placeholder="พิมพ์เพื่อค้นหา..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setSelectedUserId("")
                }}
              />
            </div>
            <div className="admin-form-group">
              <label>เลือกผู้ใช้</label>
              <select
                className="admin-form-control"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {filteredTopupUsers.length === 0 ? (
                  <option value="">ไม่พบผู้ใช้</option>
                ) : (
                  filteredTopupUsers.map((u) => (
                    <option key={String(u.id)} value={String(u.id)}>
                      ID: {String(u.id)} | {String(u.phone ?? u.email ?? "-")}
                    </option>
                  ))
                )}
              </select>
              <div className="admin-user-hint">
                {filteredTopupUsers.length
                  ? `พบผู้ใช้ ${filteredTopupUsers.length} รายการ`
                  : "ไม่พบผู้ใช้ตามคำค้นหา"}
              </div>
            </div>
            <div className="admin-form-group">
              <label>จำนวนเงินที่ต้องการเติม</label>
              <input
                className="admin-form-control"
                type="number"
                min={1}
                step="0.01"
                placeholder="เช่น 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="admin-sheet-foot">
            <button
              type="button"
              className="admin-submit-topup-btn"
              disabled={submitting}
              onClick={doTopup}
            >
              {submitting ? "กำลังบันทึก..." : "ยืนยันเติมเงิน"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`admin-wallet-edit-modal admin-sheet-overlay${walletEdit ? " show" : ""}`}
        onClick={() => setWalletEdit(null)}
      >
        <div className="admin-wallet-edit-card admin-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <div className="admin-topup-modal-head admin-sheet-head">
            <span className="admin-sheet-handle" aria-hidden />
            <h3>แก้ไขยอดเงิน</h3>
            <button type="button" className="admin-modal-close-btn" onClick={() => setWalletEdit(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div className="admin-sheet-body">
          <div className="admin-form-group">
            <label>กรอกยอดเงินใหม่</label>
            <input
              className="admin-form-control"
              type="number"
              min={0}
              step="0.01"
              placeholder="เช่น 500"
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
            />
          </div>
          </div>
          <div className="admin-wallet-edit-actions admin-sheet-foot">
            <button type="button" className="admin-wallet-edit-btn cancel" onClick={() => setWalletEdit(null)}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="admin-wallet-edit-btn save"
              disabled={submitting}
              onClick={saveWalletBalance}
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminShippingAddressesPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchAdminShippingAddresses())
    } catch {
      showToast("โหลดที่อยู่จัดส่งไม่สำเร็จ", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [row.user_id, row.username, row.phone, row.email, row.receiver_name, row.receiver_phone, row.receiver_address]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q)),
    )
  }, [rows, search])

  return (
    <AdminPageShell barTitle="ที่อยู่จัดส่ง" pageTitle="ที่อยู่จัดส่งของลูกค้า" icon="fa-location-dot">
      <AdminSearchBar value={search} onChange={setSearch} placeholder="ค้นหา User ID / ชื่อผู้ใช้ / เบอร์ / ที่อยู่" />
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ผู้ใช้</th>
              <th>ชื่อผู้รับ</th>
              <th>เบอร์ติดต่อ</th>
              <th>ที่อยู่จัดส่ง</th>
              <th>ค่าเริ่มต้น</th>
              <th>อัปเดตล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={7} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={7} message="ยังไม่มีที่อยู่จัดส่ง" />
            ) : (
              filtered.map((row) => (
                <tr key={`${row.user_id}-${row.id}`}>
                  <td>#{String(row.user_id ?? "-")}</td>
                  <td>
                    <strong>{String(row.username ?? "-")}</strong>
                    <div style={{ color: "#666", fontSize: 12 }}>{String(row.phone || row.email || "-")}</div>
                  </td>
                  <td>{String(row.receiver_name ?? "-")}</td>
                  <td>{String(row.receiver_phone ?? "-")}</td>
                  <td>{String(row.receiver_address ?? "-")}</td>
                  <td>
                    <span className="admin-status-badge admin-finance-status-approved">ค่าเริ่มต้น</span>
                  </td>
                  <td>{formatAdminDate(String(row.updated_at ?? row.created_at ?? ""))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>
      {Toast}
    </AdminPageShell>
  )
}
