'use client'

import { useState, useEffect } from 'react'
import { validateRomajiInputWithPatterns, convertToRomaji } from '@/lib/romaji'

interface TypingDisplayProps {
  japaneseText: string
  userInput: string
  isActive: boolean
  mode: 'sentence' | 'word'
}

interface RomajiChar {
  char: string
  status: 'correct' | 'incorrect' | 'pending' | 'current'
  index: number
}

export default function TypingDisplay({ japaneseText, userInput, isActive, mode }: TypingDisplayProps) {
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
      'ん': ['n', 'nn']
    }
    
    let adaptedRomaji = baseRomaji
    let inputIndex = 0
    
    // 入力に基づいてパターンを適応的に変更
    for (const [hiragana, patterns] of Object.entries(variations)) {
      if (japanese.includes(hiragana)) {
        const hiraganaIndex = japanese.indexOf(hiragana)
        const romajiIndex = convertToRomaji(japanese.substring(0, hiraganaIndex)).length
        
        if (inputIndex <= romajiIndex && input.length > romajiIndex) {
          const inputSegment = input.substring(romajiIndex)
          
          // 入力された文字列に最もマッチするパターンを選択
          for (const pattern of patterns) {
            if (inputSegment.startsWith(pattern.substring(0, Math.min(pattern.length, inputSegment.length)))) {
              adaptedRomaji = adaptedRomaji.replace(patterns[0], pattern)
              break
            }
          }
        }
      }
    }
    
    return adaptedRomaji
  }

  // ローマ字文字の状態を計算
  const calculateRomajiStatus = (romaji: string, input: string): RomajiChar[] => {
    const chars: RomajiChar[] = []
    
    for (let i = 0; i < romaji.length; i++) {
      let status: 'correct' | 'incorrect' | 'pending' | 'current' = 'pending'
      
      if (i < input.length) {
        if (input[i] === romaji[i]) {
          status = 'correct'
        } else {
          status = 'incorrect'
        }
      } else if (i === input.length) {
        status = 'current'
      }
      
      chars.push({
        char: romaji[i],
        status,
        index: i
      })
    }
    
    return chars
  }

  useEffect(() => {
    if (japaneseText) {
      const adapted = adaptRomajiPattern(japaneseText, userInput)
      setAdaptiveRomaji(adapted)
      setCurrentRomajiPattern(adapted)
      setRomajiChars(calculateRomajiStatus(adapted, userInput))
    }
  }, [japaneseText, userInput])

  const getCharStyle = (status: 'correct' | 'incorrect' | 'pending' | 'current') => {
    switch (status) {
      case 'correct':
        return 'text-white bg-green-500 shadow-md font-bold'
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
      {mode === 'word' ? (
        // 単語モード表示（寿司打スタイル）
        <div className="text-center space-y-6">
          {/* 日本語表示 */}
          <div className="text-5xl font-bold text-gray-800 mb-4 tracking-wide">
            {japaneseText}
          </div>
          
          {/* ローマ字表示（適応的、同じくらいの大きさ） */}
          <div className="text-4xl font-mono tracking-wider leading-relaxed">
            {romajiChars.map((char, index) => (
              <span
                key={index}
                className={`inline-block px-2 py-1 mx-1 rounded-lg transition-all duration-300 transform ${getCharStyle(char.status)} ${
                  char.status === 'current' ? 'scale-110 shadow-lg' : ''
                } ${
                  char.status === 'incorrect' ? 'animate-bounce' : ''
                }`}
              >
                {char.char}
              </span>
            ))}
          </div>
          
          {/* 進捗バー */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${romajiChars.length > 0 ? (romajiChars.filter(c => c.status === 'correct').length / romajiChars.length) * 100 : 0}%` 
              }}
            ></div>
          </div>
          
          {/* 入力状況の表示（寿司打風） */}
          <div className="flex justify-center items-center space-x-6 text-lg">
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
      ) : (
        // 文章モードの表示（改良版）
        <div className="space-y-6">
          {/* 日本語文章表示（文字ごとに色分け） */}
          <div className="text-3xl leading-relaxed text-center">
            {japaneseText.split('').map((char, index) => {
              const charRomajiLength = convertToRomaji(char).length
              const precedingLength = convertToRomaji(japaneseText.substring(0, index)).length
              const isCompleted = userInput.length > precedingLength + charRomajiLength - 1
              const isCurrent = userInput.length >= precedingLength && userInput.length < precedingLength + charRomajiLength
              
              return (
                <span
                  key={index}
                  className={`inline-block px-1 py-1 rounded transition-all duration-300 ${
                    isCompleted 
                      ? 'text-green-700 bg-green-200 font-bold' 
                      : isCurrent 
                        ? 'text-blue-700 bg-blue-200 animate-pulse font-bold'
                        : 'text-gray-800'
                  }`}
                >
                  {char}
                </span>
              )
            })}
          </div>
          
          {/* ローマ字表示（適応的、同じくらいの大きさ） */}
          <div className="text-2xl font-mono tracking-wide text-center leading-relaxed">
            {romajiChars.map((char, index) => (
              <span
                key={index}
                className={`inline-block px-1 py-1 mx-0.5 rounded transition-all duration-300 ${getCharStyle(char.status)} ${
                  char.status === 'current' ? 'scale-110' : ''
                } ${
                  char.status === 'incorrect' ? 'animate-pulse' : ''
                }`}
              >
                {char.char}
              </span>
            ))}
          </div>
          
          {/* 進捗バー */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ 
                width: `${romajiChars.length > 0 ? (romajiChars.filter(c => c.status === 'correct').length / romajiChars.length) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
      )}
      
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
