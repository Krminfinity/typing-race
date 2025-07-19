import io from 'socket.io-client'

export interface Participant {
  id: string
  name: string
  progress: number
  wpm: number
  accuracy: number
  finished: boolean
  finishTime?: number
}

export interface Room {
  id: string
  teacherId: string
  text: string
  status: 'waiting' | 'active' | 'finished'
  participants: Participant[]
  startTime?: number
}

class SocketService {
  private socket: ReturnType<typeof io> | null = null
  private isConnected = false

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io('http://localhost:3000')
    
    this.socket.on('connect', () => {
      this.isConnected = true
      console.log('Connected to server')
    })

    this.socket.on('disconnect', () => {
      this.isConnected = false
      console.log('Disconnected from server')
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  createRoom(teacherName: string, callback?: (data: { pin: string, room: Room }) => void) {
    if (!this.socket) return

    this.socket.emit('create-room', { teacherName })
    
    if (callback) {
      this.socket.on('room-created', callback)
    }
  }

  joinRoom(pin: string, name: string, callback?: (data: { room: Room }) => void) {
    if (!this.socket) return

    this.socket.emit('join-room', { pin, name })
    
    if (callback) {
      this.socket.on('joined-room', callback)
    }
  }

  startRace(pin: string, text?: string, textType?: string) {
    if (!this.socket) return
    this.socket.emit('start-race', { pin, text, textType })
  }

  updateProgress(pin: string, progress: number, wpm: number, accuracy: number) {
    if (!this.socket) return
    this.socket.emit('update-progress', { pin, progress, wpm, accuracy })
  }

  onRaceStarted(callback: (data: { text: string, startTime: number, textType?: string }) => void) {
    if (!this.socket) return
    this.socket.on('race-started', callback)
  }

  onParticipantUpdate(callback: (data: { participants: Participant[] }) => void) {
    if (!this.socket) return
    this.socket.on('participant-update', callback)
  }

  onRoomClosed(callback: () => void) {
    if (!this.socket) return
    this.socket.on('room-closed', callback)
  }

  onError(callback: (data: { message: string }) => void) {
    if (!this.socket) return
    this.socket.on('error', callback)
  }

  removeAllListeners() {
    if (!this.socket) return
    this.socket.removeAllListeners()
  }
}

export const socketService = new SocketService()
