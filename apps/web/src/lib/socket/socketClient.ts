import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/lib/store/authStore'

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

export function getSocket(): Socket {
  if (!socket) {
    const user = useAuthStore.getState().user
    const token = useAuthStore.getState().token
    socket = io('/ws', {
      auth: { user_id: user?.id, token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })

    socket.on('connect', () => {
      reconnectAttempts = 0
      console.log('[WS] Connected')
    })

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      reconnectAttempts++
      console.warn(`[WS] Connection error (attempt ${reconnectAttempts}):`, error.message)
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  reconnectAttempts = 0
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

export function emitEvent(event: string, data: any) {
  if (socket?.connected) {
    socket.emit(event, data)
  }
}
