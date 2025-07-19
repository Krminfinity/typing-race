'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { socketService, Room, Participant } from '@/lib/socket'

function TeacherPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const teacherName = searchParams.get('name') || ''
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [raceStarted, setRaceStarted] = useState(false)
  const [error, setError] = useState('')
  
  // 問題設定用の状態（文章モード削除）
  const [textType, setTextType] = useState<'japanese' | 'english' | 'romaji'>('japanese')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [customText, setCustomText] = useState('')
  const [useCustomText, setUseCustomText] = useState(false)

  useEffect(() => {
    if (!teacherName) {
      router.push('/')
      return
    }

    socketService.connect()

    // Create room
    socketService.createRoom(teacherName, (data) => {
      setRoom(data.room)
    })

    // Listen for participant updates
    socketService.onParticipantUpdate((data) => {
      setParticipants(data.participants)
    })

    // Listen for errors
    socketService.onError((data) => {
      setError(data.message)
    })

    return () => {
      socketService.removeAllListeners()
      socketService.disconnect()
    }
  }, [teacherName, router])

  const handleStartRace = () => {
    if (room && participants.length > 0) {
      console.log('Starting race with options:', { mode: 'word', textType: 'japanese', difficulty, useCustomText, customText: customText.substring(0, 30) + '...' })
      
      const raceOptions: any = {
        mode: 'word', // 常に単語モード
        textType: 'japanese', // 常に日本語に設定
        difficulty,
        customText: useCustomText ? customText.trim() : undefined
      }
      
      console.log('Word mode selected')
      
      socketService.startRace(room.id, raceOptions)
      setRaceStarted(true)
    } else {
      console.log('Cannot start race: room or participants missing', { roomExists: !!room, participantCount: participants.length })
    }
  }

  const handleRestartRace = () => {
    if (room) {
      // レース状態をリセット
      setRaceStarted(false)
      
      // サーバーにリセット指示を送信
      socketService.resetRace(room.id)
      
      console.log('Race reset for room:', room.id)
    }
  }

  const getDefaultText = (type: string, level: string) => {
    const texts = {
      japanese: {
        easy: 'これは簡単な日本語のタイピング練習です。ゆっくりと正確に入力しましょう。',
        medium: '中級者向けの日本語タイピングです。句読点や記号も含まれます。頑張って！',
        hard: '上級者向けの複雑な日本語文章です。「」や！？などの記号、数字123も含まれます。集中して正確に入力してください。'
      }
    }
    
    return texts[type as keyof typeof texts]?.[level as keyof typeof texts.japanese] || texts.japanese.easy
  }

  const handleExportCSV = () => {
    if (!participants.length) {
      alert('エクスポートする参加者データがありません。')
      return
    }

    // CSV データを作成
    const headers = ['名前', 'WPM', '正確率', 'ミス数', '完了単語数', '総入力文字数']
    const csvData = [
      headers.join(','),
      ...participants.map(p => [
        p.name,
        p.stats?.wpm?.toFixed(1) || '0.0',
        p.stats?.accuracy?.toFixed(1) || '0.0',
        p.stats?.mistakes || '0',
        p.stats?.completedWords || '0',
        p.stats?.totalChars || '0'
      ].join(','))
    ].join('\n')

    // BOM付きでダウンロード（Excel対応）
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `タイピング成績_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!teacherName) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎯 教師ダッシュボード
          </h1>
          <p className="text-gray-600 mb-4">
            <span className="font-semibold">教師:</span> {teacherName}
          </p>
          
          {room && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                部屋情報
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {room.pin}
                  </div>
                  <div className="text-sm text-gray-600">部屋PIN</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600">
                    {participants.length}
                  </div>
                  <div className="text-sm text-gray-600">参加者数</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* 参加者リスト */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              参加者一覧
            </h3>
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">👥</div>
                <p className="text-gray-500">参加者を待っています...</p>
                <p className="text-sm text-gray-400 mt-1">
                  生徒にPIN番号を伝えて参加してもらってください
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">
                        {participant.name}
                      </span>
                    </div>
                    
                    {participant.stats && (
                      <div className="flex space-x-4 text-sm">
                        <span className="text-blue-600 font-semibold">
                          {participant.stats.wpm?.toFixed(1) || '0.0'} WPM
                        </span>
                        <span className="text-green-600 font-semibold">
                          {participant.stats.accuracy?.toFixed(1) || '0.0'}%
                        </span>
                        <span className="text-red-600 font-semibold">
                          ミス: {participant.stats.mistakes || 0}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* CSV エクスポートボタン */}
                {raceStarted && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleExportCSV}
                      className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>📊</span>
                      <span>成績をCSVでエクスポート</span>
                    </button>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Excel で開いて成績管理に活用できます
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 問題設定セクション（自動入力制限機能の説明部分を削除） */}
        {!raceStarted && (
          <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              問題設定
            </h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600 font-bold text-xl">🇯🇵</span>
                <h3 className="font-bold text-blue-800">日本語入力のみ</h3>
              </div>
              <p className="text-blue-800 text-sm">
                ローマ字入力で日本語の単語をタイピングします。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  難易度
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">簡単</option>
                  <option value="medium">普通</option>
                  <option value="hard">難しい</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCustomText"
                    checked={useCustomText}
                    onChange={(e) => setUseCustomText(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useCustomText" className="text-sm font-medium text-gray-700">
                    カスタム単語を使用
                  </label>
                </div>
              </div>
            </div>
            
            {useCustomText && (
              <div className="mt-4">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="ここに単語を入力してください（複数の場合はスペースで区切る）..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>
            )}
            
            {!useCustomText && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">プリセット問題:</span> 
                  難易度に応じた日本語単語が自動で選択されます
                </p>
                <div className="text-xs text-gray-500">
                  簡単: ひらがな・カタカナの基本単語 | 
                  普通: 漢字混じりの一般的な単語 | 
                  難しい: 複雑な漢字・記号を含む単語
                </div>
              </div>
            )}
          </div>
        )}

        {/* コントロールパネル */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            レース管理
          </h2>
          
          {!raceStarted ? (
            <button
              onClick={handleStartRace}
              disabled={participants.length === 0}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors ${
                participants.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {participants.length === 0 
                ? '参加者を待っています...' 
                : `レースを開始 (${participants.length}人)`
              }
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 font-bold text-xl">🏁</span>
                  <span className="text-green-800 font-semibold">レース進行中</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  参加者がタイピングを行っています
                </p>
              </div>
              
              <button
                onClick={handleRestartRace}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors"
              >
                🔄 新しいレースを開始
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TeacherPageContent />
    </Suspense>
  )
}
