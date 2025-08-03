import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">📖 KeyDojo の使い方</h1>
        <div className="text-gray-700 space-y-6">
          {/* 先生：ルーム作成 */}
          <div>
            <h2 className="text-lg font-semibold mb-2">1. 先生（ルーム作成）</h2>
            <p className="mb-2">先生はまずこちらのボタンをクリックして名前を入力し、ルームを作成します。</p>
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg">
              🎓 先生（ルーム作成）
            </button>
          </div>
          {/* 生徒：ルーム参加 */}
          <div>
            <h2 className="text-lg font-semibold mb-2">2. 生徒（ルーム参加）</h2>
            <p className="mb-2">生徒は先生から教えてもらった6桁のPINと自分の名前を入力して参加します。</p>
            <div className="space-y-2">
              <input disabled placeholder="ルームPIN: 123456" className="w-full px-3 py-2 border border-gray-300 rounded-md text-center tracking-widest bg-gray-100" />
              <input disabled placeholder="名前: 山田太郎" className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
            </div>
            <button className="mt-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg">
              🎒 生徒（ルーム参加）
            </button>
          </div>
          {/* タイピングレース */}
          <div>
            <h2 className="text-lg font-semibold mb-2">3. タイピングレース</h2>
            <p className="mb-2">画面に表示された文章をタイピングして速度と正確さを競います。</p>
            <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
              例: 今日は良い天気ですね。<br />Type here...
            </div>
          </div>
          {/* 結果 */}
          <div>
            <h2 className="text-lg font-semibold mb-2">4. 結果表示</h2>
            <p className="mb-2">レース終了後、順位、WPM、正確さが表示されます。</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>順位: 1位/5人</li>
              <li>WPM: 45</li>
              <li>正確さ: 98%</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link href="/">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
              ホームに戻る
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
