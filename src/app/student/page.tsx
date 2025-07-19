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
  }, [userInput, raceText, raceMode, wordList, currentWordIndex, startTime, textType])

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
      console.log('Race started event received:', data)
      setRaceMode('word') // 常に単語モード
      setTextType(data.textType || '')
      setRaceStarted(true)
      setRaceFinished(false)
      setStartTime(data.startTime)
      setUserInput('')
      setCurrentWordIndex(0)
      
      // 新しいタイピング統計を初期化
      setTypingStats(new AccurateTypingStats())
      setCurrentAccuracy(100)
      setCurrentWPM(0)
      
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
      setRaceText('')
      setWordList([])
      setStartTime(null)
      setTypingStats(null)
      setCurrentAccuracy(100)
      setCurrentWPM(0)
      setError('')
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
        setInputRestricted(state.isActive || state.composing)
        
        // 入力モードを検出して表示
        if (state.isActive) {
          setInputModeDetected('日本語入力')
          setShowInputHelp(true)
        } else {
          setInputModeDetected('半角英数')
          setShowInputHelp(false)
        }
      })
      
      // 入力制限が有効であることを表示
      setInputRestricted(true)
      
      return () => {
        if (imeMonitorRef.current) {
          imeMonitorRef.current.destroy()
        }
        setInputRestricted(false)
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
          {},
          []
        )
      } else {
        socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy)
      }
    }
  }, [userInput, room, calculateStats, raceStarted, startTime, raceMode])

  const handleInputChange = useCallback((newInput: string) => {
    if (!raceStarted || raceFinished) return
    
    setLastKeyPressed(newInput[newInput.length - 1] || '')
    
    // 常に入力を受け入れる（ミスも含めて表示するため）
    setUserInput(newInput)
    
    if (raceMode === 'word') {
      // 単語モード処理
      if (currentWordIndex >= wordList.length) return
      
      const currentWord = wordList[currentWordIndex]
      const targetText = currentWord.hiragana || currentWord.word || ''
      
      if (textType === 'japanese' || (targetText && targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/))) {
        // 日本語単語の場合、ローマ字検証を使用
        const validation = validateRomajiInputWithPatterns(targetText, newInput)
        
        // 詳細統計の更新（ミスも含めて）
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
        
        // 単語完了チェック（正確に入力された場合のみ）
        if (validation.isComplete) {
          const nextIndex = currentWordIndex + 1
          setCurrentWordIndex(nextIndex)
          setUserInput('')
          
          if (nextIndex >= wordList.length && !raceFinished) {
            setRaceFinished(true)
          }
        }
      } else {
        // 英語やローマ字単語の場合
        // 詳細統計の更新
        if (typingStats) {
          const stats = typingStats.updateWithKeyInput(targetText, newInput, lastKeyPressed)
          setCurrentAccuracy(stats.accuracy)
          setCurrentWPM(stats.wpm)
        }
        
        // 単語完了チェック（正確に入力された場合のみ）
        if (newInput === targetText) {
          const nextIndex = currentWordIndex + 1
          setCurrentWordIndex(nextIndex)
          setUserInput('')
          
          if (nextIndex >= wordList.length && !raceFinished) {
            setRaceFinished(true)
          }
        }
      }
    }
  }, [raceStarted, raceFinished, raceMode, currentWordIndex, wordList, textType, typingStats, room, lastKeyPressed])

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
          <p className="text-gray-600">ルームに参加中...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={pageRef}
      tabIndex={0}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4 focus:outline-none"
      style={{ userSelect: 'none' }}
    >
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
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">進捗状況</h3>
              <div className="text-sm text-gray-600">
                {Math.round(currentStats.progress)}% 完了
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
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xl p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                競争開始を待っています...
              </h2>
              <p className="text-gray-600 mb-6">
                先生が競争を開始するまでお待ちください
              </p>
              <div className="text-sm text-gray-500 mb-6">
                <p>ルームPIN: <span className="font-bold">{room.id}</span></p>
                <p>参加者: {participants.length}人</p>
              </div>
            </div>
            
            {/* 入力設定の事前説明 */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-blue-600 font-bold text-xl">⌨️</span>
                <h3 className="text-lg font-bold text-blue-800">入力方法について</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="font-bold text-gray-800 mb-2">📌 重要：キーボードでそのまま入力してください</p>
                  <div className="space-y-2 text-gray-700">
                    <p>• 競争が始まったら、<strong className="text-blue-600">画面に向かってキーボードで直接入力</strong>してください</p>
                    <p>• 入力欄をクリックする必要はありません</p>
                    <p>• <strong className="text-green-600">半角英数字（ローマ字）</strong>で入力してください</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-300">
                  <p className="font-bold text-orange-800 mb-2">💡 入力例</p>
                  <div className="space-y-1 text-gray-700">
                    <p>日本語「こんにちは」 → キーボードで「<span className="font-mono bg-gray-100 px-1 rounded">konnichiwa</span>」と入力</p>
                    <p>日本語「ありがとう」 → キーボードで「<span className="font-mono bg-gray-100 px-1 rounded">arigatou</span>」と入力</p>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-300">
                  <p className="font-bold text-green-800 mb-2">🔧 便利機能</p>
                  <div className="space-y-1 text-gray-700">
                    <p>• 間違えた場合は<strong>Backspace</strong>キーで削除できます</p>
                    <p>• システムが自動的に正しい入力に制限します</p>
                    <p>• 日本語入力モードでも自動的に英数字に変換されます</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* タイトル */}
            <div className="bg-white rounded-xl shadow-xl p-4 text-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {raceFinished ? '🎉 完了！お疲れ様でした！' : '⚡ タイピング中...'}
              </h2>
              {raceMode === 'word' && (
                <div className="text-sm text-gray-600 mt-1">
                  単語 {currentWordIndex + 1} / {wordList.length}
                </div>
              )}
            </div>
              
            {/* 寿司打スタイルのタイピング表示 */}
            {raceMode === 'word' && currentWordIndex < wordList.length && (
              <TypingDisplay
                japaneseText={wordList[currentWordIndex].hiragana || wordList[currentWordIndex].word || ''}
                userInput={userInput}
                isActive={raceStarted && !raceFinished}
              />
            )}
            
            {/* 詳細統計表示 */}
            {(raceMode === 'word' && currentWordIndex >= wordList.length) && (
              <div className="text-center p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-300">
                <h3 className="text-3xl font-bold text-green-800 mb-4">🏆 全単語完了！</h3>
                <p className="text-xl text-green-600 mb-2">お疲れ様でした！</p>
                <div className="text-lg text-gray-600">
                  最終スコアは順位表をご確認ください
                </div>
              </div>
            )}

            {/* 入力制限状態の表示 */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 font-bold text-lg">⌨️</span>
                  <span className="font-bold text-blue-800">入力モード: {inputModeDetected}</span>
                </div>
                {inputRestricted && (
                  <div className="flex items-center space-x-1">
                    <span className="text-green-600 font-bold text-sm">✅</span>
                    <span className="text-green-700 text-sm font-medium">制限有効</span>
                  </div>
                )}
              </div>
              
              {showInputHelp && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-orange-600 font-bold">⚠️</span>
                    <span className="font-bold text-orange-800">日本語入力が検出されました</span>
                  </div>
                  <div className="text-orange-700 text-sm space-y-1">
                    <p>• このゲームは半角英数字（ローマ字）での入力が必要です</p>
                    <p>• システムが自動的に半角英数字入力に制限しています</p>
                    <p>• そのままキーボードで入力を続けてください</p>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>💡 操作方法:</strong> キーボードで直接入力、Backspaceで削除</p>
                <p><strong>🔤 入力方法:</strong> 日本語をローマ字で入力（例: こんにちは → konnichiwa）</p>
                {imeState.isActive && (
                  <p className="text-orange-600 font-medium">
                    <strong>🔄 自動制御:</strong> IME（日本語入力）が検出されましたが、システムが英数字入力に制限しています
                  </p>
                )}
              </div>
            </div>
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
