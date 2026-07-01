import { createContext, useContext, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

export const SocketContext = createContext<Socket | null>(null)

export function useSocket() {
  return useContext(SocketContext)
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useSocket()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!socket) return
    const cb = (data: T) => handlerRef.current(data)
    socket.on(event, cb)
    return () => { socket.off(event, cb) }
  }, [socket, event])
}

export function createSocket(role: string): Socket {
  const s = io(SOCKET_URL, { transports: ['websocket'], query: { role } })
  s.on('connect', () => s.emit('join', { role }))
  return s
}
