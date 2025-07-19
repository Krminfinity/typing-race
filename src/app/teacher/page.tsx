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
  
  // 全体成績統計の計算
  const calculateOverallStats = () => {
    if (participants.length === 0) return null
    
    const totalParticipants = participants.length
    const finishedParticipants = participants.filter(p => p.finished).length
    const averageWpm = participants.reduce((sum, p) => sum + (p.stats?.wpm || 0), 0) / totalParticipants
    const averageAccuracy = participants.reduce((sum, p) => sum + (p.stats?.accuracy || 0), 0) / totalParticipants
    const totalMistakes = participants.reduce((sum, p) => sum + (p.stats?.mistakes || 0), 0)
    const totalCompletedWords = participants.reduce((sum, p) => sum + (p.stats?.completedWords || 0), 0)
    const totalChars = participants.reduce((sum, p) => sum + (p.stats?.totalChars || 0), 0)
    
    const topWpm = Math.max(...participants.map(p => p.stats?.wpm || 0))
    const topAccuracy = Math.max(...participants.map(p => p.stats?.accuracy || 0))
    
    return {
      totalParticipants,
      finishedParticipants,
      averageWpm,
      averageAccuracy,
      totalMistakes,
      totalCompletedWords,
      totalChars,
      topWpm,
      topAccuracy,
      completionRate: (finishedParticipants / totalParticipants) * 100
    }
  }
  
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

  const handleExportCSV = () => {
    if (!participants.length) {
      alert('エクスポートする参加者データがありません。')
      return
    }

    const overallStats = calculateOverallStats()

    // CSV データを作成
    const headers = ['名前', 'WPM', '正確率(%)', 'ミス数', '完了単語数', '総入力文字数', '完了状況', '順位']
    const csvData = [
      headers.join(','),
      // 個別成績
      ...participants
        .sort((a, b) => {
          if (a.finished && b.finished) {
            return (a.finishTime || 0) - (b.finishTime || 0)
          }
          if (a.finished) return -1
          if (b.finished) return 1
          return (b.progress || 0) - (a.progress || 0)
        })
        .map((p, index) => [
          p.name,
          p.stats?.wpm?.toFixed(1) || '0.0',
          p.stats?.accuracy?.toFixed(1) || '0.0',
          p.stats?.mistakes || '0',
          p.stats?.completedWords || '0',
          p.stats?.totalChars || '0',
          p.finished ? '完了' : '未完了',
          index + 1
        ].join(',')),
      '', // 空行
      '=== 全体統計 ===',
      `総参加者数,${overallStats?.totalParticipants || 0}`,
      `完了者数,${overallStats?.finishedParticipants || 0}`,
      `完了率(%),${overallStats?.completionRate?.toFixed(1) || '0.0'}`,
      `平均WPM,${overallStats?.averageWpm?.toFixed(1) || '0.0'}`,
      `平均正確率(%),${overallStats?.averageAccuracy?.toFixed(1) || '0.0'}`,
      `最高WPM,${overallStats?.topWpm?.toFixed(1) || '0.0'}`,
      `最高正確率(%),${overallStats?.topAccuracy?.toFixed(1) || '0.0'}`,
      `総ミス数,${overallStats?.totalMistakes || 0}`,
      `総完了単語数,${overallStats?.totalCompletedWords || 0}`,
      `総入力文字数,${overallStats?.totalChars || 0}`
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
              参加者一覧 {raceStarted && <span className="text-sm text-blue-600">(リアルタイム成績)</span>}
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
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      {raceStarted && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          順位
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        名前
                      </th>
                      {raceStarted && (
                        <>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            進捗率
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            WPM
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            正確率
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            ミス数
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            完了単語数
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            総文字数
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            状態
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            進捗バー
                          </th>
                        </>
                      )}
                      {!raceStarted && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          状態
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {participants
                      .sort((a, b) => {
                        // レース中は成績でソート、レース前は参加順
                        if (!raceStarted) return 0
                        if (a.finished && b.finished) {
                          return (a.finishTime || 0) - (b.finishTime || 0)
                        }
                        if (a.finished) return -1
                        if (b.finished) return 1
                        return (b.progress || 0) - (a.progress || 0)
                      })
                      .map((participant, index) => (
                        <tr
                          key={participant.id}
                          className={`hover:bg-gray-50 ${
                            raceStarted && index < 3 
                              ? ['bg-yellow-50', 'bg-gray-50', 'bg-orange-50'][index] 
                              : ''
                          }`}
                        >
                          {raceStarted && (
                            <td className="px-4 py-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index < 3 
                                  ? ['bg-yellow-500 text-white', 'bg-gray-500 text-white', 'bg-orange-500 text-white'][index]
                                  : 'bg-blue-500 text-white'
                              }`}>
                                {index + 1}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {participant.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-lg">
                                  {participant.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {participant.id.slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          {raceStarted && (
                            <>
                              <td className="px-4 py-3 text-center">
                                <div className="text-lg font-semibold text-blue-600">
                                  {participant.progress?.toFixed(1) || '0.0'}%
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="text-lg font-semibold text-purple-600">
                                  {participant.stats?.wpm?.toFixed(1) || '0.0'}
                                </div>
                                <div className="text-xs text-gray-500">WPM</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="text-lg font-semibold text-green-600">
                                  {participant.stats?.accuracy?.toFixed(1) || '0.0'}%
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="text-lg font-semibold text-red-600">
                                  {participant.stats?.mistakes || 0}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="text-lg font-semibold text-indigo-600">
                                  {participant.stats?.completedWords || 0}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="text-lg font-semibold text-gray-600">
                                  {participant.stats?.totalChars || 0}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {participant.finished ? (
                                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    ✅ 完了
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    🏃 進行中
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                  <div 
                                    className="bg-blue-500 h-4 rounded-full transition-all duration-300 flex items-center justify-center"
                                    style={{ width: `${Math.min(participant.progress || 0, 100)}%` }}
                                  >
                                    <span className="text-white text-xs font-bold">
                                      {participant.progress >= 10 ? `${(participant.progress || 0).toFixed(0)}%` : ''}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </>
                          )}
                          {!raceStarted && (
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                ⏳ 待機中
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
                
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

        {/* 全体統計セクション */}
        {raceStarted && participants.length > 0 && (() => {
          const overallStats = calculateOverallStats()
          return overallStats ? (
            <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span>📈</span>
                <span>全体統計</span>
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{overallStats.totalParticipants}</div>
                  <div className="text-sm text-gray-600">総参加者数</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{overallStats.finishedParticipants}</div>
                  <div className="text-sm text-gray-600">完了者数</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{overallStats.completionRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">完了率</div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{overallStats.totalMistakes}</div>
                  <div className="text-sm text-gray-600">総ミス数</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">📊 平均成績</h3>
                  <div className="space-y-1 text-sm">
                    <div>WPM: <span className="font-semibold text-blue-600">{overallStats.averageWpm.toFixed(1)}</span></div>
                    <div>正確率: <span className="font-semibold text-green-600">{overallStats.averageAccuracy.toFixed(1)}%</span></div>
                    <div>完了単語数: <span className="font-semibold text-purple-600">{Math.round(overallStats.totalCompletedWords / overallStats.totalParticipants)}</span></div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">🏆 最高記録</h3>
                  <div className="space-y-1 text-sm">
                    <div>最高WPM: <span className="font-semibold text-blue-600">{overallStats.topWpm.toFixed(1)}</span></div>
                    <div>最高正確率: <span className="font-semibold text-green-600">{overallStats.topAccuracy.toFixed(1)}%</span></div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">📝 合計データ</h3>
                  <div className="space-y-1 text-sm">
                    <div>完了単語: <span className="font-semibold text-purple-600">{overallStats.totalCompletedWords}</span></div>
                    <div>入力文字: <span className="font-semibold text-gray-600">{overallStats.totalChars}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        })()}

        {/* 問題設定セクション */}
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