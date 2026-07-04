// In khổ nhiệt 58mm không cần thư viện: dựng HTML template rồi in qua iframe ẩn
// (tránh popup blocker, cô lập hoàn toàn style khỏi app).

const SHOP_NAME = 'The Brew Corner'
const SHOP_SUB = 'Cà phê & Trà'

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )

const vnd = (v: number) => (Number(v) || 0).toLocaleString('vi-VN')

const fmtDate = (d?: string) => {
  const date = d ? new Date(d) : new Date()
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Gửi HTML vào iframe ẩn và gọi print
export const printHtml = (innerHtml: string, widthMm = 58) => {
  const css = `
    @page { size: ${widthMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 4mm 3mm; font-family: 'Segoe UI', Tahoma, sans-serif; color: #000; width: ${widthMm}mm; }
    .center { text-align: center; }
    .shop { font-size: 15px; font-weight: 800; letter-spacing: .5px; }
    .sub { font-size: 10px; color: #333; margin-bottom: 4px; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; font-size: 11px; line-height: 1.5; }
    .meta { font-size: 10px; }
    .item-name { font-size: 12px; font-weight: 600; margin-top: 4px; }
    .big { font-size: 14px; font-weight: 800; }
    .note { font-size: 10px; font-style: italic; color: #333; padding-left: 4px; }
    .foot { font-size: 10px; text-align: center; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 11px; padding: 1px 0; vertical-align: top; }
    td.q { text-align: center; width: 26px; }
    td.p { text-align: right; white-space: nowrap; }
  `
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${innerHtml}</body></html>`)
  doc.close()

  const win = iframe.contentWindow!
  const cleanup = () => setTimeout(() => { try { document.body.removeChild(iframe) } catch { /* noop */ } }, 500)
  win.onafterprint = cleanup
  // fallback dọn iframe nếu onafterprint không kích hoạt
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(cleanup, 2000)
  }, 150)
}

export interface ReceiptData {
  code: string
  tableName: string
  createdAt?: string
  items: { name: string; qty: number; total: number }[]
  subtotal: number
  discount: number
  total: number
  paymentMethod?: string
  cashier?: string
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', E_WALLET: 'Ví điện tử',
}

export const printReceipt = (data: ReceiptData) => {
  const rows = data.items
    .map(
      (it) => `<tr><td>${esc(it.name)}</td><td class="q">${it.qty}</td><td class="p">${vnd(it.total)}</td></tr>`,
    )
    .join('')
  const discountRow = data.discount > 0
    ? `<div class="row"><span>Giảm giá</span><span>-${vnd(data.discount)}đ</span></div>`
    : ''
  const html = `
    <div class="center">
      <div class="shop">${SHOP_NAME}</div>
      <div class="sub">${SHOP_SUB}</div>
    </div>
    <div class="hr"></div>
    <div class="meta">HĐ: ${esc(data.code)}</div>
    <div class="meta">Bàn: ${esc(data.tableName)}</div>
    <div class="meta">Ngày: ${fmtDate(data.createdAt)}</div>
    ${data.cashier ? `<div class="meta">Thu ngân: ${esc(data.cashier)}</div>` : ''}
    <div class="hr"></div>
    <table>
      <tr><td><b>Món</b></td><td class="q"><b>SL</b></td><td class="p"><b>T.Tiền</b></td></tr>
      ${rows}
    </table>
    <div class="hr"></div>
    <div class="row"><span>Tạm tính</span><span>${vnd(data.subtotal)}đ</span></div>
    ${discountRow}
    <div class="row big"><span>TỔNG</span><span>${vnd(data.total)}đ</span></div>
    ${data.paymentMethod ? `<div class="row"><span>Thanh toán</span><span>${PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</span></div>` : ''}
    <div class="foot">Cảm ơn quý khách & hẹn gặp lại!</div>
  `
  printHtml(html)
}

export interface KitchenTicketData {
  code: string
  tableName: string
  createdAt?: string
  items: { name: string; qty: number; note?: string }[]
}

export const printKitchenTicket = (data: KitchenTicketData) => {
  const rows = data.items
    .map(
      (it) =>
        `<div class="item-name">${it.qty} × ${esc(it.name)}</div>${it.note ? `<div class="note">${esc(it.note)}</div>` : ''}`,
    )
    .join('')
  const html = `
    <div class="center big">PHIẾU BẾP</div>
    <div class="hr"></div>
    <div class="meta">Bàn: <b>${esc(data.tableName)}</b></div>
    <div class="meta">Đơn: ${esc(data.code)}</div>
    <div class="meta">Giờ: ${fmtDate(data.createdAt)}</div>
    <div class="hr"></div>
    ${rows}
    <div class="hr"></div>
  `
  printHtml(html)
}
