'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { socketService, Room, Participant } from '@/lib/socket'
import { validateRomajiInputWithPatterns, calculateRomajiProgress, AccurateTypingStats, convertToRomaji, analyzeTypingProgress } from '@/lib/romaji'
import { 
  disableIME, 
  enableIME, 
  detectJapaneseInput, 
  convertToHalfWidth,
  filterKeyboardInput,
  IMEMonitor,
  createUltimateInputRestriction,
  createAutoHalfWidthSwitcher,
  type IMEState
} from '@/lib/ime-control'
import TypingDisplay from '@/components/TypingDisplay'

function StudentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pin = searchParams.get('pin') || ''
  const studentName = searchParams.get('name') || ''
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [raceText, setRaceText] = useState('')
  const [raceMode, setRaceMode] = useState<'sentence' | 'word'>('word') // 常に単語モード
  const [wordList, setWordList] = useState<Array<{ hiragana?: string, word?: string, romaji: string[] }>>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [textType, setTextType] = useState<string>('')
  const [userInput, setUserInput] = useState('')
  const [raceStarted, setRaceStarted] = useState(false)
  const [raceFinished, setRaceFinished] = useState(false)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)

  // 新しいタイピング統計システム
  const [typingStats, setTypingStats] = useState<AccurateTypingStats | null>(null)
  const [lastKeyPressed, setLastKeyPressed] = useState<string>('')
  const [currentAccuracy, setCurrentAccuracy] = useState<number>(100)
  const [currentWPM, setCurrentWPM] = useState<number>(0)
  
  // IME制御用の状態
  const [imeState, setImeState] = useState<IMEState>({ isActive: false, composing: false })
  const [inputRestricted, setInputRestricted] = useState<boolean>(false)
  const [showInputHelp, setShowInputHelp] = useState<boolean>(false)
  const [inputModeDetected, setInputModeDetected] = useState<string>('半角英数')
  const pageRef = useRef<HTMLDivElement>(null)
  const imeMonitorRef = useRef<IMEMonitor | null>(null)
  const ultimateRestrictionCleanupRef = useRef<(() => void) | null>(null)
  const autoSwitcherCleanupRef = useRef<(() => void) | null>(null)

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
          
          if (textType === 'japanese' || (targetText && targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/))) {
            // 日本語の場合、ローマ字検証を使用
            const validation = validateRomajiInputWithPatterns(targetText, userInput)
            if (validation.isComplete) {
              // 現在の単語が完了している場合
              accuracy = 100
            } else if (userInput.length > 0) {
              accuracy = (validation.correctLength / userInput.length) * 100
            }
          } else {
            // 英語やローマ字の場合
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
    }
    
    // Calculate WPM
    const timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
    const wordsTyped = userInput.length / 5 // assuming 5 characters per word
    const wpm = timeElapsed > 0 ? wordsTyped / timeElapsed : 0
    
    return { progress, wpm, accuracy }
  }, [startTime, raceMode, wordList, currentWordIndex, textType, userInput])

  useEffect(() => {
    if (!pin || !studentName) {
      router.push('/')
      return
    }

    socketService.connect()

    // Join room
    socketService.joinRoom(pin, studentName, (data) => {
      setRoom(data.room)
    })

    // Listen for participant updates
    socketService.onParticipantUpdate((data) => {
      setParticipants(data.participants)
    })

    // Listen for race start
    socketService.onRaceStart((data) => {
      setRaceStarted(true)
      setStartTime(Date.now())
      setTextType(data.textType || 'japanese')
      setRaceMode(data.mode || 'word')
      
      // 常に単語モード
      if (data.wordList) {
        console.log('Setting up word mode with', data.wordList.length, 'words')
        setWordList(data.wordList)
        setCurrentWordIndex(0)
        setRaceText('')
      }
    })

    // Listen for race reset
    socketService.onRaceReset(() => {
      console.log('Race reset event received')
      setRaceStarted(false)
      setRaceFinished(false)
      setUserInput('')
      setCurrentWordIndex(0)
      setStartTime(null)
      setTypingStats(null)
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

  // 詳細統計システムの初期化
  useEffect(() => {
    if (raceStarted && startTime) {
      const stats = new AccurateTypingStats(startTime)
      setTypingStats(stats)
    }
  }, [raceStarted, startTime])

  // 統計の更新とサーバーへの送信
  useEffect(() => {
    if (room && raceStarted && startTime) {
      const stats = calculateStats()
      
      // サーバーへの統計送信（詳細統計があれば詳細版、なければ簡易版）
      if (typingStats) {
        socketService.updateDetailedStats(
          room.id, 
          typingStats.getFinalStats(), 
          stats.progress, 
          {},
          []
        )
      } else {
        socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy)
      }
    }
  }, [userInput, room, calculateStats, raceStarted, startTime, raceMode])

  // ページ全体でのキーボード入力を受け取る
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // システムキーやショートカットキーを除外
    if (e.ctrlKey || e.altKey || e.metaKey) return
    if (e.key === 'F5' || e.key === 'F12') return
    if (e.key === 'Tab' || e.key === 'Escape') return
    
    e.preventDefault()
    
    // IME制御機能を併用
    const filtered = filterKeyboardInput(e)
    if (!filtered) {
      return
    }
    
    // 日本語入力を検出して警告
    const japaneseDetection = detectJapaneseInput(e)
    if (japaneseDetection.hasJapanese) {
      console.warn('Japanese input detected and blocked')
      return
    }

    // Backspaceの処理
    if (e.key === 'Backspace') {
      setUserInput(prev => {
        if (prev.length > 0) {
          return prev.slice(0, -1)
        }
        return prev
      })
      return
    }

    // 通常の文字入力の処理
    if (e.key.length === 1) {
      const newChar = e.key
      setUserInput(prev => {
        const newInput = prev + newChar
        // handleInputChangeの処理を直接実行
        setTimeout(() => handleInputChange(newInput), 0)
        return newInput
      })
    }
  }, [raceStarted, raceFinished])

  useEffect(() => {
    if (!raceStarted || raceFinished) return

    // ページ全体にイベントリスナーを追加
    document.addEventListener('keydown', handleKeyDown)
    
    // フォーカスを確実にページに当てる
    if (pageRef.current) {
      pageRef.current.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [raceStarted, raceFinished, handleKeyDown])

  // 究極の入力制限システムの初期化（ページ全体に適用）
  useEffect(() => {
    if (raceStarted && pageRef.current) {
      // IME監視（状態表示用）
      imeMonitorRef.current = new IMEMonitor(document.body, (state: IMEState) => {
        setImeState(state)
        setInputModeDetected(state.isActive ? '日本語入力' : '半角英数')
        
        if (state.isActive) {
          setShowInputHelp(true)
          setTimeout(() => setShowInputHelp(false), 3000)
        }
      })

      // 究極の入力制限（ページ全体）
      const restrictionCleanup = createUltimateInputRestriction(document.body, {
        enableImeBlocking: true,
        enableKeyFiltering: true,
        enableCompositionBlocking: true,
        showWarnings: false
      })
      ultimateRestrictionCleanupRef.current = restrictionCleanup

      // 自動半角切り替え（ページ全体）
      const switcherCleanup = createAutoHalfWidthSwitcher(document.body, {
        enableAutoSwitch: true,
        enableClickFocus: true,
        enableKeyboardFocus: true
      })
      autoSwitcherCleanupRef.current = switcherCleanup
      
      setInputRestricted(true)
    }

    return () => {
      if (imeMonitorRef.current) {
        imeMonitorRef.current.destroy()
        imeMonitorRef.current = null
      }
      if (ultimateRestrictionCleanupRef.current) {
        ultimateRestrictionCleanupRef.current()
        ultimateRestrictionCleanupRef.current = null
      }
      if (autoSwitcherCleanupRef.current) {
        autoSwitcherCleanupRef.current()
        autoSwitcherCleanupRef.current = null
      }
      setInputRestricted(false)
    }
  }, [raceStarted])

  const handleInputChange = useCallback((newInput: string) => {
    if (!raceStarted || raceFinished) return
    
    setLastKeyPressed(newInput[newInput.length - 1] || '')
    
    // 入力を更新
    setUserInput(newInput)
    
    if (raceMode === 'word') {
      // 単語モード処理
      if (currentWordIndex >= wordList.length) return
      
      const currentWord = wordList[currentWordIndex]
      const targetText = currentWord.hiragana || currentWord.word || ''
      
      if (textType === 'japanese' || (targetText && targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/))) {
        // 日本語単語の場合、ローマ字検証を使用
        const validation = validateRomajiInputWithPatterns(targetText, newInput)
        
        // 詳細統計の更新
        if (typingStats && room) {
          const stats = typingStats.updateWithKeyInput(targetText, newInput, lastKeyPressed)
          setCurrentAccuracy(stats.accuracy)
          setCurrentWPM(stats.wpm)
          
          const romajiExpected = convertToRomaji(targetText)
          const progress = targetText.length > 0 ? (validation.correctLength / romajiExpected.length) * 100 : 0
          
          socketService.updateDetailedStats(room.id, {
            totalKeystrokes: stats.totalKeystrokes,
            errorCount: stats.errorCount,
            correctKeystrokes: stats.correctKeystrokes,
            accuracy: stats.accuracy,
            wpm: stats.wpm,
            finished: validation.isComplete
          }, Math.min(progress, 100))
        }
        
        // 単語完了判定の改善 - より柔軟な判定
        if (validation.isComplete) {
          // 完了時の処理
          handleWordComplete()
        }
      } else {
        // 英語やローマ字単語の場合
        if (typingStats) {
          const stats = typingStats.updateWithKeyInput(targetText, newInput, lastKeyPressed)
          setCurrentAccuracy(stats.accuracy)
          setCurrentWPM(stats.wpm)
        }
        
        // 単語完了チェック
        if (newInput === targetText) {
          handleWordComplete()
        }
      }
    }
  }, [raceStarted, raceFinished, raceMode, currentWordIndex, wordList, textType, typingStats, room, lastKeyPressed])

  // 単語完了処理を分離
  const handleWordComplete = useCallback(() => {
    const nextIndex = currentWordIndex + 1
    setCurrentWordIndex(nextIndex)
    setUserInput('')
    
    if (nextIndex >= wordList.length && !raceFinished) {
      setRaceFinished(true)
    }
  }, [currentWordIndex, wordList.length, raceFinished])

  const handleBackToHome = () => {
    router.push('/')
  }

  // Calculate current statistics
  const currentStats = calculateStats()
  const userRank = participants
    .filter(p => p.progress > 0 || p.finished)
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
          <p className="text-gray-600">部屋に接続しています...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={pageRef}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 focus:outline-none"
      tabIndex={0}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              🏃‍♂️ タイピング競争
            </h1>
            <button
              onClick={handleBackToHome}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h2 className="text-xl font-semibold text-blue-800 mb-2">
                  参加者: {studentName}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentStats.progress.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">進捗</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-green-600">
                      {currentStats.wpm.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">WPM</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentStats.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">正確率</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-orange-600">
                      {userRank > 0 ? userRank : '-'}
                    </div>
                    <div className="text-sm text-gray-600">順位</div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {!raceStarted && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    レース開始を待っています
                  </h3>
                  <p className="text-gray-600">
                    先生がレースを開始するまでお待ちください
                  </p>
                </div>
              )}

              {raceStarted && !raceFinished && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700 mb-2">
                      単語 {currentWordIndex + 1} / {wordList.length}
                    </div>
                    
                    {/* 入力制限が有効な場合の表示 */}
                    {inputRestricted && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-green-600 font-bold">🔒</span>
                          <span className="text-green-800 font-semibold">自動入力制限: 有効</span>
                          <span className="text-green-600 font-bold">🔒</span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">
                          半角英数字のみ入力可能です
                        </p>
                      </div>
                    )}

                    {/* 一時的なヘルプ表示 */}
                    {showInputHelp && (
                      <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">🔄 入力モード自動調整</h4>
                        <div className="text-sm text-orange-700 space-y-1">
                          <p>• このゲームは半角英数字（ローマ字）での入力が必要です</p>
                          <p>• システムが自動的に半角英数字入力に制限しています</p>
                          <p>• そのままキーボードで入力を続けてください</p>
                        </div>
                      </div>
                    )}
                  </div>
              
                  {/* 寿司打スタイルのタイピング表示 */}
                  {raceMode === 'word' && currentWordIndex < wordList.length && (
                    <TypingDisplay
                      japaneseText={wordList[currentWordIndex].hiragana || wordList[currentWordIndex].word || ''}
                      userInput={userInput}
                      isActive={raceStarted && !raceFinished}
                      onComplete={handleWordComplete}
                    />
                  )}
                </div>
              )}

              {/* 詳細統計表示 */}
              {(raceMode === 'word' && currentWordIndex >= wordList.length) && (
                <div className="text-center p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-300">
                  <h3 className="text-3xl font-bold text-green-800 mb-4">🏆 全単語完了！</h3>
                  <p className="text-xl text-green-600 mb-2">お疲れ様でした！</p>
                  
                  {typingStats && (
                    <div className="mt-6 p-4 bg-white rounded-lg shadow-inner">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">📊 最終成績</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{typingStats.getFinalStats().finalWPM.toFixed(1)}</div>
                          <div className="text-sm text-gray-600">最終WPM</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{typingStats.getFinalStats().finalAccuracy.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">最終正確率</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{typingStats.getFinalStats().finalErrorCount}</div>
                          <div className="text-sm text-gray-600">総ミス数</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">{typingStats.getFinalStats().totalKeystrokes}</div>
                          <div className="text-sm text-gray-600">総キー数</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mini leaderboard */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                📊 リアルタイム順位
              </h3>
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  他の参加者を待っています...
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
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
                    .map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`p-2 rounded-lg shadow-sm ${
                          participant.name === studentName 
                            ? 'bg-blue-100 border-2 border-blue-300' 
                            : 'bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-gray-600">
                              #{index + 1}
                            </span>
                            <span className={`font-medium ${
                              participant.name === studentName 
                                ? 'text-blue-800' 
                                : 'text-gray-800'
                            }`}>
                              {participant.name}
                              {participant.name === studentName && ' (あなた)'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-700">
                              {participant.progress.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {participant.wpm.toFixed(1)} WPM
                            </div>
                          </div>
                        </div>
                        {participant.finished && (
                          <div className="text-xs text-green-600 font-semibold mt-1">
                            ✅ 完了
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-600">ページを読み込んでいます...</p>
      </div>
    </div>}>
      <StudentPageContent />
    </Suspense>
  )
}
