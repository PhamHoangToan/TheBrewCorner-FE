import { useCallback, useEffect, useRef, useState } from 'react'
import { App } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '../services/notification.service'
import { notificationService } from '../services/notification.service'
import { useSocketEvent } from './useSocket'
import { useAuthStore } from '../store/auth.store'

function playDing() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

export function useNotifications() {
  const { notification, message: antMessage } = App.useApp()
  const role = useAuthStore((s) => s.user?.role)
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const loadingRef = useRef(false)

  const loadInitial = useCallback(async () => {
    if (!role) return
    loadingRef.current = true
    try {
      const [listRes, countRes] = await Promise.all([
        notificationService.getAll(role, 1, 20),
        notificationService.getUnreadCount(role),
      ])
      setNotifications(listRes.data.items)
      setHasMore(listRes.data.items.length < listRes.data.total)
      setUnreadCount(countRes.data.count)
      setPage(1)
    } finally {
      loadingRef.current = false
    }
  }, [role])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useSocketEvent<AppNotification>('notification:new', (notif) => {
    if (notif.role !== role) return
    setNotifications((prev) => [notif, ...prev])
    setUnreadCount((n) => n + 1)
    playDing()
    const isLowStock = notif.type === 'LOW_STOCK'
    const isPayrollReady = notif.type === 'PAYROLL_READY'
    if (typeof notification?.open === 'function') {
      notification.open({
        message: notif.title,
        description: notif.body,
        placement: 'topRight',
        duration: isLowStock || isPayrollReady ? 8 : 5,
        style: isLowStock
          ? { borderLeft: '4px solid #faad14' }
          : isPayrollReady
            ? { borderLeft: '4px solid #662c21' }
            : undefined,
        onClick: isLowStock
          ? () => navigate('/inventory')
          : isPayrollReady
            ? () => navigate('/payroll')
            : undefined,
      })
    } else {
      antMessage.info(`${notif.title} — ${notif.body}`)
    }
  })

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!role) return
    await notificationService.markAllRead(role)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [role])

  const loadMore = useCallback(async () => {
    if (!role || loadingRef.current || !hasMore) return
    loadingRef.current = true
    const nextPage = page + 1
    try {
      const res = await notificationService.getAll(role, nextPage, 20)
      setNotifications((prev) => [...prev, ...res.data.items])
      setHasMore(notifications.length + res.data.items.length < res.data.total)
      setPage(nextPage)
    } finally {
      loadingRef.current = false
    }
  }, [role, page, hasMore, notifications.length])

  return { notifications, unreadCount, markRead, markAllRead, loadMore, hasMore }
}
