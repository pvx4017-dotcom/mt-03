import { useEffect, useState } from "react"
import { resolveUploadsDisplayUrl } from "@/lib/storageUpload"

type StorageImageProps = {
  path: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  openOnClick?: boolean
}

export function StorageImage({ path, alt = "", className, style, openOnClick }: StorageImageProps) {
  const raw = String(path ?? "").trim()
  const [src, setSrc] = useState("")
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(Boolean(raw))

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    if (!raw) {
      setSrc("")
      setLoading(false)
      return
    }
    if (raw.startsWith("blob:") || raw.startsWith("data:")) {
      setSrc(raw)
      setLoading(false)
      return
    }
    setLoading(true)
    setSrc("")
    void resolveUploadsDisplayUrl(raw).then((url) => {
      if (cancelled) return
      setSrc(url)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [raw])

  if (!raw || failed) {
    return (
      <div className={className} style={{ ...style, display: "grid", placeItems: "center", background: "#f1f5f9", color: "#94a3b8" }}>
        <i className="fa-regular fa-image" />
      </div>
    )
  }

  if (loading || !src) {
    return (
      <div className={className} style={{ ...style, display: "grid", placeItems: "center", background: "#f8fafc", color: "#94a3b8" }}>
        <i className="fa-solid fa-spinner fa-spin" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...style, cursor: openOnClick ? "zoom-in" : style?.cursor }}
      onClick={() => {
        if (openOnClick && src) window.open(src, "_blank", "noopener,noreferrer")
      }}
      onError={() => setFailed(true)}
    />
  )
}
