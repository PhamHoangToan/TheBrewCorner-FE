import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>()
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: vi.fn(() => ({
        notification: { open: vi.fn() },
        message: { success: vi.fn(), error: vi.fn() },
        modal: {},
      })),
    },
  }
})

vi.mock('../store/auth.store', () => ({
  useAuthStore: vi.fn((selector: any) => selector({ user: { role: 'barista' } })),
}))

vi.mock('../services/notification.service', () => ({
  notificationService: {
    getAll: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    getUnreadCount: vi.fn().mockResolvedValue({ data: { count: 0 } }),
    markRead: vi.fn().mockResolvedValue({}),
    markAllRead: vi.fn().mockResolvedValue({}),
  },
}))

let socketEventHandlers: Record<string, (data: any) => void> = {}

vi.mock('./useSocket', () => ({
  useSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
  useSocketEvent: vi.fn((event: string, handler: (data: any) => void) => {
    socketEventHandlers[event] = handler
  }),
}))

import { useNotifications } from './useNotifications'
import { notificationService } from '../services/notification.service'
import { App } from 'antd'

const makeNotif = (overrides: Partial<any> = {}) => ({
  id: 'n1',
  role: 'barista',
  title: 'Order mới',
  body: 'Bàn 1 — 2 món',
  type: 'ORDER_NEW',
  refId: 'order-1',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useNotifications', () => {
  beforeEach(() => {
    socketEventHandlers = {}
    vi.clearAllMocks()
    ;(notificationService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0 },
    })
    ;(notificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0 },
    })
  })

  it('loads notifications and unread count on mount', async () => {
    const items = [makeNotif()]
    ;(notificationService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items, total: 1 },
    })
    ;(notificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 2 },
    })

    const { result } = renderHook(() => useNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.unreadCount).toBe(2)
    })
  })

  // ── socket event: ORDER_NEW ────────────────────────────────────────────────

  it('ORDER_NEW — prepends notification and increments unreadCount', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    const notif = makeNotif({ type: 'ORDER_NEW' })
    act(() => { socketEventHandlers['notification:new']?.(notif) })

    expect(result.current.notifications[0]).toEqual(notif)
    expect(result.current.unreadCount).toBe(1)
  })

  // ── socket event: ORDER_PREPARING ─────────────────────────────────────────

  it('ORDER_PREPARING — shows toast via notification.open', async () => {
    const openMock = vi.fn()
    ;(App.useApp as ReturnType<typeof vi.fn>).mockReturnValue({ notification: { open: openMock } })

    renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ type: 'ORDER_PREPARING', title: 'Đang pha chế', body: 'Bàn 2 — barista đang làm' }),
      })
    })

    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Đang pha chế', placement: 'topRight' }),
    )
  })

  // ── socket event: ORDER_READY ─────────────────────────────────────────────

  it('ORDER_READY — shows toast via notification.open', async () => {
    const openMock = vi.fn()
    ;(App.useApp as ReturnType<typeof vi.fn>).mockReturnValue({ notification: { open: openMock } })

    renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ type: 'ORDER_READY', title: 'Món sẵn sàng', body: 'Bàn 2 — sẵn sàng phục vụ' }),
      })
    })

    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Món sẵn sàng' }),
    )
  })

  // ── socket event: ITEM_SERVED ─────────────────────────────────────────────

  it('ITEM_SERVED — prepends to notifications', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ type: 'ITEM_SERVED', title: 'Món đã sẵn sàng' }),
      })
    })

    expect(result.current.notifications[0].type).toBe('ITEM_SERVED')
  })

  // ── socket event: RETURN_REQUEST ──────────────────────────────────────────

  it('RETURN_REQUEST — increments unreadCount', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ type: 'RETURN_REQUEST', title: 'Yêu cầu trả món' }),
      })
    })

    expect(result.current.unreadCount).toBe(1)
  })

  // ── socket event: role mismatch ───────────────────────────────────────────

  it('ignores notifications for a different role', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ role: 'cashier' }), // current user is barista
      })
    })

    expect(result.current.notifications).toHaveLength(0)
    expect(result.current.unreadCount).toBe(0)
  })

  // ── markRead ──────────────────────────────────────────────────────────────

  it('markRead — sets notification read=true and decrements unreadCount', async () => {
    const items = [makeNotif({ read: false })]
    ;(notificationService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items, total: 1 },
    })
    ;(notificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1 },
    })
    ;(notificationService.markRead as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))

    await act(async () => { await result.current.markRead('n1') })

    expect(result.current.notifications[0].read).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  // ── markAllRead ───────────────────────────────────────────────────────────

  it('markAllRead — marks all read and resets unreadCount to 0', async () => {
    const items = [makeNotif({ read: false }), makeNotif({ id: 'n2', read: false })]
    ;(notificationService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items, total: 2 },
    })
    ;(notificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 2 },
    })

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.unreadCount).toBe(2))

    await act(async () => { await result.current.markAllRead() })

    expect(result.current.unreadCount).toBe(0)
    expect(result.current.notifications.every((n) => n.read)).toBe(true)
  })

  // ── loadMore ──────────────────────────────────────────────────────────────

  it('loadMore — appends next page items', async () => {
    const page1 = [makeNotif({ id: 'n1' }), makeNotif({ id: 'n2' })]
    const page2 = [makeNotif({ id: 'n3' })]
    ;(notificationService.getAll as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { items: page1, total: 3 } })
      .mockResolvedValueOnce({ data: { items: page2, total: 3 } })
    ;(notificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { count: 0 } })

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.notifications).toHaveLength(2))

    await act(async () => { await result.current.loadMore() })

    expect(result.current.notifications).toHaveLength(3)
    expect(result.current.hasMore).toBe(false)
  })

  // ── RETURN_APPROVED / RETURN_REJECTED ─────────────────────────────────────

  it('RETURN_APPROVED — adds to notifications list', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ type: 'RETURN_APPROVED', title: 'Trả món được chấp nhận' }),
      })
    })

    expect(result.current.notifications[0].type).toBe('RETURN_APPROVED')
  })

  it('RETURN_REJECTED — adds to notifications list', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ type: 'RETURN_REJECTED', title: 'Trả món bị từ chối' }),
      })
    })

    expect(result.current.notifications[0].type).toBe('RETURN_REJECTED')
  })

  // ── CHECKOUT_REQUESTED ────────────────────────────────────────────────────

  it('CHECKOUT_REQUESTED — shows toast', async () => {
    const openMock = vi.fn()
    ;(App.useApp as ReturnType<typeof vi.fn>).mockReturnValue({ notification: { open: openMock } })

    renderHook(() => useNotifications())
    await waitFor(() => expect(notificationService.getAll).toHaveBeenCalled())

    act(() => {
      socketEventHandlers['notification:new']?.({
        ...makeNotif({ role: 'barista', type: 'CHECKOUT_REQUESTED', title: 'Yêu cầu thanh toán' }),
      })
    })

    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Yêu cầu thanh toán' }),
    )
  })
})
