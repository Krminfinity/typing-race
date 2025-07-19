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

// 包括的なローマ字パターンマップ（表記ゆれ対応）
const romajiPatterns: { [key: string]: string[] } = {
  'あ': ['a'],
  'い': ['i'],
  'う': ['u'],
  'え': ['e'],
  'お': ['o'],
  'か': ['ka', 'ca'],
  'き': ['ki'],
  'く': ['ku', 'cu'],
  'け': ['ke'],
  'こ': ['ko', 'co'],
  'が': ['ga'],
  'ぎ': ['gi'],
  'ぐ': ['gu'],
  'げ': ['ge'],
  'ご': ['go'],
  'さ': ['sa'],
  'し': ['shi', 'si'],
  'す': ['su'],
  'せ': ['se'],
  'そ': ['so'],
  'ざ': ['za'],
  'じ': ['ji', 'zi'],
  'ず': ['zu'],
  'ぜ': ['ze'],
  'ぞ': ['zo'],
  'た': ['ta'],
  'ち': ['chi', 'ti'],
  'つ': ['tsu', 'tu'],
  'て': ['te'],
  'と': ['to'],
  'だ': ['da'],
  'ぢ': ['di'],
  'づ': ['du', 'zu'],
  'で': ['de'],
  'ど': ['do'],
  'な': ['na'],
  'に': ['ni'],
  'ぬ': ['nu'],
  'ね': ['ne'],
  'の': ['no'],
  'は': ['ha'],
  'ひ': ['hi'],
  'ふ': ['fu', 'hu'],
  'へ': ['he'],
  'ほ': ['ho'],
  'ば': ['ba'],
  'び': ['bi'],
  'ぶ': ['bu'],
  'べ': ['be'],
  'ぼ': ['bo'],
  'ぱ': ['pa'],
  'ぴ': ['pi'],
  'ぷ': ['pu'],
  'ぺ': ['pe'],
  'ぽ': ['po'],
  'ま': ['ma'],
  'み': ['mi'],
  'む': ['mu'],
  'め': ['me'],
  'も': ['mo'],
  'や': ['ya'],
  'ゆ': ['yu'],
  'よ': ['yo'],
  'ら': ['ra'],
  'り': ['ri'],
  'る': ['ru'],
  'れ': ['re'],
  'ろ': ['ro'],
  'わ': ['wa'],
  'ゐ': ['wi'],
  'ゑ': ['we'],
  'を': ['wo'],
  'ん': ['n', 'nn', 'xn'],
  
  // 拗音（小さいゃゅょ）
  'きゃ': ['kya'],
  'きゅ': ['kyu'],
  'きょ': ['kyo'],
  'しゃ': ['sha', 'sya'],
  'しゅ': ['shu', 'syu'],
  'しょ': ['sho', 'syo'],
  'ちゃ': ['cha', 'tya'],
  'ちゅ': ['chu', 'tyu'],
  'ちょ': ['cho', 'tyo'],
  'にゃ': ['nya'],
  'にゅ': ['nyu'],
  'にょ': ['nyo'],
  'ひゃ': ['hya'],
  'ひゅ': ['hyu'],
  'ひょ': ['hyo'],
  'みゃ': ['mya'],
  'みゅ': ['myu'],
  'みょ': ['myo'],
  'りゃ': ['rya'],
  'りゅ': ['ryu'],
  'りょ': ['ryo'],
  'ぎゃ': ['gya'],
  'ぎゅ': ['gyu'],
  'ぎょ': ['gyo'],
  'じゃ': ['ja', 'zya'],
  'じゅ': ['ju', 'zyu'],
  'じょ': ['jo', 'zyo'],
  'びゃ': ['bya'],
  'びゅ': ['byu'],
  'びょ': ['byo'],
  'ぴゃ': ['pya'],
  'ぴゅ': ['pyu'],
  'ぴょ': ['pyo'],
  
  // 促音（っ）+ 子音
  'っか': ['kka'],
  'っき': ['kki'],
  'っく': ['kku'],
  'っけ': ['kke'],
  'っこ': ['kko'],
  'っさ': ['ssa'],
  'っし': ['sshi', 'ssi'],
  'っす': ['ssu'],
  'っせ': ['sse'],
  'っそ': ['sso'],
  'った': ['tta'],
  'っち': ['cchi', 'tti'],
  'っつ': ['ttsu', 'ttu'],
  'って': ['tte'],
  'っと': ['tto'],
  'っは': ['hha'],
  'っひ': ['hhi'],
  'っふ': ['ffu', 'hhu'],
  'っへ': ['hhe'],
  'っほ': ['hho'],
  'っば': ['bba'],
  'っび': ['bbi'],
  'っぶ': ['bbu'],
  'っべ': ['bbe'],
  'っぼ': ['bbo'],
  'っぱ': ['ppa'],
  'っぴ': ['ppi'],
  'っぷ': ['ppu'],
  'っぺ': ['ppe'],
  'っぽ': ['ppo'],
  'っま': ['mma'],
  'っみ': ['mmi'],
  'っむ': ['mmu'],
  'っめ': ['mme'],
  'っも': ['mmo'],
  'っや': ['yya'],
  'っゆ': ['yyu'],
  'っよ': ['yyo'],
  'っら': ['rra'],
  'っり': ['rri'],
  'っる': ['rru'],
  'っれ': ['rre'],
  'っろ': ['rro'],
  'っわ': ['wwa'],
  
  // その他
  'ー': ['-'],
  '、': [','],
  '。': ['.'],
  '！': ['!'],
  '？': ['?'],
  '　': [' '], // 全角スペース
  ' ': [' ']   // 半角スペース
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

// 包括的なローマ字検証システム（表記ゆれ対応）
export function validateRomajiInputWithPatterns(targetText: string, userInput: string): {
  isValid: boolean
  correctLength: number
  nextExpectedChars: string[]
  suggestions: string[]
  isComplete: boolean
  matchedPattern?: string
} {
  const segments = analyzeHiraganaSegments(targetText)
  let inputPosition = 0
  let correctLength = 0
  let currentSegmentIndex = 0
  let lastMatchedPattern: string | undefined
  
  while (inputPosition < userInput.length && currentSegmentIndex < segments.length) {
    const segment = segments[currentSegmentIndex]
    const patterns = romajiPatterns[segment] || [segment]
    
    let bestMatch: { pattern: string; matchLength: number } | null = null
    
    // 各パターンで最長一致を探す
    for (const pattern of patterns) {
      const remainingInput = userInput.slice(inputPosition)
      const matchLength = getMatchLength(pattern, remainingInput)
      
      if (matchLength > 0 && (!bestMatch || matchLength > bestMatch.matchLength)) {
        bestMatch = { pattern, matchLength }
      }
    }
    
    if (bestMatch) {
      lastMatchedPattern = bestMatch.pattern
      if (bestMatch.matchLength === bestMatch.pattern.length) {
        // 完全一致
        correctLength += bestMatch.matchLength
        inputPosition += bestMatch.matchLength
        currentSegmentIndex++
      } else if (bestMatch.pattern.startsWith(userInput.slice(inputPosition))) {
        // 部分一致（途中まで正しい）
        correctLength = inputPosition + bestMatch.matchLength
        break
      } else {
        // 不一致
        break
      }
    } else {
      // どのパターンにも一致しない
      break
    }
  }
  
  const isComplete = currentSegmentIndex >= segments.length && inputPosition >= userInput.length
  const isValid = correctLength === userInput.length
  
  // 次の期待文字を取得
  let nextExpectedChars: string[] = []
  if (currentSegmentIndex < segments.length) {
    const nextSegment = segments[currentSegmentIndex]
    const patterns = romajiPatterns[nextSegment] || [nextSegment]
    const remainingInput = userInput.slice(inputPosition)
    
    for (const pattern of patterns) {
      if (pattern.startsWith(remainingInput)) {
        const nextChar = pattern[remainingInput.length]
        if (nextChar && !nextExpectedChars.includes(nextChar)) {
          nextExpectedChars.push(nextChar)
        }
      }
    }
  }
  
  return {
    isValid,
    correctLength,
    nextExpectedChars,
    suggestions: nextExpectedChars,
    isComplete,
    matchedPattern: lastMatchedPattern
  }
}

// ひらがなテキストをセグメント（文字単位）に分解
function analyzeHiraganaSegments(text: string): string[] {
  const segments: string[] = []
  let i = 0
  
  while (i < text.length) {
    const char = text[i]
    
    // 拗音や促音の組み合わせをチェック
    if (i < text.length - 1) {
      const twoChar = text.slice(i, i + 2)
      if (romajiPatterns[twoChar]) {
        segments.push(twoChar)
        i += 2
        continue
      }
    }
    
    // 促音の特別処理
    if (char === 'っ' && i < text.length - 1) {
      const nextChar = text[i + 1]
      const combination = char + nextChar
      if (romajiPatterns[combination]) {
        segments.push(combination)
        i += 2
        continue
      }
    }
    
    // 単一文字
    segments.push(char)
    i++
  }
  
  return segments
}

// 文字列の一致長を取得
function getMatchLength(pattern: string, input: string): number {
  let matchLength = 0
  for (let i = 0; i < Math.min(pattern.length, input.length); i++) {
    if (pattern[i] === input[i]) {
      matchLength++
    } else {
      break
    }
  }
  return matchLength
}

// 高精度タイピング統計クラス
export class AccurateTypingStats {
  private startTime: number
  private totalKeystrokes: number = 0
  private correctKeystrokes: number = 0
  private errorCount: number = 0
  private lastInput: string = ''
  
  constructor() {
    this.startTime = Date.now()
  }
  
  // キー入力ごとに呼び出す
  updateWithKeyInput(targetText: string, currentInput: string, lastKeyPressed: string): {
    isCorrect: boolean
    accuracy: number
    wpm: number
    totalKeystrokes: number
    errorCount: number
  } {
    this.totalKeystrokes++
    
    const validation = validateRomajiInputWithPatterns(targetText, currentInput)
    const wasCorrect = currentInput.length <= validation.correctLength
    
    if (wasCorrect) {
      this.correctKeystrokes++
    } else {
      this.errorCount++
    }
    
    this.lastInput = currentInput
    
    const accuracy = this.totalKeystrokes > 0 ? (this.correctKeystrokes / this.totalKeystrokes) * 100 : 100
    const elapsedMinutes = (Date.now() - this.startTime) / (1000 * 60)
    const wpm = elapsedMinutes > 0 ? (this.correctKeystrokes / 5) / elapsedMinutes : 0
    
    return {
      isCorrect: wasCorrect,
      accuracy: Math.round(accuracy * 100) / 100, // 小数点2桁まで
      wpm: Math.round(wpm * 100) / 100,
      totalKeystrokes: this.totalKeystrokes,
      errorCount: this.errorCount
    }
  }
  
  // 最終統計を取得
  getFinalStats(targetText: string, finalInput: string): TypingStats {
    const validation = validateRomajiInputWithPatterns(targetText, finalInput)
    const elapsedTime = Date.now() - this.startTime
    const elapsedMinutes = elapsedTime / (1000 * 60)
    
    return {
      startTime: this.startTime,
      endTime: Date.now(),
      totalKeystrokes: this.totalKeystrokes,
      errorCount: this.errorCount,
      correctKeystrokes: this.correctKeystrokes,
      accuracy: this.totalKeystrokes > 0 ? (this.correctKeystrokes / this.totalKeystrokes) * 100 : 100,
      wpm: elapsedMinutes > 0 ? (this.correctKeystrokes / 5) / elapsedMinutes : 0,
      elapsedTime
    }
  }
  
  reset() {
    this.startTime = Date.now()
    this.totalKeystrokes = 0
    this.correctKeystrokes = 0
    this.errorCount = 0
    this.lastInput = ''
  }
}

// レガシー関数（互換性のため）
export function validateRomajiInput(targetText: string, userInput: string): {
  isValid: boolean
  correctLength: number
  nextExpectedChars: string[]
} {
  const result = validateRomajiInputWithPatterns(targetText, userInput)
  return {
    isValid: result.isValid,
    correctLength: result.correctLength,
    nextExpectedChars: result.nextExpectedChars
  }
}

export function calculateRomajiProgress(targetText: string, userInput: string): {
  progress: number
  correctLength: number
} {
  const validation = validateRomajiInputWithPatterns(targetText, userInput)
  const targetRomaji = convertToRomaji(targetText)
  const progress = targetRomaji.length > 0 ? (validation.correctLength / targetRomaji.length) * 100 : 0
  
  return {
    progress: Math.min(progress, 100),
    correctLength: validation.correctLength
  }
}

export function convertToRomajiPatterns(text: string): string[] {
  return [
    convertToRomaji(text, RomajiStyle.HEPBURN),
    convertToRomaji(text, RomajiStyle.KUNREI),
    convertToRomaji(text, RomajiStyle.NIHON)
  ]
}

export function getShortestRomajiPattern(text: string): string {
  return convertToRomaji(text, RomajiStyle.HEPBURN)
}

export function validateFixedRomajiInput(
  targetText: string, 
  userInput: string, 
  style: RomajiStyle = RomajiStyle.HEPBURN
): {
  isValid: boolean
  correctLength: number
  progress: number
} {
  const expected = convertToRomaji(targetText, style)
  let correctLength = 0
  
  for (let i = 0; i < userInput.length; i++) {
    if (i < expected.length && userInput[i] === expected[i]) {
      correctLength++
    } else {
      break
    }
  }
  
  const isValid = correctLength === userInput.length
  const progress = expected.length > 0 ? (correctLength / expected.length) * 100 : 0
  
  return {
    isValid,
    correctLength,
    progress: Math.min(progress, 100)
  }
}

// 単語統計の初期化と更新
export function initializeWordStats(wordIndex: number, expectedInput: string): WordTypingStats {
  return {
    wordIndex,
    expectedInput,
    actualInput: '',
    isCompleted: false,
    startTime: Date.now(),
    totalKeystrokes: 0,
    errorCount: 0,
    correctKeystrokes: 0,
    wpm: 0,
    accuracy: 100,
    elapsedTime: 0
  }
}

export function updateWordStats(
  stats: WordTypingStats, 
  newInput: string,
  isKeyCorrect: boolean
): WordTypingStats {
  const updatedStats = { ...stats }
  updatedStats.actualInput = newInput
  updatedStats.totalKeystrokes++
  
  if (isKeyCorrect) {
    updatedStats.correctKeystrokes++
  } else {
    updatedStats.errorCount++
  }
  
  // 正確性計算
  updatedStats.accuracy = updatedStats.totalKeystrokes > 0 
    ? (updatedStats.correctKeystrokes / updatedStats.totalKeystrokes) * 100 
    : 100
  
  // WPM計算
  const elapsedMinutes = (Date.now() - updatedStats.startTime) / (1000 * 60)
  updatedStats.wpm = elapsedMinutes > 0 ? (updatedStats.correctKeystrokes / 5) / elapsedMinutes : 0
  updatedStats.elapsedTime = Date.now() - updatedStats.startTime
  
  // 完了チェック
  const validation = validateRomajiInputWithPatterns(stats.expectedInput, newInput)
  updatedStats.isCompleted = validation.isComplete
  
  return updatedStats
}
