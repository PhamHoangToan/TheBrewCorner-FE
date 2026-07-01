const BANK_ID      = 'TPB'
const ACCOUNT_NO   = '0387646729'
const ACCOUNT_NAME = 'PHAM HOANG TOAN'
const TEMPLATE     = 'compact2'

export const VIETQR_BANK = { bankId: BANK_ID, accountNo: ACCOUNT_NO, accountName: ACCOUNT_NAME }

export function buildVietQRUrl(amount: number, orderCode: string): string {
  const addInfo = encodeURIComponent(`TheBrewCorner ${orderCode}`)
  const name    = encodeURIComponent(ACCOUNT_NAME)
  return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${Math.round(amount)}&addInfo=${addInfo}&accountName=${name}`
}
