import io from 'socket.io-client'

export interface Participant {
  id: string
  name: string
  progress: number
  wpm: number
  accuracy: number
  finished: boolean
  finishTime?: number
  currentWordIndex?: number
  stats?: {
    wpm?: number
    accuracy?: number
    mistakes?: number
    completedWords?: number
    totalChars?: number
  }
  typingStats?: {
    totalKeystrokes: number
    errorCount: number
    correctKeystrokes: number
    startTime: number | null
    endTime: number | null
    finalAccuracy: number
    finalWPM: number
    finalErrorCount: number
    wordStats: Array<Record<string, unknown>>
  }
}

export interface Room {
  id: string
  pin: string // PINを必須プロパティに変更
  teacherId: string
  text: string
  status: 'waiting' | 'active' | 'finished'
  participants: Participant[]
  startTime?: number
  mode?: 'sentence' | 'word'
  wordList?: Array<{ hiragana?: string, word?: string, romaji: string[] }>
  currentWordIndex?: number
}

class SocketService {
  private socket: ReturnType<typeof io> | null = null
  private isConnected = false

  connect(): Promise<ReturnType<typeof io>> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('Socket already connected')
        resolve(this.socket)
        return
      }

      // 本番環境では強制的にRailway URLを使用
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? 'https://typing-race-production.up.railway.app'
        : process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
      
      console.log('=== SOCKET CONNECTION DEBUG ===')
      console.log('Socket URL:', socketUrl)
      console.log('Environment:', process.env.NODE_ENV)
      console.log('VERCEL_ENV:', process.env.VERCEL_ENV)
      console.log('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')))
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      })
      
      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('✅ Connected to server:', socketUrl)
        console.log('Socket ID:', this.socket?.id)
        resolve(this.socket!)
      })

      this.socket.on('disconnect', (reason: string) => {
        this.isConnected = false
        console.log('❌ Disconnected from server. Reason:', reason)
      })

      this.socket.on('connect_error', (error: Error) => {
        console.error('❌ Connection error:', error)
        reject(error)
      })

      // タイムアウト処理
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'))
        }
      }, 20000)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  async createRoom(teacherName: string, callback?: (data: { pin: string, room: Room }) => void) {
    console.log('=== CREATE ROOM DEBUG ===')
    console.log('Teacher name:', teacherName)
    
    try {
      // 接続が完了するまで待機
      await this.connect()
      
      console.log('Socket connected:', this.socket?.connected)
      console.log('Socket ID:', this.socket?.id)
      
      if (!this.socket) {
        console.error('❌ No socket connection available')
        return
      }

      if (!this.socket.connected) {
        console.error('❌ Socket not connected')
        return
      }

      console.log('📤 Emitting create-room event')
      this.socket.emit('create-room', { teacherName })
      
      if (callback) {
        this.socket.on('room-created', (data: any) => {
          console.log('✅ Room created:', data)
          callback(data)
        })
      }
    } catch (error) {
      console.error('❌ Failed to connect and create room:', error)
    }
  }

  joinRoom(pin: string, name: string, callback?: (data: { room: Room }) => void) {
    if (!this.socket) return

    this.socket.emit('join-room', { pin, name })
    
    if (callback) {
      this.socket.on('joined-room', callback)
    }
  }

  startRace(pin: string, options: {
    text?: string
    textType?: string
    mode?: 'sentence' | 'word'
    difficulty?: string
    wordCount?: number
    customText?: string
  }) {
    if (!this.socket) return
    console.log('=== SOCKET START RACE ===')
    console.log('Pin:', pin)
    console.log('Options received:', JSON.stringify(options, null, 2))
    console.log('Options.wordCount:', options.wordCount, '(type:', typeof options.wordCount, ')')
    
    const payload = { pin, ...options }
    console.log('Final payload to emit:', JSON.stringify(payload, null, 2))
    console.log('=== EMITTING start-race ===')
    
    this.socket.emit('start-race', payload)
  }

  resetRace(pin: string) {
    if (!this.socket) return
    console.log('Emitting reset-race for room:', pin)
    this.socket.emit('reset-race', { pin })
  }

  updateTypingStats(pin: string, progress: number, typingStats: Record<string, unknown>, wordStats?: Record<string, unknown>) {
    if (!this.socket) return
    this.socket.emit('update-typing-stats', { pin, progress, typingStats, wordStats })
  }

  updateDetailedStats(pin: string, stats: {
    totalKeystrokes: number
    errorCount: number
    correctKeystrokes: number
    accuracy: number
    wpm: number
    completedWords?: number
    finished?: boolean
  }, progress?: number) {
    if (!this.socket) return
    console.log('Sending detailed stats:', { pin, stats, progress })
    this.socket.emit('update-detailed-stats', { pin, stats, progress })
  }

  updateProgress(pin: string, progress: number, wpm: number, accuracy: number, currentWordIndex?: number) {
    if (!this.socket) return
    this.socket.emit('update-progress', { pin, progress, wpm, accuracy, currentWordIndex })
  }

  wordCompleted(pin: string, currentWordIndex: number) {
    if (!this.socket) return
    this.socket.emit('word-completed', { pin, currentWordIndex })
  }

  finishRace(pin: string, finalStats: {
    wpm: number
    accuracy: number
    mistakes: number
    totalChars: number
    completedWords: number
    timeElapsed: number
    finishTime: number
  }) {
    if (!this.socket) return
    console.log('Sending final race completion stats:', { pin, finalStats })
    this.socket.emit('race-finished', { pin, finalStats })
  }

  onRaceStarted(callback: (data: { 
    text?: string
    startTime: number
    textType?: string
    mode?: 'sentence' | 'word'
    wordList?: Array<{ hiragana?: string, word?: string, romaji: string[] }>
    fixedRomajiPatterns?: string[]
  }) => void) {
    if (!this.socket) {
      console.warn('Socket not connected when trying to listen for race-started')
      return
    }
    console.log('Setting up race-started listener')
    this.socket.on('race-started', callback)
  }

  onRaceReset(callback: () => void) {
    if (!this.socket) {
      console.warn('Socket not connected when trying to listen for race-reset')
      return
    }
    console.log('Setting up race-reset listener')
    this.socket.on('race-reset', callback)
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
