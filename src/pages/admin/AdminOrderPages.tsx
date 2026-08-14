import { useCallback, useEffect, useMemo, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { Link, useNavigate } from "react-router-dom"
import { AdminTopBar } from "@/components/admin/AdminTopBar"
import { AdminConfirmModal, AdminDetailModal, AdminOrderTableWrap, useAdminToast } from "@/components/admin/AdminUi"
import {
  adminGet,
  adminPost,
  fetchAdminCart,
  fetchAdminOrders,
  fetchAdminUserWallet,
  fetchCustomerShopProducts,
  fetchCustomerStores,
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
import { showAdminTableLoading } from "@/lib/adminLoadHelper"

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

const PRODUCT_STAT_FIELDS = [
  { key: "product_stock" as const, label: "จำนวนสต็อก", type: "number" },
  { key: "view_count" as const, label: "ยอดเข้าชม", type: "number" },
  { key: "trust_score" as const, label: "คะแนนความน่าเชื่อถือ", type: "number" },
  { key: "sales_volume" as const, label: "ยอดขายสะสม", type: "number" },
]

function AdminOrderDetailPanel({ row }: { row: CartItem }) {
  const st = adminStatusBadge(row.order_status ?? row.status)
  const phone = String(row.receiver_phone ?? row.contact_phone ?? "").trim()
  const receiverName = String(row.receiver_name ?? row.contact_name ?? "-")
  const receiverAddress = String(row.receiver_address ?? row.contact_address ?? "-")
  const orderedAt = formatAdminDate(String(row.ordered_at ?? row.created_at ?? ""))

  return (
    <div className="admin-order-detail-body">
      <div className="admin-order-detail-hero">
        <img
          className="admin-order-detail-img"
          src={adminParseImage(row.product_image)}
          alt={String(row.product_name ?? "product")}
        />
        <div className="admin-order-detail-hero-text">
          <span className={`admin-order-detail-status ${st.className}`}>{st.label}</span>
          <div className="admin-order-product-name">{String(row.product_name ?? "-")}</div>
          <div className="admin-order-product-sub">{String(row.shop_name ?? "-")}</div>
          <div className="admin-order-product-price">${adminFmtMoney(row.total_price ?? row.unit_price)}</div>
        </div>
      </div>

      <div className="admin-order-detail-metrics">
        <div className="admin-order-metric">
          <span>รหัสคำสั่งซื้อ</span>
          <strong>#{String(row.id ?? "-")}</strong>
        </div>
        <div className="admin-order-metric">
          <span>รหัสผู้ใช้</span>
          <strong>#{String(row.user_id ?? "-")}</strong>
        </div>
        <div className="admin-order-metric">
          <span>จำนวน</span>
          <strong>{adminFmtNum(row.quantity ?? 1)}</strong>
        </div>
        <div className="admin-order-metric">
          <span>ราคาต่อชิ้น</span>
          <strong>${adminFmtMoney(row.unit_price)}</strong>
        </div>
      </div>

      <h4 className="admin-detail-section-title">ข้อมูลผู้รับ</h4>
      <dl className="admin-detail-list admin-detail-list--emphasis">
        <div className="admin-detail-item">
          <dt>ชื่อผู้รับ</dt>
          <dd>{receiverName}</dd>
        </div>
        <div className="admin-detail-item admin-detail-item--wide">
          <dt>ที่อยู่จัดส่ง</dt>
          <dd>{receiverAddress}</dd>
        </div>
        <div className="admin-detail-item">
          <dt>เบอร์โทร</dt>
          <dd>
            {phone ? (
              <a className="admin-detail-phone" href={`tel:${phone.replace(/\s/g, "")}`}>
                {phone}
              </a>
            ) : (
              "-"
            )}
          </dd>
        </div>
        <div className="admin-detail-item">
          <dt>วันที่สั่งซื้อ</dt>
          <dd>{orderedAt}</dd>
        </div>
      </dl>

      {Number(row.commission_amount ?? 0) > 0 ? (
        <p className="admin-order-comm-note">
          ค่าคอมมิชชั่น: ${adminFmtMoney(row.commission_amount)}
        </p>
      ) : null}
    </div>
  )
}

export function AdminCustomerStoreProductsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [stores, setStores] = useState<Record<string, unknown>[]>([])
  const [rows, setRows] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [storeSearch, setStoreSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [cartCount, setCartCount] = useState(0)
  const [detailRow, setDetailRow] = useState<CartItem | null>(null)
  const [editForm, setEditForm] = useState({
    product_stock: "",
    view_count: "",
    trust_score: "",
    sales_volume: "",
  })

  const openDetail = (row: CartItem) => {
    setDetailRow(row)
    setEditForm({
      product_stock: String(row.product_stock ?? ""),
      view_count: String(row.view_count ?? ""),
      trust_score: String(row.trust_score ?? ""),
      sales_volume: String(row.sales_volume ?? ""),
    })
  }

  const load = useCallback(
    async (silent = false) => {
      if (!silent || (rows.length === 0 && stores.length === 0)) setLoading(true)
      try {
        const [storeRows, products, cart] = await Promise.all([
          fetchCustomerStores(),
          fetchCustomerShopProducts(),
          fetchAdminCart("pending"),
        ])
        setStores(storeRows)
        setRows(products)
        setCartCount(cart.items?.length ?? 0)
      } catch {
        showToast("โหลดข้อมูลไม่สำเร็จ", "error")
      } finally {
        if (!silent || (rows.length === 0 && stores.length === 0)) setLoading(false)
      }
    },
    [rows.length, stores.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => filterProductsByNameOrShop(rows, search), [rows, search])

  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase()
    if (!q) return stores
    return stores.filter((store) => {
      const name = String(store.shop_name ?? "").toLowerCase()
      const uid = String(store.user_id ?? "")
      const category = String(store.main_category ?? "").toLowerCase()
      return name.includes(q) || uid.includes(q) || category.includes(q)
    })
  }, [storeSearch, stores])

  const addToCart = async (row: CartItem) => {
    const fd = new FormData()
    fd.append("action", "add")
    fd.append("product_id", String(row.source_product_id ?? row.id))
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
    if (!detailRow) return
    const fd = new FormData()
    fd.append("action", "update_product")
    fd.append("id", String(detailRow.id))
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
      setDetailRow(null)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const addDetailToCart = async () => {
    if (!detailRow) return
    await addToCart(detailRow)
  }

  return (
    <>
      <AdminTopBar title="สินค้าของลูกค้า" backTo="/admin" />
      <div className="admin-order-wrap admin-customer-products-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            <i className="fa-solid fa-store" /> ร้านและสินค้าลูกค้า
          </h1>
          <div className="admin-page-header-actions">
            <Link to="/admin/cart" className="back-btn admin-header-cart-btn">
              <i className="fa-solid fa-cart-shopping" />
              ตะกร้า
              {cartCount > 0 ? <span className="admin-cart-badge-inline">{cartCount}</span> : null}
            </Link>
            <Link to="/admin" className="back-btn">
              <i className="fa-solid fa-arrow-left" /> กลับหน้าหลัก
            </Link>
          </div>
        </div>

        <section className="admin-customer-stores-section">
          <div className="admin-section-head">
            <h2 className="admin-section-title">
              <i className="fa-solid fa-shop" /> ร้านที่ลูกค้าเปิด ({stores.length})
            </h2>
          </div>
          <div className="admin-order-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              placeholder="ค้นหาชื่อร้าน / รหัสผู้ใช้ / หมวดหมู่…"
            />
          </div>
          <AdminOrderTableWrap className="admin-product-table admin-stores-table">
            {showAdminTableLoading(loading, stores.length) ? (
              <div className="admin-order-empty">กำลังโหลดร้านค้า…</div>
            ) : filteredStores.length === 0 ? (
              <div className="admin-order-empty">
                {stores.length === 0 ? (
                  <>
                    ยังไม่มีลูกค้าเปิดร้าน
                    <br />
                    <small style={{ opacity: 0.75, fontWeight: 400 }}>
                      ลูกค้าเปิดร้านได้จากเมนู &quot;ฉันจะเปิดร้าน&quot; ในหน้าโปรไฟล์
                    </small>
                  </>
                ) : (
                  "ไม่พบร้านตามคำค้นหา"
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>รูป</th>
                    <th>ชื่อร้าน</th>
                    <th>หมวดหมู่</th>
                    <th>สินค้าในร้าน</th>
                    <th>ขายแล้ว</th>
                    <th>สถานะ</th>
                    <th>รหัสผู้ใช้</th>
                    <th>เปิดเมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => (
                    <tr key={String(store.id)}>
                      <td>
                        <img
                          className="admin-order-thumb"
                          src={adminParseImage(String(store.shop_image ?? ""))}
                          alt=""
                        />
                      </td>
                      <td>{String(store.shop_name ?? "-")}</td>
                      <td>{String(store.main_category ?? "-")}</td>
                      <td>{adminFmtNum(store.product_count ?? 0)}</td>
                      <td>{adminFmtNum(store.sold_count ?? 0)}</td>
                      <td>{String(store.status ?? "active")}</td>
                      <td>#{String(store.user_id ?? "-")}</td>
                      <td>{formatAdminDate(String(store.created_at ?? ""))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminOrderTableWrap>
        </section>

        <section className="admin-customer-products-section">
          <div className="admin-section-head">
            <h2 className="admin-section-title">
              <i className="fa-solid fa-box" /> สินค้าในร้านลูกค้า ({rows.length})
            </h2>
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

        <AdminOrderTableWrap className="admin-product-table">
          {showAdminTableLoading(loading, rows.length) ? (
            <div className="admin-order-empty">กำลังโหลด…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-order-empty">
              {rows.length === 0 ? (
                <>
                  ยังไม่มีสินค้าในร้านลูกค้า
                  <br />
                  <small style={{ opacity: 0.75, fontWeight: 400 }}>
                    หลังเปิดร้าน ระบบจะนำสินค้าจากหมวดที่เลือกเข้าร้านอัตโนมัติ
                    — ถ้ายังไม่มี ลองบันทึกร้านอีกครั้งหรือเพิ่มจากคอลเลกชันสินค้า
                  </small>
                </>
              ) : (
                "ไม่พบข้อมูลสินค้าตามคำค้นหา"
              )}
            </div>
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
                          title="รายละเอียด / แก้ไข"
                          onClick={() => openDetail(row)}
                        >
                          <i className="fa-solid fa-circle-info" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </AdminOrderTableWrap>
        </section>
      </div>

      <AdminDetailModal
        open={!!detailRow}
        title="รายละเอียดสินค้า"
        wide
        onClose={() => setDetailRow(null)}
        footer={
          <>
            <button type="button" className="admin-edit-btn cancel" onClick={() => setDetailRow(null)}>
              ปิด
            </button>
            <button type="button" className="admin-edit-btn admin-btn-cart" onClick={addDetailToCart}>
              <i className="fa-solid fa-cart-plus" /> เพิ่มลงตะกร้า
            </button>
            <button type="button" className="admin-edit-btn save" onClick={saveEdit}>
              บันทึก
            </button>
          </>
        }
      >
        {detailRow ? (
          <>
            <div className="admin-order-product-preview admin-customer-product-preview">
              <img src={adminParseImage(detailRow.product_image)} alt="" />
              <div className="admin-order-product-meta">
                <div className="admin-order-product-name">{String(detailRow.product_name ?? "-")}</div>
                <div className="admin-order-product-sub">{String(detailRow.shop_name ?? "-")}</div>
                <div className="admin-order-product-price">${adminFmtMoney(detailRow.product_price)}</div>
              </div>
            </div>

            <dl className="admin-detail-list admin-customer-product-meta">
              <div className="admin-detail-item">
                <dt>รหัสสินค้า</dt>
                <dd>#{String(detailRow.id ?? "-")}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>รหัสผู้ใช้</dt>
                <dd>#{String(detailRow.user_id ?? "-")}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>หมวดหมู่</dt>
                <dd>{String(detailRow.product_category ?? "-")}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>ประเภท</dt>
                <dd>{String(detailRow.product_type ?? "customer")}</dd>
              </div>
            </dl>

            <h4 className="admin-detail-section-title">แก้ไขข้อมูลสถิติ</h4>
            <div className="admin-customer-product-stats">
              {PRODUCT_STAT_FIELDS.map(({ key, label, type }) => (
                <div className="admin-form-group" key={key}>
                  <label htmlFor={`product-stat-${key}`}>{label}</label>
                  <input
                    id={`product-stat-${key}`}
                    className="admin-form-control"
                    type={type}
                    step={key === "trust_score" ? "0.1" : "1"}
                    min={0}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}
      </AdminDetailModal>
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
  const [customerWallet, setCustomerWallet] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [qty, setQty] = useState(1)
  const [receiver, setReceiver] = useState({ name: "", address: "", phone: "" })

  const load = useCallback(
    async (silent = false) => {
      if (!silent || items.length === 0) setLoading(true)
      try {
        const [cart, shipping] = await Promise.all([
          fetchAdminCart("pending"),
          fetchAdminCart("shipping"),
        ])
        setItems(cart.items ?? [])
        setShippingCount(shipping.items?.length ?? 0)
      } catch {
        showToast("โหลดตะกร้าไม่สำเร็จ", "error")
      } finally {
        if (!silent || items.length === 0) setLoading(false)
      }
    },
    [items.length, showToast],
  )

  useEffect(() => {
    load()
    adminGet<{ percent?: number; commission_percent?: number }>(API.adminCommission)
      .then((d) => setCommPct(String(d.percent ?? d.commission_percent ?? 20)))
      .catch(() => {})
  }, [load])

  const filtered = useMemo(() => filterByUserOrShop(items, search), [items, search])
  const total = filtered.reduce((s, r) => s + Number(r.total_price ?? 0), 0)
  const commAmount = (total * Number(commPct || 0)) / 100

  const saveCommission = useCallback(
    async (pct: string) => {
      const fd = new FormData()
      fd.append("percent", pct)
      const res = await adminPost<{ success: boolean; message?: string }>(API.adminCommission, fd)
      if (res.success === false) showToast(res.message ?? "บันทึกค่าคอมไม่สำเร็จ", "error")
    },
    [showToast],
  )

  const openOrder = (row: CartItem) => {
    setOrderModal(row)
    setQty(Number(row.quantity ?? 1))
    setCustomerWallet(null)
    setReceiver({
      name: String(row.receiver_name ?? row.contact_name ?? ""),
      address: String(row.receiver_address ?? row.contact_address ?? ""),
      phone: String(row.receiver_phone ?? row.contact_phone ?? ""),
    })
    const uid = Number(row.user_id ?? 0)
    if (uid > 0) {
      fetchAdminUserWallet(uid)
        .then(setCustomerWallet)
        .catch(() => setCustomerWallet(null))
    }
  }

  const orderUnit = Number(orderModal?.unit_price ?? 0)
  const orderComm = orderUnit * qty * (Number(commPct) / 100)
  const orderTotalDue = orderUnit * qty + orderComm
  const walletInsufficient =
    customerWallet != null && Number.isFinite(customerWallet) && customerWallet < orderTotalDue

  const saveOrder = async () => {
    if (!orderModal) return
    if (!receiver.name || !receiver.address || !receiver.phone) {
      showToast("กรุณากรอกข้อมูลผู้รับให้ครบ", "error")
      return
    }
    if (walletInsufficient) {
      showToast("ยอดในกระเป๋าไม่เพียงพอ — ลูกค้าต้องฝากเงินก่อน", "error")
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
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const deleteItem = async () => {
    if (deleteId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(deleteId))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminCart, fd)
    if (res.success) {
      showToast("ลบแล้ว")
      setDeleteId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
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
            สินค้ารอจัดส่ง
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
            onChange={(e) => setCommPct(e.target.value)}
            onBlur={() => saveCommission(commPct)}
          />
          <span>%</span>
          <strong>${adminFmtMoney(commAmount)}</strong>
        </div>

        <AdminOrderTableWrap>
          {showAdminTableLoading(loading, items.length) ? (
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
        </AdminOrderTableWrap>
      </div>

      <AdminDetailModal
        open={!!orderModal}
        title="รายละเอียดคำสั่งซื้อ"
        onClose={() => setOrderModal(null)}
        footer={
          <>
            <button type="button" className="admin-edit-btn cancel" onClick={() => setOrderModal(null)}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="admin-edit-btn save"
              onClick={saveOrder}
              disabled={walletInsufficient}
            >
              บันทึก
            </button>
          </>
        }
      >
        {orderModal ? (
          <div className="admin-order-detail-body admin-order-detail-body--form">
            <div className="admin-order-detail-hero">
              <img
                className="admin-order-detail-img"
                src={adminParseImage(orderModal.product_image)}
                alt={String(orderModal.product_name ?? "product")}
              />
              <div className="admin-order-detail-hero-text">
                <span className="admin-order-detail-status admin-order-status admin-order-status--pending">
                  รอดำเนินการ
                </span>
                <div className="admin-order-product-name">{String(orderModal.product_name)}</div>
                <div className="admin-order-product-sub">{String(orderModal.shop_name)}</div>
                <div className="admin-order-product-price">${adminFmtMoney(orderModal.unit_price)}</div>
              </div>
            </div>

            <div className="admin-order-detail-metrics">
              <div className="admin-order-metric">
                <span>รหัสรายการ</span>
                <strong>#{String(orderModal.id ?? "-")}</strong>
              </div>
              <div className="admin-order-metric">
                <span>รหัสผู้ใช้</span>
                <strong>#{String(orderModal.user_id ?? "-")}</strong>
              </div>
            </div>

            <h4 className="admin-detail-section-title">จำนวนและผู้รับ</h4>
            <div className="admin-order-qty-row">
              <span className="admin-order-qty-label">จำนวน</span>
              <button type="button" className="admin-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="admin-qty-value">{qty}</span>
              <button type="button" className="admin-qty-btn" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <div className="admin-form-group">
              <label>ชื่อผู้รับ</label>
              <input
                className="admin-form-control"
                value={receiver.name}
                onChange={(e) => setReceiver({ ...receiver, name: e.target.value })}
                autoComplete="name"
              />
            </div>
            <div className="admin-form-group">
              <label>ที่อยู่จัดส่ง</label>
              <textarea
                className="admin-form-control"
                rows={3}
                value={receiver.address}
                onChange={(e) => setReceiver({ ...receiver, address: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label>เบอร์โทร</label>
              <input
                className="admin-form-control"
                type="tel"
                inputMode="tel"
                value={receiver.phone}
                onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })}
                autoComplete="tel"
              />
            </div>
            <p className="admin-order-comm-note">
              ค่าคอมมิชชั่น ({commPct}%): ${adminFmtMoney(orderComm)}
            </p>
            <p className="admin-order-comm-note">
              ยอดหักจากกระเป๋าลูกค้า: <strong>${adminFmtMoney(orderTotalDue)}</strong>
              {customerWallet != null ? (
                <>
                  {" "}
                  (กระเป๋ามี ${adminFmtMoney(customerWallet)})
                </>
              ) : null}
            </p>
            {walletInsufficient ? (
              <p className="admin-order-wallet-warn">
                ยอดในกระเป๋าไม่เพียงพอ — ลูกค้าต้องฝากเงินก่อน (เมนู ลูกค้าฝากเงิน / เติมเงินลูกค้า)
              </p>
            ) : null}
          </div>
        ) : null}
      </AdminDetailModal>

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

  const load = useCallback(
    async (silent = false) => {
      if (!silent || rows.length === 0) setLoading(true)
      try {
        const data = await fetchAdminOrders(orderStatus)
        setRows(data.items ?? data.orders ?? [])
      } catch {
        showToast("โหลดรายการไม่สำเร็จ", "error")
      } finally {
        if (!silent || rows.length === 0) setLoading(false)
      }
    },
    [orderStatus, rows.length, showToast],
  )

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
    load(true)
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
      load(true)
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

        <AdminOrderTableWrap>
          {showAdminTableLoading(loading, rows.length) ? (
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
        </AdminOrderTableWrap>
      </div>

      <AdminDetailModal
        open={!!detailRow}
        title="รายละเอียดคำสั่งซื้อ"
        onClose={() => setDetailRow(null)}
        footer={
          <>
            <button type="button" className="admin-edit-btn cancel" onClick={() => setDetailRow(null)}>
              ปิด
            </button>
            {detailRow ? (
              <button
                type="button"
                className="admin-edit-btn save"
                onClick={() => {
                  setConfirmIds([Number(detailRow.id)])
                  setDetailRow(null)
                }}
              >
                {nextLabel}
              </button>
            ) : null}
          </>
        }
      >
        {detailRow ? <AdminOrderDetailPanel row={detailRow} /> : null}
      </AdminDetailModal>

      <AdminConfirmModal
        open={confirmIds != null}
        title="ยืนยันการดำเนินการ"
        message={`ยืนยัน${nextLabel} ${confirmIds?.length ?? 0} รายการ?`}
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => confirmIds && updateStatus(confirmIds)}
      />

      <AdminDetailModal
        open={!!reviewRow}
        title="รีวิวสินค้า"
        onClose={() => setReviewRow(null)}
        footer={
          <>
            <button type="button" className="admin-edit-btn cancel" onClick={() => setReviewRow(null)}>
              ยกเลิก
            </button>
            <button type="button" className="admin-edit-btn save" onClick={submitReview}>
              บันทึกรีวิว
            </button>
          </>
        }
      >
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
      </AdminDetailModal>
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
