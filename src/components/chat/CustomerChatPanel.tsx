import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { logoAsset, chatImageAsset } from "@/lib/assets"
import { APP_NAME } from "@/lib/brand"
import {
  CHAT_DELETED_MARKER,
  chatRowsSignature,
  isChatDeletedMessage,
} from "@/lib/chatMessages"
import {
  fetchChatMessages,
  sendChatMessage,
  uploadChatImage,
  deleteChatMessage,
  type ChatMessageRow,
} from "@/lib/customerApi"

const DEPOSIT_NOTIFY_PREFIX = "depositChatNotified:"

const INTRO_ADMIN_TEXT =
  `สวัสดีค่ะ 🙏 ทีมงาน ${APP_NAME} ยินดีให้บริการค่ะ\n\nมีเรื่องอะไรให้เราช่วยเหลือ หรือสอบถามข้อมูลเพิ่มเติม พิมพ์ข้อความฝากไว้ได้เลยนะคะ แอดมินจะรีบตอบกลับให้เร็วที่สุดค่ะ`

function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatCenterDate(d: Date) {
  if (!Number.isFinite(d.getTime())) return ""
  const now = new Date()
  if (sameCalendarDay(d, now)) return "วันนี้"
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (sameCalendarDay(d, y)) return "เมื่อวาน"
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
}

function formatTimeOnly(value: unknown) {
  if (!value) {
    return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  }
  const t = new Date(String(value))
  if (!Number.isFinite(t.getTime())) {
    return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  }
  return t.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
}

