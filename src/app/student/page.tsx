'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { socketService, Room, Participant } from '@/lib/socket'
import { validateRomajiInput, calculateRomajiProgress, convertToRomajiPatterns, getShortestRomajiPattern, validateFixedRomajiInput, RomajiStyle, convertToRomaji, initializeWordStats, updateWordStats, WordTypingStats } from '@/lib/romaji'
import { 
  disableIME, 
  enableIME, 
  detectJapaneseInput, 
  convertToHalfWidth,
  filterKeyboardInput,
  IMEMonitor,
  type IMEState
} from '@/lib/ime-control'

function StudentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pin = searchParams.get('pin') || ''
  const studentName = searchParams.get('name') || ''
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [raceText, setRaceText] = useState('')
  const [raceMode, setRaceMode] = useState<'sentence' | 'word'>('sentence')
  const [wordList, setWordList] = useState<Array<{ hiragana?: string, word?: string, romaji: string[] }>>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [fixedRomajiPatterns, setFixedRomajiPatterns] = useState<string[]>([])
  const [romajiStyle, setRomajiStyle] = useState<RomajiStyle>(RomajiStyle.HEPBURN)
  const [currentWordStats, setCurrentWordStats] = useState<WordTypingStats | null>(null)
  const [allWordStats, setAllWordStats] = useState<WordTypingStats[]>([])
  const [globalTypingStats, setGlobalTypingStats] = useState({
    totalKeystrokes: 0,
    errorCount: 0,
    correctKeystrokes: 0,
    startTime: null as number | null
  })
  const [textType, setTextType] = useState<string>('')
  const [userInput, setUserInput] = useState('')
  const [raceStarted, setRaceStarted] = useState(false)
  const [raceFinished, setRaceFinished] = useState(false)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)

  // IME制御用の状態
  const [imeState, setImeState] = useState<IMEState>({ isActive: false, composing: false })
  const [imeWarning, setImeWarning] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imeMonitorRef = useRef<IMEMonitor | null>(null)

  // Calculate typing statistics with romaji support
  const calculateStats = useCallback(() => {
    if (!startTime) return { progress: 0, wpm: 0, accuracy: 100 }
    
    let progress = 0
    let accuracy = 100
    
    if (raceMode === 'word') {
      // 単語モードの統計計算
      if (wordList.length > 0) {
        progress = (currentWordIndex / wordList.length) * 100
        
        // 現在の単語の正確性を計算
        if (currentWordIndex < wordList.length) {
          const currentWord = wordList[currentWordIndex]
          const targetText = currentWord.hiragana || currentWord.word || ''
          
          if (textType === 'japanese' || targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
            // 固定パターンを使用
            const fixedPattern = fixedRomajiPatterns[currentWordIndex]
            if (fixedPattern) {
              const validation = validateFixedRomajiInput(targetText, userInput, romajiStyle)
              accuracy = userInput.length > 0 ? (validation.correctLength / userInput.length) * 100 : 100
            } else {
              // フォールバック: 通常の検証
              const validation = validateRomajiInput(targetText, userInput)
              accuracy = userInput.length > 0 ? (validation.correctLength / userInput.length) * 100 : 100
            }
          } else {
            let correctChars = 0
            for (let i = 0; i < userInput.length; i++) {
              if (userInput[i] === targetText[i]) {
                correctChars++
              }
            }
            accuracy = userInput.length > 0 ? (correctChars / userInput.length) * 100 : 100
          }
        }
      }
    } else {
      // 文章モードの統計計算
      if (!raceText) return { progress: 0, wpm: 0, accuracy: 100 }
      
      // 日本語の場合はローマ字で判定
      if (textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText))) {
        const romajiProgress = calculateRomajiProgress(raceText, userInput)
        progress = romajiProgress.progress
        
        const validation = validateRomajiInput(raceText, userInput)
        accuracy = userInput.length > 0 ? (validation.correctLength / userInput.length) * 100 : 100
      } else {
        // 英語やローマ字の場合は通常の文字比較
        progress = Math.min((userInput.length / raceText.length) * 100, 100)
        
        let correctChars = 0
        for (let i = 0; i < userInput.length; i++) {
          if (userInput[i] === raceText[i]) {
            correctChars++
          }
        }
        accuracy = userInput.length > 0 ? (correctChars / userInput.length) * 100 : 100
      }
    }
    
    // Calculate WPM
    const timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
    const wordsTyped = userInput.length / 5 // assuming 5 characters per word
    const wpm = timeElapsed > 0 ? wordsTyped / timeElapsed : 0
    
    return { progress, wpm, accuracy }
  }, [userInput, raceText, raceMode, wordList, currentWordIndex, startTime, textType, fixedRomajiPatterns])

  useEffect(() => {
    if (!pin || !studentName) {
      router.push('/')
      return
    }

    socketService.connect()

    // Join room
    socketService.joinRoom(pin, studentName, (data) => {
      setRoom(data.room)
      setParticipants(data.room.participants)
    })

    // Listen for race start
    socketService.onRaceStarted((data) => {
      setRaceMode(data.mode || 'sentence')
      setTextType(data.textType || '')
      setRaceStarted(true)
      setStartTime(data.startTime)
      
      if (data.mode === 'word' && data.wordList) {
        setWordList(data.wordList)
        setCurrentWordIndex(0)
        setRaceText('')
        
        // 固定ローマ字パターンを設定
        if (data.fixedRomajiPatterns) {
          setFixedRomajiPatterns(data.fixedRomajiPatterns)
        } else {
          // パターンが送られてこない場合は最短パターンを生成
          const patterns = data.wordList.map((word: any) => 
            word.hiragana ? getShortestRomajiPattern(word.hiragana) : word.word
          )
          setFixedRomajiPatterns(patterns)
        }
        
        // 統計の初期化
        setGlobalTypingStats({
          totalKeystrokes: 0,
          errorCount: 0,
          correctKeystrokes: 0,
          startTime: Date.now()
        })
        setAllWordStats([])
        
        // 最初の単語の統計を初期化
        if (data.wordList.length > 0) {
          const firstWordText = data.wordList[0].hiragana || data.wordList[0].word || ''
          const expectedInput = convertToRomaji(firstWordText, romajiStyle)
          setCurrentWordStats(initializeWordStats(0, expectedInput))
        }
      } else {
        setRaceText(data.text || '')
        setWordList([])
        setCurrentWordIndex(0)
        setFixedRomajiPatterns([])
      }
    })

    // Listen for participant updates
    socketService.onParticipantUpdate((data) => {
      setParticipants(data.participants)
    })

    // Listen for room closed
    socketService.onRoomClosed(() => {
      alert('ルームが閉じられました')
      router.push('/')
    })

    // Listen for errors
    socketService.onError((data) => {
      setError(data.message)
    })

    return () => {
      socketService.removeAllListeners()
      socketService.disconnect()
    }
  }, [pin, studentName, router])

  // IME制御の初期化
  useEffect(() => {
    if (textareaRef.current) {
      // IMEを無効化
      disableIME(textareaRef.current)
      
      // IME監視を開始
      imeMonitorRef.current = new IMEMonitor(textareaRef.current, (state: IMEState) => {
        setImeState(state)
        if (state.isActive || state.composing) {
          setImeWarning('日本語入力モードが検出されました。ローマ字入力に切り替えてください。')
        } else {
          setImeWarning('')
        }
      })
      
      return () => {
        if (textareaRef.current) {
          enableIME(textareaRef.current)
        }
        if (imeMonitorRef.current) {
          imeMonitorRef.current.destroy()
        }
      }
    }
  }, [raceStarted])

  // Update progress when input changes
  useEffect(() => {
    if (raceStarted && startTime && room) {
      const stats = calculateStats()
      
      // 詳細統計を送信
      if (raceMode === 'word') {
        socketService.updateTypingStats(
          room.id, 
          stats.progress, 
          globalTypingStats,
          allWordStats
        )
      } else {
        socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy)
      }
      
      // Check if finished
      if (stats.progress >= 100 && !raceFinished) {
        setRaceFinished(true)
      }
    }
  }, [userInput, raceStarted, startTime, room, calculateStats, raceFinished, raceMode, currentWordIndex, globalTypingStats, allWordStats])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!raceStarted || raceFinished) return
    
    let value = e.target.value
    
    // 日本語入力の検出と変換
    const detection = detectJapaneseInput(value)
    if (detection.hasJapanese) {
      setImeWarning(detection.message || '')
      // 全角文字を半角に変換を試行
      value = convertToHalfWidth(value)
      // 変換後も日本語文字が残っている場合は入力を拒否
      const secondCheck = detectJapaneseInput(value)
      if (secondCheck.hasJapanese) {
        // 入力を元に戻す（日本語文字を除去）
        value = userInput
        return
      }
    } else {
      setImeWarning('')
    }
    
    if (raceMode === 'word') {
      // 単語モードの処理
      if (currentWordIndex >= wordList.length) return
      
      const currentWord = wordList[currentWordIndex]
      const targetText = currentWord.hiragana || currentWord.word || ''
      
      // 日本語の場合はローマ字で判定
      if (textType === 'japanese' || targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
        // 固定パターンを使用
        const fixedPattern = fixedRomajiPatterns[currentWordIndex]
        if (fixedPattern) {
          const validation = validateFixedRomajiInput(targetText, value, romajiStyle)
          
          if (validation.isValid) {
            setUserInput(value)
            
            // 統計更新
            if (currentWordStats) {
              const isError = validation.errorPositions.length > 0
              const updatedStats = updateWordStats(currentWordStats, value, isError)
              setCurrentWordStats(updatedStats)
              
              // グローバル統計更新
              setGlobalTypingStats(prev => ({
                ...prev,
                totalKeystrokes: prev.totalKeystrokes + 1,
                errorCount: prev.errorCount + (isError ? 1 : 0),
                correctKeystrokes: prev.correctKeystrokes + (isError ? 0 : 1)
              }))
            }
            
            // 単語完了チェック
            if (validation.isComplete) {
              // 次の単語へ進む
              const nextIndex = currentWordIndex + 1
              setCurrentWordIndex(nextIndex)
              setUserInput('')
              
              // 現在の単語統計を保存
              if (currentWordStats) {
                const finalStats = updateWordStats(currentWordStats, value, false)
                setAllWordStats(prev => [...prev, finalStats])
              }
              
              // 次の単語の統計を初期化
              if (nextIndex < wordList.length) {
                const nextWordText = wordList[nextIndex].hiragana || wordList[nextIndex].word || ''
                const nextExpectedInput = convertToRomaji(nextWordText, romajiStyle)
                setCurrentWordStats(initializeWordStats(nextIndex, nextExpectedInput))
              }
              
              if (room) {
                socketService.wordCompleted(room.id, nextIndex)
              }
              
              if (nextIndex >= wordList.length && !raceFinished) {
                setRaceFinished(true)
              }
            }
          }
        } else {
          // フォールバック: 通常の検証（複数パターン対応）
          const validation = validateRomajiInput(targetText, value)
          
          if (validation.isValid) {
            setUserInput(value)
            
            // 単語完了チェック
            const progress = calculateRomajiProgress(targetText, value)
            if (progress.isComplete) {
              // 次の単語へ進む
              const nextIndex = currentWordIndex + 1
              setCurrentWordIndex(nextIndex)
              setUserInput('')
              
              if (room) {
                socketService.wordCompleted(room.id, nextIndex)
              }
              
              if (nextIndex >= wordList.length && !raceFinished) {
                setRaceFinished(true)
              }
            }
          }
        }
      } else {
        // 英語の場合は文字比較
        let isValid = true
        for (let i = 0; i < value.length; i++) {
          if (i >= targetText.length || value[i] !== targetText[i]) {
            isValid = false
            break
          }
        }
        
        if (isValid) {
          setUserInput(value)
          
          // 単語完了チェック
          if (value === targetText) {
            // 次の単語へ進む
            const nextIndex = currentWordIndex + 1
            setCurrentWordIndex(nextIndex)
            setUserInput('')
            
            if (room) {
              socketService.wordCompleted(room.id, nextIndex)
            }
            
            if (nextIndex >= wordList.length && !raceFinished) {
              setRaceFinished(true)
            }
          }
        }
      }
    } else {
      // 文章モードの処理（従来通り）
      // 日本語の場合はローマ字で厳密に判定
      if (textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText))) {
        const validation = validateRomajiInput(raceText, value)
        
        if (validation.isValid) {
          setUserInput(value)
          
          // 完了チェック
          const progress = calculateRomajiProgress(raceText, value)
          if (progress.isComplete && !raceFinished) {
            setRaceFinished(true)
          }
        }
        // 無効な入力は受け入れない（間違いがあると先に進めない）
      } else {
        // 英語やローマ字の場合は厳密に文字比較
        let isValid = true
        for (let i = 0; i < value.length; i++) {
          if (i >= raceText.length || value[i] !== raceText[i]) {
            isValid = false
            break
          }
        }
        
        if (isValid) {
          setUserInput(value)
          
          // 完了チェック
          if (value.length >= raceText.length && !raceFinished) {
            setRaceFinished(true)
          }
        }
        // 無効な入力は受け入れない
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME制御：無効な文字の入力を阻止
    const isValidKey = filterKeyboardInput(e.nativeEvent)
    
    if (!isValidKey) {
      setImeWarning('ローマ字（半角英数字）のみで入力してください')
      setTimeout(() => setImeWarning(''), 2000)
      return
    }
    
    // Enterキーで改行を防ぐ（タイピング競争では通常不要）
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  const currentStats = calculateStats()
  const currentRank = participants
    .filter(p => p.progress > 0)
    .sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishTime || 0) - (b.finishTime || 0)
      }
      if (a.finished) return -1
      if (b.finished) return 1
      return b.progress - a.progress
    })
    .findIndex(p => p.name === studentName) + 1

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ルームに参加中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              タイピング競争
            </h1>
            <button
              onClick={handleBackToHome}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
            >
              ホームに戻る
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="text-sm font-medium text-blue-800 mb-1">現在の順位</h3>
              <p className="text-2xl font-bold text-blue-600">
                {currentRank > 0 ? `${currentRank}位` : '-'}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <h3 className="text-sm font-medium text-green-800 mb-1">進捗</h3>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(currentStats.progress)}%
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">速度</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {Math.round(currentStats.wpm)} WPM
              </p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">進捗状況</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  正確性: {Math.round(currentStats.accuracy)}%
                </span>
                {/* IME状態インジケーター */}
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  imeState.isActive || imeState.composing
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    imeState.isActive || imeState.composing ? 'bg-red-500' : 'bg-green-500'
                  }`}></span>
                  <span>
                    {imeState.isActive || imeState.composing ? 'IME有効' : '英数字モード'}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${currentStats.progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!raceStarted ? (
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              競争開始を待っています...
            </h2>
            <p className="text-gray-600 mb-6">
              先生が競争を開始するまでお待ちください
            </p>
            <div className="text-sm text-gray-500">
              <p>ルームPIN: <span className="font-bold">{room.id}</span></p>
              <p>参加者: {participants.length}人</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {raceFinished ? '完了！お疲れ様でした！' : 'タイピング中...'}
              </h2>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4 font-mono text-lg leading-relaxed">
                {raceMode === 'word' ? (
                  // 単語モード表示
                  <div>
                    <div className="mb-2 text-sm text-gray-600">
                      単語 {currentWordIndex + 1} / {wordList.length}
                    </div>
                    {currentWordIndex < wordList.length && (
                      <div>
                        <div className="text-2xl font-bold mb-2">
                          {wordList[currentWordIndex].hiragana || wordList[currentWordIndex].word}
                        </div>
                        {(textType === 'japanese' || (wordList[currentWordIndex].hiragana && wordList[currentWordIndex].hiragana!.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/))) && (
                          <div className="text-sm text-blue-600">
                            ローマ字: {fixedRomajiPatterns[currentWordIndex] || wordList[currentWordIndex].romaji.join(' または ')}
                          </div>
                        )}
                      </div>
                    )}
                    {currentWordIndex >= wordList.length && (
                      <div className="text-2xl font-bold text-green-600">
                        全単語完了！
                      </div>
                    )}
                  </div>
                ) : (
                  // 文章モード表示（従来通り）
                  <div>
                    <div className="mb-2 text-sm text-gray-600">
                      {textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText)) 
                        ? `入力テキスト（ローマ字で入力）: ${convertToRomajiPatterns(raceText).join('')}`
                        : '入力テキスト:'
                      }
                    </div>
                    {raceText.split('').map((char, index) => {
                      let className = ''
                      
                      // 日本語の場合はローマ字進捗で表示を制御
                      if (textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText))) {
                        const romajiProgress = calculateRomajiProgress(raceText, userInput)
                        const textProgress = (romajiProgress.progress / 100) * raceText.length
                        
                        if (index < textProgress) {
                          className = 'bg-green-200 text-green-800'
                        } else if (index === Math.floor(textProgress)) {
                          className = 'bg-blue-200'
                        }
                      } else {
                        // 英語の場合は従来通り
                        if (index < userInput.length) {
                          className = userInput[index] === char 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-red-200 text-red-800'
                        } else if (index === userInput.length) {
                          className = 'bg-blue-200'
                        }
                      }
                      
                      return (
                        <span key={index} className={className}>
                          {char}
                        </span>
                      )
                    })}
                  </div>
                )}
                
                {/* 入力表示 */}
                <div className="mt-2 text-sm">
                  <div className="text-gray-600">現在の入力: <span className="font-bold">{userInput}</span></div>
                </div>
              </div>
              
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={!raceStarted || raceFinished}
                placeholder={
                  raceMode === 'word' 
                    ? (currentWordIndex < wordList.length && (textType === 'japanese' || (wordList[currentWordIndex].hiragana && wordList[currentWordIndex].hiragana!.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)))
                        ? `「${wordList[currentWordIndex].hiragana || wordList[currentWordIndex].word}」を「${fixedRomajiPatterns[currentWordIndex] || wordList[currentWordIndex].romaji[0]}」で入力...`
                        : `「${wordList[currentWordIndex]?.word || ''}」を入力...`)
                    : (textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText))
                        ? "ローマ字で入力してください (例: konnichiwa)..."
                        : "ここに入力してください...")
                }
                className={`w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 font-mono text-lg disabled:bg-gray-100 ${
                  imeState.isActive || imeWarning 
                    ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                    : 'border-gray-300 focus:ring-green-500'
                }`}
              />
              
              {/* IME警告表示 */}
              {(imeState.isActive || imeWarning) && (
                <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600 font-bold">⚠️</span>
                    <div className="text-red-800">
                      <p className="font-semibold">入力モード警告</p>
                      <p className="text-sm">
                        {imeWarning || 'IMEが有効になっています。半角英数字モードに切り替えてください。'}
                      </p>
                      <p className="text-xs mt-1 text-red-600">
                        Windows: 「半角/全角」キー、または「Alt + `」で切り替え
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* リアルタイム統計パネル */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 リアルタイム統計</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-gray-600">速度</p>
                  <p className="font-bold text-blue-600">{Math.round(currentStats.wpm)} WPM</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">正確性</p>
                  <p className="font-bold text-green-600">{Math.round(currentStats.accuracy)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">順位</p>
                  <p className="font-bold text-purple-600">{currentRank}位</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">タイプミス</p>
                  <p className="font-bold text-red-600">{globalTypingStats.errorCount}回</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">経過時間</p>
                  <p className="font-bold text-orange-600">
                    {globalTypingStats.startTime 
                      ? Math.round((Date.now() - globalTypingStats.startTime) / 1000)
                      : 0
                    }秒
                  </p>
                </div>
              </div>
              {currentWordStats && raceMode === 'word' && (
                <div className="mt-3 p-2 bg-white rounded border">
                  <p className="text-xs text-gray-600 mb-1">現在の単語統計</p>
                  <div className="flex justify-between text-xs">
                    <span>速度: <span className="font-medium text-blue-600">{Math.round(currentWordStats.wpm)}WPM</span></span>
                    <span>正確性: <span className="font-medium text-green-600">{Math.round(currentWordStats.accuracy)}%</span></span>
                    <span>ミス: <span className="font-medium text-red-600">{currentWordStats.errorCount}回</span></span>
                  </div>
                </div>
              )}
            </div>
            
            {raceFinished && (
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  🎉 完了しました！
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">最終順位</p>
                    <p className="font-bold text-green-600">{currentRank}位</p>
                  </div>
                  <div>
                    <p className="text-gray-600">平均速度</p>
                    <p className="font-bold text-green-600">{Math.round(currentStats.wpm)} WPM</p>
                  </div>
                  <div>
                    <p className="text-gray-600">正確性</p>
                    <p className="font-bold text-green-600">{Math.round(currentStats.accuracy)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">タイプミス</p>
                    <p className="font-bold text-red-600">{globalTypingStats.errorCount}回</p>
                  </div>
                </div>
                {raceMode === 'word' && allWordStats.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">単語別統計</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <div className="space-y-1 text-xs">
                        {allWordStats.map((wordStat, index) => (
                          <div key={index} className="flex justify-between items-center bg-white px-2 py-1 rounded">
                            <span>{wordStat.expectedInput}</span>
                            <div className="flex space-x-2">
                              <span className="text-blue-600">{Math.round(wordStat.wpm)}WPM</span>
                              <span className="text-green-600">{Math.round(wordStat.accuracy)}%</span>
                              <span className="text-red-600">{wordStat.errorCount}ミス</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mini leaderboard */}
        <div className="bg-white rounded-xl shadow-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            リアルタイム順位表
          </h3>
          <div className="space-y-2">
            {participants
              .filter(p => p.progress > 0 || p.finished)
              .sort((a, b) => {
                if (a.finished && b.finished) {
                  return (a.finishTime || 0) - (b.finishTime || 0)
                }
                if (a.finished) return -1
                if (b.finished) return 1
                return b.progress - a.progress
              })
              .slice(0, 5)
              .map((participant, index) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    participant.name === studentName ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-blue-400 text-blue-900'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium">{participant.name}</span>
                    {participant.finished && (
                      <span className="text-green-600 text-sm">✓ 完了</span>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <div>{Math.round(participant.progress)}%</div>
                    <div className="text-gray-500">{Math.round(participant.wpm)} WPM</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <StudentPageContent />
    </Suspense>
  )
}
