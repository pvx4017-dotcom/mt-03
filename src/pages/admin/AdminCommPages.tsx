import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import {
  AdminConfirmModal,
  AdminEditModal,
  AdminEmptyRow,
  AdminLoadingRow,
  AdminTableWrap,
  useAdminToast,
} from "@/components/admin/AdminUi"
import {
  adminAsset,
  adminPost,
  fetchAdminNotifications,
  fetchAdminSlideImages,
  fetchAdminUsers,
  fetchChatMessages,
  fetchChatThreads,
  formatAdminDate,
  type AdminSlide,
} from "@/lib/adminApi"
import { AdminTopBar } from "@/components/admin/AdminTopBar"
import { runAdminListLoad, showAdminTableLoading } from "@/lib/adminLoadHelper"
import { useBodyClass } from "@/hooks/useBodyClass"

export function AdminSlideImagesPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<AdminSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editFile, setEditFile] = useState<File | null>(null)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminSlideImages,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const upload = async () => {
    if (!file) return showToast("เลือกรูปก่อน", "error")
    const fd = new FormData()
    fd.append("action", "create")
    fd.append("slide_image", file)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminSlideImages, fd)
    if (res.success) {
      showToast("อัปโหลดสำเร็จ")
      setFile(null)
      load(true)
    } else showToast(res.message ?? "อัปโหลดไม่สำเร็จ", "error")
  }

  const saveEdit = async () => {
    if (editId == null || !editFile) return showToast("เลือกรูปใหม่", "error")
    const fd = new FormData()
    fd.append("action", "update")
    fd.append("id", String(editId))
    fd.append("slide_image", editFile)
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminSlideImages, fd)
    if (res.success) {
      showToast("แก้ไขสำเร็จ")
      setEditId(null)
      setEditFile(null)
      load(true)
    } else showToast(res.message ?? "แก้ไขไม่สำเร็จ", "error")
  }

  const deleteSlide = async () => {
    if (confirmId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(confirmId))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminSlideImages, fd)
    if (res.success) {
      showToast("ลบสำเร็จ")
      setConfirmId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="รูปสไลด์" pageTitle="จัดการรูปสไลด์" icon="fa-images">
      <div className="admin-card">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>อัปโหลดรูปสไลด์</label>
            <input className="admin-form-control" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="admin-form-group admin-form-group-action">
            <label>.</label>
            <button type="button" className="admin-submit-btn" onClick={upload}>อัปโหลด</button>
          </div>
        </div>
      </div>

      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>รูป</th>
              <th>ไฟล์</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={5} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={5} message="ยังไม่มีสไลด์" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td><img className="admin-thumb" src={adminAsset(row.slide_image)} alt="" style={{ width: 80, height: 48, objectFit: "cover" }} /></td>
                  <td>{row.slide_image}</td>
                  <td>{formatAdminDate(row.created_at)}</td>
                  <td>
                    <div className="admin-manage-actions">
                      <button type="button" className="admin-action-btn edit" onClick={() => { setEditId(row.id); setEditFile(null) }}>แก้ไข</button>
                      <button type="button" className="admin-action-btn delete" onClick={() => setConfirmId(row.id)}>ลบ</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal open={editId != null} title="แก้ไขรูปสไลด์" onClose={() => setEditId(null)} onSave={saveEdit}>
        <div className="admin-form-group">
          <label>เลือกรูปใหม่</label>
          <input className="admin-form-control" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
        </div>
      </AdminEditModal>

      <AdminConfirmModal open={confirmId != null} title="ยืนยันการลบ" message="ต้องการลบสไลด์นี้หรือไม่?" onCancel={() => setConfirmId(null)} onConfirm={deleteSlide} />
      {Toast}
    </AdminPageShell>
  )
}

const NOTIF_TYPES: Record<string, string> = {
  service: "บริการลูกค้า",
  customer_service: "บริการลูกค้า",
  platform: "แพลตฟอร์ม",
  personal: "ส่วนตัว",
}

