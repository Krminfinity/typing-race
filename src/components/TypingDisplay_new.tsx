'use client'

import { useState, useEffect } from 'react'
import { validateRomajiInputWithPatterns, convertToRomaji } from '@/lib/romaji'

interface TypingDisplayProps {
  japaneseText: string
  userInput: string
  isActive: boolean
  mode?: 'word' // 常に単語モード
}

interface RomajiChar {
  char: string
  status: 'correct' | 'incorrect' | 'pending' | 'current'
  index: number
}

export default function TypingDisplay({ japaneseText, userInput, isActive }: TypingDisplayProps) {
  const [currentRomajiPattern, setCurrentRomajiPattern] = useState<string>('')
  const [romajiChars, setRomajiChars] = useState<RomajiChar[]>([])
  const [adaptiveRomaji, setAdaptiveRomaji] = useState<string>('')

  // 表記ゆれに対応したローマ字パターンの適応的変更
  const adaptRomajiPattern = (japanese: string, input: string) => {
    // 基本的なローマ字変換
    const baseRomaji = convertToRomaji(japanese)
    
    // 表記ゆれ対応の辞書
    const variations: { [key: string]: string[] } = {
      'し': ['shi', 'si'],
      'ち': ['chi', 'ti'],
      'つ': ['tsu', 'tu'],
      'ふ': ['fu', 'hu'],
      'じ': ['ji', 'zi'],
      'ぢ': ['di', 'zi'],
      'づ': ['du', 'zu'],
      'しゃ': ['sha', 'sya'],
      'しゅ': ['shu', 'syu'],
      'しょ': ['sho', 'syo'],
      'ちゃ': ['cha', 'tya'],
      'ちゅ': ['chu', 'tyu'],
      'ちょ': ['cho', 'tyo'],
      'じゃ': ['ja', 'jya', 'zya'],
      'じゅ': ['ju', 'jyu', 'zyu'],
      'じょ': ['jo', 'jyo', 'zyo'],
      'ん': ['n', 'nn'],
      '日': ['hi', 'niti'],
      '人': ['hito', 'jin', 'nin']
    }
    
    let adaptedRomaji = baseRomaji
    
    // 入力に応じてパターンを調整
    for (const [hiragana, patterns] of Object.entries(variations)) {
      if (japanese.includes(hiragana)) {
        for (const pattern of patterns) {
          if (input.toLowerCase().includes(pattern.toLowerCase())) {
            adaptedRomaji = adaptedRomaji.replace(
              new RegExp(patterns[0], 'gi'), 
              pattern
            )
            break
          }
        }
      }
    }
    
    return adaptedRomaji
  }

  // ローマ字の状態を計算する関数（統合版）
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
      const adaptedPattern = adaptRomajiPattern(japaneseText, userInput)
      setAdaptiveRomaji(adaptedPattern)
      setCurrentRomajiPattern(adaptedPattern)
      
      const newRomajiChars = calculateRomajiStatus(japaneseText, userInput)
      setRomajiChars(newRomajiChars)
    }
  }, [japaneseText, userInput, isActive])

  const getCharStyle = (status: string) => {
    switch (status) {
      case 'correct':
        return 'text-white bg-green-500 shadow-lg font-bold border-2 border-green-600'
      case 'incorrect':
        return 'text-white bg-red-500 shadow-lg font-bold border-2 border-red-600'
      case 'current':
        return 'text-white bg-blue-500 shadow-lg font-bold animate-pulse border-2 border-blue-600'
      default:
        return 'text-gray-600 bg-gray-100 border border-gray-300'
    }
  }

  if (!isActive || !japaneseText) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-xl shadow-lg border-2 border-blue-300">
      {/* 単語モード表示（寿司打スタイル） */}
      <div className="text-center space-y-6">
        {/* 日本語表示 */}
        <div className="text-5xl font-bold text-gray-800 mb-4 tracking-wide">
          {japaneseText}
        </div>
        
        {/* ローマ字表示（同じくらいの大きさ） */}
        <div className="text-4xl font-mono tracking-wider mb-6">
          {romajiChars.map((char, index) => (
            <span
              key={index}
              className={`inline-block px-2 py-1 mx-0.5 rounded transition-all duration-300 ${getCharStyle(char.status)} ${
                char.status === 'current' ? 'scale-110' : ''
              } ${
                char.status === 'incorrect' ? 'animate-pulse' : ''
              }`}
            >
              {char.char}
            </span>
          ))}
        </div>
        
        {/* 進捗表示 */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-bold">
              正解: {romajiChars.filter(c => c.status === 'correct').length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 font-bold">
              ミス: {romajiChars.filter(c => c.status === 'incorrect').length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-blue-700 font-bold">
              残り: {romajiChars.filter(c => c.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>
      
      {/* 現在の入力表示（改良版） */}
      <div className="mt-6 p-4 bg-white bg-opacity-70 rounded-lg shadow-inner">
        <div className="text-sm text-gray-600 mb-2 font-semibold">現在の入力:</div>
        <div className="text-2xl font-mono tracking-wide">
          {userInput.split('').map((char, index) => {
            const isCorrect = index < adaptiveRomaji.length && char === adaptiveRomaji[index]
            return (
              <span
                key={index}
                className={`inline-block px-1 py-1 rounded transition-all duration-200 ${
                  isCorrect 
                    ? 'text-green-700 bg-green-100 font-bold' 
                    : 'text-red-700 bg-red-200 font-bold animate-bounce'
                }`}
              >
                {char}
              </span>
            )
          })}
          <span className="text-blue-600 animate-pulse text-3xl font-bold">|</span>
        </div>
      </div>
      
      {/* 適応パターンの表示（寿司打風のヒント表示） */}
      {japaneseText && (
        <div className="mt-4 text-center">
          <details className="cursor-pointer bg-white bg-opacity-50 rounded-lg p-3">
            <summary className="text-sm text-gray-700 hover:text-gray-900 font-semibold">
              💡 入力パターンヒント
            </summary>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="mb-2">
                <span className="font-semibold text-blue-800">基本パターン:</span> 
                <span className="font-mono ml-2">{convertToRomaji(japaneseText)}</span>
              </div>
              {adaptiveRomaji !== convertToRomaji(japaneseText) && (
                <div className="text-blue-700 font-semibold">
                  <span className="text-blue-800">現在適用中:</span> 
                  <span className="font-mono ml-2 bg-blue-200 px-2 py-1 rounded">{adaptiveRomaji}</span>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
