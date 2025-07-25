const { createServer } = require('node:http')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = dev ? 'localhost' : '0.0.0.0'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

// Interface definitions as comments for reference
// Room: { id, teacherId, text, status, participants, startTime, textType?, difficulty?, wordList?, currentWordIndex? }
// Participant: { id, name, progress, wpm, accuracy, finished, finishTime, currentWordIndex? }

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
    "konnichiwa sekai",
    "nihongo no taipingu renshuu",
    "purogramingu gengo no benkyou",
    "gijutsu no shinpo to kaihatsu",
    "chiimuwaku to koraboreshon"
  ]
}

// 単語リスト（寿司打風）
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
  japanese_medium: [
    { hiragana: "がっこう", romaji: ["gakkou", "gakkō"] },
    { hiragana: "びょういん", romaji: ["byouin", "byōin"] },
    { hiragana: "りょうり", romaji: ["ryouri", "ryōri"] },
    { hiragana: "じゅぎょう", romaji: ["jugyou", "jugyō"] },
    { hiragana: "でんしゃ", romaji: ["densha"] },
    { hiragana: "きょうしつ", romaji: ["kyoushitsu", "kyōshitsu"] },
    { hiragana: "しゅくだい", romaji: ["shukudai"] },
    { hiragana: "ひゃっか", romaji: ["hyakka"] },
    { hiragana: "ちゃいろ", romaji: ["chairo"] },
    { hiragana: "にゃんこ", romaji: ["nyanko"] },
    { hiragana: "こうえん", romaji: ["kouen", "kōen"] },
    { hiragana: "べんきょう", romaji: ["benkyou", "benkyō"] },
    { hiragana: "しんぶん", romaji: ["shinbun"] },
    { hiragana: "でんき", romaji: ["denki"] },
    { hiragana: "きんようび", romaji: ["kinyoubi", "kinyōbi"] },
    { hiragana: "こんびに", romaji: ["konbini"] },
    { hiragana: "ぎゅうにゅう", romaji: ["gyuunyuu", "gyūnyū"] },
    { hiragana: "しゃしん", romaji: ["shashin"] },
    { hiragana: "じかん", romaji: ["jikan"] },
    { hiragana: "けいたい", romaji: ["keitai"] },
    { hiragana: "ちょうど", romaji: ["choudo", "chōdo"] },
    { hiragana: "ひゃくえん", romaji: ["hyakuen"] },
    { hiragana: "りゅうこう", romaji: ["ryuukou", "ryūkō"] },
    { hiragana: "しゅっぱつ", romaji: ["shuppatsu"] },
    { hiragana: "ちゅうもん", romaji: ["chuumon", "chūmon"] },
    { hiragana: "きょうだい", romaji: ["kyoudai", "kyōdai"] },
    { hiragana: "しゃっきん", romaji: ["shakkin"] },
    { hiragana: "びっくり", romaji: ["bikkuri"] },
    { hiragana: "きっと", romaji: ["kitto"] },
    { hiragana: "じっと", romaji: ["jitto"] }
  ],
  japanese_hard: [
    { hiragana: "けんきゅうしつ", romaji: ["kenkyuushitsu", "kenkyūshitsu"] },
    { hiragana: "こうえん", romaji: ["kouen", "kōen"] },
    { hiragana: "きょうそう", romaji: ["kyousou", "kyōsō"] },
    { hiragana: "しんじゅく", romaji: ["shinjuku"] },
    { hiragana: "ちょうちょう", romaji: ["chouchou", "chōchō"] },
    { hiragana: "りゅうがく", romaji: ["ryuugaku", "ryūgaku"] },
    { hiragana: "ひゃっぽん", romaji: ["hyappon"] },
    { hiragana: "きっぷ", romaji: ["kippu"] },
    { hiragana: "しっぽ", romaji: ["shippo"] },
    { hiragana: "ちょうせん", romaji: ["chousen", "chōsen"] },
    { hiragana: "きょうりょく", romaji: ["kyouryoku", "kyōryoku"] },
    { hiragana: "ちゅうがっこう", romaji: ["chuugakkou", "chūgakkō"] },
    { hiragana: "ぎじゅつしゃ", romaji: ["gijutsusha"] },
    { hiragana: "ちょうりし", romaji: ["chourishi", "chōrishi"] },
    { hiragana: "ひょうじゅん", romaji: ["hyoujun", "hyōjun"] },
    { hiragana: "ゆうびんきょく", romaji: ["yuubinkyoku", "yūbinkyoku"] },
    { hiragana: "じゅんびうんどう", romaji: ["junbiundou", "junbiundō"] },
    { hiragana: "ちょうしゃ", romaji: ["chousha", "chōsha"] },
    { hiragana: "しゅっちょう", romaji: ["shucchou", "shutchō"] },
    { hiragana: "きょうかしょ", romaji: ["kyoukasho", "kyōkasho"] },
    { hiragana: "じゅうたく", romaji: ["juutaku", "jūtaku"] },
    { hiragana: "りょこう", romaji: ["ryokou", "ryokō"] },
    { hiragana: "ちゅういほう", romaji: ["chuuihou", "chūihō"] },
    { hiragana: "しゃかいじん", romaji: ["shakaijin"] },
    { hiragana: "でんしゃりょう", romaji: ["densharou", "densharō"] },
    { hiragana: "きょうつう", romaji: ["kyoutsuu", "kyōtsū"] },
    { hiragana: "ひっこし", romaji: ["hikkoshi"] },
    { hiragana: "しっぱい", romaji: ["shippai"] },
    { hiragana: "ちゅうしゃじょう", romaji: ["chuushajou", "chūshajō"] },
    { hiragana: "じっけん", romaji: ["jikken"] }
  ],
  english_easy: [
    { word: "cat", romaji: ["cat"] },
    { word: "dog", romaji: ["dog"] },
    { word: "run", romaji: ["run"] },
    { word: "jump", romaji: ["jump"] },
    { word: "walk", romaji: ["walk"] },
    { word: "book", romaji: ["book"] },
    { word: "pen", romaji: ["pen"] },
    { word: "car", romaji: ["car"] },
    { word: "sun", romaji: ["sun"] },
    { word: "moon", romaji: ["moon"] },
    { word: "fish", romaji: ["fish"] },
    { word: "bird", romaji: ["bird"] },
    { word: "tree", romaji: ["tree"] },
    { word: "house", romaji: ["house"] },
    { word: "food", romaji: ["food"] },
    { word: "water", romaji: ["water"] },
    { word: "fire", romaji: ["fire"] },
    { word: "air", romaji: ["air"] },
    { word: "hand", romaji: ["hand"] },
    { word: "foot", romaji: ["foot"] },
    { word: "head", romaji: ["head"] },
    { word: "eye", romaji: ["eye"] },
    { word: "ear", romaji: ["ear"] },
    { word: "nose", romaji: ["nose"] },
    { word: "mouth", romaji: ["mouth"] },
    { word: "red", romaji: ["red"] },
    { word: "blue", romaji: ["blue"] },
    { word: "green", romaji: ["green"] },
    { word: "white", romaji: ["white"] },
    { word: "black", romaji: ["black"] }
  ],
  english_medium: [
    { word: "computer", romaji: ["computer"] },
    { word: "keyboard", romaji: ["keyboard"] },
    { word: "program", romaji: ["program"] },
    { word: "website", romaji: ["website"] },
    { word: "internet", romaji: ["internet"] },
    { word: "practice", romaji: ["practice"] },
    { word: "exercise", romaji: ["exercise"] },
    { word: "question", romaji: ["question"] },
    { word: "answer", romaji: ["answer"] },
    { word: "student", romaji: ["student"] },
    { word: "teacher", romaji: ["teacher"] },
    { word: "school", romaji: ["school"] },
    { word: "library", romaji: ["library"] },
    { word: "hospital", romaji: ["hospital"] },
    { word: "restaurant", romaji: ["restaurant"] },
    { word: "station", romaji: ["station"] },
    { word: "airport", romaji: ["airport"] },
    { word: "building", romaji: ["building"] },
    { word: "mountain", romaji: ["mountain"] },
    { word: "ocean", romaji: ["ocean"] },
    { word: "forest", romaji: ["forest"] },
    { word: "garden", romaji: ["garden"] },
    { word: "kitchen", romaji: ["kitchen"] },
    { word: "bedroom", romaji: ["bedroom"] },
    { word: "bathroom", romaji: ["bathroom"] },
    { word: "morning", romaji: ["morning"] },
    { word: "evening", romaji: ["evening"] },
    { word: "weekend", romaji: ["weekend"] },
    { word: "holiday", romaji: ["holiday"] },
    { word: "birthday", romaji: ["birthday"] }
  ],
  english_hard: [
    { word: "programming", romaji: ["programming"] },
    { word: "development", romaji: ["development"] },
    { word: "technology", romaji: ["technology"] },
    { word: "environment", romaji: ["environment"] },
    { word: "information", romaji: ["information"] },
    { word: "communication", romaji: ["communication"] },
    { word: "international", romaji: ["international"] },
    { word: "organization", romaji: ["organization"] },
    { word: "responsibility", romaji: ["responsibility"] },
    { word: "understanding", romaji: ["understanding"] },
    { word: "implementation", romaji: ["implementation"] },
    { word: "transportation", romaji: ["transportation"] },
    { word: "administration", romaji: ["administration"] },
    { word: "recommendation", romaji: ["recommendation"] },
    { word: "collaboration", romaji: ["collaboration"] },
    { word: "transformation", romaji: ["transformation"] },
    { word: "infrastructure", romaji: ["infrastructure"] },
    { word: "characteristic", romaji: ["characteristic"] },
    { word: "demonstration", romaji: ["demonstration"] },
    { word: "establishment", romaji: ["establishment"] },
    { word: "revolutionary", romaji: ["revolutionary"] },
    { word: "extraordinary", romaji: ["extraordinary"] },
    { word: "contemporary", romaji: ["contemporary"] },
    { word: "configuration", romaji: ["configuration"] },
    { word: "documentation", romaji: ["documentation"] },
    { word: "specification", romaji: ["specification"] },
    { word: "psychological", romaji: ["psychological"] },
    { word: "philosophical", romaji: ["philosophical"] },
    { word: "sophisticated", romaji: ["sophisticated"] },
    { word: "comprehensive", romaji: ["comprehensive"] }
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
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Create room (teacher)
    socket.on('create-room', (data) => {
      const pin = generatePIN()
      const room = {
        id: pin,
        pin: pin, // PINプロパティを追加
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

      // 30人制限チェック
      if (room.participants.size >= MAX_PARTICIPANTS) {
        socket.emit('error', { message: `参加者数が上限（${MAX_PARTICIPANTS}人）に達しています` })
        return
      }

      const participant = {
        id: socket.id,
        name: data.name,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
        currentWordIndex: 0,
        fixedRomajiPatterns: [], // 生徒固有のローマ字パターンを保存
        stats: {
          wpm: 0,
          accuracy: 100,
          mistakes: 0,
          totalChars: 0,
          completedWords: 0
        },
        typingStats: {
          totalKeystrokes: 0,
          errorCount: 0,
          correctKeystrokes: 0,
          startTime: null,
          endTime: null,
          finalAccuracy: 100,
          finalWPM: 0,
          finalErrorCount: 0,
          wordStats: [] // 各単語の詳細統計
        }
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
      
      console.log(`${data.name} joined room ${data.pin} (${room.participants.size}/${MAX_PARTICIPANTS})`)
    })

    // Start race (teacher only)
    socket.on('start-race', (data) => {
      console.log('=== RECEIVED START-RACE EVENT ===')
      console.log('Raw data:', JSON.stringify(data, null, 2))
      console.log('data.wordCount:', data.wordCount, '(type:', typeof data.wordCount, ')')
      console.log('data.pin:', data.pin)
      console.log('data.mode:', data.mode)
      console.log('data.textType:', data.textType)
      console.log('data.difficulty:', data.difficulty)
      console.log('=== END RAW DATA ===')
      
      const room = rooms.get(data.pin)
      
      if (!room || room.teacherId !== socket.id) {
        socket.emit('error', { message: '権限がありません' })
        return
      }

      console.log(`Starting race in room ${data.pin} with mode: ${data.mode}`)
      console.log('Received race data:', {
        mode: data.mode,
        textType: data.textType,
        difficulty: data.difficulty,
        wordCount: data.wordCount,
        customText: data.customText ? 'provided' : 'none'
      })
      console.log('=== RACE START DEBUG ===')

      let raceData = {}
      let selectedWords = null

      // 単語モードかどうかを判定
      if (data.mode === 'word') {
        // 単語リストを生成
        const wordListKey = `${data.textType}_${data.difficulty}`
        const wordList = wordLists[wordListKey] || wordLists.japanese_easy
        
        // 指定された問題数だけランダムに単語を選択（デフォルトは20問）
        const wordCount = data.wordCount || 20
        console.log(`=== WORD COUNT DEBUG ===`)
        console.log(`Received data.wordCount: ${data.wordCount} (type: ${typeof data.wordCount})`)
        console.log(`Final wordCount: ${wordCount}`)
        console.log(`wordList available: ${wordList.length} words`)
        console.log(`=== END DEBUG ===`)
        
        const shuffled = [...wordList].sort(() => 0.5 - Math.random())
        selectedWords = shuffled.slice(0, wordCount)
        
        console.log(`Selected ${selectedWords.length} words from ${wordList.length} available words`)
        console.log('Selected words:', selectedWords.map((w, i) => `${i + 1}: ${w.hiragana || w.word}`))
        
        room.wordList = selectedWords
        room.currentWordIndex = 0
        room.mode = 'word'
        
        raceData = {
          mode: 'word',
          wordList: selectedWords,
          startTime: Date.now(),
          textType: data.textType,
          wordCount: wordCount,
          fixedRomajiPatterns: selectedWords.map(word => word.romaji[0]) // 固定パターンも送信
        }
        
        console.log(`Word mode: selected ${selectedWords.length} words (requested: ${wordCount})`)
      } else {
        // 通常の文章モード
        let raceText = room.text
        if (data.textType && data.difficulty && !data.customText) {
          raceText = generateTextByDifficulty(data.textType, data.difficulty)
          room.text = raceText
        } else if (data.customText) {
          raceText = data.customText
          room.text = raceText
        }

        room.mode = 'sentence'
        
        raceData = {
          mode: 'sentence',
          text: raceText,
          startTime: Date.now(),
          textType: data.textType
        }
        
        console.log(`Sentence mode: text set to "${raceText.substring(0, 50)}..."`)
      }

      room.status = 'active'
      room.startTime = Date.now()
      room.textType = data.textType
      room.difficulty = data.difficulty
      
      // 参加者の状態を初期化
      room.participants.forEach(participant => {
        participant.currentWordIndex = 0
        participant.progress = 0
        participant.wpm = 0
        participant.accuracy = 100
        participant.finished = false
        
        // 単語モードの場合、各参加者に固定のローマ字パターンを設定
        if (data.mode === 'word' && data.textType === 'japanese' && selectedWords) {
          participant.fixedRomajiPatterns = selectedWords.map(word => {
            // 各単語の最短ローマ字パターンを生成
            return word.romaji[0] // 最初のパターンを固定パターンとして使用
          })
        } else {
          participant.fixedRomajiPatterns = []
        }
      })
      
      console.log(`Emitting race-started to room ${data.pin} with data:`, {
        mode: raceData.mode,
        hasText: !!raceData.text,
        hasWordList: !!raceData.wordList,
        wordListLength: raceData.wordList ? raceData.wordList.length : 0,
        textType: raceData.textType,
        actualWordList: raceData.wordList ? raceData.wordList.map((w, i) => `${i + 1}: ${w.hiragana || w.word}`) : []
      })
      
      io.to(data.pin).emit('race-started', raceData)
      
      console.log(`Race started in room ${data.pin} with ${data.mode} mode (${data.textType} ${data.difficulty})`)
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

      // 教師画面用の stats オブジェクトを更新
      if (!participant.stats) {
        participant.stats = {}
      }
      participant.stats.wpm = data.wpm || 0
      participant.stats.accuracy = data.accuracy || 100
      participant.stats.mistakes = participant.typingStats?.errorCount || 0
      participant.stats.totalChars = participant.typingStats?.totalKeystrokes || 0
      participant.stats.completedWords = data.currentWordIndex || 0

      // 単語モードの場合は単語インデックスも更新
      if (room.mode === 'word' && data.currentWordIndex !== undefined) {
        participant.currentWordIndex = data.currentWordIndex
      }

      if (data.progress >= 100 && !participant.finished) {
        participant.finished = true
        participant.finishTime = Date.now()
      }

      // Broadcast updated participants to all in room
      const participantsArray = Array.from(room.participants.values())
      console.log(`Broadcasting participant-update for room ${data.pin} (update-progress):`, 
        participantsArray.map(p => ({
          name: p.name,
          progress: p.progress,
          stats: p.stats,
          wpm: p.wpm,
          accuracy: p.accuracy
        }))
      )
      
      io.to(data.pin).emit('participant-update', {
        participants: participantsArray
      })
    })

    // 単語完了イベント（単語モード用）
    socket.on('word-completed', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room || !room.participants.has(socket.id) || room.mode !== 'word') {
        return
      }

      const participant = room.participants.get(socket.id)
      participant.currentWordIndex = data.currentWordIndex
      
      // 全単語完了チェック
      if (data.currentWordIndex >= room.wordList.length) {
        participant.finished = true
        participant.finishTime = Date.now()
        participant.progress = 100
      } else {
        participant.progress = (data.currentWordIndex / room.wordList.length) * 100
      }

      // Broadcast updated participants to all in room
      io.to(data.pin).emit('participant-update', {
        participants: Array.from(room.participants.values())
      })
    })

    // 詳細タイピング統計更新イベント（新システム）
    socket.on('update-detailed-stats', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room || !room.participants.has(socket.id)) {
        return
      }

      const participant = room.participants.get(socket.id)
      
      // 詳細統計を更新
      if (data.stats) {
        console.log(`Updating stats for ${participant.name}:`, {
          before: {
            totalKeystrokes: participant.typingStats.totalKeystrokes,
            errorCount: participant.typingStats.errorCount,
            correctKeystrokes: participant.typingStats.correctKeystrokes
          },
          incoming: {
            totalKeystrokes: data.stats.totalKeystrokes,
            errorCount: data.stats.errorCount,
            correctKeystrokes: data.stats.correctKeystrokes
          }
        })
        
        // 統計は累積的に更新（減らない）
        participant.typingStats.totalKeystrokes = Math.max(
          participant.typingStats.totalKeystrokes || 0, 
          data.stats.totalKeystrokes || 0
        )
        participant.typingStats.errorCount = Math.max(
          participant.typingStats.errorCount || 0,
          data.stats.errorCount || 0
        )
        participant.typingStats.correctKeystrokes = Math.max(
          participant.typingStats.correctKeystrokes || 0,
          data.stats.correctKeystrokes || 0
        )
        
        // 基本統計を更新
        participant.accuracy = data.stats.accuracy || 100
        participant.wpm = data.stats.wpm || 0
        
        // 教師画面用の stats オブジェクトを更新
        if (!participant.stats) {
          participant.stats = {}
        }
        participant.stats.wpm = data.stats.wpm || 0
        participant.stats.accuracy = data.stats.accuracy || 100
        participant.stats.mistakes = data.stats.errorCount || 0
        participant.stats.totalChars = data.stats.totalKeystrokes || 0
        participant.stats.completedWords = data.stats.completedWords || 0
        
        console.log(`After update for ${participant.name}:`, {
          totalKeystrokes: participant.typingStats.totalKeystrokes,
          errorCount: participant.typingStats.errorCount,
          correctKeystrokes: participant.typingStats.correctKeystrokes,
          stats: participant.stats
        })
        
        // 完了時の最終統計を記録
        if (data.stats.finished) {
          participant.finished = true
          participant.finishTime = Date.now()
          participant.progress = 100
          participant.typingStats.endTime = Date.now()
          participant.typingStats.finalAccuracy = data.stats.accuracy
          participant.typingStats.finalWPM = data.stats.wpm
          participant.typingStats.finalErrorCount = data.stats.errorCount
          participant.typingStats.finalTotalKeystrokes = data.stats.totalKeystrokes
          participant.typingStats.finalCorrectKeystrokes = data.stats.correctKeystrokes
        }
      }
      
      // 進捗更新
      if (data.progress !== undefined) {
        participant.progress = data.progress
      }

      // Broadcast updated participants to all in room
      const participantsArray = Array.from(room.participants.values())
      console.log(`Broadcasting participant-update for room ${data.pin} (update-detailed-stats):`, 
        participantsArray.map(p => ({
          name: p.name,
          progress: p.progress,
          stats: p.stats,
          wpm: p.wpm,
          accuracy: p.accuracy
        }))
      )
      
      io.to(data.pin).emit('participant-update', {
        participants: participantsArray
      })
    })

    // タイピング統計更新イベント（レガシー）
    socket.on('update-typing-stats', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room || !room.participants.has(socket.id)) {
        return
      }

      const participant = room.participants.get(socket.id)
      
      // 統計データを更新
      if (data.typingStats) {
        participant.typingStats = {
          ...participant.typingStats,
          ...data.typingStats
        }
        
        // WPMと正確性を再計算
        const { totalKeystrokes, errorCount, correctKeystrokes, startTime } = participant.typingStats
        
        if (startTime && totalKeystrokes > 0) {
          const elapsedMinutes = (Date.now() - startTime) / (1000 * 60)
          participant.wpm = elapsedMinutes > 0 ? (correctKeystrokes / 5) / elapsedMinutes : 0
          participant.accuracy = (correctKeystrokes / totalKeystrokes) * 100
        }
      }

      // 通常の進捗更新も処理
      if (data.progress !== undefined) {
        participant.progress = data.progress
      }
      
      // 単語統計を追加
      if (data.wordStats) {
        participant.typingStats.wordStats = data.wordStats
      }

      // 完了チェック
      if (data.progress >= 100 && !participant.finished) {
        participant.finished = true
        participant.finishTime = Date.now()
      }

      // 全参加者に更新を通知
      io.to(data.pin).emit('participant-update', {
        participants: Array.from(room.participants.values())
      })
    })

    // レースリセット機能
    socket.on('reset-race', (data) => {
      const room = rooms.get(data.pin)
      
      if (!room || room.teacherId !== socket.id) {
        socket.emit('error', { message: 'レースをリセットする権限がありません' })
        return
      }

      console.log(`Resetting race for room ${data.pin}`)
      
      // ルームの状態をリセット
      room.status = 'waiting'
      
      // 全参加者の統計をリセット
      for (const participant of room.participants.values()) {
        participant.progress = 0
        participant.wpm = 0
        participant.accuracy = 100
        participant.finished = false
        participant.finishTime = null
        participant.typingStats = {
          totalKeystrokes: 0,
          errorCount: 0,
          correctKeystrokes: 0,
          startTime: null,
          endTime: null,
          accuracy: 100,
          wpm: 0,
          finalAccuracy: 100,
          finalWPM: 0,
          finalErrorCount: 0,
          finalTotalKeystrokes: 0,
          finalCorrectKeystrokes: 0,
          wordStats: []
        }
      }

      // 全参加者にリセット通知
      io.to(data.pin).emit('race-reset')
      
      // 更新された参加者情報を送信
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
