import { useCallback, useEffect, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import {
  AdminConfirmModal,
  AdminEditModal,
  AdminEmptyRow,
  AdminLoadingRow,
  AdminTableWrap,
  useAdminToast,
} from "@/components/admin/AdminUi"
import {
  adminPost,
  fetchAdminCategories,
  fetchAdminGeneralShops,
  fetchAdminRecommendedShops,
  fetchAdminStoreProducts,
  formatAdminDate,
  type AdminProduct,
} from "@/lib/adminApi"
import { adminParseImage } from "@/lib/adminUtils"
import { useBodyClass } from "@/hooks/useBodyClass"
import { runAdminListLoad, showAdminTableLoading } from "@/lib/adminLoadHelper"

const DEFAULT_DESC = "สินค้าคุณภาพดี รับประกันความพึงพอใจ"

type ProductForm = {
  user_id: string
  shop_name: string
  product_type: string
  product_category: string
  product_sizes: string
  product_colors: string
  product_name: string
  product_description: string
  product_price: string
  product_stock: string
  review_count: string
  view_count: string
  trust_score: string
  sales_volume: string
}

const emptyForm = (): ProductForm => ({
  user_id: `admin_${Math.floor(1000 + Math.random() * 9000)}`,
  shop_name: "",
  product_type: "admin",
  product_category: "",
  product_sizes: "",
  product_colors: "",
  product_name: "",
  product_description: DEFAULT_DESC,
  product_price: "",
  product_stock: "",
  review_count: "",
  view_count: "",
  trust_score: "",
  sales_volume: "",
})

export default function AdminAddProductPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [images, setImages] = useState<File[]>([])
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const loadMeta = useCallback(async () => {
    const [rec, gen, cats] = await Promise.all([
      fetchAdminRecommendedShops(),
      fetchAdminGeneralShops(),
      fetchAdminCategories(),
    ])
    const shopNames = [...rec, ...gen].map((s) => s.shop_name).filter(Boolean)
    setShops([...new Set(shopNames)])
    setCategories(cats.map((c) => c.category_name))
  }, [])

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: fetchAdminStoreProducts,
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    loadMeta()
    load()
  }, [load, loadMeta])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm())
    setImages([])
    setModalOpen(true)
  }

  const openEdit = (row: AdminProduct & Record<string, unknown>) => {
    setEditId(Number(row.id))
    setForm({
      user_id: `admin_${row.user_id ?? ""}`,
      shop_name: String(row.shop_name ?? ""),
      product_type: String(row.product_type ?? "admin"),
      product_category: String(row.product_category ?? ""),
      product_sizes: String(row.product_sizes ?? ""),
      product_colors: String(row.product_colors ?? ""),
      product_name: String(row.product_name ?? ""),
      product_description: String(row.product_description ?? DEFAULT_DESC),
      product_price: String(row.product_price ?? ""),
      product_stock: String(row.product_stock ?? ""),
      review_count: String(row.review_count ?? ""),
      view_count: String(row.view_count ?? ""),
      trust_score: String(row.trust_score ?? ""),
      sales_volume: String(row.sales_volume ?? ""),
    })
    setImages([])
    setModalOpen(true)
  }

  const save = async () => {
    const fd = new FormData()
    fd.append("action", editId ? "update" : "create")
    if (editId) fd.append("id", String(editId))
    const uid = form.user_id.replace(/^admin_/i, "")
    fd.append("user_id", uid)
    fd.append("shop_name", form.shop_name)
    fd.append("product_type", form.product_type)
    fd.append("product_category", form.product_category)
    fd.append("product_sizes", form.product_sizes)
    fd.append("product_colors", form.product_colors)
    fd.append("product_name", form.product_name)
    fd.append("product_description", form.product_description)
    fd.append("product_price", form.product_price)
    fd.append("product_stock", form.product_stock)
    fd.append("review_count", form.review_count || "0")
    fd.append("view_count", form.view_count || "0")
    fd.append("trust_score", form.trust_score || "0")
    fd.append("sales_volume", form.sales_volume || "0")
    images.forEach((f) => fd.append("product_images[]", f))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminStoreProducts, fd)
    if (res.success) {
      showToast(editId ? "แก้ไขสำเร็จ" : "เพิ่มสินค้าสำเร็จ")
      setModalOpen(false)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const deleteProduct = async () => {
    if (confirmId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(confirmId))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminStoreProducts, fd)
    if (res.success) {
      showToast("ลบสำเร็จ")
      setConfirmId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell
      barTitle="เพิ่มสินค้า"
      pageTitle="เพิ่มสินค้าเข้าระบบ"
      icon="fa-square-plus"
      headerExtra={
        <button type="button" className="admin-submit-btn" onClick={openCreate}>
          <i className="fa-solid fa-square-plus" /> เพิ่มสินค้า
        </button>
      }
    >
      <AdminTableWrap innerClassName="admin-add-product-table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Type</th>
              <th>ชื่อร้าน</th>
              <th>หมวดหมู่</th>
              <th>ชื่อสินค้า</th>
              <th>รายละเอียด</th>
              <th>ขนาด</th>
              <th>สี</th>
              <th>รูป</th>
              <th>ราคา</th>
              <th>สต็อก</th>
              <th>ความคิดเห็น</th>
              <th>ยอดวิว</th>
              <th>คะแนน</th>
              <th>ซื้อขาย</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={18} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={18} message="ยังไม่มีสินค้า" />
            ) : (
              rows.map((row) => {
                const ext = row as AdminProduct & Record<string, unknown>
                return (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{String(ext.user_id ?? "-")}</td>
                    <td>{String(ext.product_type ?? "admin")}</td>
                    <td>{row.shop_name}</td>
                    <td>{row.product_category}</td>
                    <td>{row.product_name}</td>
                    <td title={String(ext.product_description ?? "")}>
                      {String(ext.product_description ?? "-").slice(0, 20)}
                    </td>
                    <td>{String(ext.product_sizes ?? "-")}</td>
                    <td>{String(ext.product_colors ?? "-")}</td>
                    <td>
                      <img className="admin-thumb" src={adminParseImage(row.product_image)} alt="" />
                    </td>
                    <td>{row.product_price}</td>
                    <td>{String(ext.product_stock ?? "-")}</td>
                    <td>{String(ext.review_count ?? "-")}</td>
                    <td>{String(ext.view_count ?? "-")}</td>
                    <td>{String(ext.trust_score ?? "-")}</td>
                    <td>{String(ext.sales_volume ?? "-")}</td>
                    <td>{formatAdminDate(row.created_at)}</td>
                    <td>
                      <div className="admin-manage-actions">
                        <button type="button" className="admin-action-btn edit" onClick={() => openEdit(ext)}>
                          แก้ไข
                        </button>
                        <button type="button" className="admin-action-btn delete" onClick={() => setConfirmId(row.id)}>
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal
        open={modalOpen}
        title={editId ? `แก้ไขสินค้า #${editId}` : "เพิ่มสินค้าเข้าระบบ"}
        onClose={() => setModalOpen(false)}
        onSave={save}
        wide
      >
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>User ID</label>
            <input className="admin-form-control" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label>ชื่อร้าน</label>
            <select className="admin-form-control" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })}>
              <option value="">เลือกร้าน</option>
              {shops.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-group">
            <label>Type</label>
            <select className="admin-form-control" value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })}>
              <option value="admin">admin</option>
              <option value="customer">customer</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>หมวดหมู่</label>
            <select className="admin-form-control" value={form.product_category} onChange={(e) => setForm({ ...form, product_category: e.target.value })}>
              <option value="">เลือกหมวด</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="admin-form-group">
          <label>ชื่อสินค้า</label>
          <input className="admin-form-control" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
        </div>
        <div className="admin-form-group">
          <label>รายละเอียด</label>
          <textarea className="admin-form-control" value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>ขนาด</label>
            <input className="admin-form-control" value={form.product_sizes} onChange={(e) => setForm({ ...form, product_sizes: e.target.value })} placeholder="S,M,L" />
          </div>
          <div className="admin-form-group">
            <label>สี</label>
            <input className="admin-form-control" value={form.product_colors} onChange={(e) => setForm({ ...form, product_colors: e.target.value })} placeholder="Red,Blue" />
          </div>
        </div>
        <div className="admin-form-group">
          <label>รูปสินค้า (1-5 รูป)</label>
          <input className="admin-form-control" type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 5))} />
        </div>
        <div className="admin-form-row">
          {(["product_price", "product_stock", "review_count", "view_count", "trust_score", "sales_volume"] as const).map((f) => (
            <div className="admin-form-group" key={f}>
              <label>{f}</label>
              <input className="admin-form-control" value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          ))}
        </div>
      </AdminEditModal>

      <AdminConfirmModal
        open={confirmId != null}
        title="ยืนยันการลบ"
        message="ต้องการลบสินค้านี้หรือไม่?"
        onCancel={() => setConfirmId(null)}
        onConfirm={deleteProduct}
      />
      {Toast}
    </AdminPageShell>
  )
}
