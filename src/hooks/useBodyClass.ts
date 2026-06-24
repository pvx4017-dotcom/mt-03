import { useEffect } from "react"

/** Apply a body class while a page is mounted (matches per-page CSS from the reference site). */
export function useBodyClass(className: string) {
  useEffect(() => {
    const classes = className.split(/\s+/).filter(Boolean)
    document.body.classList.add(...classes)
    return () => document.body.classList.remove(...classes)
  }, [className])
}
