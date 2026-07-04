import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Input, message, Select } from 'antd'
import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { isSoldOut, productService } from '../../../services/product.service'
import { tableService } from '../../../services/table.service'
import { orderService } from '../../../services/order.service'
import { printKitchenTicket } from '../../../utils/print'
import styles from './orderList.module.css'

type Category = string

interface Product {
  id: string
  name: string
  price: number
  category: Category
  emoji: string
  imageUrl?: string
  ingredients: string[]
  recipes?: { quantity: number; unit: string; ingredient: { name: string } }[]
  soldOutUntil?: string | null
}

interface CartItem extends Product {
  qty: number
}

interface TableOption {
  value: string
  label: string
}

const FALLBACK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Black Coffee',      price: 35000, category: 'Coffee', emoji: '☕', ingredients: [] },
  { id: 'p2', name: 'Cafe Latte',         price: 45000, category: 'Coffee', emoji: '☕', ingredients: [] },
  { id: 'p3', name: 'Cappuccino',         price: 45000, category: 'Coffee', emoji: '☕', ingredients: [] },
  { id: 'p4', name: 'Flat White',         price: 50000, category: 'Coffee', emoji: '☕', ingredients: [] },
  { id: 'p5', name: 'Irish Coffee',       price: 55000, category: 'Coffee', emoji: '☕', ingredients: [] },
  { id: 'p6', name: 'Trà Xanh Đậu Đỏ',   price: 40000, category: 'Trà',    emoji: '🍵', ingredients: [] },
  { id: 'p7', name: 'Trà Thạch Đào',      price: 40000, category: 'Trà',    emoji: '🍵', ingredients: [] },
  { id: 'p8', name: 'Tiramisu',           price: 55000, category: 'Bánh',   emoji: '🎂', ingredients: [] },
  { id: 'p9', name: 'Mousse Cacao',       price: 50000, category: 'Bánh',   emoji: '🍫', ingredients: [] },
  { id: 'p10', name: 'Phô Mai Trà Xanh', price: 50000, category: 'Bánh',   emoji: '🧁', ingredients: [] },
]

const FALLBACK_TABLES: TableOption[] = [
  { value: 'ban-012', label: 'Bàn 012 - Tầng 1' },
  { value: 'ban-008', label: 'Bàn 008 - Tầng 2' },
  { value: 'ban-004', label: 'Bàn 004 - Tầng 1' },
]

const CATEGORY_EMOJI: Record<string, string> = {
  Coffee: '☕', Trà: '🍵', Bánh: '🎂', Khác: '🥤',
}

