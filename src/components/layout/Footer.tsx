import { asset, logoAsset } from "@/lib/assets"
import { APP_NAME } from "@/lib/brand"

export function Footer({ variant = "light" }: { variant?: "light" | "dark" }) {
  if (variant === "dark") {
    return (
      <footer className="advanced-footer">
        <section className="footer-newsletter">
          <div className="footer-logo-row">
            <img src={logoAsset()} alt={`${APP_NAME} Logo`} className="footer-logo-img" />
            <span className="footer-logo-text">{APP_NAME}</span>
          </div>
          <h3 className="newsletter-heading">รับคูปองของคุณมากขึ้น</h3>
          <div className="newsletter-input-group">
            <input type="email" placeholder="อีเมลของคุณ" className="newsletter-input" />
            <button type="button" className="subscribe-btn">สมัครสมาชิก</button>
          </div>
        </section>
        <FooterLinks />
        <section className="footer-extended">
          <p className="meta-business-desc">
            {APP_NAME} ผู้ใช้เว็บไซต์ทั่วโลกมาจาก 103 ประเทศทั่วโลกและใช้ USDT/ETH/BTC ในการชำระบัญชี
          </p>
          <FooterPartners />
          <p className="footer-copyright">ลิขสิทธิ์ © เมต้า คอร์ปอเรชั่น 2012</p>
        </section>
      </footer>
    )
  }

  return (
    <footer className="main-footer">
      <div className="footer-newsletter">
        <div className="footer-logo">
          <img src={logoAsset()} alt={APP_NAME} />
          <span>{APP_NAME}</span>
        </div>
        <p className="newsletter-sub">รับคูปองของคุณมากขึ้น</p>
        <div className="newsletter-form">
          <input type="email" placeholder="อีเมลของคุณ" />
          <button type="button">สมัครสมาชิก</button>
        </div>
      </div>
      <FooterLinksGrid />
      <div className="footer-description">
        <h5>{APP_NAME}</h5>
        <p>
          {APP_NAME} ผู้ใช้เว็บไซต์ทั่วโลกมาจาก 103 ประเทศทั่วโลกและใช้ USDT/ETH/BTC ในการชำระบัญชี
        </p>
      </div>
      <FooterPartners />
      <div className="footer-bottom">
        <p className="copyright">ลิขสิทธิ์ © เมต้า คอร์ปอเรชั่น 2012</p>
        <p className="footer-mission">{APP_NAME} แบรนด์คุณภาพจากอีคอมเมิร์ซทั่วโลก</p>
      </div>
    </footer>
  )
}

function FooterLinks() {
  return (
    <section className="footer-grid">
      <div className="footer-column">
        <h4>บริการลูกค้า</h4>
        <ul className="footer-links">
          <li><a href="#">บริการออนไลน์</a></li>
          <li><a href="#">ติดต่อเรา</a></li>
          <li><a href="#">ดาวน์โหลดแอพ (ฝั่งซื้อ)</a></li>
          <li><a href="#">ดาวน์โหลด APP (ฝั่งผู้ขาย)</a></li>
        </ul>
      </div>
      <div className="footer-column">
        <h4>การคืนสินค้าและการแลกเปลี่ยน</h4>
        <ul className="footer-links">
          <li><a href="/privacy-policy">นโยบายความเป็นส่วนตัว</a></li>
          <li><a href="#">นโยบายการคืนสินค้า</a></li>
          <li><a href="#">จัดส่งและรับของ</a></li>
          <li><a href="#">นโยบายผู้ขาย</a></li>
        </ul>
      </div>
      <div className="footer-column">
        <h4>ศูนย์ผู้ใช้</h4>
        <ul className="footer-links">
          <li><a href="#">การลงทะเบียนผู้ใช้</a></li>
          <li><a href="#">การติดตามคำสั่งซื้อ</a></li>
          <li><a href="/collections">คอลเลกชันสินค้า</a></li>
          <li><a href="#">กระเป๋าสตางค์ของฉัน</a></li>
        </ul>
      </div>
      <div className="footer-column">
        <h4>เกี่ยวกับเรา</h4>
        <ul className="footer-links">
          <li><a href="/about">เกี่ยวกับเรา</a></li>
          <li><a href="#">รับสมัคร</a></li>
          <li><a href="#">ข่าว</a></li>
          <li><a href="#">ประกาศของห้างสรรพสินค้า</a></li>
        </ul>
      </div>
    </section>
  )
}

function FooterLinksGrid() {
  return (
    <div className="footer-links-grid">
      <div className="links-column">
        <h4>บริการลูกค้า</h4>
        <a href="#">บริการออนไลน์</a>
        <a href="#">ติดต่อเรา</a>
        <a href="#">ดาวน์โหลดแอพ (ฝั่งผู้ซื้อ)</a>
        <a href="#">ดาวน์โหลด APP (ฝั่งผู้ขาย)</a>
      </div>
      <div className="links-column text-right">
        <h4>การคืนสินค้าและการแลกเปลี่ยน</h4>
        <a href="/privacy-policy">นโยบายความเป็นส่วนตัว</a>
        <a href="#">นโยบายการคืนสินค้า</a>
        <a href="#">จัดส่งและรับของ</a>
        <a href="#">นโยบายผู้ขาย</a>
      </div>
      <div className="links-column">
        <h4>ศูนย์ผู้ใช้</h4>
        <a href="#">การลงทะเบียนผู้ใช้</a>
        <a href="#">การติดตามคำสั่งซื้อ</a>
        <a href="/collections">คอลเลกชันสินค้า</a>
        <a href="#">กระเป๋าสตางค์ของฉัน</a>
      </div>
      <div className="links-column text-right">
        <h4>เกี่ยวกับเรา</h4>
        <a href="/about">เกี่ยวกับเรา</a>
        <a href="#">รับสมัคร</a>
        <a href="#">ข่าว</a>
        <a href="#">ประกาศของห้างสรรพสินค้า</a>
      </div>
    </div>
  )
}

function FooterPartners() {
  const partners = [
    "smsufermalls.png",
    "bdo.png",
    "nector.png",
    "zelle.png",
    "crypto.png",
    "standard.png",
  ]
  return (
    <div className="footer-partners">
      {partners.map((p) => (
        <img key={p} src={asset(`partner/${p}`)} alt={p} />
      ))}
    </div>
  )
}