function fullDateTimeTitle(value: unknown) {
  if (!value) return ""
  const t = new Date(String(value))
  if (!Number.isFinite(t.getTime())) return ""
  return t.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function renderMessageBody(raw: string, onImageClick: (src: string) => void) {
  if (isChatDeletedMessage(raw)) {
    return <span className="msg-deleted">ข้อความนี้ถูกลบแล้ว</span>
  }
  if (raw.startsWith("CHATIMG:")) {
    const src = chatImageAsset(raw)
    if (src) {
      return (
        <img
          src={src}
          alt="รูปแชท"
          className="chat-attached-img"
          style={{ cursor: "pointer", maxWidth: "100%", maxHeight: 260, borderRadius: 8, display: "block" }}
          onClick={() => onImageClick(src)}
        />
      )
    }
    return "[รูปภาพ]"
  }
  return raw
}

const LONG_PRESS_MS = 500

type Props = {
  backTo: string
  title: string
  variant?: "help-center" | "chat-detail"
}

export function CustomerChatPanel({ backTo, title, variant = "help-center" }: Props) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ChatMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [message, setMessage] = useState("")
  const [hint, setHint] = useState("กำลังโหลด...")
  const [modalSrc, setModalSrc] = useState<string | null>(null)
  const [actionMsgId, setActionMsgId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const sigRef = useRef("")
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const depositSentRef = useRef(false)
  const forgotSentRef = useRef(false)
  const longPressTimerRef = useRef<number | null>(null)
  const stickToBottomRef = useRef(true)

  const clearDepositQuery = useCallback(() => {
    if (!params.get("user_id") && !params.get("userId") && !params.get("amount")) return
    navigate(variant === "chat-detail" ? "/chat-detail" : "/help-center", { replace: true })
  }, [navigate, params, variant])

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchChatMessages()
      if (!data.success) {
        const msg = String(data.message ?? "")
        if (msg.includes("ไม่พบผู้ใช้") || msg.includes("เข้าสู่ระบบ")) {
          setLoggedIn(false)
          setLoading(false)
          return
        }
        setHint(msg || "โหลดไม่สำเร็จ")
        setLoading(false)
        return
      }
      setLoggedIn(true)
      const next = data.rows ?? []
      const sig = chatRowsSignature(next as Array<Record<string, unknown>>)
      if (sig !== sigRef.current) {
        sigRef.current = sig
        setRows(next)
      }
      setLoading(false)
    } catch {
      setHint("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMessages()
    const timer = window.setInterval(() => {
      if (loggedIn) loadMessages()
    }, variant === "help-center" ? 4000 : 5000)
    return () => window.clearInterval(timer)
  }, [loadMessages, loggedIn, variant])

  useEffect(() => {
    if (depositSentRef.current || !loggedIn || loading) return

    let userId = (params.get("user_id") || params.get("userId") || "").trim()
    let amount = (params.get("amount") || "").trim()
    let requestNo = ""
    try {
      const raw = sessionStorage.getItem("pendingDepositRequest")
      if (raw) {
        const payload = JSON.parse(raw) as {
          user_id?: number | string
          amount?: string
          request_no?: string
        }
        userId = userId || String(payload.user_id ?? "").trim()
        amount = amount || String(payload.amount ?? "").trim()
        requestNo = String(payload.request_no ?? "").trim()
      }
    } catch {
      /* ignore */
    }
    if (!userId || !amount) return

    const claimKey = `${DEPOSIT_NOTIFY_PREFIX}${requestNo || `${userId}:${amount}`}`
    try {
      if (sessionStorage.getItem(claimKey) === "1") {
        depositSentRef.current = true
        sessionStorage.removeItem("pendingDepositRequest")
        clearDepositQuery()
        return
      }
      sessionStorage.setItem(claimKey, "1")
    } catch {
      /* ignore quota */
    }

    depositSentRef.current = true
    const text = `แจ้งฝากเงิน user_id: ${userId} จำนวน: ${amount}`

    const alreadyExists = rows.some((row) => String(row.message ?? "") === text)
    if (alreadyExists) {
      sessionStorage.removeItem("pendingDepositRequest")
      clearDepositQuery()
      return
    }

    sendChatMessage(text).then((res) => {
      sessionStorage.removeItem("pendingDepositRequest")
      clearDepositQuery()
      if (!res.success) {
        try {
          sessionStorage.removeItem(claimKey)
        } catch {
          /* ignore */
        }
        depositSentRef.current = false
        return
      }
      sigRef.current = ""
      stickToBottomRef.current = true
      loadMessages()
    })
  }, [loggedIn, loading, loadMessages, params, rows, clearDepositQuery])

  useEffect(() => {
    if (forgotSentRef.current || !loggedIn || loading) return
    if (sessionStorage.getItem("pendingForgotPassword") !== "1") return
    const text = "ลืมรหัสผ่าน ต้องการให้แอดมินช่วยรีเซ็ตบัญชี"
    const alreadyExists = rows.some((row) => String(row.message ?? "") === text)
    sessionStorage.removeItem("pendingForgotPassword")
    forgotSentRef.current = true
    if (alreadyExists) return
    sendChatMessage(text).then((res) => {
      if (res.success) {
        sigRef.current = ""
        stickToBottomRef.current = true
        loadMessages()
      } else {
        forgotSentRef.current = false
        sessionStorage.setItem("pendingForgotPassword", "1")
      }
    })
  }, [loggedIn, loading, loadMessages, rows])

  useEffect(() => {
    const el = messagesRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [rows])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const openMessageActions = useCallback(
    (messageId: number) => {
      clearLongPressTimer()
      setActionMsgId(messageId)
    },
    [clearLongPressTimer],
  )

  const startLongPress = useCallback(
    (messageId: number) => {
      clearLongPressTimer()
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null
        openMessageActions(messageId)
      }, LONG_PRESS_MS)
    },
    [clearLongPressTimer, openMessageActions],
  )

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer])

  const handleSend = async () => {
    const text = message.trim()
    if (!text || !loggedIn) return
    const res = await sendChatMessage(text)
    if (!res.success) {
      window.alert(res.message || "ส่งไม่สำเร็จ")
      return
    }
    setMessage("")
    sigRef.current = ""
    stickToBottomRef.current = true
    await loadMessages()
  }

  const handleImage = async (file: File) => {
    if (!loggedIn) {
      window.alert("กรุณาเข้าสู่ระบบก่อน")
      return
    }
    const res = await uploadChatImage(file)
    if (!res.success) {
      window.alert(res.message || "อัปโหลดไม่สำเร็จ")
      return
    }
    sigRef.current = ""
    setActionMsgId(null)
    stickToBottomRef.current = true
    await loadMessages()
  }

  const handleDelete = async () => {
    if (!loggedIn || actionMsgId == null || deleting) return
    setDeleting(true)
    const targetId = actionMsgId
    try {
      const res = await deleteChatMessage(targetId)
      if (!res.success) {
        window.alert(res.message || "ลบไม่สำเร็จ")
        return
      }
      setRows((prev) =>
        prev.map((row) =>
          Number(row.id) === targetId ? { ...row, message: CHAT_DELETED_MARKER } : row,
        ),
      )
      sigRef.current = ""
      setActionMsgId(null)
      await loadMessages()
    } finally {
      setDeleting(false)
    }
  }

  const showPinned = variant === "help-center" && loggedIn
  const inputDisabled = !loggedIn
  const actionRow = actionMsgId != null ? rows.find((r) => Number(r.id) === actionMsgId) : null
  const canDeleteAction =
    !!actionRow &&
    String(actionRow.sender_type) === "user" &&
    !isChatDeletedMessage(actionRow.message)

  const messageNodes: React.ReactNode[] = []
  let lastDay = ""
  if (!loggedIn) {
    messageNodes.push(
      <div key="login" className="not-logged-in">
        <p style={{ fontSize: 15, fontWeight: 600, color: "#001529" }}>กรุณาเข้าสู่ระบบก่อน</p>
        <p style={{ fontSize: 13, maxWidth: 320 }}>
          ข้อความกับเจ้าหน้าที่เชื่อมกับบัญชีของคุณ (เดียวกับรายการ admin)
        </p>
        <Link to="/login">เข้าสู่ระบบ / สมัคร</Link>
      </div>,
    )
  } else if (loading && rows.length === 0) {
    messageNodes.push(
      <div key="hint" className="chat-load-hint">
        {hint}
      </div>,
    )
  } else if (rows.length === 0) {
    if (variant === "chat-detail") {
      messageNodes.push(
        <div key="empty" className="system-msg">
          ยังไม่มีข้อความ เริ่มแชท์ได้เลย
        </div>,
      )
    }
  } else {
    rows.forEach((row, i) => {
      const t = new Date(String(row.created_at ?? ""))
      if (Number.isFinite(t.getTime())) {
        const dk = dayKey(t)
        if (dk !== lastDay) {
          lastDay = dk
          messageNodes.push(
            <div key={`day-${dk}-${i}`} className="system-msg date-divider">
              <span>{formatCenterDate(t)}</span>
            </div>,
          )
        }
      }
      const isUser = String(row.sender_type) === "user"
      const messageId = Number(row.id)
      const deleted = isChatDeletedMessage(row.message)
      const canAct = isUser && messageId > 0 && !deleted
      messageNodes.push(
        <div
          key={String(row.id ?? i)}
          className={`message-bubble ${isUser ? "msg-right" : "msg-left"}${deleted ? " is-deleted" : ""}${
            actionMsgId === messageId ? " is-action-active" : ""
          }`}
          onMouseDown={canAct ? () => startLongPress(messageId) : undefined}
          onMouseUp={clearLongPressTimer}
          onMouseLeave={clearLongPressTimer}
          onTouchStart={canAct ? () => startLongPress(messageId) : undefined}
          onTouchEnd={clearLongPressTimer}
          onTouchCancel={clearLongPressTimer}
          onContextMenu={
            canAct
              ? (e) => {
                  e.preventDefault()
                  openMessageActions(messageId)
                }
              : undefined
          }
        >
          {renderMessageBody(String(row.message ?? ""), setModalSrc)}
          <span className="msg-time" title={fullDateTimeTitle(row.created_at)}>
            {formatTimeOnly(row.created_at)}
          </span>
        </div>,
      )
    })
  }

  const inputBar = (
    <footer className="chat-input-bar">
      <div className="input-actions">
        <i
          className="fa-solid fa-image"
          role="button"
          aria-label="ส่งรูปภาพ"
          style={{ opacity: inputDisabled ? 0.45 : 1, pointerEvents: inputDisabled ? "none" : "auto" }}
          onClick={() => fileRef.current?.click()}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) handleImage(file)
          }}
        />
      </div>
      <div className="input-field-wrap">
        <textarea
          rows={1}
          placeholder="พิมพ์ข้อความที่นี่..."
          title="Enter ส่งข้อความ · Shift+Enter ขึ้นบรรทัดใหม่"
          value={message}
          disabled={inputDisabled}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
      </div>
      <div
        className="send-btn"
        role="button"
        aria-label="ส่งข้อความ"
        style={{ opacity: inputDisabled ? 0.45 : 1, pointerEvents: inputDisabled ? "none" : "auto" }}
        onClick={handleSend}
      >
        <i className="fa-solid fa-paper-plane" />
      </div>
    </footer>
  )

  return (
    <div id="app">
      <header className="chat-header">
        <Link to={backTo} className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="header-info">
          <div className="header-avatar">
            <img src={logoAsset()} alt="Avatar" />
          </div>
          <div className="header-text">
            <span className="header-name">{title}</span>
            <span className="header-status">{variant === "chat-detail" ? "ออนไลน์" : "พร้อมให้บริการ"}</span>
          </div>
        </div>
      </header>

      {variant === "help-center" ? (
        <div className="chat-main-wrap">
          {showPinned && (
            <div className="chat-pinned is-visible" aria-label="ข้อความต้อนรับ">
              <div className="message-bubble msg-left">{INTRO_ADMIN_TEXT}</div>
            </div>
          )}
          <main
            className="chat-messages"
            ref={messagesRef}
            onScroll={(e) => {
              const el = e.currentTarget
              stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
          >
            {messageNodes}
          </main>
        </div>
      ) : (
        <main
          className="chat-messages"
          ref={messagesRef}
          onScroll={(e) => {
            const el = e.currentTarget
            stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
          }}
        >
          {messageNodes}
        </main>
      )}

      {inputBar}

      {actionMsgId != null ? (
        <div className="chat-action-sheet" role="dialog" aria-label="จัดการข้อความ">
          <button
            type="button"
            className="chat-action-backdrop"
            aria-label="ปิด"
            onClick={() => setActionMsgId(null)}
          />
          <div className="chat-action-panel">
            <p className="chat-action-title">จัดการข้อความ</p>
            {canDeleteAction ? (
              <button
                type="button"
                className="chat-action-btn danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "กำลังลบ..." : "ลบข้อความ"}
              </button>
            ) : (
              <p className="chat-action-hint">ลบได้เฉพาะข้อความของคุณที่ยังไม่ถูกลบ</p>
            )}
            <button
              type="button"
              className="chat-action-btn"
              disabled={deleting}
              onClick={() => setActionMsgId(null)}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {modalSrc && (
        <div className="image-modal" style={{ display: "flex" }} onClick={() => setModalSrc(null)}>
          <div className="image-modal-close">
            <i className="fa-solid fa-xmark" />
          </div>
          <img src={modalSrc} alt="preview" />
        </div>
      )}
    </div>
  )
}
