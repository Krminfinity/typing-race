'use client'

import { useState, useEffect } from 'react'
import { validateRomajiInputWithPatterns, convertToRomaji } from '@/lib/romaji'

interface TypingDisplayProps {
  japaneseText: string
  userInput: string
  isActive: boolean
}

interface RomajiChar {
  char: string
  status: 'correct' | 'incorrect' | 'pending' | 'current'
  index: number
}

export default function TypingDisplay({ japaneseText, userInput, isActive }: TypingDisplayProps) {
  const [romajiChars, setRomajiChars] = useState<RomajiChar[]>([])

  // ローマ字の状態を計算する関数
  const calculateRomajiStatus = (japanese: string, input: string) => {
    // validateRomajiInputWithPatternsを使用して正確な進捗を取得
    const validation = validateRomajiInputWithPatterns(japanese, input)
    const baseRomaji = convertToRomaji(japanese)
    
    const chars: RomajiChar[] = []
    
    // 各文字の状態を設定
    for (let i = 0; i < baseRomaji.length; i++) {
      let status: 'correct' | 'incorrect' | 'pending' | 'current' = 'pending'
      
      if (i < validation.correctLength) {
        status = 'correct'
      } else if (i < input.length) {
        status = 'incorrect'
      } else if (i === input.length) {
        status = 'current'
      }
      
      chars.push({
        char: baseRomaji[i],
        status,
        index: i
      })
    }
    
    return chars
  }

  useEffect(() => {
    if (japaneseText && isActive) {
      const newRomajiChars = calculateRomajiStatus(japaneseText, userInput)
      setRomajiChars(newRomajiChars)
    }
  }, [japaneseText, userInput, isActive])

  const getCharStyle = (status: string) => {
    switch (status) {
      case 'correct':
        return 'text-white bg-green-500 shadow-lg font-bold border-2 border-green-600'
      case 'incorrect':
        return 'text-white bg-red-500 shadow-lg font-bold border-2 border-red-600 animate-pulse'
      case 'current':
        return 'text-white bg-blue-500 shadow-lg font-bold animate-pulse border-2 border-blue-600 scale-110'
      default:
        return 'text-gray-600 bg-gray-100 border border-gray-300'
    }
  }

  if (!isActive || !japaneseText) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-xl shadow-lg border-2 border-blue-300">
      <div className="text-center space-y-6">
        {/* 日本語表示 */}
        <div className="text-6xl font-bold text-gray-800 mb-6 tracking-wide">
          {japaneseText}
        </div>
        
        {/* ローマ字表示 */}
        <div className="text-4xl font-mono tracking-wider mb-6">
          {romajiChars.map((char, index) => (
            <span
              key={index}
              className={`inline-block px-2 py-1 mx-0.5 rounded transition-all duration-300 ${getCharStyle(char.status)}`}
            >
              {char.char}
            </span>
          ))}
        </div>
        
        {/* シンプルな進捗表示 */}
        <div className="flex justify-center items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-bold text-lg">
              正解: {romajiChars.filter(c => c.status === 'correct').length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 font-bold text-lg">
              ミス: {romajiChars.filter(c => c.status === 'incorrect').length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-blue-700 font-bold text-lg">
              残り: {romajiChars.filter(c => c.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
