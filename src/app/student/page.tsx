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
  const [finishTime, setFinishTime] = useState<number | null>(null)
  
  // 詳細統計を追跡
  const [totalKeystrokes, setTotalKeystrokes] = useState(0)
  const [totalMistakes, setTotalMistakes] = useState(0)
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0)
  const [completedWords, setCompletedWords] = useState(0)

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
        console.log('WordList received:', data.wordList.map((w, i) => `${i + 1}: ${w.hiragana || w.word}`))
        setWordList(data.wordList)
        setCurrentWordIndex(0)
        setRaceFinished(false)
        setUserInput('')
        
        // レース開始時に即座にフォーカスを設定
        setTimeout(() => {
          document.body.focus()
          console.log('Race started - body focused automatically')
        }, 100)
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
      setFinishTime(null)
      
      // 統計をリセット
      setTotalKeystrokes(0)
      setTotalMistakes(0)
      setCorrectKeystrokes(0)
      setCompletedWords(0)
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
    if (!startTime) return { progress: 0, wpm: 0, accuracy: 100, mistakes: 0, totalChars: 0, completedWords: 0 }
    
    let progress = 0
    let accuracy = 100
    
    if (wordList.length > 0) {
      progress = (currentWordIndex / wordList.length) * 100
      
      // デバッグ: 進捗計算の詳細をログ出力
      console.log('Progress calculation debug:', {
        completedWords,
        wordListLength: wordList.length,
        currentWordIndex,
        progress,
        calculatedProgress: (currentWordIndex / wordList.length) * 100
      })
      
      // 正確率を計算：正解キーストローク数 / 総キーストローク数 * 100
      if (totalKeystrokes > 0) {
        accuracy = (correctKeystrokes / totalKeystrokes) * 100
        // 正確率は100%を超えないように制限
        accuracy = Math.min(accuracy, 100)
      }
    }
    
    // Calculate WPM based on completed words and time elapsed
    let timeElapsed = 0
    let wpm = 0
    
    if (startTime) {
      if (raceFinished && finishTime) {
        // レース完了時は完了時刻を使用
        timeElapsed = (finishTime - startTime) / 1000 / 60 // minutes
      } else {
        // レース継続中は現在時刻を使用
        timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
      }
      
      if (timeElapsed > 0) {
        wpm = completedWords / timeElapsed
      }
    }

    return { 
      progress, 
      wpm, 
      accuracy, 
      mistakes: totalMistakes,
      totalChars: totalKeystrokes,
      completedWords
    }
  }, [startTime, wordList, currentWordIndex, totalKeystrokes, correctKeystrokes, totalMistakes, completedWords])

  // 統計の更新とサーバーへの送信（完了した単語のみ、または定期的に）
  useEffect(() => {
    if (room && raceStarted && startTime) {
      const stats = calculateStats()
      
      // デバッグ: 統計データをコンソールに出力
      console.log('Student stats calculation:', {
        stats,
        totalKeystrokes,
        correctKeystrokes,
        totalMistakes,
        userInput,
        currentWordIndex,
        timeElapsed: startTime ? (Date.now() - startTime) / 1000 / 60 : 0
      })
      
      // 統計が有効な値を持つ場合のみ送信
      if (stats.wpm >= 0 && stats.accuracy >= 0) {
        // 詳細な統計データも含めて送信
        socketService.updateDetailedStats(room.id, {
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errorCount: stats.mistakes,
          totalKeystrokes: totalKeystrokes,
          correctKeystrokes: correctKeystrokes,
          completedWords: stats.completedWords
        }, stats.progress)
        
        // 従来の進捗更新も維持
        socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy, currentWordIndex)
      }
    }
  }, [completedWords, room, calculateStats, raceStarted, startTime, currentWordIndex, totalKeystrokes, correctKeystrokes]) // completedWordsの変更時に送信

  // 定期的な統計更新（2秒ごと）
  useEffect(() => {
    if (!room || !raceStarted || !startTime) return

    const interval = setInterval(() => {
      const stats = calculateStats()
      
      if (stats.wpm >= 0 && stats.accuracy >= 0) {
        socketService.updateDetailedStats(room.id, {
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errorCount: stats.mistakes,
          totalKeystrokes: totalKeystrokes,
          correctKeystrokes: correctKeystrokes,
          completedWords: stats.completedWords
        }, stats.progress)
        
        socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy, currentWordIndex)
      }
    }, 2000) // 2秒ごと

    return () => clearInterval(interval)
  }, [room, raceStarted, startTime, calculateStats, totalKeystrokes, correctKeystrokes, currentWordIndex])

  // レース完了時に最終統計を送信
  useEffect(() => {
    if (raceFinished && startTime && room) {
      const finalStats = calculateStats()
      const timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
      
      // 詳細な最終統計を送信
      socketService.finishRace(room.id, {
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        mistakes: finalStats.mistakes,
        totalChars: finalStats.totalChars,
        completedWords: finalStats.completedWords,
        timeElapsed: timeElapsed,
        finishTime: Date.now()
      })
      
      console.log('Final stats sent:', finalStats)
    }
  }, [raceFinished, startTime, room, calculateStats])

  // シンプルなキーボード入力処理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!raceStarted || raceFinished) return
    
    // システムキーやショートカットキーを除外（Vimモード対策でより厳格に）
    if (e.ctrlKey || e.altKey || e.metaKey) return
    if (e.key === 'F5' || e.key === 'F12') return
    if (e.key === 'Tab' || e.key === 'Escape') return
    
    // Vimライクなモードコマンドを無効化
    if (e.key === 'i' || e.key === 'I' || e.key === 'a' || e.key === 'A' || e.key === 'o' || e.key === 'O') {
      // 通常の文字として処理するため、preventDefault()を呼ぶ
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    // Backspaceの処理
    if (e.key === 'Backspace') {
      setUserInput(prev => {
        if (prev.length > 0) {
          // バックスペースはキーストロークには含めない
          return prev.slice(0, -1)
        }
        return prev
      })
      return
    }

    // 通常の文字入力の処理（ローマ字入力に必要な文字をすべて許可）
    if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9\-',.!?;: ]/)) {
      setUserInput(prev => {
        const newInput = prev + e.key
        
        // キーストローク数をカウント（文字が実際に追加された時のみ）
        setTotalKeystrokes(prevTotal => prevTotal + 1)
        
        // 単語完了チェック
        if (currentWordIndex < wordList.length) {
          const currentWord = wordList[currentWordIndex]
          const targetText = currentWord.hiragana || currentWord.word || ''
          
          if (targetText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
            // 日本語の場合、ローマ字検証
            const validation = validateRomajiInputWithPatterns(targetText, newInput)
            
            // 現在の文字が正しいかチェック
            const currentCharCorrect = validation.correctLength >= newInput.length
            
            if (currentCharCorrect) {
              // この文字が正しい場合のみ正解数に加算
              setCorrectKeystrokes(prevCorrect => prevCorrect + 1)
            } else {
              // この文字が間違っている場合はミス数に加算
              setTotalMistakes(prevMistakes => prevMistakes + 1)
            }
            
            if (validation.isComplete) {
              // 単語完了
              setCompletedWords(prev => prev + 1)
              setTimeout(() => {
                const nextIndex = currentWordIndex + 1
                setCurrentWordIndex(nextIndex)
                setUserInput('')
                
                console.log('Word completion check (Japanese):', {
                  nextIndex,
                  wordListLength: wordList.length,
                  completedWords: completedWords + 1,
                  currentWordIndex
                })
                
                if (nextIndex >= wordList.length) {
                  console.log('Race completion triggered (Japanese)!')
                  setRaceFinished(true)
                  setFinishTime(Date.now())
                }
              }, 100)
            }
          } else {
            // 英語の場合、完全一致
            const isCorrectChar = newInput.length <= targetText.length && 
                                 newInput[newInput.length - 1] === targetText[newInput.length - 1]
            
            if (isCorrectChar) {
              setCorrectKeystrokes(prevCorrect => prevCorrect + 1)
            } else {
              setTotalMistakes(prevMistakes => prevMistakes + 1)
            }
            
            if (newInput === targetText) {
              setCompletedWords(prev => prev + 1)
              setTimeout(() => {
                const nextIndex = currentWordIndex + 1
                setCurrentWordIndex(nextIndex)
                setUserInput('')
                
                console.log('Word completion check (English):', {
                  nextIndex,
                  wordListLength: wordList.length,
                  completedWords: completedWords + 1,
                  currentWordIndex
                })
                
                if (nextIndex >= wordList.length) {
                  console.log('Race completion triggered (English)!')
                  setRaceFinished(true)
                  setFinishTime(Date.now())
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

    // bodyにtabIndexを設定してフォーカス可能にする
    document.body.tabIndex = -1
    document.body.style.outline = 'none'
    
    // Vimモード対策のためのスタイル設定
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    // keydownイベントをcaptureフェーズで追加（より早い段階でキャッチ）
    document.addEventListener('keydown', handleKeyDown, true)
    
    // フォーカスを確実にページに当てる
    const focusPage = () => {
      // bodyにフォーカスを移動
      document.body.focus()
      console.log('Body focused, activeElement:', document.activeElement?.tagName)
    }
    
    // 即座にフォーカス（複数回試行）
    focusPage()
    setTimeout(focusPage, 50)
    setTimeout(focusPage, 100)
    setTimeout(focusPage, 200)
    
    // 定期的にフォーカスを確認（何かの要素にフォーカスが移動した場合に備えて）
    const focusInterval = setInterval(() => {
      if (document.activeElement !== document.body) {
        focusPage()
      }
    }, 500) // より頻繁にチェック
    
    // クリック時にもフォーカスを戻す
    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      setTimeout(focusPage, 0)
    }
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      focusPage()
    }
    
    document.addEventListener('click', handleClick, true)
    document.addEventListener('mousedown', handleMouseDown, true)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('mousedown', handleMouseDown, true)
      clearInterval(focusInterval)
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
    <div 
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 focus:outline-none" 
      tabIndex={0}
      style={{ 
        outline: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onFocus={() => console.log('Page focused')}
      onClick={() => {
        // クリック時にフォーカスを確実にする
        if (raceStarted && !raceFinished) {
          document.body.focus()
        }
      }}
      onKeyDown={(e) => {
        // divレベルでもVimモードコマンドを無効化
        if (raceStarted && !raceFinished) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
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

              {raceStarted && !raceFinished && currentWordIndex < wordList.length && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700 mb-4">
                      単語 {currentWordIndex + 1} / {wordList.length}
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
