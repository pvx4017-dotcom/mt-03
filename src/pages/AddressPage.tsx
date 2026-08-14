import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useBodyClass } from "@/hooks/useBodyClass"
import { useApp } from "@/context/AppContext"
import {
  resolveCheckoutAddress,
  saveShippingAddress,
  writeSavedShippingAddress,
  type SavedShippingAddress,
} from "@/lib/customerApi"
import "@/styles/extracted/address.css"

const emptyAddress: SavedShippingAddress = {
  receiver_name: "",
  receiver_phone: "",
  receiver_address: "",
}

export default function AddressPage() {
  useBodyClass("page-address")
  const { user, isLoggedIn, requireLogin } = useApp()
  const [addr, setAddr] = useState<SavedShippingAddress>(emptyAddress)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!requireLogin()) return
    if (!user?.id) return
    void resolveCheckoutAddress(user.id)
      .then((found) => {
        if (found) setAddr(found)
        setEditing(!found)
      })
      .finally(() => setLoading(false))
  }, [requireLogin, user?.id])

  const hasAddress = Boolean(addr.receiver_name || addr.receiver_address)

  const save = async () => {
    if (!addr.receiver_name.trim() || !addr.receiver_phone.trim() || !addr.receiver_address.trim()) return
    const payload = {
      receiver_name: addr.receiver_name.trim(),
      receiver_phone: addr.receiver_phone.trim(),
      receiver_address: addr.receiver_address.trim(),
    }
    setBusy(true)
    try {
      const res = await saveShippingAddress(payload)
      writeSavedShippingAddress(user?.id, payload)
      if (!res.success) return
      setEditing(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1600)
    } finally {
      setBusy(false)
    }
  }

  if (!isLoggedIn) return null

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
          <p>ที่อยู่นี้จะถูกใช้ตอนยืนยันคำสั่งซื้อ และแอดมินจะเห็นตอนจัดส่ง</p>
        </section>

        {loading ? (
          <p className="address-text">กำลังโหลด...</p>
        ) : !hasAddress && !editing ? (
          <section className="address-list">
            <article className="address-card">
              <p className="address-text">ยังไม่มีที่อยู่จัดส่ง — เพิ่มเพื่อใช้ตอนสั่งซื้อ</p>
            </article>
          </section>
        ) : editing ? (
          <section className="address-list">
            <article className="address-card">
              <div className="address-main" style={{ display: "grid", gap: 10 }}>
                <input
                  className="search-input"
                  style={{ width: "100%", border: "1px solid #ddd", borderRadius: 10, padding: "10px 12px" }}
                  placeholder="ชื่อผู้รับ"
                  value={addr.receiver_name}
                  onChange={(e) => setAddr({ ...addr, receiver_name: e.target.value })}
                />
                <input
                  className="search-input"
                  style={{ width: "100%", border: "1px solid #ddd", borderRadius: 10, padding: "10px 12px" }}
                  placeholder="เบอร์ติดต่อ"
                  value={addr.receiver_phone}
                  onChange={(e) => setAddr({ ...addr, receiver_phone: e.target.value })}
                />
                <textarea
                  rows={3}
                  style={{ width: "100%", border: "1px solid #ddd", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit" }}
                  placeholder="ที่อยู่จัดส่ง"
                  value={addr.receiver_address}
                  onChange={(e) => setAddr({ ...addr, receiver_address: e.target.value })}
                />
              </div>
              <div className="address-footer">
                <button type="button" className="set-default-btn active" onClick={save} disabled={busy}>
                  {busy ? "กำลังบันทึก..." : "บันทึกที่อยู่"}
                  บันทึกเป็นค่าเริ่มต้น
                </button>
              </div>
            </article>
          </section>
        ) : (
          <section className="address-list">
            <article className="address-card">
              <div className="address-main">
                <div className="address-head">
                  <div className="receiver">
                    {addr.receiver_name} <span>{addr.receiver_phone}</span>
                  </div>
                  <span className="default-badge">ค่าเริ่มต้น</span>
                </div>
                <p className="address-text">{addr.receiver_address}</p>
              </div>
              <div className="address-footer">
                <button type="button" className="set-default-btn active">
                  ตั้งเป็นค่าเริ่มต้นแล้ว
                </button>
                <div className="actions">
                  <button type="button" className="action-btn edit-btn" onClick={() => setEditing(true)}>
                    แก้ไข
                  </button>
                </div>
              </div>
            </article>
          </section>
        )}
        {saved ? <p className="address-text" style={{ textAlign: "center", color: "#15803d" }}>บันทึกที่อยู่แล้ว</p> : null}
      </main>
      {!editing ? (
        <div className="add-address-wrap">
          <button type="button" className="add-address-btn" onClick={() => setEditing(true)}>
            <i className="fa-solid fa-plus" /> {hasAddress ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}
          </button>
        </div>
      ) : null}
    </>
  )
}
