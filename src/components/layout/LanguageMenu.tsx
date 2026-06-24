import { languages } from "@/data/languages"
import { flagAsset } from "@/lib/assets"
import { useApp } from "@/context/AppContext"

export function LanguageMenu() {
  const { langOpen, closeLang, currentLang, setCurrentLang } = useApp()

  return (
    <>
      <div
        className={`lang-overlay${langOpen ? " open" : ""}`}
        onClick={closeLang}
      />
      <div className={`lang-menu${langOpen ? " open" : ""}`}>
        <div className="lang-menu-header">
          <i className="fa-solid fa-chevron-left lang-close" onClick={closeLang} />
          <span>หลายภาษา</span>
          <span />
        </div>
        <div className="lang-list">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className={`lang-item${currentLang === lang.code ? " active" : ""}`}
              onClick={() => {
                setCurrentLang(lang.code)
                closeLang()
              }}
              role="button"
            >
              <img src={flagAsset(lang.flag)} alt={lang.code} />
              <span>{lang.label}</span>
              <i className="fa-solid fa-check check-icon" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