export function AdminNotificationsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [history, setHistory] = useState<Record<string, unknown>[]>([])
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(0)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [userSearch, setUserSearch] = useState("")
  const [form, setForm] = useState({
    notification_type: "platform",
    recipient_mode: "all",
    target_user_id: "",
    title: "",
    message: "",
  })

  const load = useCallback(
    async (silent = false) => {
      if (!silent || history.length === 0) setLoading(true)
      try {
        const [rows, u] = await Promise.all([fetchAdminNotifications(), fetchAdminUsers()])
        setHistory(rows)
        setUsers(u.map((x) => ({ id: x.id, phone: x.phone, email: x.email })))
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

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users.slice(0, 50)
    return users.filter((u) =>
      String(u.id).includes(q) || String(u.phone ?? "").toLowerCase().includes(q) || String(u.email ?? "").toLowerCase().includes(q),
    ).slice(0, 50)
  }, [users, userSearch])

  const save = async () => {
    if (!form.title.trim() || !form.message.trim()) return showToast("กรุณากรอกหัวข้อและข้อความ", "error")
    if (form.recipient_mode === "one" && !form.target_user_id) return showToast("กรุณาเลือกผู้ใช้", "error")
    const fd = new FormData()
    fd.append("action", editId > 0 ? "update" : "create")
    fd.append("id", String(editId || ""))
    fd.append("notification_type", form.notification_type)
    fd.append("recipient_mode", form.recipient_mode)
    fd.append("target_user_id", form.target_user_id)
    fd.append("title", form.title.trim())
    fd.append("message", form.message.trim())
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminNotifications, fd)
    if (res.success) {
      showToast(editId > 0 ? "แก้ไขแล้ว" : "ส่งแจ้งเตือนแล้ว")
      setEditId(0)
      setForm({ notification_type: "platform", recipient_mode: "all", target_user_id: "", title: "", message: "" })
      load(true)
    } else showToast(res.message ?? "ไม่สำเร็จ", "error")
  }

  const deleteNotif = async () => {
    if (deleteId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(deleteId))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminNotifications, fd)
    if (res.success) {
      showToast("ลบแล้ว")
      setDeleteId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  const startEdit = (row: Record<string, unknown>) => {
    setEditId(Number(row.id))
    setForm({
      notification_type: String(row.notification_type ?? row.ntype ?? "platform"),
      recipient_mode: String(row.recipient_mode ?? "all"),
      target_user_id: String(row.target_user_id ?? ""),
      title: String(row.title ?? ""),
      message: String(row.message ?? ""),
    })
  }

  return (
    <AdminPageShell barTitle="การแจ้งเตือน" pageTitle="ส่งข้อความถึงผู้ใช้ (3 รูปแบบ)" icon="fa-bell">
      <div className="admin-card">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>ประเภท</label>
            <select className="admin-form-control" value={form.notification_type} onChange={(e) => setForm({ ...form, notification_type: e.target.value })}>
              <option value="service">บริการลูกค้า</option>
              <option value="platform">แพลตฟอร์ม</option>
              <option value="personal">ส่วนตัว</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>ผู้รับ</label>
            <select className="admin-form-control" value={form.recipient_mode} onChange={(e) => setForm({ ...form, recipient_mode: e.target.value })}>
              <option value="all">ทุกคน</option>
              <option value="one">รายบุคคล</option>
            </select>
          </div>
        </div>
        {form.recipient_mode === "one" ? (
          <>
            <div className="admin-form-group admin-user-picker-wrap">
              <label>ค้นหาผู้ใช้ (ID / เบอร์ / อีเมล)</label>
              <input className="admin-form-control" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="พิมพ์เพื่อค้นหา…" />
              {userSearch ? (
                <div className="admin-user-picker-list">
                  {filteredUsers.map((u) => (
                    <button key={String(u.id)} type="button" className="admin-user-picker-item" onClick={() => { setForm({ ...form, target_user_id: String(u.id) }); setUserSearch(`ID: ${u.id}`) }}>
                      ID: {String(u.id)} | {String(u.phone ?? u.email ?? "-")}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="admin-form-group">
              <label>User ID ที่เลือก</label>
              <input className="admin-form-control" value={form.target_user_id} onChange={(e) => setForm({ ...form, target_user_id: e.target.value })} />
            </div>
          </>
        ) : null}
        <div className="admin-form-group">
          <label>หัวข้อ</label>
          <input className="admin-form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="admin-form-group">
          <label>ข้อความ</label>
          <textarea className="admin-form-control" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button type="button" className="admin-submit-btn" onClick={save}>
          {editId > 0 ? "บันทึกการแก้ไข" : "ส่งข้อความ"}
        </button>
        {editId > 0 ? (
          <button type="button" className="admin-edit-btn cancel" style={{ marginLeft: 8 }} onClick={() => { setEditId(0); setForm({ notification_type: "platform", recipient_mode: "all", target_user_id: "", title: "", message: "" }) }}>
            ยกเลิกแก้ไข
          </button>
        ) : null}
      </div>

      <div className="admin-card">
        <div className="admin-history-head">
          <h3>รายการแจ้งเตือนล่าสุด</h3>
          <button type="button" className="admin-history-refresh" onClick={() => load(true)}>
            <i className="fa-solid fa-rotate-right" /> รีเฟรช
          </button>
        </div>
        {showAdminTableLoading(loading, history.length) ? (
          <p className="admin-empty-row">กำลังโหลด…</p>
        ) : history.length === 0 ? (
          <p className="admin-empty-row">ยังไม่มีประวัติ</p>
        ) : (
          <div className="admin-notif-history">
            {history.map((row, i) => (
              <article key={String(row.id ?? i)} className="admin-history-card">
                <div className="admin-history-card-head">
                  <div>
                    <div className="admin-history-card-title">{String(row.title ?? "-")}</div>
                    <div className="admin-history-card-meta">
                      {NOTIF_TYPES[String(row.notification_type)] ?? String(row.notification_type)} • ผู้รับ: {String(row.recipient_mode === "one" ? `User ${row.target_user_id}` : "ทุกคน")} • {formatAdminDate(String(row.created_at ?? ""))}
                    </div>
                  </div>
                  <div className="admin-history-menu">
                    <button type="button" className="edit" onClick={() => startEdit(row)}>แก้ไข</button>
                    <button type="button" className="delete" onClick={() => setDeleteId(Number(row.id))}>ลบ</button>
                  </div>
                </div>
                <div className="admin-history-card-msg">{String(row.message ?? "")}</div>
              </article>
            ))}
          </div>
        )}
      </div>

      <AdminConfirmModal open={deleteId != null} title="ยืนยันการลบ" message="ต้องการลบข้อความนี้ใช่หรือไม่?" onCancel={() => setDeleteId(null)} onConfirm={deleteNotif} />
      {Toast}
    </AdminPageShell>
  )
}

function renderChatBody(msg: string, onImageClick?: (url: string) => void) {
  if (msg.startsWith("CHATIMG:")) {
    const rel = msg.slice(8).trim()
    if (/^uploads\/support_chat\//.test(rel)) {
      const url = adminAsset(rel)
      return (
        <img
          className="bubble-chat-img"
          src={url}
          alt="รูปแชท"
          style={{ cursor: onImageClick ? "pointer" : undefined }}
          onClick={() => onImageClick?.(url)}
        />
      )
    }
    return "[รูปภาพ]"
  }
  return msg
}

function chatRowsSignature(rows: Record<string, unknown>[]) {
  if (!rows.length) return "0"
  const last = rows[rows.length - 1]
  return `${rows.length}:${String(last.id ?? "")}:${String(last.created_at ?? "")}`
}

function threadsSignature(rows: Record<string, unknown>[]) {
  return rows
    .map(
      (t) =>
        `${String(t.user_id ?? "")}:${String(t.last_at ?? "")}:${String(t.message_count ?? "")}:${String(t.last_message ?? t.message ?? "")}`,
    )
    .join("|")
}

export function AdminChatPage() {
  useBodyClass("admin-page admin-chat-page")
  const { showToast, Toast } = useAdminToast()
  const [view, setView] = useState<"list" | "chat">("list")
  const [threads, setThreads] = useState<Record<string, unknown>[]>([])
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, unknown>[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [menu, setMenu] = useState<{ id: number; x: number; y: number; canEdit: boolean } | null>(null)
  const [editMsg, setEditMsg] = useState<{ id: number; text: string } | null>(null)
  const [deleteMsgId, setDeleteMsgId] = useState<number | null>(null)
  const [imageViewer, setImageViewer] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesBoxRef = useRef<HTMLDivElement>(null)
  const threadsSigRef = useRef("")
  const messagesSigRef = useRef("")

  const scrollMessagesToEnd = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" })
    })
  }, [])

  const isNearBottom = useCallback(() => {
    const el = messagesBoxRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 96
  }, [])

  useEffect(() => {
    document.body.setAttribute("data-view", view)
    return () => document.body.removeAttribute("data-view")
  }, [view])

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) {
      setThreadsLoading(true)
      setThreadsError(null)
    }
    try {
      const rows = await fetchChatThreads()
      const sig = threadsSignature(rows)
      if (sig !== threadsSigRef.current) {
        threadsSigRef.current = sig
        setThreads(rows)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "โหลดรายการแชทไม่สำเร็จ"
      setThreadsError(message)
      if (!silent) {
        setThreads([])
        showToast(message, "error")
      }
    } finally {
      if (!silent) setThreadsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadThreads(false)
    const t = setInterval(() => loadThreads(true), 15000)
    return () => clearInterval(t)
  }, [loadThreads])

  const loadMessages = useCallback(
    async (uid: string, options?: { silent?: boolean; scroll?: boolean }) => {
      const silent = options?.silent ?? false
      const scroll = options?.scroll ?? !silent
      if (!silent) setMessagesLoading(true)
      try {
        const rows = await fetchChatMessages(uid)
        const sig = chatRowsSignature(rows)
        const changed = sig !== messagesSigRef.current
        if (changed) {
          const stick = scroll || isNearBottom()
          messagesSigRef.current = sig
          setMessages(rows)
          if (stick) scrollMessagesToEnd(silent ? "auto" : "smooth")
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "โหลดข้อความไม่สำเร็จ"
        if (!silent) {
          showToast(message, "error")
          setMessages([])
          messagesSigRef.current = ""
        }
      } finally {
        if (!silent) setMessagesLoading(false)
      }
    },
    [isNearBottom, scrollMessagesToEnd, showToast],
  )

  useEffect(() => {
    if (!activeUser) return
    messagesSigRef.current = ""
    loadMessages(activeUser, { silent: false, scroll: true })
    const t = setInterval(() => loadMessages(activeUser, { silent: true }), 5000)
    return () => clearInterval(t)
  }, [activeUser, loadMessages])

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) => {
      const uid = String(t.user_id ?? "")
      const phone = String(t.phone ?? "")
      const email = String(t.email ?? "")
      const last = String(t.last_message ?? t.message ?? "")
      return uid.includes(q) || phone.toLowerCase().includes(q) || email.toLowerCase().includes(q) || last.toLowerCase().includes(q)
    })
  }, [threads, search])

  const openChat = async (uid: string) => {
    setActiveUser(uid)
    setView("chat")
    const fd = new FormData()
    fd.append("mode", "reset_message_count")
    fd.append("user_id", uid)
    await adminPost(API.supportChat, fd).catch(() => {})
    loadThreads(true)
  }

  const sendMessage = async () => {
    if (!activeUser || !text.trim()) return
    const fd = new FormData()
    fd.append("sender_type", "admin")
    fd.append("user_id", activeUser)
    fd.append("message", text.trim())
    const res = await adminPost<{ success: boolean; message?: string }>(API.supportChat, fd)
    if (res.success) {
      setText("")
      messagesSigRef.current = ""
      await loadMessages(activeUser, { silent: true, scroll: true })
      loadThreads(true)
    } else showToast(res.message ?? "ส่งไม่สำเร็จ", "error")
  }

  const sendImage = async (file: File) => {
    if (!activeUser) return
    const fd = new FormData()
    fd.append("mode", "upload_image")
    fd.append("sender_type", "admin")
    fd.append("user_id", activeUser)
    fd.append("image", file)
    const res = await adminPost<{ success: boolean; message?: string }>(API.supportChat, fd)
    if (res.success) {
      messagesSigRef.current = ""
      await loadMessages(activeUser, { silent: true, scroll: true })
      loadThreads(true)
    } else showToast(res.message ?? "อัปโหลดรูปไม่สำเร็จ", "error")
  }

  const saveEditMessage = async () => {
    if (!activeUser || !editMsg) return
    const fd = new FormData()
    fd.append("mode", "update_message")
    fd.append("message_id", String(editMsg.id))
    fd.append("user_id", activeUser)
    fd.append("message", editMsg.text.trim())
    const res = await adminPost<{ success: boolean }>(API.supportChat, fd)
    if (res.success) {
      setEditMsg(null)
      messagesSigRef.current = ""
      loadMessages(activeUser, { silent: true })
    } else showToast("แก้ไขไม่สำเร็จ", "error")
  }

  const deleteMessage = async () => {
    if (!activeUser || deleteMsgId == null) return
    const fd = new FormData()
    fd.append("mode", "delete_message")
    fd.append("message_id", String(deleteMsgId))
    fd.append("user_id", activeUser)
    const res = await adminPost<{ success: boolean }>(API.supportChat, fd)
    if (res.success) {
      setDeleteMsgId(null)
      messagesSigRef.current = ""
      loadMessages(activeUser, { silent: true })
    } else showToast("ลบไม่สำเร็จ", "error")
  }

  let lastDay = ""
  const messageNodes = messages.map((m, i) => {
    const raw = String(m.message ?? "")
    const isAdmin = String(m.sender_type ?? m.sender) === "admin"
    const dt = new Date(String(m.created_at ?? ""))
    const dayKey = Number.isFinite(dt.getTime()) ? dt.toLocaleDateString("th-TH") : ""
    const divider = dayKey && dayKey !== lastDay ? (
      <div key={`d-${i}`} className="admin-chat-date-divider">{dayKey}</div>
    ) : null
    if (dayKey) lastDay = dayKey
    const timeStr = Number.isFinite(dt.getTime()) ? dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : ""
    return (
      <div
        key={String(m.id ?? i)}
        className={`admin-chat-row${isAdmin ? " admin-chat-row--out" : " admin-chat-row--in"}`}
      >
        {divider}
        <div className={`admin-chat-bubble ${isAdmin ? "admin" : "user"}${isAdmin ? " with-actions" : ""}`}>
          {isAdmin ? (
            <button type="button" className="admin-chat-msg-actions" onClick={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect()
              setMenu({ id: Number(m.id), x: rect.left, y: rect.bottom + 4, canEdit: !raw.startsWith("CHATIMG:") })
            }}>
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>
          ) : null}
          {renderChatBody(raw, setImageViewer)}
          <time>{timeStr}</time>
        </div>
      </div>
    )
  })

  const activeThread = threads.find((t) => String(t.user_id) === activeUser)
  const headLabel = activeUser
    ? `คุยกับ ID: ${activeUser}${activeThread?.phone || activeThread?.email ? ` (${String(activeThread.phone ?? activeThread.email)})` : ""}`
    : "เลือกผู้ใช้เพื่อเริ่มแชท"

  return (
    <>
      <AdminTopBar title={view === "chat" ? headLabel : "แชท์ผู้ใช้"} backTo="/admin" />
      <div className="admin-chat-layout">
        <div className={`admin-chat-body${view === "chat" ? " chat-open" : ""}`}>
          <aside className="admin-chat-sidebar">
            <div className="sidebar-head" style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", fontWeight: 700 }}>
              <span>บทสนทนา ({filteredThreads.length})</span>
            </div>
            <div className="thread-search-wrap" style={{ display: "flex", padding: 8, gap: 8, borderBottom: "1px solid #e5e7eb" }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: "#9ca3af", alignSelf: "center" }} />
              <input placeholder="ค้นหา ID / เบอร์ / ข้อความ…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px" }} />
            </div>
            <div className="thread-list" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {threadsLoading && threads.length === 0 ? (
                <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>กำลังโหลดบทสนทนา...</div>
              ) : threadsError && threads.length === 0 ? (
                <div style={{ padding: 16, color: "#dc2626", fontSize: 13 }}>{threadsError}</div>
              ) : filteredThreads.length === 0 ? (
                <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>ยังไม่มีแชทในระบบ</div>
              ) : (
                filteredThreads.map((t, i) => {
                  const uid = String(t.user_id ?? i)
                  const unread = Number(t.message_count ?? 0)
                  const contact = String(t.phone ?? t.email ?? "")
                  return (
                    <button key={uid} type="button" className={`admin-thread-item${activeUser === uid ? " active" : ""}`} onClick={() => openChat(uid)}>
                      <div className="admin-thread-avatar-wrap">
                        <div className="admin-thread-avatar"><i className="fa-solid fa-user" /></div>
                        {unread > 0 ? <span className="admin-thread-unread">{unread > 99 ? "99+" : unread}</span> : null}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>ID: {uid}{contact ? ` (${contact})` : ""}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(t.last_message ?? t.message ?? "")}</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="admin-chat-panel">
            {activeUser ? (
              <>
                <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
                  <button type="button" className="back-btn" style={{ padding: "6px 10px" }} onClick={() => { setActiveUser(null); setView("list") }}>
                    <i className="fa-solid fa-arrow-left" />
                  </button>
                  <strong style={{ fontSize: 14 }}>{headLabel}</strong>
                </div>
                <div className="admin-chat-messages" ref={messagesBoxRef}>
                  {messagesLoading && messages.length === 0 ? (
                    <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 24 }}>
                      กำลังโหลดข้อความ...
                    </div>
                  ) : (
                    messageNodes
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="admin-chat-input-row">
                  <button type="button" className="admin-chat-image-btn" onClick={() => fileRef.current?.click()} title="ส่งรูป">
                    <i className="fa-solid fa-image" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = "" }} />
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์ข้อความ…" onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                  <button type="button" className="admin-submit-btn" onClick={sendMessage}>ส่ง</button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>เลือกบทสนทนาเพื่อเริ่มแชท</div>
            )}
          </section>
        </div>
      </div>

      {menu ? (
        <div className="admin-chat-msg-menu" style={{ left: menu.x, top: menu.y }}>
          {menu.canEdit ? (
            <button type="button" onClick={() => {
              const msg = messages.find((m) => Number(m.id) === menu.id)
              setEditMsg({ id: menu.id, text: String(msg?.message ?? "") })
              setMenu(null)
            }}>แก้ไข</button>
          ) : null}
          <button type="button" onClick={() => { setDeleteMsgId(menu.id); setMenu(null) }}>ลบ</button>
        </div>
      ) : null}

      <AdminEditModal open={!!editMsg} title="แก้ไขข้อความ" onClose={() => setEditMsg(null)} onSave={saveEditMessage}>
        <textarea className="admin-form-control" value={editMsg?.text ?? ""} onChange={(e) => setEditMsg(editMsg ? { ...editMsg, text: e.target.value } : null)} />
      </AdminEditModal>

      <AdminConfirmModal open={deleteMsgId != null} title="ลบข้อความ" message="ต้องการลบข้อความนี้หรือไม่?" onCancel={() => setDeleteMsgId(null)} onConfirm={deleteMessage} />

      {imageViewer ? (
        <div className="admin-order-modal-overlay show" onClick={() => setImageViewer(null)}>
          <img src={imageViewer} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8 }} />
        </div>
      ) : null}

      {Toast}
    </>
  )
}
