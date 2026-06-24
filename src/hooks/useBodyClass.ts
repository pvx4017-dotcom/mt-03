import { useEffect } from "react"

/** Apply a body class while a page is mounted (matches per-page CSS from the reference site). */
export function useBodyClass(className: string) {
  useEffect(() => {
    document.body.classList.add(className)
    return () => document.body.classList.remove(className)
  }, [className])
}
