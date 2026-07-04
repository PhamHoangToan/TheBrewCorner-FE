import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Empty, Input, Select, Tag, message } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { useSocket, useSocketEvent } from '../../hooks/useSocket'
import { chatService, type ChatMessage, type ChatThreadSummary } from '../../services/chat.service'
import styles from './supportChat.module.css'

const SupportChat: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const socket = useSocket()
  const [threads, setThreads] = useState<ChatThreadSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<string | undefined>('OPEN')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchThreads = useCallback(async () => {
    try {
      const res = await chatService.listThreads(statusFilter)
      setThreads(res.data ?? [])
    } catch { /* ignore */ }
  }, [statusFilter])

  useEffect(() => { fetchThreads() }, [fetchThreads])
  // Nhận biết có tin nhắn mới ở bất kỳ hội thoại nào → refresh badge/danh sách
  useSocketEvent('notification:new', () => fetchThreads())

  const openThread = async (id: string) => {
    setActiveId(id)
    try {
      const res = await chatService.listMessages(id)
      setMessages(res.data ?? [])
      await chatService.markRead(id)
      fetchThreads()
    } catch { setMessages([]) }
  }

  useEffect(() => {
    if (!activeId || !socket) return
    const join = () => socket.emit('join:chat', { threadId: activeId })
    join()
    // Room membership không sống qua reconnect (laptop sleep, mạng chập) — join lại mỗi lần connect
    socket.on('connect', join)
    return () => { socket.off('connect', join) }
  }, [activeId, socket])

  // Polling 10s làm fallback cho thread đang mở — realtime chính vẫn là socket
  useEffect(() => {
    if (!activeId) return
    const timer = window.setInterval(() => {
      chatService.listMessages(activeId).then((res) => setMessages(res.data ?? [])).catch(() => {})
    }, 10000)
    return () => window.clearInterval(timer)
  }, [activeId])

  useSocketEvent<ChatMessage>('chat:message', (msg) => {
    if (msg.threadId !== activeId) return
    setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
  })

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    setInput('')
    try {
      const res = await chatService.reply(activeId, text)
      setMessages((prev) => prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data])
      fetchThreads()
    } catch {
      message.error('Gửi thất bại')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    if (!activeId) return
    try {
      await chatService.close(activeId)
      message.success('Đã đóng hội thoại')
      setActiveId(null)
      fetchThreads()
    } catch { message.error('Thao tác thất bại') }
  }

  const activeThread = threads.find((t) => t.id === activeId)

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Chat hỗ trợ khách hàng" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Chat hỗ trợ' }]} />

      <div className={styles.layout}>
        <div className={styles.threadList}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '100%', marginBottom: 12 }}
            options={[
              { value: 'OPEN', label: 'Đang mở' },
              { value: 'CLOSED', label: 'Đã đóng' },
              { value: undefined, label: 'Tất cả' },
            ]}
          />
          {threads.length === 0 ? (
            <Empty description="Không có hội thoại" />
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.threadItem} ${activeId === t.id ? styles.threadItemActive : ''}`}
                onClick={() => openThread(t.id)}
              >
                <div className={styles.threadItemTop}>
                  <span className={styles.threadName}>{t.customerName}</span>
                  {t.unreadCount > 0 && <Badge count={t.unreadCount} />}
                </div>
                <div className={styles.threadPreview}>{t.lastMessage ?? '—'}</div>
                <div className={styles.threadTime}>{dayjs(t.lastMessageAt).format('DD/MM HH:mm')}</div>
              </button>
            ))
          )}
        </div>

        <div className={styles.panel}>
          {!activeId ? (
            <div className={styles.emptyState}>Chọn 1 hội thoại để xem chi tiết</div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <span>{activeThread?.customerName}</span>
                {activeThread?.status === 'OPEN' && (
                  <Button size="small" danger onClick={handleClose}>Đóng hội thoại</Button>
                )}
                {activeThread?.status === 'CLOSED' && <Tag>Đã đóng</Tag>}
              </div>
              <div className={styles.messages} ref={listRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`${styles.bubbleMsg} ${m.senderType === 'STAFF' ? styles.bubbleMsgStaff : styles.bubbleMsgCustomer}`}>
                    {m.content}
                  </div>
                ))}
              </div>
              <div className={styles.inputRow}>
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  value={input}
                  placeholder="Nhập phản hồi..."
                  onChange={(e) => setInput(e.target.value)}
                  onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend() } }}
                />
                <Button type="primary" icon={<SendOutlined />} disabled={!input.trim() || sending} onClick={handleSend} />
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default SupportChat
