// Xuất mảng dữ liệu ra file CSV (Excel mở được) — không cần thư viện.
// columns: [{ key, label }]. Thêm BOM UTF-8 để Excel hiển thị tiếng Việt đúng.
export const exportCsv = <T extends object>(
  filename: string,
  columns: { key: keyof T & string; label: string }[],
  rows: T[],
) => {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = columns.map((c) => escape(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(',')).join('\n')
  const csv = '﻿' + header + '\n' + body

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
