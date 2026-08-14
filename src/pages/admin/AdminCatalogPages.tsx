import { useCallback, useEffect, useState } from "react"
import { API } from "@/lib/apiRoutes"
import { AdminPageShell } from "@/components/admin/AdminPageShell"
import {
  AdminConfirmModal,
  AdminDetailModal,
  AdminEditModal,
  AdminEmptyRow,
  AdminLoadingRow,
  AdminSearchBar,
  AdminTableWrap,
  useAdminToast,
} from "@/components/admin/AdminUi"
import {
  adminPost,
  fetchAdminCategories,
  fetchAdminGeneralShops,
  fetchAdminRecommendedShops,
  fetchCustomerShopProducts,
  fetchCustomerStores,
  formatAdminDate,
  type AdminCategory,
  type AdminShop,
} from "@/lib/adminApi"
import { adminParseImage } from "@/lib/adminUtils"
import { runAdminListLoad, showAdminTableLoading } from "@/lib/adminLoadHelper"
import { useBodyClass } from "@/hooks/useBodyClass"

export default function AdminProductCategoriesPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [rows, setRows] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [edit, setEdit] = useState<AdminCategory | null>(null)
  const [editName, setEditName] = useState("")
  const [editFile, setEditFile] = useState<File | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent || rows.length === 0) {
        setLoading(true)
        setLoadError(null)
      }
      try {
        setRows(await fetchAdminCategories())
      } catch (err) {
        const message = err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ"
        setLoadError(message)
        setRows([])
        showToast(message, "error")
      } finally {
        if (!silent || rows.length === 0) setLoading(false)
      }
    },
    [rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const addCategory = async () => {
    if (!name.trim()) return showToast("กรุณาใส่ชื่อหมวดหมู่", "error")
    const fd = new FormData()
    fd.append("action", "create")
    fd.append("category_name", name.trim())
    if (file) fd.append("category_image", file)
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.adminProductCategories,
      fd,
    )
    if (res.success) {
      showToast("เพิ่มหมวดหมู่สำเร็จ")
      setName("")
      setFile(null)
      load(true)
    } else showToast(res.message ?? "เพิ่มไม่สำเร็จ", "error")
  }

  const saveEdit = async () => {
    if (!edit) return
    const fd = new FormData()
    fd.append("action", "update")
    fd.append("id", String(edit.id))
    fd.append("category_name", editName.trim())
    if (editFile) fd.append("category_image", editFile)
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.adminProductCategories,
      fd,
    )
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEdit(null)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const deleteCategory = async () => {
    if (confirmId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(confirmId))
    const res = await adminPost<{ success: boolean; message?: string }>(
      API.adminProductCategories,
      fd,
    )
    if (res.success) {
      showToast("ลบสำเร็จ")
      setConfirmId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="หมวดหมู่สินค้า" pageTitle="จัดการหมวดหมู่สินค้า" icon="fa-layer-group">
      <div className="admin-card">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="categoryName">ชื่อหมวดหมู่</label>
            <input
              id="categoryName"
              className="admin-form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมาร์ทวอทช์"
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="categoryImage">รูปหมวดหมู่</label>
            <input
              id="categoryImage"
              className="admin-form-control"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="admin-form-group admin-form-group-action">
            <label>.</label>
            <button type="button" className="admin-submit-btn" onClick={addCategory}>
              เพิ่มหมวดหมู่
            </button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="admin-card" style={{ color: "#dc2626", fontSize: 14 }}>
          โหลดหมวดหมู่ไม่สำเร็จ: {loadError}
        </div>
      ) : null}

      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>รูป</th>
              <th>ชื่อหมวดหมู่</th>
              <th>ไฟล์รูป</th>
              <th>วันที่สร้าง</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={6} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={6} message="ยังไม่มีหมวดหมู่สินค้า" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    {row.category_image ? (
                      <img
                        className="admin-thumb"
                        src={adminParseImage(row.category_image)}
                        alt={row.category_name}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{row.category_name}</td>
                  <td>{row.category_image || "-"}</td>
                  <td>{formatAdminDate(row.created_at)}</td>
                  <td>
                    <div className="admin-manage-actions">
                      <button
                        type="button"
                        className="admin-action-btn edit"
                        onClick={() => {
                          setEdit(row)
                          setEditName(row.category_name)
                          setEditFile(null)
                        }}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn delete"
                        onClick={() => setConfirmId(row.id)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal
        open={!!edit}
        title="แก้ไขหมวดหมู่สินค้า"
        onClose={() => setEdit(null)}
        onSave={saveEdit}
      >
        <div className="admin-form-group">
          <label>ชื่อหมวดหมู่</label>
          <input
            className="admin-form-control"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label>รูปหมวดหมู่ (เลือกใหม่ถ้าต้องการเปลี่ยน)</label>
          <input
            className="admin-form-control"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </AdminEditModal>

      <AdminConfirmModal
        open={confirmId != null}
        title="ยืนยันการลบ"
        message="ต้องการลบหมวดหมู่นี้หรือไม่?"
        onCancel={() => setConfirmId(null)}
        onConfirm={deleteCategory}
      />
      {Toast}
    </AdminPageShell>
  )
}

export function AdminShopsPage({
  variant,
}: {
  variant: "recommended" | "general"
}) {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const isRec = variant === "recommended"
  const apiPath = isRec ? API.adminRecommendedShops : API.adminGeneralShops
  const title = isRec ? "ร้านค้าแนะนำ" : "ร้านค้าทั่วไป"
  const pageTitle = isRec ? "จัดการร้านค้าแนะนำ" : "จัดการร้านค้าทั่วไป"

  const [rows, setRows] = useState<AdminShop[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    shop_name: "",
    review_count: "",
    view_count: "",
    trust_score: "",
    sales_volume: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [edit, setEdit] = useState<AdminShop | null>(null)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const load = useCallback(
    async (silent = false) => {
      await runAdminListLoad({
        silent,
        hasRows: rows.length > 0,
        setLoading,
        fetchRows: async () => (isRec ? fetchAdminRecommendedShops() : fetchAdminGeneralShops()),
        onRows: setRows,
        onError: (msg) => showToast(msg, "error"),
      })
    },
    [isRec, rows.length, showToast],
  )

  useEffect(() => {
    load()
  }, [load])

  const buildFormData = (action: string, extra: Record<string, string>) => {
    const fd = new FormData()
    fd.append("action", action)
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v))
    return fd
  }

  const addShop = async () => {
    if (!form.shop_name.trim()) return showToast("กรุณาใส่ชื่อร้าน", "error")
    const fd = buildFormData("create", {
      shop_name: form.shop_name.trim(),
      review_count: form.review_count || "0",
      view_count: form.view_count || "0",
      trust_score: form.trust_score || "0",
      sales_volume: form.sales_volume || "0",
    })
    if (file) fd.append("shop_image", file)
    const res = await adminPost<{ success: boolean; message?: string }>(apiPath, fd)
    if (res.success) {
      showToast("เพิ่มร้านค้าสำเร็จ")
      setForm({ shop_name: "", review_count: "", view_count: "", trust_score: "", sales_volume: "" })
      setFile(null)
      load(true)
    } else showToast(res.message ?? "เพิ่มไม่สำเร็จ", "error")
  }

  const saveEdit = async () => {
    if (!edit) return
    const fd = buildFormData("update", {
      id: String(edit.id),
      shop_name: edit.shop_name,
      review_count: String(edit.review_count),
      view_count: String(edit.view_count),
      trust_score: String(edit.trust_score),
      sales_volume: String(edit.sales_volume),
    })
    if (editFile) fd.append("shop_image", editFile)
    const res = await adminPost<{ success: boolean; message?: string }>(apiPath, fd)
    if (res.success) {
      showToast("บันทึกสำเร็จ")
      setEdit(null)
      setEditFile(null)
      load(true)
    } else showToast(res.message ?? "บันทึกไม่สำเร็จ", "error")
  }

  const deleteShop = async () => {
    if (confirmId == null) return
    const fd = buildFormData("delete", { id: String(confirmId) })
    const res = await adminPost<{ success: boolean; message?: string }>(apiPath, fd)
    if (res.success) {
      showToast("ลบสำเร็จ")
      setConfirmId(null)
      load(true)
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle={title} pageTitle={pageTitle} icon="fa-store">
      <div className="admin-card">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>ชื่อร้าน</label>
            <input
              className="admin-form-control"
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              placeholder="เช่น Shopping Online"
            />
          </div>
          <div className="admin-form-group">
            <label>รูปร้าน</label>
            <input
              className="admin-form-control"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="admin-form-group">
            <label>จำนวนความคิดเห็น</label>
            <input
              className="admin-form-control"
              type="number"
              min={0}
              value={form.review_count}
              onChange={(e) => setForm({ ...form, review_count: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>จำนวนยอดวิว</label>
            <input
              className="admin-form-control"
              type="number"
              min={0}
              value={form.view_count}
              onChange={(e) => setForm({ ...form, view_count: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>คะแนนความน่าเชื่อถือ</label>
            <input
              className="admin-form-control"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.trust_score}
              onChange={(e) => setForm({ ...form, trust_score: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>ปริมาณซื้อขาย</label>
            <input
              className="admin-form-control"
              type="number"
              min={0}
              value={form.sales_volume}
              onChange={(e) => setForm({ ...form, sales_volume: e.target.value })}
            />
          </div>
          <div className="admin-form-group admin-form-group-action">
            <label>.</label>
            <button type="button" className="admin-submit-btn" onClick={addShop}>
              เพิ่มร้านค้า
            </button>
          </div>
        </div>
      </div>

      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>รูป</th>
              <th>ชื่อร้าน</th>
              <th>ความคิดเห็น</th>
              <th>ยอดวิว</th>
              <th>คะแนน</th>
              <th>ซื้อขาย</th>
              <th>วันที่สร้าง</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, rows.length) ? (
              <AdminLoadingRow cols={9} />
            ) : rows.length === 0 ? (
              <AdminEmptyRow cols={9} message="ยังไม่มีร้านค้า" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <img className="admin-thumb" src={adminParseImage(row.shop_image)} alt="" />
                  </td>
                  <td>{row.shop_name}</td>
                  <td>{row.review_count}</td>
                  <td>{row.view_count}</td>
                  <td>{row.trust_score}</td>
                  <td>{row.sales_volume}</td>
                  <td>{formatAdminDate(row.created_at)}</td>
                  <td>
                    <div className="admin-manage-actions">
                      <button
                        type="button"
                        className="admin-action-btn edit"
                        onClick={() => {
                          setEdit({ ...row })
                          setEditFile(null)
                        }}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn delete"
                        onClick={() => setConfirmId(row.id)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminEditModal
        open={!!edit}
        title={`แก้ไข${title}`}
        onClose={() => setEdit(null)}
        onSave={saveEdit}
      >
        {edit ? (
          <>
            <div className="admin-form-group">
              <label>ชื่อร้าน</label>
              <input
                className="admin-form-control"
                value={edit.shop_name}
                onChange={(e) => setEdit({ ...edit, shop_name: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label>รูปร้าน (เลือกใหม่ถ้าต้องการเปลี่ยน)</label>
              <input
                className="admin-form-control"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>ความคิดเห็น</label>
                <input
                  className="admin-form-control"
                  type="number"
                  value={edit.review_count}
                  onChange={(e) => setEdit({ ...edit, review_count: Number(e.target.value) })}
                />
              </div>
              <div className="admin-form-group">
                <label>ยอดวิว</label>
                <input
                  className="admin-form-control"
                  type="number"
                  value={edit.view_count}
                  onChange={(e) => setEdit({ ...edit, view_count: Number(e.target.value) })}
                />
              </div>
              <div className="admin-form-group">
                <label>คะแนน</label>
                <input
                  className="admin-form-control"
                  type="number"
                  value={edit.trust_score}
                  onChange={(e) => setEdit({ ...edit, trust_score: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>ซื้อขาย</label>
                <input
                  className="admin-form-control"
                  type="number"
                  value={edit.sales_volume}
                  onChange={(e) => setEdit({ ...edit, sales_volume: Number(e.target.value) })}
                />
              </div>
            </div>
          </>
        ) : null}
      </AdminEditModal>

      <AdminConfirmModal
        open={confirmId != null}
        title="ยืนยันการลบ"
        message="ต้องการลบร้านค้านี้หรือไม่?"
        onCancel={() => setConfirmId(null)}
        onConfirm={deleteShop}
      />
      {Toast}
    </AdminPageShell>
  )
}

export function AdminRecommendedShopsPage() {
  return <AdminShopsPage variant="recommended" />
}

export function AdminGeneralShopsPage() {
  return <AdminShopsPage variant="general" />
}

export function AdminUserShopsPage() {
  useBodyClass("admin-page")
  const { showToast, Toast } = useAdminToast()
  const [stores, setStores] = useState<Record<string, unknown>[]>([])
  const [products, setProducts] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [openStore, setOpenStore] = useState<Record<string, unknown> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [storeRows, productRows] = await Promise.all([fetchCustomerStores(), fetchCustomerShopProducts()])
      setStores(storeRows)
      setProducts(productRows)
    } catch {
      showToast("โหลดร้านค้าลูกค้าไม่สำเร็จ", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = stores.filter((store) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(store.shop_name ?? "").toLowerCase().includes(q) ||
      String(store.user_id ?? "").includes(q) ||
      String(store.main_category ?? "").toLowerCase().includes(q)
    )
  })

  const storeProducts = products.filter((p) => Number(p.user_id) === Number(openStore?.user_id))

  const deleteStore = async () => {
    if (deleteId == null) return
    const fd = new FormData()
    fd.append("action", "delete")
    fd.append("id", String(deleteId))
    const res = await adminPost<{ success: boolean; message?: string }>(API.adminCustomerStores, fd)
    if (res.success) {
      showToast("ลบร้านค้าแล้ว")
      setDeleteId(null)
      setOpenStore(null)
      void load()
    } else showToast(res.message ?? "ลบไม่สำเร็จ", "error")
  }

  return (
    <AdminPageShell barTitle="ร้านค้าของผู้ใช้" pageTitle="ร้านค้าของผู้ใช้ (ลูกค้า)" icon="fa-store">
      <AdminSearchBar value={search} onChange={setSearch} placeholder="ค้นหาชื่อร้าน, รหัสผู้ใช้..." />
      <AdminTableWrap>
        <table>
          <thead>
            <tr>
              <th>ร้านค้า</th>
              <th>รหัสผู้ใช้</th>
              <th>หมวดหมู่</th>
              <th>สินค้า</th>
              <th>ขายแล้ว</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {showAdminTableLoading(loading, stores.length) ? (
              <AdminLoadingRow cols={6} />
            ) : filtered.length === 0 ? (
              <AdminEmptyRow cols={6} message="ไม่พบร้านค้าของผู้ใช้ (ลูกค้า)" />
            ) : (
              filtered.map((store) => (
                <tr key={String(store.id)}>
                  <td>{String(store.shop_name ?? "-")}</td>
                  <td>#{String(store.user_id ?? "-")}</td>
                  <td>{String(store.main_category ?? "-")}</td>
                  <td>{String(store.product_count ?? 0)}</td>
                  <td>{String(store.sold_count ?? 0)}</td>
                  <td>
                    <button type="button" className="admin-action-btn" onClick={() => setOpenStore(store)}>
                      สินค้า
                    </button>{" "}
                    <button type="button" className="admin-action-btn cancel" onClick={() => setDeleteId(Number(store.id))}>
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminDetailModal
        open={!!openStore}
        title={`สินค้าในร้าน ${String(openStore?.shop_name ?? "")}`}
        onClose={() => setOpenStore(null)}
        footer={
          <button type="button" className="admin-edit-btn cancel" onClick={() => setOpenStore(null)}>
            ปิด
          </button>
        }
      >
        {storeProducts.length === 0 ? (
          <p>ยังไม่มีสินค้าในร้านนี้</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {storeProducts.map((p) => (
              <li key={String(p.id)}>
                {String(p.product_name ?? "-")} · สต็อก {String(p.product_stock ?? 0)}
              </li>
            ))}
          </ul>
        )}
      </AdminDetailModal>

      <AdminConfirmModal
        open={deleteId != null}
        title="ยืนยันการลบ"
        message="ยืนยันลบร้านค้านี้และสินค้าในร้านใช่หรือไม่?"
        onCancel={() => setDeleteId(null)}
        onConfirm={deleteStore}
      />
      {Toast}
    </AdminPageShell>
  )
}
