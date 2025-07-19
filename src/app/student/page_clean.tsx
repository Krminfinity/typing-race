'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { socketService, Room, Participant } from '@/lib/socket'
import { validateRomajiInputWithPatterns, convertToRomaji } from '@/lib/romaji'
import TypingDisplay from '@/components/TypingDisplay'

function StudentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pin = searchParams.get('pin') || ''
  const studentName = searchParams.get('name') || ''
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [wordList, setWordList] = useState<Array<{ hiragana?: string, word?: string, romaji: string[] }>>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [raceStarted, setRaceStarted] = useState(false)
  const [raceFinished, setRaceFinished] = useState(false)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)

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
    socketService.onRaceStarted((data) => {
      setRaceStarted(true)
      setStartTime(Date.now())
      
      // 常に単語モード
      if (data.wordList) {
        console.log('Setting up word mode with', data.wordList.length, 'words')
        setWordList(data.wordList)
        setCurrentWordIndex(0)
        setRaceFinished(false)
        setUserInput('')
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

  // 統計計算
  const calculateStats = useCallback(() => {
    if (!startTime) return { progress: 0, wpm: 0, accuracy: 100 }
    
    let progress = 0
    let accuracy = 100
    
    if (wordList.length > 0) {
      progress = (currentWordIndex / wordList.length) * 100
      
      // 現在の単語の正確性を計算
      if (currentWordIndex < wordList.length) {
        const currentWord = wordList[currentWordIndex]
        const targetText = currentWord.hiragana || currentWord.word || ''
        
        if (targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
          // 日本語の場合、ローマ字検証を使用
          const validation = validateRomajiInputWithPatterns(targetText, userInput)
          if (userInput.length > 0) {
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
    
    // Calculate WPM
    const timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
    const wordsTyped = userInput.length / 5 // assuming 5 characters per word
    const wpm = timeElapsed > 0 ? wordsTyped / timeElapsed : 0
    
    return { progress, wpm, accuracy }
  }, [startTime, wordList, currentWordIndex, userInput])

  // 統計の更新とサーバーへの送信
  useEffect(() => {
    if (room && raceStarted && startTime) {
      const stats = calculateStats()
      socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy)
    }
  }, [userInput, room, calculateStats, raceStarted, startTime])

  // シンプルなキーボード入力処理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!raceStarted || raceFinished) return
    
    // システムキーやショートカットキーを除外
    if (e.ctrlKey || e.altKey || e.metaKey) return
    if (e.key === 'F5' || e.key === 'F12') return
    if (e.key === 'Tab' || e.key === 'Escape') return
    
    e.preventDefault()
    
    // Backspaceの処理
    if (e.key === 'Backspace') {
      setUserInput(prev => prev.slice(0, -1))
      return
    }

    // 通常の文字入力の処理（半角英数字のみ）
    if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
      setUserInput(prev => {
        const newInput = prev + e.key
        
        // 単語完了チェック
        if (currentWordIndex < wordList.length) {
          const currentWord = wordList[currentWordIndex]
          const targetText = currentWord.hiragana || currentWord.word || ''
          
          if (targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
            // 日本語の場合、ローマ字検証
            const validation = validateRomajiInputWithPatterns(targetText, newInput)
            if (validation.isComplete) {
              // 単語完了
              setTimeout(() => {
                const nextIndex = currentWordIndex + 1
                setCurrentWordIndex(nextIndex)
                setUserInput('')
                
                if (nextIndex >= wordList.length) {
                  setRaceFinished(true)
                }
              }, 100)
            }
          } else {
            // 英語の場合、完全一致
            if (newInput === targetText) {
              setTimeout(() => {
                const nextIndex = currentWordIndex + 1
                setCurrentWordIndex(nextIndex)
                setUserInput('')
                
                if (nextIndex >= wordList.length) {
                  setRaceFinished(true)
                }
              }, 100)
            }
          }
        }
        
        return newInput
      })
    }
  }, [raceStarted, raceFinished, currentWordIndex, wordList])

  useEffect(() => {
    if (!raceStarted || raceFinished) return

    // ページ全体にイベントリスナーを追加
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [raceStarted, raceFinished, handleKeyDown])

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 focus:outline-none" tabIndex={0}>
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

              {raceStarted && !raceFinished && currentWordIndex < wordList.length && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700 mb-2">
                      単語 {currentWordIndex + 1} / {wordList.length}
                    </div>
                    
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-700 text-sm">
                        💡 キーボードの半角英数字（ローマ字）で入力してください
                      </p>
                    </div>
                  </div>
              
                  {/* シンプルなタイピング表示 */}
                  <TypingDisplay
                    japaneseText={wordList[currentWordIndex].hiragana || wordList[currentWordIndex].word || ''}
                    userInput={userInput}
                    isActive={raceStarted && !raceFinished}
                  />
                </div>
              )}

              {raceFinished && (
                <div className="text-center p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-300">
                  <h3 className="text-3xl font-bold text-green-800 mb-4">🏆 全単語完了！</h3>
                  <p className="text-xl text-green-600 mb-2">お疲れ様でした！</p>
                  
                  <div className="mt-6 p-4 bg-white rounded-lg shadow-inner">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">📊 最終成績</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{currentStats.wpm.toFixed(1)}</div>
                        <div className="text-sm text-gray-600">WPM</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{currentStats.accuracy.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600">正確率</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{wordList.length}</div>
                        <div className="text-sm text-gray-600">完了単語数</div>
                      </div>
                    </div>
                  </div>
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
