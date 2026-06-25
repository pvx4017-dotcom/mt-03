import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { flagAsset, logoAsset } from "@/lib/assets"
import { languages } from "@/data/languages"
import { useApp } from "@/context/AppContext"

export function MainHeader() {
  const { pathname } = useLocation()
  const { openLang, currentLang } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const isHome = pathname === "/"
  const flagCode = languages.find((l) => l.code === currentLang)?.flag ?? "th"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const headerClass = [
    "main-header",
    isHome ? "main-header--home" : "",
    scrolled ? "main-header--scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <header className={headerClass}>
      <div className="logo-container">
        <img src={logoAsset()} alt="Meta Business" className="main-logo-img" />
        <div className="logo-text">
          <h1>Meta Business</h1>
          {isHome && !scrolled ? <span className="logo-tagline">Marketplace ครบวงจร</span> : null}
        </div>
      </div>
      <div className="header-actions">
        <div
          className="language-selector"
          onClick={openLang}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openLang()}
        >
          <img src={flagAsset(flagCode)} alt="" className="flag-icon" />
          <i className="fa-solid fa-chevron-down" />
        </div>
        <Link to="/notifications" className="notification-icon" aria-label="การแจ้งเตือน">
          <i className="fa-regular fa-bell" />
        </Link>
      </div>
    </header>
  )
}
