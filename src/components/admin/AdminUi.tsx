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
    <div className={`admin-confirm-modal admin-sheet-overlay${open ? " show" : ""}`} onClick={onCancel}>
      <div className="admin-confirm-card admin-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-sheet-head">
          <span className="admin-sheet-handle" aria-hidden />
          <h3 className="admin-edit-title">{title}</h3>
        </div>
        <p className="admin-sheet-message">{message}</p>
        <div className="admin-edit-actions">
          <button type="button" className="admin-edit-btn cancel" onClick={onCancel}>
            ยกเลิก
          </button>
          <button type="button" className="admin-edit-btn save admin-btn-danger" onClick={onConfirm}>
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
    <div className={`admin-edit-modal admin-sheet-overlay${open ? " show" : ""}`} onClick={onClose}>
      <div
        className={`admin-edit-card admin-sheet-panel${wide ? " admin-sheet-panel--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-sheet-head">
          <span className="admin-sheet-handle" aria-hidden />
          <h3 className="admin-edit-title">{title}</h3>
          <button type="button" className="admin-modal-close-btn" onClick={onClose} aria-label="ปิด">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="admin-sheet-body">{children}</div>
        <div className="admin-edit-actions admin-sheet-foot">
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

type DetailModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}

export function AdminDetailModal({ open, title, onClose, children, footer, wide }: DetailModalProps) {
  return (
    <div className={`admin-order-modal-overlay admin-sheet-overlay${open ? " show" : ""}`} onClick={onClose}>
      <div
        className={`admin-order-modal admin-sheet-panel${wide ? " admin-sheet-panel--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-order-modal-head admin-sheet-head">
          <span className="admin-sheet-handle" aria-hidden />
          <h2 className="admin-sheet-title">{title}</h2>
          <button type="button" className="admin-modal-close-btn" onClick={onClose} aria-label="ปิด">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="admin-order-modal-body admin-sheet-body">{children}</div>
        {footer ? <div className="admin-order-modal-foot admin-sheet-foot">{footer}</div> : null}
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

function AdminTableScrollHint() {
  return (
    <p className="admin-table-scroll-hint">
      <i className="fa-solid fa-arrows-left-right" aria-hidden />
      เลื่อนซ้าย-ขวาเพื่อดูทุกคอลัมน์
    </p>
  )
}

export function AdminTableWrap({
  className = "",
  innerClassName = "",
  bare = false,
  children,
}: {
  className?: string
  innerClassName?: string
  bare?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`admin-table-bundle${bare ? " admin-table-bundle--bare" : " admin-card"} ${className}`.trim()}
    >
      <AdminTableScrollHint />
      <div className={`admin-table-wrap ${innerClassName}`.trim()}>{children}</div>
    </div>
  )
}

export function AdminOrderTableWrap({
  className = "",
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="admin-table-bundle admin-table-bundle--order">
      <AdminTableScrollHint />
      <div className={`admin-order-table-wrap ${className}`.trim()}>{children}</div>
    </div>
  )
}
