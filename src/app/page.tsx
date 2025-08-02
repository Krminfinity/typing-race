'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [userType, setUserType] = useState<'teacher' | 'student' | null>(null)
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const router = useRouter()

  const handleTeacherClick = () => {
    setUserType('teacher')
  }

  const handleStudentClick = () => {
    setUserType('student')
  }

  const handleCreateRoom = () => {
    if (name.trim()) {
      router.push(`/teacher?name=${encodeURIComponent(name)}`)
    }
  }

  const handleJoinRoom = () => {
    if (pin.trim() && name.trim()) {
      router.push(`/student?pin=${pin}&name=${encodeURIComponent(name)}`)
    }
  }

  const resetSelection = () => {
    setUserType(null)
    setPin('')
    setName('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            タイピング競争
          </h1>
          <p className="text-gray-600">
            教室でみんなで楽しくタイピング競争！
          </p>
          <div className="mt-2">
            <Link href="/help">
              <button className="text-sm text-blue-500 hover:underline">
                使い方
              </button>
            </Link>
          </div>
        </div>

        {!userType && (
          <div className="space-y-4">
            <button
              onClick={handleTeacherClick}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 shadow-md"
            >
              🎓 先生（ルーム作成）
            </button>
            <button
              onClick={handleStudentClick}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 shadow-md"
            >
              🎒 生徒（ルーム参加）
            </button>
          </div>
        )}

        {userType === 'teacher' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                先生のお名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="田中先生"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={!name.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              ルームを作成
            </button>
            <button
              onClick={resetSelection}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              戻る
            </button>
          </div>
        )}

        {userType === 'student' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ルームPIN
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 6))}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                あなたのお名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田太郎"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={!pin.trim() || !name.trim() || pin.length !== 6}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              ルームに参加
            </button>
            <button
              onClick={resetSelection}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
