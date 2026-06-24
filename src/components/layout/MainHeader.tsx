import { Link } from "react-router-dom"
import { flagAsset, logoAsset } from "@/lib/assets"
import { languages } from "@/data/languages"
import { useApp } from "@/context/AppContext"

export function MainHeader() {
  const { openLang, currentLang } = useApp()
  const flagCode = languages.find((l) => l.code === currentLang)?.flag ?? "th"

  return (
    <header className="main-header">
      <div className="logo-container">
        <img src={logoAsset()} alt="Meatt Logo" className="main-logo-img" />
        <h1>Meta Business</h1>
      </div>
      <div className="header-actions">
        <div className="language-selector" onClick={openLang} role="button">
          <img src={flagAsset(flagCode)} alt="" className="flag-icon" />
          <i className="fa-solid fa-chevron-down" />
        </div>
        <Link to="/notifications" className="notification-icon">
          <i className="fa-regular fa-bell" />
        </Link>
      </div>
    </header>
  )
}
