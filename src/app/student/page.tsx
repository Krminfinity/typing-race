'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { socketService, Room, Participant } from '@/lib/socket'
import { validateRomajiInput, calculateRomajiProgress, convertToRomajiPatterns } from '@/lib/romaji'

function StudentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pin = searchParams.get('pin') || ''
  const studentName = searchParams.get('name') || ''
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [raceText, setRaceText] = useState('')
  const [textType, setTextType] = useState<string>('')
  const [userInput, setUserInput] = useState('')
  const [raceStarted, setRaceStarted] = useState(false)
  const [raceFinished, setRaceFinished] = useState(false)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)

  // Calculate typing statistics with romaji support
  const calculateStats = useCallback(() => {
    if (!raceText || !startTime) return { progress: 0, wpm: 0, accuracy: 100 }
    
    let progress = 0
    let accuracy = 100
    
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
    
    // Calculate WPM
    const timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
    const wordsTyped = userInput.length / 5 // assuming 5 characters per word
    const wpm = timeElapsed > 0 ? wordsTyped / timeElapsed : 0
    
    return { progress, wpm, accuracy }
  }, [userInput, raceText, startTime, textType])

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
      setRaceText(data.text)
      setTextType(data.textType || '')
      setRaceStarted(true)
      setStartTime(data.startTime)
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

  // Update progress when input changes
  useEffect(() => {
    if (raceStarted && startTime && room) {
      const stats = calculateStats()
      
      // Send progress update
      socketService.updateProgress(room.id, stats.progress, stats.wpm, stats.accuracy)
      
      // Check if finished
      if (stats.progress >= 100 && !raceFinished) {
        setRaceFinished(true)
      }
    }
  }, [userInput, raceStarted, startTime, room, calculateStats, raceFinished])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!raceStarted || raceFinished) return
    
    const value = e.target.value
    
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 通常の入力処理を許可
    // IME使用時の日本語入力にも対応
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
              <span className="text-sm text-gray-600">
                正確性: {Math.round(currentStats.accuracy)}%
              </span>
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
                
                {/* ローマ字入力表示 */}
                {(textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText))) && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-600">現在の入力: <span className="font-bold">{userInput}</span></div>
                  </div>
                )}
              </div>
              
              <textarea
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={!raceStarted || raceFinished}
                placeholder={
                  textType === 'japanese' || (!textType && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(raceText))
                    ? "ローマ字で入力してください (例: konnichiwa)..."
                    : "ここに入力してください..."
                }
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-lg disabled:bg-gray-100"
              />
            </div>
            
            {raceFinished && (
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  🎉 完了しました！
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
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
                </div>
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
