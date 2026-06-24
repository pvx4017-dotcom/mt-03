/** แสดง loading เฉพาะครั้งแรกที่ยังไม่มีข้อมูล — กันกระพริกตอน refresh */
export function showAdminTableLoading(loading: boolean, rowCount: number) {
  return loading && rowCount === 0
}

export async function runAdminListLoad<T>(opts: {
  silent?: boolean
  hasRows: boolean
  setLoading: (value: boolean) => void
  fetchRows: () => Promise<T>
  onRows: (rows: T) => void
  onError?: (message: string) => void
}) {
  const { silent, hasRows, setLoading, fetchRows, onRows, onError } = opts
  if (!silent || !hasRows) setLoading(true)
  try {
    onRows(await fetchRows())
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
  } finally {
    if (!silent || !hasRows) setLoading(false)
  }
}
