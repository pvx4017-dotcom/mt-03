import { useEffect } from "react"

/** Apply a body class while a page is mounted (matches per-page CSS from the reference site). */
export function useBodyClass(className: string) {
  useEffect(() => {
    const pageClasses = className.split(/\s+/).filter(Boolean)
    const isAdmin = pageClasses.some((c) => c.startsWith("admin"))
    const classes = isAdmin ? pageClasses : ["page-customer", ...pageClasses]
    document.body.classList.add(...classes)
    return () => document.body.classList.remove(...classes)
  }, [className])
}
