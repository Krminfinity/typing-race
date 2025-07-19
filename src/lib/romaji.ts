import { toRomaji, isRomaji, toHiragana } from 'wanakana'

// タイピング統計情報の型定義
export interface TypingStats {
  startTime: number
  endTime?: number
  totalKeystrokes: number
  errorCount: number
  correctKeystrokes: number
  wpm: number
  accuracy: number
  elapsedTime: number
}

// 単語タイピング統計の型定義
export interface WordTypingStats extends TypingStats {
  wordIndex: number
  expectedInput: string
  actualInput: string
  isCompleted: boolean
}

// ローマ字入力方式の種類
export enum RomajiStyle {
  HEPBURN = 'hepburn',      // ヘボン式（標準）
  KUNREI = 'kunrei',        // 訓令式
  NIHON = 'nihon'           // 日本式
}

// ローマ字パターンマップ（wanakakaのサポート外の特殊ケース用）
const customRomajiPatterns: { [key: string]: { [key in RomajiStyle]: string[] } } = {
  'ん': {
    [RomajiStyle.HEPBURN]: ['n', 'nn'],
    [RomajiStyle.KUNREI]: ['n', 'nn'],
    [RomajiStyle.NIHON]: ['n', 'nn']
  },
  'し': {
    [RomajiStyle.HEPBURN]: ['shi'],
    [RomajiStyle.KUNREI]: ['si'],
    [RomajiStyle.NIHON]: ['si']
  },
  'ち': {
    [RomajiStyle.HEPBURN]: ['chi'],
    [RomajiStyle.KUNREI]: ['ti'],
    [RomajiStyle.NIHON]: ['ti']
  },
  'つ': {
    [RomajiStyle.HEPBURN]: ['tsu'],
    [RomajiStyle.KUNREI]: ['tu'],
    [RomajiStyle.NIHON]: ['tu']
  },
  'ふ': {
    [RomajiStyle.HEPBURN]: ['fu'],
    [RomajiStyle.KUNREI]: ['hu'],
    [RomajiStyle.NIHON]: ['hu']
  },
  'じ': {
    [RomajiStyle.HEPBURN]: ['ji'],
    [RomajiStyle.KUNREI]: ['zi'],
    [RomajiStyle.NIHON]: ['zi']
  },
  'づ': {
    [RomajiStyle.HEPBURN]: ['zu'],
    [RomajiStyle.KUNREI]: ['du'],
    [RomajiStyle.NIHON]: ['du']
  },
  'しゃ': {
    [RomajiStyle.HEPBURN]: ['sha'],
    [RomajiStyle.KUNREI]: ['sya'],
    [RomajiStyle.NIHON]: ['sya']
  },
  'しゅ': {
    [RomajiStyle.HEPBURN]: ['shu'],
    [RomajiStyle.KUNREI]: ['syu'],
    [RomajiStyle.NIHON]: ['syu']
  },
  'しょ': {
    [RomajiStyle.HEPBURN]: ['sho'],
    [RomajiStyle.KUNREI]: ['syo'],
    [RomajiStyle.NIHON]: ['syo']
  },
  'ちゃ': {
    [RomajiStyle.HEPBURN]: ['cha'],
    [RomajiStyle.KUNREI]: ['tya'],
    [RomajiStyle.NIHON]: ['tya']
  },
  'ちゅ': {
    [RomajiStyle.HEPBURN]: ['chu'],
    [RomajiStyle.KUNREI]: ['tyu'],
    [RomajiStyle.NIHON]: ['tyu']
  },
  'ちょ': {
    [RomajiStyle.HEPBURN]: ['cho'],
    [RomajiStyle.KUNREI]: ['tyo'],
    [RomajiStyle.NIHON]: ['tyo']
  },
  'じゃ': {
    [RomajiStyle.HEPBURN]: ['ja'],
    [RomajiStyle.KUNREI]: ['zya'],
    [RomajiStyle.NIHON]: ['zya']
  },
  'じゅ': {
    [RomajiStyle.HEPBURN]: ['ju'],
    [RomajiStyle.KUNREI]: ['zyu'],
    [RomajiStyle.NIHON]: ['zyu']
  },
  'じょ': {
    [RomajiStyle.HEPBURN]: ['jo'],
    [RomajiStyle.KUNREI]: ['zyo'],
    [RomajiStyle.NIHON]: ['zyo']
  }
}

