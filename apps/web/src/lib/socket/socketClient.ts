import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/lib/store/authStore'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const user = useAuthStore.getState().user
    socket = io('/ws', {
      auth: { user_id: user?.id },
      transports: ['websocket'],
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
