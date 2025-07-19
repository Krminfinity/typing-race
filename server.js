const { createServer } = require('node:http')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

// Interface definitions as comments for reference
// Room: { id, teacherId, text, status, participants, startTime, textType?, difficulty? }
// Participant: { id, name, progress, wpm, accuracy, finished, finishTime }

// テキストタイプごとのサンプルテキスト
const sampleTexts = {
  english: [
    "The quick brown fox jumps over the lazy dog.",
    "TypeScript is a superset of JavaScript that adds static types.",
    "Modern web development requires knowledge of various frameworks.",
    "Programming languages evolve to meet the needs of developers.",
    "Software engineering is both an art and a science."
  ],
  japanese: [
    "こんにちは、タイピングの練習をしましょう。",
    "日本語のタイピングは文字変換が必要です。",
    "プログラミングは論理的思考力を養います。",
    "技術の進歩により、開発環境も向上しています。",
    "チームワークは成功への重要な要素です。"
  ],
  romaji: [
    "konnichiwa sekai",
    "nihongo no taipingu renshuu",
    "purogramingu gengo no benkyou",
    "gijutsu no shinpo to kaihatsu",
    "chiimuwaku to koraboreshon"
  ]
}

// 難易度に応じたテキスト生成
function generateTextByDifficulty(textType, difficulty) {
  const texts = sampleTexts[textType] || sampleTexts.english
  const baseText = texts[Math.floor(Math.random() * texts.length)]
  
  switch (difficulty) {
    case 'easy':
      return baseText.slice(0, 30)
    case 'medium':
      return baseText
    case 'hard':
      return baseText + " " + texts[Math.floor(Math.random() * texts.length)]
    default:
      return baseText
  }
}

const rooms = new Map()

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

app.prepare().then(() => {
  const httpServer = createServer(handler)
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Create room (teacher)
    socket.on('create-room', (data) => {
      const pin = generatePIN()
      const room = {
        id: pin,
        teacherId: socket.id,
        text: 'これは教室でのタイピング競争のテストです。みんなで頑張って正確に早く入力しましょう。',
        status: 'waiting',
        participants: new Map()
      }
      
      rooms.set(pin, room)
      socket.join(pin)
      
      socket.emit('room-created', { pin, room })
      console.log(`Room created: ${pin}`)
    })

    // Join room (student)
    socket.on('join-room', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room) {
        socket.emit('error', { message: 'ルームが見つかりません' })
        return
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'このルームは既に開始されています' })
        return
      }

      const participant = {
        id: socket.id,
        name: data.name,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false
      }

      room.participants.set(socket.id, participant)
      socket.join(data.pin)
      
      // Notify all participants about the update
      io.to(data.pin).emit('participant-update', {
        participants: Array.from(room.participants.values())
      })
      
      socket.emit('joined-room', { room: {
        ...room,
        participants: Array.from(room.participants.values())
      }})
      
      console.log(`${data.name} joined room ${data.pin}`)
    })

    // Start race (teacher only)
    socket.on('start-race', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room || room.teacherId !== socket.id) {
        socket.emit('error', { message: '権限がありません' })
        return
      }

      // カスタムテキストがある場合はそれを使用、なければ難易度とタイプから生成
      let raceText = room.text
      if (data.textType && data.difficulty && !data.customText) {
        raceText = generateTextByDifficulty(data.textType, data.difficulty)
        room.text = raceText
      } else if (data.customText) {
        raceText = data.customText
        room.text = raceText
      }

      room.status = 'active'
      room.startTime = Date.now()
      room.textType = data.textType
      room.difficulty = data.difficulty
      
      io.to(data.pin).emit('race-started', { 
        text: raceText,
        startTime: room.startTime,
        textType: data.textType
      })
      
      console.log(`Race started in room ${data.pin} with ${data.textType} text (${data.difficulty})`)
    })

    // Update progress
    socket.on('update-progress', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room || !room.participants.has(socket.id)) {
        return
      }

      const participant = room.participants.get(socket.id)
      participant.progress = data.progress
      participant.wpm = data.wpm
      participant.accuracy = data.accuracy

      if (data.progress >= 100 && !participant.finished) {
        participant.finished = true
        participant.finishTime = Date.now()
      }

      // Broadcast updated participants to all in room
      io.to(data.pin).emit('participant-update', {
        participants: Array.from(room.participants.values())
      })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      
      // Remove from all rooms
      for (const [pin, room] of rooms) {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id)
          
          // If teacher disconnects, remove room
          if (room.teacherId === socket.id) {
            rooms.delete(pin)
            io.to(pin).emit('room-closed')
          } else {
            // Update participants list
            io.to(pin).emit('participant-update', {
              participants: Array.from(room.participants.values())
            })
          }
        }
      }
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