// wanakakaを使用したローマ字変換（デフォルトはヘボン式）
export function convertToRomaji(text: string, style: RomajiStyle = RomajiStyle.HEPBURN): string {
  // wanakakaは基本的にヘボン式ベース
  let romaji = toRomaji(text)
  
  // 方式に応じて変換
  if (style === RomajiStyle.KUNREI || style === RomajiStyle.NIHON) {
    romaji = romaji
      .replace(/shi/g, 'si')
      .replace(/chi/g, 'ti')
      .replace(/tsu/g, 'tu')
      .replace(/fu/g, 'hu')
      .replace(/ji/g, 'zi')
      .replace(/sha/g, 'sya')
      .replace(/shu/g, 'syu')
      .replace(/sho/g, 'syo')
      .replace(/cha/g, 'tya')
      .replace(/chu/g, 'tyu')
      .replace(/cho/g, 'tyo')
      .replace(/ja/g, 'zya')
      .replace(/ju/g, 'zyu')
      .replace(/jo/g, 'zyo')
  }
  
  return romaji
}

// 複数の入力方式に対応した検証
export function getRomajiPatterns(text: string): string[] {
  const patterns: string[] = []
  
  // ヘボン式
  patterns.push(convertToRomaji(text, RomajiStyle.HEPBURN))
  
  // 訓令式
  patterns.push(convertToRomaji(text, RomajiStyle.KUNREI))
  
  // 日本式
  patterns.push(convertToRomaji(text, RomajiStyle.NIHON))
  
  // 重複を除去
  return [...new Set(patterns)]
}

// 単語のタイピング統計を初期化
export function initializeWordStats(wordIndex: number, expectedInput: string): WordTypingStats {
  return {
    wordIndex,
    expectedInput,
    actualInput: '',
    startTime: Date.now(),
    totalKeystrokes: 0,
    errorCount: 0,
    correctKeystrokes: 0,
    wpm: 0,
    accuracy: 100,
    elapsedTime: 0,
    isCompleted: false
  }
}

// キーストロークごとの統計更新
export function updateWordStats(
  stats: WordTypingStats, 
  newInput: string, 
  isError: boolean = false
): WordTypingStats {
  const updatedStats = { ...stats }
  const inputLengthDiff = newInput.length - stats.actualInput.length
  
  // キーストローク数を更新
  if (inputLengthDiff > 0) {
    updatedStats.totalKeystrokes += inputLengthDiff
    if (isError) {
      updatedStats.errorCount += inputLengthDiff
    } else {
      updatedStats.correctKeystrokes += inputLengthDiff
    }
  } else if (inputLengthDiff < 0) {
    // バックスペースの場合
    updatedStats.totalKeystrokes += Math.abs(inputLengthDiff)
  }
  
  updatedStats.actualInput = newInput
  updatedStats.elapsedTime = Date.now() - stats.startTime
  
  // WPM計算（文字数ベース、平均5文字/単語として計算）
  const minutes = updatedStats.elapsedTime / (1000 * 60)
  if (minutes > 0) {
    updatedStats.wpm = (updatedStats.correctKeystrokes / 5) / minutes
  }
  
  // 正確性計算
  if (updatedStats.totalKeystrokes > 0) {
    updatedStats.accuracy = (updatedStats.correctKeystrokes / updatedStats.totalKeystrokes) * 100
  }
  
  // 完了チェック
  const patterns = getRomajiPatterns(stats.expectedInput)
  updatedStats.isCompleted = patterns.some(pattern => pattern === newInput.toLowerCase())
  
  if (updatedStats.isCompleted) {
    updatedStats.endTime = Date.now()
  }
  
  return updatedStats
}

