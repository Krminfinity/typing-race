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
  
  // 問題設定用の状態
  const [textType, setTextType] = useState<'japanese' | 'english' | 'romaji'>('japanese')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [customText, setCustomText] = useState('')
  const [useCustomText, setUseCustomText] = useState(false)
  const [mode, setMode] = useState<'sentence' | 'word'>('word') // デフォルトを単語モードに

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
      console.log('Starting race with options:', { mode, textType, difficulty, useCustomText, customText: customText.substring(0, 30) + '...' })
      
      const raceOptions: any = {
        mode,
        textType,
        difficulty,
        customText: useCustomText ? customText.trim() : undefined
      }
      
      if (mode === 'sentence') {
        const text = useCustomText && customText.trim() 
          ? customText.trim()
          : getDefaultText(textType, difficulty)
        raceOptions.text = text
        console.log('Sentence mode text:', text.substring(0, 50) + '...')
      } else {
        console.log('Word mode selected')
      }
      
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
      },
      english: {
        easy: 'This is a simple English typing practice. Type slowly and accurately.',
        medium: 'This is a medium-level English typing exercise with punctuation marks, numbers, and symbols.',
        hard: 'This advanced English typing challenge includes complex punctuation, numbers (123), symbols (@#$%), and mixed case letters.'
      },
      romaji: {
        easy: 'kore wa kantan na romaji no renshuu desu. yukkuri to seikaku ni nyuuryoku shimashou.',
        medium: 'chuukyuusha muke no romaji taipingu desu. kuten ya kigou mo fukumarete imasu. ganbatte!',
        hard: 'joukyuusha muke no fukuzatsu na romaji bunshoud esu. kigou ya suuji mo fukumarete imasu. shuuchuu shite seikaku ni nyuuryoku shite kudasai.'
      }
    }
    return texts[type as keyof typeof texts][level as keyof typeof texts.japanese]
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ルームを作成中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              教師用ダッシュボード
            </h1>
            <button
              onClick={handleBackToHome}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
            >
              ホームに戻る
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                ルーム情報
              </h2>
              <div className="space-y-2">
                <p><span className="font-medium">先生:</span> {teacherName}</p>
                <p><span className="font-medium">ルームPIN:</span> 
                  <span className="text-2xl font-bold text-blue-600 ml-2">{room.id}</span>
                </p>
                <p><span className="font-medium">参加者数:</span> {participants.length}人</p>
                <p><span className="font-medium">状態:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    room.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                    room.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {room.status === 'waiting' ? '待機中' : 
                     room.status === 'active' ? '競争中' : '終了'}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                コントロール
              </h2>
              <div className="space-y-3">
                {!raceStarted && participants.length > 0 && (
                  <button
                    onClick={handleStartRace}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    競争開始！
                  </button>
                )}
                {participants.length === 0 && (
                  <p className="text-gray-600 text-sm">
                    生徒の参加を待っています...
                  </p>
                )}
                {raceStarted && (
                  <div className="space-y-2">
                    <p className="text-green-600 font-semibold">
                      競争進行中！
                    </p>
                    <button
                      onClick={handleRestartRace}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                    >
                      競争をリセット（再開始）
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 入力制限機能の案内セクション */}
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            💻 自動入力制限機能
          </h2>
          
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-600 font-bold text-xl">✅</span>
              <h3 className="font-bold text-green-800">設定不要で自動適用</h3>
            </div>
            <p className="text-green-800 text-sm">
              生徒がタイピングエリアにカーソルを合わせると、自動的に半角英数字のみ入力可能になります。
              <br />
              PC設定の変更やソフトウェアのインストールは一切不要です。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-2">� 自動制限機能</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 日本語入力（IME）の自動無効化</li>
                <li>• 半角英数字以外のキー入力をブロック</li>
                <li>• 全角文字の貼り付けを自動変換</li>
                <li>• リアルタイムでの入力値検証</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-bold text-purple-800 mb-2">🎯 効果</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 誤った入力モード切り替えを完全防止</li>
                <li>• タイピング競争に集中できる環境</li>
                <li>• 管理者権限や設定変更不要</li>
                <li>• どのWindowsPCでも即座に動作</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>💡 使用方法:</strong> 
              生徒には「タイピングエリアをクリックするだけ」と伝えてください。
              特別な設定や操作は必要ありません。
            </p>
          </div>
        </div>

        {/* 問題設定セクション */}
        {!raceStarted && (
          <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              問題設定
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイピングモード
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'sentence' | 'word')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="word">単語モード（寿司打風）</option>
                  <option value="sentence">文章モード</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  入力方式
                </label>
                <select
                  value={textType}
                  onChange={(e) => setTextType(e.target.value as 'japanese' | 'english' | 'romaji')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="japanese">日本語（ひらがな・漢字）</option>
                  <option value="english">英語（English）</option>
                  <option value="romaji">ローマ字（Romaji）</option>
                </select>
              </div>
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
                  disabled={useCustomText && mode === 'sentence'}
                >
                  <option value="easy">初級（簡単な{mode === 'word' ? '単語' : '文章'}）</option>
                  <option value="medium">中級（{mode === 'word' ? '中程度の単語' : '句読点あり'}）</option>
                  <option value="hard">上級（{mode === 'word' ? '複雑な単語' : '記号・数字あり'}）</option>
                </select>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="useCustomText"
                    checked={useCustomText}
                    onChange={(e) => setUseCustomText(e.target.checked)}
                    className="mr-2"
                    disabled={mode === 'word'}
                  />
                  <label htmlFor="useCustomText" className="text-sm font-medium text-gray-700">
                    カスタム問題文を使用 {mode === 'word' && '(単語モードでは無効)'}
                  </label>
                </div>
              </div>
            </div>
            
            {useCustomText && mode === 'sentence' && (
              <div className="mt-4">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="ここに問題文を入力してください..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>
            )}
            
            {!useCustomText && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">プレビュー:</h3>
                <p className="text-sm text-gray-600">
                  {mode === 'word' 
                    ? `${textType}の${difficulty}レベルの単語を20個出題します`
                    : getDefaultText(textType, difficulty)
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              参加者一覧 ({participants.length}人)
            </h2>
            {raceStarted && participants.length > 0 && (
              <div className="flex space-x-4 text-sm">
                <span className="text-gray-600">
                  完了者: {participants.filter(p => p.finished).length}人
                </span>
                <span className="text-gray-600">
                  平均速度: {Math.round(participants.reduce((sum, p) => sum + p.wpm, 0) / Math.max(participants.length, 1))} WPM
                </span>
                <span className="text-gray-600">
                  平均正確性: {Math.round(participants.reduce((sum, p) => sum + p.accuracy, 0) / Math.max(participants.length, 1))}%
                </span>
              </div>
            )}
          </div>
          
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">まだ参加者がいません</p>
              <p className="text-sm text-gray-400">
                生徒にルームPIN「{room.id}」を伝えて参加してもらいましょう
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">順位</th>
                    <th className="px-4 py-2 text-left">名前</th>
                    <th className="px-4 py-2 text-left">進捗</th>
                    <th className="px-4 py-2 text-left">速度 (WPM)</th>
                    <th className="px-4 py-2 text-left">正確性</th>
                    <th className="px-4 py-2 text-left">ミス数</th>
                    <th className="px-4 py-2 text-left">タイプ数</th>
                    <th className="px-4 py-2 text-left">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {participants
                    .sort((a, b) => {
                      if (a.finished && b.finished) {
                        return (a.finishTime || 0) - (b.finishTime || 0)
                      }
                      if (a.finished) return -1
                      if (b.finished) return 1
                      return b.progress - a.progress
                    })
                    .map((participant, index) => (
                    <tr key={participant.id} className="border-t">
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium">{participant.name}</td>
                      <td className="px-4 py-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${participant.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(participant.progress)}%</span>
                      </td>
                      <td className="px-4 py-2">{Math.round(participant.wpm)}</td>
                      <td className="px-4 py-2">{Math.round(participant.accuracy)}%</td>
                      <td className="px-4 py-2">
                        <span className="text-red-600 font-semibold">
                          {participant.typingStats?.errorCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-blue-600">
                          {participant.typingStats?.totalKeystrokes || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          participant.finished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {participant.finished ? '完了' : '入力中'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <TeacherPageContent />
    </Suspense>
  )
}
