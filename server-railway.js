const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Next.jsアプリケーションを準備
const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

// 最大参加者数を30人に設定
const MAX_PARTICIPANTS = 30

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
    "konnichiwa, taipingu no renshuu wo shimashou.",
    "nihongo no taipingu wa moji henkan ga hitsuyou desu.",
    "puroguramingu wa ronri-teki shikou-ryoku wo yashinaimasu.",
    "gijutsu no shinpo ni yori, kaihatsu kankyou mo koujou shite imasu.",
    "chiimu waaku wa seikou e no juuyou na youso desu."
  ]
}

// 単語リスト（既存のwordListsをここにコピー）
const wordLists = {
  japanese_easy: [
    { hiragana: "あり", romaji: ["ari"] },
    { hiragana: "いえ", romaji: ["ie"] },
    { hiragana: "うみ", romaji: ["umi"] },
    { hiragana: "えき", romaji: ["eki"] },
    { hiragana: "おか", romaji: ["oka"] },
    { hiragana: "かき", romaji: ["kaki"] },
    { hiragana: "くつ", romaji: ["kutsu", "kutu"] },
    { hiragana: "けが", romaji: ["kega"] },
    { hiragana: "こま", romaji: ["koma"] },
    { hiragana: "さくら", romaji: ["sakura"] },
    { hiragana: "しお", romaji: ["shio", "sio"] },
    { hiragana: "すし", romaji: ["sushi", "susi"] },
    { hiragana: "せかい", romaji: ["sekai"] },
    { hiragana: "そら", romaji: ["sora"] },
    { hiragana: "たいよう", romaji: ["taiyou", "taiyō"] },
    { hiragana: "ちず", romaji: ["chizu", "tizu"] },
    { hiragana: "つき", romaji: ["tsuki", "tuki"] },
    { hiragana: "てがみ", romaji: ["tegami"] },
    { hiragana: "とり", romaji: ["tori"] },
    { hiragana: "なまえ", romaji: ["namae"] },
    { hiragana: "はな", romaji: ["hana"] },
    { hiragana: "ひと", romaji: ["hito"] },
    { hiragana: "ふね", romaji: ["hune"] },
    { hiragana: "へや", romaji: ["heya"] },
    { hiragana: "ほし", romaji: ["hoshi", "hosi"] },
    { hiragana: "まち", romaji: ["machi", "mati"] },
    { hiragana: "みず", romaji: ["mizu"] },
    { hiragana: "むし", romaji: ["mushi", "musi"] },
    { hiragana: "めがね", romaji: ["megane"] },
    { hiragana: "もり", romaji: ["mori"] }
  ],
  // ... 他の単語リストも同様に追加
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

app.prepare().then(() => {
  const httpServer = createServer(handler)
  
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  })

  // Socket.io接続処理
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Create room (teacher)
    socket.on('create-room', (data) => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      const room = {
        id: socket.id,
        pin: pin,
        teacherId: socket.id,
        teacherName: data.teacherName,
        text: '',
        status: 'waiting',
        participants: [],
        startTime: null,
        mode: 'sentence'
      }
      
      rooms.set(pin, room)
      socket.join(pin)
      
      console.log(`Room created with PIN: ${pin} by teacher: ${data.teacherName}`)
      socket.emit('room-created', { pin })
    })

    // 他のSocket.ioイベントハンドラーもここに追加...

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
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
