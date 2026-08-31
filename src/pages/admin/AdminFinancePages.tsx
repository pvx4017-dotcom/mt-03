import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { API } from "@/lib/apiRoutes"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import {
  AdminConfirmModal,
  AdminEmptyRow,
  AdminLoadingRow,
  AdminSearchBar,
  AdminTableWrap,
  useAdminToast,
} from "@/components/admin/AdminUi"
import {
  adminAsset,
  adminGet,
  adminPost,
  fetchAdminDeposits,
  fetchAdminPaymentLimits,
  fetchAdminWithdrawals,
  formatAdminDate,
} from "@/lib/adminApi"
import { adminFmtMoney } from "@/lib/adminUtils"
import { runAdminListLoad, showAdminTableLoading } from "@/lib/adminLoadHelper"
import { DEFAULT_SELLER_LEVELS, type SellerLevel } from "@/lib/engagement"
import { THAI_BANK_GROUPS } from "@/data/thaiBanks"
import { useBodyClass } from "@/hooks/useBodyClass"

function statusBadgeClass(status: unknown) {
  const s = String(status ?? "").toLowerCase()
  if (s === "approved") return "admin-status-badge admin-finance-status-approved"
  if (s === "cancelled" || s === "rejected") return "admin-status-badge admin-finance-status-cancelled"
  return "admin-status-badge admin-finance-status-pending"
}

function AdminUserChatLink({ userId }: { userId: unknown }) {
  const normalizedUserId = String(userId ?? "").trim()
  if (!/^\d+$/.test(normalizedUserId) || Number(normalizedUserId) <= 0) return <span>-</span>

  return (
    <Link
      to={`/admin/chat?user_id=${encodeURIComponent(normalizedUserId)}`}
      className="admin-action-btn admin-chat-link-btn"
      aria-label={`เปิดแชทกับผู้ใช้ ID ${normalizedUserId}`}
      title={`เปิดแชทกับผู้ใช้ ID ${normalizedUserId}`}
    >
      <i className="fa-solid fa-comments" aria-hidden="true" />
      <span>แชท</span>
    </Link>
  )
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

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: async () => (type === "deposit" ? fetchAdminDeposits() : fetchAdminWithdrawals()),
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [type, rows.length, showToast],
  )

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
      load(true)
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

      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ผู้ใช้</th>
              <th>เลขรายการ</th>
              <th>จำนวนเงิน</th>
              <th>{isWithdraw ? "วิธีรับเงิน" : "ผู้ฝาก"}</th>
              <th>สถานะ</th>
              <th>เวลา</th>
              <th>แชท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={9} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={9} message="ไม่มีรายการ" />
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
                  <td>
                    {isWithdraw
                      ? `${String(row.withdraw_method ?? "-")}${row.payout_destination ? ` · ${String(row.payout_destination)}` : ""}`
                      : `${String(row.channel ?? row.payment_method ?? "-")}${row.payer_name ? ` · ${String(row.payer_name)}` : ""}`}
                  </td>
                  <td>
                    <span className={statusBadgeClass(row.status)}>{String(row.status ?? "-")}</span>
                  </td>
                  <td>{formatAdminDate(String(row.created_at ?? row.requested_at ?? ""))}</td>
                  <td><AdminUserChatLink userId={row.user_id} /></td>
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
      </AdminTableWrap>

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

  const load = useCallback(
    async (silent = false) => {
      if (!silent || history.length === 0) setLoading(true)
      try {
        const data = await fetchAdminPaymentLimits()
        setMinDeposit(String(data.min_deposit ?? ""))
        setMinWithdraw(String(data.min_withdraw ?? ""))
        setHistory(data.limits ?? [])
      } catch {
        showToast("โหลดข้อมูลไม่สำเร็จ", "error")
      } finally {
        if (!silent || history.length === 0) setLoading(false)
      }
    },
    [history.length, showToast],
  )

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
      load(true)
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

      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ฝากขั้นต่ำ</th>
              <th>ถอนขั้นต่ำ</th>
              <th>อัปเดตล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, history.length) ? (
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
      </AdminTableWrap>
      {Toast}
    </AdminPageShell>
  )
}