// 固定入力方式での検証（生徒用）
export function validateFixedRomajiInput(
  targetText: string, 
  userInput: string, 
  style: RomajiStyle = RomajiStyle.HEPBURN
): {
  isValid: boolean
  correctLength: number
  isComplete: boolean
  expectedRomaji: string
  errorPositions: number[]
} {
  const expected = convertToRomaji(targetText, style)
  const input = userInput.toLowerCase()
  
  let correctLength = 0
  let isValid = true
  const errorPositions: number[] = []
  
  // 文字ごとの比較
  for (let i = 0; i < input.length; i++) {
    if (i < expected.length && input[i] === expected[i]) {
      correctLength++
    } else {
      if (i < expected.length) {
        errorPositions.push(i)
      }
      isValid = false
    }
  }
  
  // 入力が期待される文字列を超えていない場合は一時的に有効とする
  if (input.length <= expected.length && errorPositions.length === 0) {
    isValid = true
  }
  
  const isComplete = input.length === expected.length && correctLength === expected.length
  
  return {
    isValid,
    correctLength,
    isComplete,
    expectedRomaji: expected,
    errorPositions
  }
}

// 柔軟な入力検証（複数方式対応）
export function validateFlexibleRomajiInput(
  targetText: string, 
  userInput: string
): {
  isValid: boolean
  correctLength: number
  isComplete: boolean
  matchedPattern: string
  matchedStyle: RomajiStyle
  errorPositions: number[]
} {
  const input = userInput.toLowerCase()
  const patterns = [
    { pattern: convertToRomaji(targetText, RomajiStyle.HEPBURN), style: RomajiStyle.HEPBURN },
    { pattern: convertToRomaji(targetText, RomajiStyle.KUNREI), style: RomajiStyle.KUNREI },
    { pattern: convertToRomaji(targetText, RomajiStyle.NIHON), style: RomajiStyle.NIHON }
  ]
  
  let bestMatch = {
    isValid: false,
    correctLength: 0,
    isComplete: false,
    matchedPattern: '',
    matchedStyle: RomajiStyle.HEPBURN,
    errorPositions: [] as number[]
  }
  
  for (const { pattern, style } of patterns) {
    let correctLength = 0
    let isValid = true
    const errorPositions: number[] = []
    
    for (let i = 0; i < input.length; i++) {
      if (i < pattern.length && input[i] === pattern[i]) {
        correctLength++
      } else {
        if (i < pattern.length) {
          errorPositions.push(i)
        }
        isValid = false
      }
    }
    
    if (input.length <= pattern.length && errorPositions.length === 0) {
      isValid = true
    }
    
    const isComplete = input.length === pattern.length && correctLength === pattern.length
    
    // より良いマッチを見つけた場合
    if (correctLength > bestMatch.correctLength || 
        (correctLength === bestMatch.correctLength && isValid && !bestMatch.isValid)) {
      bestMatch = {
        isValid,
        correctLength,
        isComplete,
        matchedPattern: pattern,
        matchedStyle: style,
        errorPositions
      }
    }
  }
  
  return bestMatch
}

// 旧関数との互換性を保つためのラッパー関数
export function convertToRomajiPatterns(text: string): string[] {
  return getRomajiPatterns(text)
}

export function getShortestRomajiPattern(targetText: string): string {
  return convertToRomaji(targetText, RomajiStyle.HEPBURN)
}

export function validateRomajiInput(targetText: string, userInput: string): {
  isValid: boolean
  correctLength: number
  expectedRomaji: string
} {
  const result = validateFlexibleRomajiInput(targetText, userInput)
  return {
    isValid: result.isValid,
    correctLength: result.correctLength,
    expectedRomaji: result.matchedPattern
  }
}

export function calculateRomajiProgress(targetText: string, userInput: string): {
  progress: number
  isComplete: boolean
} {
  const result = validateFlexibleRomajiInput(targetText, userInput)
  const expectedLength = result.matchedPattern.length
  
  if (expectedLength === 0) {
    return { progress: 0, isComplete: false }
  }

  const progress = (result.correctLength / expectedLength) * 100
  
  return {
    progress: Math.min(progress, 100),
    isComplete: result.isComplete
  }
}