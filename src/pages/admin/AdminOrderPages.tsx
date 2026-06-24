import { useCallback, useEffect, useMemo, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { Link, useNavigate } from "react-router-dom"
import { AdminTopBar } from "@/components/admin/AdminTopBar"
import { AdminConfirmModal, useAdminToast } from "@/components/admin/AdminUi"
import {
  adminGet,
  adminPost,
  fetchAdminCart,
  fetchAdminOrders,
  fetchCustomerShopProducts,
  formatAdminDate,
} from "@/lib/adminApi"
import {
  adminFmtMoney,
  adminFmtNum,
  adminParseImage,
  adminStatusBadge,
  filterByUserOrShop,
  filterProductsByNameOrShop,
  type CartItem,
} from "@/lib/adminUtils"
import { useBodyClass } from "@/hooks/useBodyClass"

function OrderFlowTopBar({
  title,
  icon,
  backTo = "/admin",
  action,
}: {
  title: string
  icon: string
  backTo?: string
  action?: React.ReactNode
}) {
  return (
    <div className="admin-order-topbar">
      <Link to={backTo} className="admin-order-back">
        <i className="fa-solid fa-chevron-left" />
      </Link>
      <h1>
        <i className={`fa-solid ${icon}`} /> {title}
      </h1>
      {action ?? <span style={{ width: 36 }} />}
    </div>
  )
}

export function AdminCustomerStoreProductsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [cartCount, setCartCount] = useState(0)
  const [editRow, setEditRow] = useState<CartItem | null>(null)
  const [editForm, setEditForm] = useState({
    product_stock: "",
    view_count: "",
    trust_score: "",
    sales_volume: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, cart] = await Promise.all([
        fetchCustomerShopProducts(),
        fetchAdminCart("pending"),
      ])
      setRows(products)
      setCartCount(cart.items?.length ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => filterProductsByNameOrShop(rows, search), [rows, search])

  const addToCart = async (row: CartItem) => {
    const fd = new FormData()
    fd.append("action", "add")
    fd.append("product_id", String(row.id))
    fd.append("user_id", String(row.user_id ?? 0))
    fd.append("product_name", String(row.product_name ?? ""))
    fd.append("shop_name", String(row.shop_name ?? ""))
    fd.append("product_category", String(row.product_category ?? ""))
    fd.append("product_image", String(row.product_image ?? ""))
    fd.append("unit_price", String(row.product_price ?? 0))
    fd.append("quantity", "1")
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminCart, fd)
    if (res.success) {
      showToast("เพิ่มลงตะกร้าแล้ว")
      const cart = await fetchAdminCart("pending")
      setCartCount(cart.items?.length ?? 0)
    } else showToast(res.message ?? "ไม่สำเร็จ", "error")
  }

  const bulkAdd = async () => {
    for (const id of selected) {
      const row = rows.find((r) => Number(r.id) === id)
      if (row) await addToCart(row)
    }
    setSelected(new Set())
  }

  const saveEdit = async () => {
    if (!editRow) return
    const fd = new FormData()
    fd.append("action", "update_product")
    fd.append("id", String(editRow.id))
    fd.append("product_stock", editForm.product_stock)
    fd.append("view_count", editForm.view_count)
    fd.append("trust_score", editForm.trust_score)
    fd.append("sales_volume", editForm.sales_volume)
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.customerStoreMirror,
      fd,
    )
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEditRow(null)
      load()
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  return (
    <>
      <AdminTopBar title="สินค้าของลูกค้า" backTo="/admin" />
      <div className="admin-page-container">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            <i className="fa-solid fa-store" /> สินค้าของลูกค้า ({rows.length})
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/admin/cart" className="back-btn">
              <i className="fa-solid fa-cart-shopping" />
              ตะกร้า
              {cartCount > 0 ? <span className="admin-cart-badge-inline">{cartCount}</span> : null}
            </Link>
            <Link to="/admin" className="back-btn">
              <i className="fa-solid fa-arrow-left" /> กลับหน้าหลัก
            </Link>
          </div>
        </div>

        <div className="admin-order-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อสินค้าหรือร้านค้า…"
          />
        </div>

        <div className={`admin-selection-bar${selected.size ? " show" : ""}`}>
          <span>เลือกแล้ว {selected.size} รายการ</span>
          <button type="button" onClick={bulkAdd}>
            <i className="fa-solid fa-cart-plus" /> เพิ่มลงตะกร้า
          </button>
          <button type="button" onClick={() => setSelected(new Set())}>
            ล้างการเลือก
          </button>
        </div>

        <div className="admin-order-table-wrap admin-product-table">
          {loading ? (
            <div className="admin-order-empty">กำลังโหลด…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-order-empty">ไม่พบข้อมูลสินค้า</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((r) => selected.has(Number(r.id)))}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(filtered.map((r) => Number(r.id))))
                        else setSelected(new Set())
                      }}
                    />
                  </th>
                  <th>รูป</th>
                  <th>ชื่อสินค้า</th>
                  <th>ร้านค้า</th>
                  <th>ราคา</th>
                  <th>สต็อก</th>
                  <th>ยอดวิว</th>
                  <th>คะแนน</th>
                  <th>ยอดขาย</th>
                  <th>รหัสผู้ใช้</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const id = Number(row.id)
                  const isSel = selected.has(id)
                  return (
                    <tr key={id} className={isSel ? "row-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => {
                            setSelected((prev) => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id)
                              else next.add(id)
                              return next
                            })
                          }}
                        />
                      </td>
                      <td>
                        <img className="admin-order-thumb" src={adminParseImage(row.product_image)} alt="" />
                      </td>
                      <td>{String(row.product_name ?? "-")}</td>
                      <td>{String(row.shop_name ?? "-")}</td>
                      <td>${adminFmtMoney(row.product_price)}</td>
                      <td>{adminFmtNum(row.product_stock)}</td>
                      <td>{adminFmtNum(row.view_count)}</td>
                      <td>{Number(row.trust_score ?? 0).toFixed(1)}</td>
                      <td>{adminFmtNum(row.sales_volume)}</td>
                      <td>#{String(row.user_id ?? "-")}</td>
                      <td>
                        <button type="button" className="admin-order-act ok" title="เพิ่มลงตะกร้า" onClick={() => addToCart(row)}>
                          <i className="fa-solid fa-cart-plus" />
                        </button>
                        <button
                          type="button"
                          className="admin-order-act info"
                          title="แก้ไข"
                          onClick={() => {
                            setEditRow(row)
                            setEditForm({
                              product_stock: String(row.product_stock ?? ""),
                              view_count: String(row.view_count ?? ""),
                              trust_score: String(row.trust_score ?? ""),
                              sales_volume: String(row.sales_volume ?? ""),
                            })
                          }}
                        >
                          <i className="fa-regular fa-pen-to-square" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={`admin-order-modal-overlay${editRow ? " show" : ""}`} onClick={() => setEditRow(null)}>
        <div className="admin-order-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-order-modal-head">แก้ไขสินค้า</div>
          <div className="admin-order-modal-body">
            {(["product_stock", "view_count", "trust_score", "sales_volume"] as const).map((f) => (
              <div className="admin-form-group" key={f}>
                <label>{f}</label>
                <input
                  className="admin-form-control"
                  value={editForm[f]}
                  onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="admin-order-modal-foot">
            <button type="button" className="admin-edit-btn cancel" onClick={() => setEditRow(null)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-edit-btn save" onClick={saveEdit}>
              บันทึก
            </button>
          </div>
        </div>
      </div>
      {Toast}
    </>
  )
}

export function AdminCartPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [commPct, setCommPct] = useState("20")
  const [shippingCount, setShippingCount] = useState(0)
  const [orderModal, setOrderModal] = useState<CartItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [qty, setQty] = useState(1)
  const [receiver, setReceiver] = useState({ name: "", address: "", phone: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cart, shipping] = await Promise.all([
        fetchAdminCart("pending"),
        fetchAdminCart("shipping"),
      ])
      setItems(cart.items ?? [])
      setShippingCount(shipping.items?.length ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    adminGet<{ percent?: number; commission_percent?: number }>(API.adminCommission)
      .then((d) => setCommPct(String(d.percent ?? d.commission_percent ?? 20)))
      .catch(() => {})
  }, [load])

  const filtered = useMemo(() => filterByUserOrShop(items, search), [items, search])
  const total = filtered.reduce((s, r) => s + Number(r.total_price ?? 0), 0)
  const commAmount = (total * Number(commPct || 0)) / 100

  const saveCommission = async (pct: string) => {
    const fd = new FormData()
    fd.append("percent", pct)
    await adminPost(API.adminCommission, fd)
  }

  const openOrder = (row: CartItem) => {
    setOrderModal(row)
    setQty(Number(row.quantity ?? 1))
    setReceiver({ name: "", address: "", phone: "" })
  }

  const saveOrder = async () => {
    if (!orderModal) return
    if (!receiver.name || !receiver.address || !receiver.phone) {
      showToast("กรุณากรอกข้อมูลผู้รับให้ครบ", "error")
      return
    }
    const unit = Number(orderModal.unit_price ?? 0)
    const comm = unit * qty * (Number(commPct) / 100)
    const fd = new FormData()
    fd.append("action", "update_order")
    fd.append("id", String(orderModal.id))
    fd.append("quantity", String(qty))
    fd.append("status", "shipping")
    fd.append("receiver_name", receiver.name)
    fd.append("receiver_address", receiver.address)
    fd.append("receiver_phone", receiver.phone)
    fd.append("commission_amount", String(comm))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminCart, fd)
    if (res.success) {
      showToast("บันทึกข้อมูลลงตารางเรียบร้อยแล้ว")
      setOrderModal(null)
      load()
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const deleteItem = async () => {
    if (deleteId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(deleteId))
    const res = await adminPost<{ success: boolean }>(API.adminCart, fd)
    if (res.success) {
      showToast("ลบแล้ว")
      setDeleteId(null)
      load()
    }
  }

  return (
    <>
      <AdminTopBar title="ตะกร้าสินค้า" backTo="/admin" />
      <div className="admin-order-wrap">
        <div className="admin-page-header" style={{ marginBottom: 12 }}>
          <h1 className="admin-page-title" style={{ fontSize: 18 }}>
            ตะกร้าสินค้า ({items.length} รายการ)
          </h1>
          <Link to="/admin/shipping-orders" className="admin-order-top-action">
            อัปเดต รอรับสินค้า
            {shippingCount > 0 ? <span className="admin-cart-badge-inline">{shippingCount}</span> : null}
          </Link>
        </div>

        <div className="admin-order-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัสผู้ใช้หรือร้านค้า…"
          />
        </div>

        <div className="admin-order-summary">
          <span>
            ยอดรวม: <strong>${adminFmtMoney(total)}</strong>
          </span>
        </div>

        <div className="admin-order-commission">
          <span>ค่าคอมมิชชั่น</span>
          <input
            type="number"
            value={commPct}
            onChange={(e) => {
              setCommPct(e.target.value)
              saveCommission(e.target.value)
            }}
          />
          <span>%</span>
          <strong>${adminFmtMoney(commAmount)}</strong>
        </div>

        <div className="admin-order-table-wrap">
          {loading ? (
            <div className="admin-order-empty">กำลังโหลด…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-order-empty">
              <i className="fa-solid fa-cart-shopping" style={{ fontSize: 40, display: "block", marginBottom: 10 }} />
              ตะกร้าว่างเปล่า
              <Link to="/admin/customer-store-products">
                <i className="fa-solid fa-store" /> เลือกสินค้าใส่ตะกร้า
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>รูป</th>
                  <th>ชื่อสินค้า</th>
                  <th>รหัสผู้ใช้</th>
                  <th>ร้านค้า</th>
                  <th>จำนวน</th>
                  <th>ราคา/หน่วย</th>
                  <th>ราคารวม</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const st = adminStatusBadge(row.status)
                  return (
                    <tr key={String(row.id)}>
                      <td>
                        <img className="admin-order-thumb" src={adminParseImage(row.product_image)} alt="" />
                      </td>
                      <td>{String(row.product_name ?? "-")}</td>
                      <td>{String(row.user_id ?? "-")}</td>
                      <td>{String(row.shop_name ?? "-")}</td>
                      <td>{adminFmtNum(row.quantity)}</td>
                      <td>${adminFmtMoney(row.unit_price)}</td>
                      <td>${adminFmtMoney(row.total_price)}</td>
                      <td>
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td>
                        <button type="button" className="admin-order-act ok" onClick={() => openOrder(row)}>
                          <i className="fa-solid fa-check" />
                        </button>
                        <button type="button" className="admin-order-act del" onClick={() => setDeleteId(Number(row.id))}>
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={`admin-order-modal-overlay${orderModal ? " show" : ""}`} onClick={() => setOrderModal(null)}>
        <div className="admin-order-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-order-modal-head">รายละเอียดคำสั่งซื้อ</div>
          <div className="admin-order-modal-body">
            {orderModal ? (
              <>
                <div className="admin-order-product-preview">
                  <img src={adminParseImage(orderModal.product_image)} alt="" />
                  <div>
                    <div>{String(orderModal.product_name)}</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>{String(orderModal.shop_name)}</div>
                    <div>${adminFmtMoney(orderModal.unit_price)}</div>
                  </div>
                </div>
                <div className="admin-order-qty-row">
                  <span>จำนวน</span>
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    -
                  </button>
                  <span>{qty}</span>
                  <button type="button" onClick={() => setQty((q) => q + 1)}>
                    +
                  </button>
                </div>
                <div className="admin-form-group">
                  <label>ชื่อผู้รับ</label>
                  <input className="admin-form-control" value={receiver.name} onChange={(e) => setReceiver({ ...receiver, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>ที่อยู่</label>
                  <textarea className="admin-form-control" value={receiver.address} onChange={(e) => setReceiver({ ...receiver, address: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>เบอร์โทร</label>
                  <input className="admin-form-control" value={receiver.phone} onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })} />
                </div>
                <p style={{ fontSize: 13 }}>
                  ค่าคอมมิชชั่น ({commPct}%): $
                  {adminFmtMoney(Number(orderModal.unit_price ?? 0) * qty * (Number(commPct) / 100))}
                </p>
              </>
            ) : null}
          </div>
          <div className="admin-order-modal-foot">
            <button type="button" className="admin-edit-btn cancel" onClick={() => setOrderModal(null)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-edit-btn save" onClick={saveOrder}>
              บันทึก
            </button>
          </div>
        </div>
      </div>

      <AdminConfirmModal
        open={deleteId != null}
        title="ยืนยันการลบ"
        message="ต้องการลบรายการนี้ออกจากตะกร้าใช่หรือไม่?"
        onCancel={() => setDeleteId(null)}
        onConfirm={deleteItem}
      />
      {Toast}
    </>
  )
}

function AdminFlowOrdersPage({
  orderStatus,
  title,
  icon,
  nextStatus,
  nextLabel,
  showReview,
}: {
  orderStatus: string
  title: string
  icon: string
  nextStatus: string
  nextLabel: string
  showReview?: boolean
}) {
  useBodyClass("admin-page")
  const navigate = useNavigate()
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [detailRow, setDetailRow] = useState<CartItem | null>(null)
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null)
  const [reviewRow, setReviewRow] = useState<CartItem | null>(null)
  const [reviewStars, setReviewStars] = useState(5)
  const [reviewText, setReviewText] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminOrders(orderStatus)
      setRows(data.items ?? data.orders ?? [])
    } finally {
      setLoading(false)
    }
  }, [orderStatus])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => filterByUserOrShop(rows, search), [rows, search])
  const total = filtered.reduce((s, r) => s + Number(r.total_price ?? 0), 0)

  const updateStatus = async (ids: number[]) => {
    let ok = 0
    for (const id of ids) {
      const fd = new FormData()
      fd.append("action", "update_status")
      fd.append("id", String(id))
      fd.append("order_status", nextStatus)
      fd.append("trigger_type", ids.length > 1 ? "bulk" : "single")
      const res = await adminPost<{ success: boolean }>(API.adminCartOrders, fd)
      if (res.success) ok++
    }
    showToast(`ดำเนินการสำเร็จ ${ok} รายการ`)
    setConfirmIds(null)
    setSelected(new Set())
    load()
    if (orderStatus === "shipping" && ok > 0) navigate("/admin/receiving-orders")
  }

  const submitReview = async () => {
    if (!reviewRow) return
    const fd = new FormData()
    fd.append("order_id", String(reviewRow.id))
    fd.append("star_rating", String(reviewStars))
    fd.append("review_text", reviewText)
    const res = await adminPost<{ success: boolean; message?: string }>(API.submitReviewAdmin, fd)
    if (res.success) {
      showToast("บันทึกรีวิวแล้ว")
      setReviewRow(null)
      setReviewText("")
      load()
    } else showToast(res.message ?? "บันทึกรีวิวไม่สำเร็จ", "error")
  }

  return (
    <>
      <OrderFlowTopBar
        title={title}
        icon={icon}
        action={
          orderStatus === "shipping" ? (
            <button
              type="button"
              className="admin-order-top-action"
              onClick={() => setConfirmIds(filtered.map((r) => Number(r.id)))}
            >
              อัปเดตเป็นรอรับ ({filtered.length})
            </button>
          ) : (
            <span className="admin-top-count-badge">{filtered.length}</span>
          )
        }
      />

      <div className="admin-order-wrap">
        <div className="admin-stats-row">
          <div className="admin-stat-box blue">
            <div className="sk">รายการ</div>
            <div className="sv">{filtered.length}</div>
          </div>
          <div className="admin-stat-box green">
            <div className="sk">ยอดรวม</div>
            <div className="sv">${adminFmtMoney(total)}</div>
          </div>
        </div>

        <div className="admin-order-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหารหัสผู้ใช้หรือชื่อสินค้า…" />
        </div>

        <div className={`admin-bulk-bar${selected.size ? " show" : ""}`}>
          <span>
            เลือกแล้ว <strong>{selected.size}</strong> รายการ
          </span>
          <button type="button" onClick={() => setConfirmIds(Array.from(selected))}>
            {nextLabel}
          </button>
        </div>

        <div className="admin-order-table-wrap">
          {loading ? (
            <div className="admin-order-empty">กำลังโหลด…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-order-empty">ไม่มีรายการ</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(filtered.map((r) => Number(r.id))))
                        else setSelected(new Set())
                      }}
                    />
                  </th>
                  <th>รูป</th>
                  <th>ชื่อสินค้า</th>
                  <th>รหัสผู้ใช้</th>
                  <th>ร้านค้า</th>
                  <th>จำนวน</th>
                  <th>ราคารวม</th>
                  {showReview ? <th>รีวิว</th> : null}
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const id = Number(row.id)
                  const st = adminStatusBadge(row.order_status ?? row.status)
                  return (
                    <tr key={id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => {
                            setSelected((prev) => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id)
                              else next.add(id)
                              return next
                            })
                          }}
                        />
                      </td>
                      <td>
                        <img className="admin-order-thumb" src={adminParseImage(row.product_image)} alt="" />
                      </td>
                      <td>{String(row.product_name ?? "-")}</td>
                      <td>{String(row.user_id ?? "-")}</td>
                      <td>{String(row.shop_name ?? "-")}</td>
                      <td>{adminFmtNum(row.quantity)}</td>
                      <td>${adminFmtMoney(row.total_price)}</td>
                      {showReview ? (
                        <td>
                          {!!String(row.review_text ?? "").trim() || Number(row.star_rating ?? 0) > 0 ? (
                            <i className="fa-solid fa-star" style={{ color: "#f59e0b" }} />
                          ) : (
                            <button type="button" className="admin-order-act info" onClick={() => setReviewRow(row)}>
                              <i className="fa-regular fa-star" />
                            </button>
                          )}
                        </td>
                      ) : null}
                      <td>
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td>
                        <button type="button" className="admin-order-act info" onClick={() => setDetailRow(row)}>
                          <i className="fa-solid fa-circle-info" />
                        </button>
                        <button type="button" className="admin-order-act ok" onClick={() => setConfirmIds([id])}>
                          <i className="fa-solid fa-check" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={`admin-order-modal-overlay${detailRow ? " show" : ""}`} onClick={() => setDetailRow(null)}>
        <div className="admin-order-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-order-modal-head">รายละเอียดคำสั่งซื้อ</div>
          <div className="admin-order-modal-body admin-order-detail-grid">
            {detailRow ? (
              <>
                <div>
                  <strong>สินค้า:</strong> {String(detailRow.product_name)}
                </div>
                <div>
                  <strong>ผู้รับ:</strong> {String(detailRow.receiver_name ?? "-")}
                </div>
                <div>
                  <strong>ที่อยู่:</strong> {String(detailRow.receiver_address ?? "-")}
                </div>
                <div>
                  <strong>โทร:</strong> {String(detailRow.receiver_phone ?? "-")}
                </div>
                <div>
                  <strong>วันที่:</strong> {formatAdminDate(String(detailRow.ordered_at ?? detailRow.created_at ?? ""))}
                </div>
              </>
            ) : null}
          </div>
          <div className="admin-order-modal-foot">
            <button type="button" className="admin-edit-btn cancel" onClick={() => setDetailRow(null)}>
              ปิด
            </button>
            {detailRow ? (
              <button type="button" className="admin-edit-btn save" onClick={() => { setConfirmIds([Number(detailRow.id)]); setDetailRow(null) }}>
                {nextLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <AdminConfirmModal
        open={confirmIds != null}
        title="ยืนยันการดำเนินการ"
        message={`ยืนยัน${nextLabel} ${confirmIds?.length ?? 0} รายการ?`}
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => confirmIds && updateStatus(confirmIds)}
      />

      <div className={`admin-order-modal-overlay${reviewRow ? " show" : ""}`} onClick={() => setReviewRow(null)}>
        <div className="admin-order-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-order-modal-head">รีวิวสินค้า</div>
          <div className="admin-order-modal-body">
            <div className="admin-review-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= reviewStars ? "active" : ""} onClick={() => setReviewStars(n)}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="admin-form-control"
              placeholder="เขียนรีวิว…"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
          </div>
          <div className="admin-order-modal-foot">
            <button type="button" className="admin-edit-btn cancel" onClick={() => setReviewRow(null)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-edit-btn save" onClick={submitReview}>
              บันทึกรีวิว
            </button>
          </div>
        </div>
      </div>
      {Toast}
    </>
  )
}

export function AdminShippingOrdersPage() {
  return (
    <AdminFlowOrdersPage
      orderStatus="shipping"
      title="สินค้ารอจัดส่ง"
      icon="fa-truck-fast"
      nextStatus="receiving"
      nextLabel="จัดส่งแล้ว"
    />
  )
}

export function AdminReceivingOrdersPage() {
  return (
    <AdminFlowOrdersPage
      orderStatus="receiving"
      title="สินค้าสถานะรอรับสินค้า"
      icon="fa-box-open"
      nextStatus="completed"
      nextLabel="จัดส่งเสร็จ"
      showReview
    />
  )
}