export function AdminSellerLevelsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<SellerLevel[]>(DEFAULT_SELLER_LEVELS)
  const [edit, setEdit] = useState<SellerLevel | null>(null)

  const load = useCallback(async () => {
    const data = await adminGet<{ success?: boolean; levels?: SellerLevel[] }>(API.adminSellerLevels)
    if (data.levels?.length) setRows(data.levels)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!edit) return
    const fd = new FormData()
    fd.append("id", String(edit.id))
    fd.append("code", edit.code)
    fd.append("name", edit.name)
    fd.append("min_topup", String(edit.min_topup))
    fd.append("commission_rate", edit.commission_rate)
    fd.append("referral_reward", edit.referral_reward)
    fd.append("sort_order", String(edit.sort_order))
    fd.append("is_active", edit.is_active ? "1" : "0")
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminSellerLevels, fd)
    if (!res.success) {
      showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
      return
    }
    showToast("บันทึกระดับผู้ขายแล้ว")
    setEdit(null)
    await load()
  }

  return (
    <AdminPageShell barTitle="จัดการระดับ" pageTitle="จัดการระดับผู้ขาย" icon="fa-ranking-star">
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อระดับ</th>
              <th>ยอดเติมขั้นต่ำ</th>
              <th>ค่าคอมมิชชั่น</th>
              <th>รางวัลแนะนำ</th>
              <th>ลำดับ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.code}</td>
                <td>{row.name}</td>
                <td>${row.min_topup}</td>
                <td>{row.commission_rate}</td>
                <td>{row.referral_reward}</td>
                <td>{row.sort_order}</td>
                <td>{row.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</td>
                <td>
                  <button type="button" className="admin-action-btn edit" onClick={() => setEdit(row)}>
                    แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
      {edit ? (
        <div className="admin-sheet-overlay show" onClick={() => setEdit(null)}>
          <div className="admin-sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-sheet-head">
              <h3>แก้ไขระดับผู้ขาย</h3>
            </div>
            <div className="admin-sheet-body" style={{ display: "grid", gap: 10 }}>
              <input className="admin-form-control" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} />
              <input className="admin-form-control" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <input className="admin-form-control" type="number" value={edit.min_topup} onChange={(e) => setEdit({ ...edit, min_topup: Number(e.target.value) })} />
              <input className="admin-form-control" value={edit.commission_rate} onChange={(e) => setEdit({ ...edit, commission_rate: e.target.value })} />
              <input className="admin-form-control" value={edit.referral_reward} onChange={(e) => setEdit({ ...edit, referral_reward: e.target.value })} />
              <select className="admin-form-control" value={edit.is_active ? "1" : "0"} onChange={(e) => setEdit({ ...edit, is_active: e.target.value === "1" })}>
                <option value="1">เปิดใช้งาน</option>
                <option value="0">ปิดใช้งาน</option>
              </select>
            </div>
            <div className="admin-sheet-foot">
              <button type="button" className="admin-edit-btn cancel" onClick={() => setEdit(null)}>ยกเลิก</button>
              <button type="button" className="admin-edit-btn save" onClick={save}>บันทึก</button>
            </div>
          </div>
        </div>
      ) : null}
      {Toast}
    </AdminPageShell>
  )
}

