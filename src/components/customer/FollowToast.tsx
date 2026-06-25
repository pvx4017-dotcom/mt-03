type FollowToastProps = {
  open: boolean
  message: string
  iconClass?: string
  onClose: () => void
}

export function FollowToast({
  open,
  message,
  iconClass = "fa-solid fa-heart",
  onClose,
}: FollowToastProps) {
  if (!message) return null
  return (
    <>
      <div
        className={`follow-toast-overlay${open ? " show" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div className={`follow-toast toast-success${open ? " show" : ""}`} role="status" aria-live="polite">
        <div className="follow-toast-inner">
          <div className="follow-toast-icon">
            <i className={iconClass} aria-hidden />
          </div>
          <div className="follow-toast-message">{message}</div>
        </div>
      </div>
    </>
  )
}
