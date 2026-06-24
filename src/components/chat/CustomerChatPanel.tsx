import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { asset } from "@/lib/assets"
import {
  fetchChatMessages,
  sendChatMessage,
  uploadChatImage,
  type ChatMessageRow,
} from "@/lib/customerApi"

const INTRO_ADMIN_TEXT =
  "สวัสดีค่ะ 🙏 ทีมงาน Meta Business ยินดีให้บริการค่ะ\n\nมีเรื่องอะไรให้เราช่วยเหลือ หรือสอบถามข้อมูลเพิ่มเติม พิมพ์ข้อความฝากไว้ได้เลยนะคะ แอดมินจะรีบตอบกลับให้เร็วที่สุดค่ะ"

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

function signRows(rows: ChatMessageRow[]) {
  if (!rows.length) return "0"
  const last = rows[rows.length - 1]
  return `${rows.length}:${last?.id}:${last?.created_at}`
}

function renderMessageBody(raw: string, onImageClick: (src: string) => void) {
  if (raw.startsWith("CHATIMG:")) {
    const rel = raw.slice(8).trim()
    if (/^uploads\/support_chat\/[A-Za-z0-9._]+$/.test(rel)) {
      const src = asset(rel)
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

type Props = {
  backTo: string
  title: string
  variant?: "help-center" | "chat-detail"
}

export function CustomerChatPanel({ backTo, title, variant = "help-center" }: Props) {
  const [params] = useSearchParams()
  const [rows, setRows] = useState<ChatMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [message, setMessage] = useState("")
  const [hint, setHint] = useState("กำลังโหลด...")
  const [modalSrc, setModalSrc] = useState<string | null>(null)
  const sigRef = useRef("")
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const depositSentRef = useRef(false)

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
      const sig = signRows(next)
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
    if (depositSentRef.current || !loggedIn) return
    let userId = (params.get("user_id") || params.get("userId") || "").trim()
    let amount = (params.get("amount") || "").trim()
    if (!userId || !amount) {
      try {
        const raw = sessionStorage.getItem("pendingDepositRequest")
        if (raw) {
          const payload = JSON.parse(raw) as { user_id?: number | string; amount?: string }
          userId = userId || String(payload.user_id ?? "").trim()
          amount = amount || String(payload.amount ?? "").trim()
        }
      } catch {
        /* ignore */
      }
    }
    if (!userId || !amount) return
    depositSentRef.current = true
    const text = `แจ้งฝากเงิน user_id: ${userId} จำนวน: ${amount}`
    sendChatMessage(text).then(() => {
      sessionStorage.removeItem("pendingDepositRequest")
      sigRef.current = ""
      loadMessages()
    })
  }, [loggedIn, loadMessages, params])

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [rows])

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
    await loadMessages()
  }

  const showPinned = variant === "help-center" && loggedIn
  const inputDisabled = !loggedIn

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
      messageNodes.push(
        <div key={String(row.id ?? i)} className={`message-bubble ${isUser ? "msg-right" : "msg-left"}`}>
          {renderMessageBody(String(row.message ?? ""), setModalSrc)}
          <span className="msg-time" title={fullDateTimeTitle(row.created_at)}>
            {formatTimeOnly(row.created_at)}
          </span>
        </div>,
      )
    })
  }

  const inputBar =
    variant === "chat-detail" ? (
      <footer className="chat-input-bar">
        <input
          type="text"
          placeholder="พิมพ์ข้อความ..."
          value={message}
          disabled={inputDisabled}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button type="button" className="send-btn" disabled={inputDisabled} onClick={handleSend}>
          <i className="fa-solid fa-paper-plane" />
        </button>
      </footer>
    ) : (
      <footer className="chat-input-bar">
        <div className="input-actions">
          <i
            className="fa-solid fa-image"
            role="button"
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
            <img src={asset("logo/logo meatt.webp")} alt="Avatar" />
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
              <div className="message-bubble msg-left">
                {INTRO_ADMIN_TEXT}
              </div>
            </div>
          )}
          <main className="chat-messages" ref={messagesRef}>
            {messageNodes}
          </main>
        </div>
      ) : (
        <main className="chat-messages" ref={messagesRef}>
          {messageNodes}
        </main>
      )}

      {inputBar}

      {modalSrc && (
        <div
          className="image-modal"
          style={{ display: "flex" }}
          onClick={() => setModalSrc(null)}
        >
          <div className="image-modal-close">
            <i className="fa-solid fa-xmark" />
          </div>
          <img src={modalSrc} alt="preview" />
        </div>
      )}
    </div>
  )
}