export function AdminReceivingAccountsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({
    id: "",
    channel: "bank",
    account_name: "",
    account_number: "",
    network: "",
    note: "",
    qr_image: "",
    is_active: "1",
    sort_order: "0",
  })
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [removeQr, setRemoveQr] = useState(false)
  const qrObjectUrl = useMemo(() => (qrFile ? URL.createObjectURL(qrFile) : ""), [qrFile])
  const qrPreview = qrObjectUrl || (form.qr_image ? adminAsset(form.qr_image) : "")

  useEffect(() => {
    return () => {
      if (qrObjectUrl) URL.revokeObjectURL(qrObjectUrl)
    }
  }, [qrObjectUrl])

  const resetForm = () => {
    setForm({
      id: "",
      channel: "bank",
      account_name: "",
      account_number: "",
      network: "",
      note: "",
      qr_image: "",
      is_active: "1",
      sort_order: "0",
    })
    setQrFile(null)
    setRemoveQr(false)
  }

  const load = useCallback(async () => {
    const data = await adminGet<{ accounts?: Record<string, unknown>[] }>(API.adminReceivingAccounts)
    setRows(data.accounts ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    const fd = new FormData()
    if (form.id) fd.append("id", form.id)
    fd.append("channel", form.channel)
    fd.append("account_name", form.account_name)
    fd.append("account_number", form.account_number)
    fd.append("network", form.network)
    fd.append("note", form.note)
    fd.append("qr_image_path", form.qr_image)
    fd.append("remove_qr", removeQr ? "1" : "0")
    if (qrFile) fd.append("qr_image", qrFile)
    fd.append("is_active", form.is_active)
    fd.append("sort_order", form.sort_order)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminReceivingAccounts, fd)
    if (!res.success) {
      showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
      return
    }
    showToast("บันทึกบัญชีรับเงินแล้ว")
    resetForm()
    await load()
  }

  const remove = async (id: number) => {
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(id))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminReceivingAccounts, fd)
    if (res.success) {
      showToast("ลบแล้ว")
      await load()
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="บัญชีรับเงินบริษัท" pageTitle="บัญชีรับเงินตอนฝาก" icon="fa-building-columns">
      <div className="admin-card" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div className="admin-form-row">
          <select className="admin-form-control" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            <option value="bank">bank</option>
            <option value="usdt">usdt</option>
            <option value="eth">eth</option>
            <option value="btc">btc</option>
          </select>
          <input className="admin-form-control" placeholder="ชื่อบัญชี" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          <input className="admin-form-control" placeholder="เลขบัญชี / ที่อยู่" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
        </div>
        <div className="admin-form-row">
          {form.channel === "bank" ? (
            <select
              className="admin-form-control"
              value={form.network}
              onChange={(e) => setForm({ ...form, network: e.target.value })}
            >
              <option value="">เลือกธนาคาร</option>
              {form.network && !THAI_BANK_GROUPS.some((g) => g.banks.some((b) => b.value === form.network)) ? (
                <option value={form.network}>{form.network}</option>
              ) : null}
              {THAI_BANK_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.banks.map((bank) => (
                    <option key={bank.value} value={bank.value}>
                      {bank.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <input
              className="admin-form-control"
              placeholder="เครือข่าย / ธนาคาร"
              value={form.network}
              onChange={(e) => setForm({ ...form, network: e.target.value })}
            />
          )}
          <input className="admin-form-control" placeholder="หมายเหตุ" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="button" className="admin-submit-btn" onClick={save}>{form.id ? "อัปเดต" : "เพิ่มบัญชี"}</button>
        </div>
        <div className="admin-receiving-qr-editor">
          <div className="admin-form-group">
            <label>QR Code สำหรับรับเงิน (PNG, JPG หรือ WebP ไม่เกิน 5 MB)</label>
            <input
              className="admin-form-control"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                if (file && file.size > 5 * 1024 * 1024) {
                  showToast("รูป QR Code ต้องมีขนาดไม่เกิน 5 MB", "error")
                  e.target.value = ""
                  return
                }
                setQrFile(file)
                if (file) setRemoveQr(false)
              }}
            />
          </div>
          {qrPreview ? (
            <div className="admin-receiving-qr-preview">
              <img src={qrPreview} alt={`QR Code ${form.channel}`} />
              <button
                type="button"
                className="admin-action-btn cancel"
                onClick={() => {
                  setQrFile(null)
                  setForm((current) => ({ ...current, qr_image: "" }))
                  setRemoveQr(true)
                }}
              >
                ลบ QR Code
              </button>
            </div>
          ) : (
            <div className="admin-receiving-qr-empty">
              <i className="fa-solid fa-qrcode" aria-hidden /> ยังไม่ได้เพิ่ม QR Code
            </div>
          )}
        </div>
      </div>
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ช่องทาง</th>
              <th>ชื่อบัญชี</th>
              <th>เลขบัญชี</th>
              <th>เครือข่าย</th>
              <th>QR Code</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow cols={7} message="ยังไม่มีบัญชีรับเงิน" />
            ) : (
              rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>{String(row.channel ?? "-")}</td>
                  <td>{String(row.account_name ?? "-")}</td>
                  <td>{String(row.account_number ?? "-")}</td>
                  <td>{String(row.network ?? "-")}</td>
                  <td>
                    {row.qr_image ? (
                      <img
                        className="admin-receiving-qr-thumb"
                        src={adminAsset(String(row.qr_image))}
                        alt={`QR Code ${String(row.channel ?? "")}`}
                      />
                    ) : "-"}
                  </td>
                  <td>{row.is_active ? "เปิด" : "ปิด"}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-action-btn edit"
                      onClick={() => {
                        setForm({
                          id: String(row.id ?? ""),
                          channel: String(row.channel ?? "bank"),
                          account_name: String(row.account_name ?? ""),
                          account_number: String(row.account_number ?? ""),
                          network: String(row.network ?? ""),
                          note: String(row.note ?? ""),
                          qr_image: String(row.qr_image ?? ""),
                          is_active: row.is_active ? "1" : "0",
                          sort_order: String(row.sort_order ?? 0),
                        })
                        setQrFile(null)
                        setRemoveQr(false)
                      }}
                    >
                      แก้ไข
                    </button>
                    <button type="button" className="admin-action-btn cancel" onClick={() => remove(Number(row.id))}>ลบ</button>
                  </td>
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

export function AdminLoansPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ id: number; status: string; amount: number } | null>(null)

  const load = useCallback(async (silent = false) => {
    await runAdminListLoad({
      silent,
      hasRows: rows.length > 0,
      setLoading,
      fetchRows: async () => {
        const data = await adminGet<{ success?: boolean; message?: string; items?: Record<string, unknown>[] }>(API.adminLoans)
        if (data.success === false) throw new Error(data.message ?? "โหลดคำขอสินเชื่อไม่สำเร็จ")
        return data.items ?? []
      },
      onRows: setRows,
      onError: (message) => showToast(message, "error"),
    })
  }, [rows.length, showToast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" || String(row.status ?? "").toLowerCase() === statusFilter
      if (!matchesStatus) return false
      if (!query) return true
      return [row.id, row.user_id, row.full_name, row.phone, row.username, row.email]
        .some((value) => String(value ?? "").toLowerCase().includes(query))
    })
  }, [rows, search, statusFilter])

  const applyStatus = async () => {
    if (!confirm || busy) return
    const action = confirm
    setConfirm(null)
    setBusy(true)
    const fd = new FormData()
    fd.append("id", String(action.id))
    fd.append("status", action.status)
    try {
      const res = await adminPost<{ success: boolean; message?: string; balance_after?: number }>(API.adminLoans, fd)
      if (res.success) {
        showToast(res.message ?? "อัปเดตสถานะแล้ว")
        await load(true)
      } else {
        showToast(res.message ?? "ดำเนินการไม่สำเร็จ", "error")
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ", "error")
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = (value: unknown) => {
    const status = String(value ?? "pending").toLowerCase()
    if (status === "approved") return "อนุมัติแล้ว"
    if (status === "rejected") return "ปฏิเสธแล้ว"
    if (status === "reviewing") return "กำลังพิจารณา"
    return "รอตรวจสอบ"
  }

  return (
    <AdminPageShell barTitle="สินเชื่อลูกค้า" pageTitle="คำขอสินเชื่อ" icon="fa-hand-holding-dollar">
      <div className="admin-finance-toolbar">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="ค้นหา ID ผู้ใช้ ชื่อ เบอร์ หรืออีเมล..." />
        <select className="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">สถานะทั้งหมด</option>
          <option value="pending">รอตรวจสอบ</option>
          <option value="reviewing">กำลังพิจารณา</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธแล้ว</option>
        </select>
        <span className="admin-finance-count">{filtered.length} รายการ</span>
      </div>
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ผู้ใช้</th>
              <th>ชื่อ</th>
              <th>เบอร์</th>
              <th>ยอด</th>
              <th>สถานะ</th>
              <th>วันที่ยื่น</th>
              <th>แชท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={9} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={9} message="ไม่พบคำขอสินเชื่อ" />
            ) : (
              filtered.map((row) => {
                const status = String(row.status ?? "pending").toLowerCase()
                const actionable = status === "pending" || status === "reviewing"
                return (
                <tr key={String(row.id)}>
                  <td>{String(row.id)}</td>
                  <td>
                    <div className="admin-user-cell-main">#{String(row.user_id)}</div>
                    <div className="admin-user-cell-sub">{String(row.username ?? row.email ?? "-")}</div>
                  </td>
                  <td>{String(row.full_name ?? "-")}</td>
                  <td>{String(row.phone ?? "-")}</td>
                  <td>${adminFmtMoney(row.amount)}</td>
                  <td><span className={statusBadgeClass(status)}>{statusLabel(status)}</span></td>
                  <td>{formatAdminDate(String(row.created_at ?? ""))}</td>
                  <td><AdminUserChatLink userId={row.user_id} /></td>
                  <td>
                    {actionable ? (
                      <div className="admin-manage-actions">
                        {status === "pending" ? (
                          <button type="button" className="admin-action-btn" disabled={busy} onClick={() => setConfirm({ id: Number(row.id), status: "reviewing", amount: Number(row.amount) })}>พิจารณา</button>
                        ) : null}
                        <button type="button" className="admin-action-btn approve" disabled={busy} onClick={() => setConfirm({ id: Number(row.id), status: "approved", amount: Number(row.amount) })}>อนุมัติ</button>
                        <button type="button" className="admin-action-btn cancel" disabled={busy} onClick={() => setConfirm({ id: Number(row.id), status: "rejected", amount: Number(row.amount) })}>ปฏิเสธ</button>
                      </div>
                    ) : (
                      <span className="admin-user-cell-sub">ดำเนินการแล้ว</span>
                    )}
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </AdminTableWrap>
      <AdminConfirmModal
        open={Boolean(confirm)}
        title={confirm?.status === "approved" ? "ยืนยันอนุมัติสินเชื่อ" : confirm?.status === "rejected" ? "ยืนยันปฏิเสธสินเชื่อ" : "รับเรื่องพิจารณา"}
        message={
          confirm?.status === "approved"
            ? `ระบบจะเพิ่มวงเงิน $${adminFmtMoney(confirm.amount)} เข้ากระเป๋าผู้ใช้ทันที และไม่สามารถย้อนสถานะได้`
            : confirm?.status === "rejected"
              ? "รายการจะถูกปฏิเสธและไม่สามารถย้อนสถานะได้"
              : "เปลี่ยนสถานะรายการเป็นกำลังพิจารณา"
        }
        onCancel={() => setConfirm(null)}
        onConfirm={applyStatus}
      />
      {Toast}
    </AdminPageShell>
  )
}

export function AdminCouponsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({
    id: "",
    code: "",
    title: "",
    description: "",
    value_label: "",
    expires_at: "",
    is_active: "1",
  })

  const load = useCallback(async () => {
    const data = await adminGet<{ items?: Record<string, unknown>[] }>(API.adminCoupons)
    setRows(data.items ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    const fd = new FormData()
    if (form.id) fd.append("id", form.id)
    fd.append("code", form.code)
    fd.append("title", form.title)
    fd.append("description", form.description)
    fd.append("value_label", form.value_label)
    fd.append("expires_at", form.expires_at)
    fd.append("is_active", form.is_active)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminCoupons, fd)
    if (!res.success) {
      showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
      return
    }
    showToast("บันทึกคูปองแล้ว")
    setForm({ id: "", code: "", title: "", description: "", value_label: "", expires_at: "", is_active: "1" })
    await load()
  }

  const remove = async (id: number) => {
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(id))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminCoupons, fd)
    if (res.success) {
      showToast("ลบแล้ว")
      await load()
    }
  }

  return (
    <AdminPageShell barTitle="คูปอง" pageTitle="จัดการคูปอง" icon="fa-ticket">
      <div className="admin-card" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div className="admin-form-row">
          <input className="admin-form-control" placeholder="โค้ด" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="admin-form-control" placeholder="ชื่อ" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="admin-form-control" placeholder="มูลค่า เช่น 50฿" value={form.value_label} onChange={(e) => setForm({ ...form, value_label: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <input className="admin-form-control" placeholder="รายละเอียด" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="admin-form-control" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <button type="button" className="admin-submit-btn" onClick={save}>{form.id ? "อัปเดต" : "เพิ่มคูปอง"}</button>
        </div>
      </div>
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>โค้ด</th>
              <th>ชื่อ</th>
              <th>มูลค่า</th>
              <th>หมดอายุ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow cols={6} message="ยังไม่มีคูปอง" />
            ) : (
              rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>{String(row.code)}</td>
                  <td>{String(row.title)}</td>
                  <td>{String(row.value_label ?? "-")}</td>
                  <td>{String(row.expires_at ?? "-")}</td>
                  <td>{row.is_active ? "เปิด" : "ปิด"}</td>
                  <td>
                    <button type="button" className="admin-action-btn edit" onClick={() => setForm({
                      id: String(row.id ?? ""),
                      code: String(row.code ?? ""),
                      title: String(row.title ?? ""),
                      description: String(row.description ?? ""),
                      value_label: String(row.value_label ?? ""),
                      expires_at: String(row.expires_at ?? "").slice(0, 10),
                      is_active: row.is_active ? "1" : "0",
                    })}>แก้ไข</button>
                    <button type="button" className="admin-action-btn cancel" onClick={() => remove(Number(row.id))}>ลบ</button>
                  </td>
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

export function AdminFeedbackPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    adminGet<{ items?: Record<string, unknown>[] }>(API.adminFeedback)
      .then((data) => setRows(data.items ?? []))
      .catch(() => showToast("โหลดไม่สำเร็จ", "error"))
  }, [showToast])

  return (
    <AdminPageShell barTitle="ข้อเสนอแนะ" pageTitle="กล่องรับเรื่องจากลูกค้า" icon="fa-inbox">
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้ใช้</th>
              <th>ประเภท</th>
              <th>หัวข้อ</th>
              <th>รายละเอียด</th>
              <th>ติดต่อ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow cols={6} message="ยังไม่มีเรื่อง" />
            ) : (
              rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>{formatAdminDate(String(row.created_at ?? ""))}</td>
                  <td>#{String(row.user_id ?? "-")}</td>
                  <td>{String(row.ftype ?? "-")}</td>
                  <td>{String(row.subject ?? "-")}</td>
                  <td>{String(row.detail ?? "-")}</td>
                  <td>{String(row.contact ?? "-")}</td>
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
