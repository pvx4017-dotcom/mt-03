import { Link, useSearchParams } from "react-router-dom"
import { notifications } from "@/data/notifications"
import { useBodyClass } from "@/hooks/useBodyClass"
import { asset, logoAsset } from "@/lib/assets"
import { APP_NAME } from "@/lib/brand"
import "@/styles/privacy-style.css"

export default function NoticeDetailPage() {
  useBodyClass("page-sub")
  const [params] = useSearchParams()
  const id = params.get("id") ?? "1"
  const notice = notifications.find((n) => n.id === id) ?? notifications[0]

  return (
    <div id="app" className="fade-in">
      <header className="page-header">
        <Link to="/notifications" className="back-btn">
          <i className="fa-solid fa-angle-left" />
        </Link>
        <h1>รายละเอียด</h1>
      </header>
      <div className="detail-content">
        <div className="detail-header">
          <div className="detail-category">ข้อมูลระบบ</div>
          <h2 className="detail-title">{notice.title}</h2>
          <div className="detail-meta">
            <span>{notice.time}</span>
          </div>
        </div>
        <div className="detail-body">
          <p>{notice.snippet}</p>
          <img src={asset("images/media__1775719499454.png")} alt="Illustration" />
          <p>หากคุณมีคำถามเพิ่มเติม โปรดติดต่อฝ่ายสนับสนุนลูกค้าได้ตลอด 24 ชั่วโมง</p>
        </div>
        <div className="action-bar">
          <button type="button" className="primary-action-btn">เริ่มใช้งานทันที</button>
        </div>
      </div>
    </div>
  )
}

export function PrivacyPolicyPage() {
  useBodyClass("page-privacy-policy")

  return (
    <div id="app">
      <nav className="top-navbar">
        <Link to="/profile" className="back-btn">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="nav-title">นโยบายความเป็นส่วนตัวของผู้ใช้</div>
      </nav>
      <header className="privacy-banner">
        <div className="banner-overlay" />
        <div className="banner-content">
          <div className="meta-branding">
            <img src={logoAsset()} alt="" className="meta-logo" />
            <span className="meta-text">{APP_NAME}</span>
          </div>
          <div className="banner-text">
            <span>นโยบายความเป็นส่วนตัวของผู้ใช้</span>
          </div>
        </div>
      </header>
      <main className="privacy-content">
        <div className="intro-section">
          <p>นโยบายความเป็นส่วนตัวของผู้ใช้ {APP_NAME}</p>
          <ol className="main-toc">
            <li>เรารวบรวมข้อมูลของคุณอย่างไร</li>
            <li>วิธีที่เราใช้ข้อมูล</li>
            <li>เราแบ่งปัน ถ่ายโอน และเปิดเผยข้อมูลอย่างไร</li>
            <li>เราจัดเก็บข้อมูลอย่างไร</li>
            <li>เราปกป้องความปลอดภัยของข้อมูลส่วนบุคคลของคุณอย่างไร</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
