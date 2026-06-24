import { Link } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import "@/styles/extracted/address.css"

export default function AddressPage() {
  useBodyClass("page-address")

  return (
    <>
      <nav className="topbar">
        <Link to="/profile" className="back-btn" aria-label="ย้อนกลับ">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="title">ที่อยู่รับสินค้า</div>
      </nav>
      <main className="page">
        <section className="summary-card">
          <h2>จัดการที่อยู่จัดส่งของคุณ</h2>
          <p>เลือกที่อยู่เริ่มต้นเพื่อให้ระบบเลือกให้อัตโนมัติทุกครั้งที่สั่งซื้อ</p>
        </section>
        <section className="address-list">
          <article className="address-card">
            <div className="address-main">
              <div className="address-head">
                <div className="receiver">สมชาย ใจดี <span>098-123-4567</span></div>
                <span className="default-badge">ค่าเริ่มต้น</span>
              </div>
              <p className="address-text">
                88/12 หมู่บ้านพฤกษา ซอย 5 ถนนรามอินทรา แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร 10220
              </p>
              <div className="address-tags">
                <span className="tag">บ้าน</span>
                <span className="tag">จัดส่งได้ปกติ</span>
              </div>
            </div>
            <div className="address-footer">
              <button type="button" className="set-default-btn active">ตั้งเป็นค่าเริ่มต้นแล้ว</button>
              <div className="actions">
                <button type="button" className="action-btn edit-btn">แก้ไข</button>
                <button type="button" className="action-btn delete-btn">ลบ</button>
              </div>
            </div>
          </article>
        </section>
      </main>
      <div className="add-address-wrap">
        <button type="button" className="add-address-btn">
          <i className="fa-solid fa-plus" /> เพิ่มที่อยู่ใหม่
        </button>
      </div>
    </>
  )
}