const WaiterOrderList: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [products, setProducts] = useState<Product[]>([])
  const [tableOptions, setTableOptions] = useState<TableOption[]>(FALLBACK_TABLES)
  const [categories, setCategories] = useState<Category[]>(['Coffee'])
  const [activeCategory, setActiveCategory] = useState<Category>('Coffee')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('ban-012')
  const [sending, setSending] = useState(false)
  const [brokenImgs, setBrokenImgs] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const fetchMenu = useCallback(async () => {
    try {
      const res = await productService.list({ limit: 200 })
      const items: any[] = res.data?.items ?? res.data ?? []
      const mapped: Product[] = items.map((p) => ({
        id: p.id,
        name: p.name ?? p.tenmon ?? '',
        price: Number(p.price ?? p.gia ?? 0),
        category: p.category?.name ?? p.categoryName ?? p.nhomthucdon ?? 'Khác',
        emoji: CATEGORY_EMOJI[p.category?.name ?? p.type ?? ''] ?? '🥤',
        imageUrl: p.imageUrl ?? p.anhUrl,
        ingredients: (p.recipes ?? []).map((r: any) => r.ingredient?.name ?? '').filter(Boolean),
        recipes: p.recipes ?? [],
        soldOutUntil: p.soldOutUntil ?? null,
      }))
      const cats = [...new Set(mapped.map((p) => p.category))]
      setProducts(mapped)
      setCategories(cats.length ? cats : ['Coffee'])
      setActiveCategory(cats[0] ?? 'Coffee')
    } catch {
      setProducts(FALLBACK_PRODUCTS)
      setCategories(['Coffee', 'Trà', 'Bánh', 'Khác'])
    }
  }, [])

  const fetchTables = useCallback(async () => {
    const params = new URLSearchParams(location.search)
    const tableIdFromUrl = params.get('tableId')
    try {
      const res = await tableService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      const opts: TableOption[] = items.map((t) => ({
        value: t.id,
        label: `${t.name ?? t.tableName}${t.area?.name ? ' - ' + t.area.name : ''}`,
      }))
      if (opts.length) {
        setTableOptions(opts)
        const preSelected = tableIdFromUrl
          ? (opts.find((o) => o.value === tableIdFromUrl)?.value ?? opts[0].value)
          : opts[0].value
        setSelectedTable(preSelected)
      }
    } catch {
      setTableOptions(FALLBACK_TABLES)
    }
  }, [location.search])

  useEffect(() => { fetchMenu(); fetchTables() }, [fetchMenu, fetchTables])

  const filteredProducts = products.filter(
    (p) =>
      p.category === activeCategory &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id)
      if (existing) return prev.map((c) => c.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.id === id ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0),
    )
  }

  const handleSend = async () => {
    if (!cart.length) return
    setSending(true)
    try {
      const items = cart.map((c) => ({ productId: c.id, quantity: c.qty, price: c.price }))
      // Nếu bàn đang có 1 order CHƯA thanh toán → gộp món vào đó (1 bàn = 1 bill chưa trả),
      // tránh mỗi lần thêm lại tạo order mới làm bảng pha chế hiện trùng bàn.
      let appendableId: string | null = null
      try {
        const listRes = await orderService.list({ tableId: selectedTable, limit: '100' })
        const orders: any[] = (listRes.data as any)?.items ?? []
        appendableId = orders.find((o) =>
          o.status !== 'CANCELLED' && o.status !== 'PAID' && o.invoice?.status !== 'PAID',
        )?.id ?? null
      } catch {
        // không tra được danh sách → cứ tạo order mới
      }

      let orderCode = ''
      if (appendableId) {
        const res = await orderService.addItems(appendableId, items)
        orderCode = (res.data as any)?.code ?? ''
        message.success('Đã thêm món vào bàn')
      } else {
        const res = await orderService.create({ tableId: selectedTable, items })
        orderCode = (res.data as any)?.code ?? ''
        message.success('Đã gửi order thành công')
      }
      // In phiếu bếp cho các món vừa gửi
      printKitchenTicket({
        code: orderCode,
        tableName: tableOptions.find((o) => o.value === selectedTable)?.label ?? selectedTable,
        items: cart.map((c) => ({ name: c.name, qty: c.qty })),
      })
      setCart([])
      navigate('/tables')
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Gửi order thất bại')
    } finally {
      setSending(false)
    }
  }

  return (
    <AppLayout role={user?.role ?? 'waiter'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.splitWrap}>
        {/* LEFT */}
        <div className={styles.leftPanel}>
          <div className={styles.categoryTabs}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.catTab} ${activeCategory === cat ? styles.catTabActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.searchBar}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm món..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.productGrid}>
            {filteredProducts.map((p) => {
              const soldOut = isSoldOut(p.soldOutUntil)
              return (
              <div
                key={p.id}
                className={styles.productCard}
                onClick={() => { if (!soldOut) setSelectedProduct(p) }}
                style={soldOut ? { opacity: 0.45, cursor: 'not-allowed', position: 'relative' } : undefined}
              >
                {soldOut && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 1,
                    background: '#cf1322', color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 10,
                  }}>
                    Hết hàng
                  </div>
                )}
                <div className={styles.productImg}>
                  {p.imageUrl && !brokenImgs.has(p.id) ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImgs((prev) => new Set([...prev, p.id]))}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 32 }}>{p.emoji}</span>
                  )}
                </div>
                <div className={styles.productName}>{p.name}</div>
                {p.ingredients.length > 0 && (
                  <div className={styles.productIngredients}>
                    {p.ingredients.slice(0, 4).join(' · ')}
                    {p.ingredients.length > 4 && ` +${p.ingredients.length - 4}`}
                  </div>
                )}
                <div className={styles.productPrice}>{p.price.toLocaleString('vi-VN')}đ</div>
              </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div className={styles.rightPanel}>
          <div className={styles.tableSelector}>
            <span className={styles.tableSelectorLabel}>Bàn:</span>
            <Select
              value={selectedTable}
              onChange={setSelectedTable}
              options={tableOptions}
              style={{ width: 200 }}
            />
          </div>

          <div className={styles.orderHeader}>
            <span>Món</span>
            <span>Đơn giá</span>
            <span>SL</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
          </div>

          <div className={styles.orderRows}>
            {cart.map((item) => (
              <div key={item.id} className={styles.orderRow}>
                <span>{item.name}</span>
                <span>{item.price.toLocaleString('vi-VN')}đ</span>
                <div className={styles.qtyBox}>
                  <button type="button" className={styles.qtyBtn} onClick={() => changeQty(item.id, -1)}>−</button>
                  <span className={styles.qtyNum}>{item.qty}</span>
                  <button type="button" className={styles.qtyBtn} onClick={() => changeQty(item.id, 1)}>+</button>
                </div>
                <span className={styles.rowTotal}>{(item.price * item.qty).toLocaleString('vi-VN')}đ</span>
              </div>
            ))}
          </div>

          <div className={styles.orderActions}>
            <button type="button" className={styles.btnCancel} onClick={() => setCart([])}>Hủy</button>
            <button
              type="button"
              className={styles.btnSend}
              disabled={cart.length === 0 || sending}
              onClick={handleSend}
            >
              {sending ? 'Đang gửi...' : 'Gửi order'}
            </button>
          </div>
        </div>
      </div>
      {/* Product detail overlay */}
      {selectedProduct && (
        <div className={styles.detailOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.detailClose}
              onClick={() => setSelectedProduct(null)}
            >
              <CloseOutlined />
            </button>

            <div className={styles.detailImgWrap}>
              {selectedProduct.imageUrl && !brokenImgs.has(selectedProduct.id) ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className={styles.detailImg}
                  referrerPolicy="no-referrer"
                  onError={() => setBrokenImgs((prev) => new Set([...prev, selectedProduct.id]))}
                />
              ) : (
                <span style={{ fontSize: 72 }}>{selectedProduct.emoji}</span>
              )}
            </div>

            <div className={styles.detailBody}>
              <div className={styles.detailName}>{selectedProduct.name}</div>
              <div className={styles.detailMeta}>
                <span className={styles.detailCategory}>{selectedProduct.category}</span>
                <span className={styles.detailPrice}>
                  {selectedProduct.price.toLocaleString('vi-VN')}đ
                </span>
              </div>

              {selectedProduct.ingredients.length > 0 && (
                <>
                  <div className={styles.detailIngTitle}>Thành phần</div>
                  <div className={styles.detailIngList}>
                    {selectedProduct.ingredients.map((ing) => (
                      <span key={ing} className={styles.detailIngItem}>{ing}</span>
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                className={styles.detailAddBtn}
                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null) }}
              >
                + Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default WaiterOrderList
