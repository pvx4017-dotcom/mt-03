import { useCallback, useEffect, useState } from "react"

export function useAdminToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => setToast({ message, type }),
    [],
  )

  const Toast = toast ? (
    <div className={`admin-center-toast${toast.type === "error" ? " error" : ""}`}>{toast.message}</div>
  ) : null

  return { showToast, Toast }
}

type ConfirmProps = {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export function AdminConfirmModal({ open, title, message, onCancel, onConfirm }: ConfirmProps) {
  return (
    <div className={`admin-confirm-modal${open ? " show" : ""}`}>
      <div className="admin-confirm-card">
        <h3 className="admin-edit-title">{title}</h3>
        <p style={{ margin: 0, fontSize: 14, color: "#4b5563", lineHeight: 1.45 }}>{message}</p>
        <div className="admin-edit-actions">
          <button type="button" className="admin-edit-btn cancel" onClick={onCancel}>
            ยกเลิก
          </button>
          <button type="button" className="admin-edit-btn save" style={{ background: "#dc2626" }} onClick={onConfirm}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  )
}

type EditModalProps = {
  open: boolean
  title: string
  onClose: () => void
  onSave: () => void
  children: React.ReactNode
  wide?: boolean
}

export function AdminEditModal({ open, title, onClose, onSave, children, wide }: EditModalProps) {
  return (
    <div className={`admin-edit-modal${open ? " show" : ""}`} onClick={onClose}>
      <div
        className="admin-edit-card"
        style={wide ? { width: "min(94vw, 720px)" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="admin-edit-title">{title}</h3>
        {children}
        <div className="admin-edit-actions">
          <button type="button" className="admin-edit-btn cancel" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="admin-edit-btn save" onClick={onSave}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminSearchBar({
  value,
  onChange,
  placeholder = "ค้นหา…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="admin-search-container">
      <i className="fa-solid fa-magnifying-glass" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export function AdminLoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="admin-empty-row">
        กำลังโหลดข้อมูล...
      </td>
    </tr>
  )
}

export function AdminEmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="admin-empty-row">
        {message}
      </td>
    </tr>
  )
}
