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

// 包括的なローマ字パターンマップ（参考資料の対応表に基づく完全版）
const romajiPatterns: { [key: string]: string[] } = {
  // 基本五十音
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
  'し': ['shi', 'si', 'ci'],
  'す': ['su'],
  'せ': ['se', 'ce'],
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
  'づ': ['du'],
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
  
  // 小文字（単体）
  'ぁ': ['la', 'xa'],
  'ぃ': ['li', 'xi'],
  'ぅ': ['lu', 'xu'],
  'ぇ': ['le', 'xe'],
  'ぉ': ['lo', 'xo'],
  'ゃ': ['lya', 'xya'],
  'ゅ': ['lyu', 'xyu'],
  'ょ': ['lyo', 'xyo'],
  'っ': ['ltu', 'xtu'],
  
  // 促音 + 子音の組み合わせ（一般的なローマ字表記）
  'っか': ['kka'],
  'っき': ['kki'],
  'っく': ['kku'],
  'っけ': ['kke'],
  'っこ': ['kko'],
  'っが': ['gga'],
  'っぎ': ['ggi'],
  'っぐ': ['ggu'],
  'っげ': ['gge'],
  'っご': ['ggo'],
  'っさ': ['ssa'],
  'っし': ['sshi', 'ssi'],
  'っす': ['ssu'],
  'っせ': ['sse'],
  'っそ': ['sso'],
  'っざ': ['zza'],
  'っじ': ['jji', 'zzi'],
  'っず': ['zzu'],
  'っぜ': ['zze'],
  'っぞ': ['zzo'],
  'った': ['tta'],
  'っち': ['tchi', 'tti'],
  'っつ': ['ttsu', 'ttu'],
  'って': ['tte'],
  'っと': ['tto'],
  'っだ': ['dda'],
  'っぢ': ['ddi'],
  'っづ': ['ddu'],
  'っで': ['dde'],
  'っど': ['ddo'],
  'っは': ['hha'],
  'っひ': ['hhi'],
  'っふ': ['hhu', 'ffu'],
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
  'っを': ['wwo'],
  
  // 促音 + 拗音の組み合わせ（一般的なローマ字表記）
  'っきゃ': ['kkya'],
  'っきゅ': ['kkyu'],
  'っきょ': ['kkyo'],
  'っしゃ': ['ssha', 'ssya'],
  'っしゅ': ['sshu', 'ssyu'],
  'っしょ': ['ssho', 'ssyo'],
  'っちゃ': ['tcha', 'ttya'],
  'っちゅ': ['tchu', 'ttyu'],
  'っちょ': ['tcho', 'ttyo'],
  'っにゃ': ['nnya'],
  'っにゅ': ['nnyu'],
  'っにょ': ['nnyo'],
  'っひゃ': ['hhya'],
  'っひゅ': ['hhyu'],
  'っひょ': ['hhyo'],
  'っびゃ': ['bbya'],
  'っびゅ': ['bbyu'],
  'っびょ': ['bbyo'],
  'っぴゃ': ['ppya'],
  'っぴゅ': ['ppyu'],
  'っぴょ': ['ppyo'],
  'っみゃ': ['mmya'],
  'っみゅ': ['mmyu'],
  'っみょ': ['mmyo'],
  'っりゃ': ['rrya'],
  'っりゅ': ['rryu'],
  'っりょ': ['rryo'],
  
  // W系
  'うぁ': ['wha'],
  'うぃ': ['wi', 'whi'],
  'うぇ': ['we', 'whe'],
  'うぉ': ['who'],
  
  // K系拗音
  'きゃ': ['kya'],
  'きぃ': ['kyi'],
  'きゅ': ['kyu'],
  'きぇ': ['kye'],
  'きょ': ['kyo'],
  
  // G系拗音
  'ぎゃ': ['gya'],
  'ぎぃ': ['gyi'],
  'ぎゅ': ['gyu'],
  'ぎぇ': ['gye'],
  'ぎょ': ['gyo'],
  
  // S系拗音
  'しゃ': ['sha', 'sya'],
  'しぃ': ['syi'],
  'しゅ': ['shu', 'syu'],
  'しぇ': ['she', 'sye'],
  'しょ': ['sho', 'syo'],
  
  // Z/J系拗音
  'じゃ': ['ja', 'zya', 'jya'],
  'じぃ': ['zyi', 'jyi'],
  'じゅ': ['ju', 'zyu', 'jyu'],
  'じぇ': ['zye', 'jye'],
  'じょ': ['jo', 'zyo', 'jyo'],
  
  // T/C系拗音
  'ちゃ': ['cha', 'tya', 'cya'],
  'ちぃ': ['tyi', 'cyi'],
  'ちゅ': ['chu', 'tyu', 'cyu'],
  'ちぇ': ['che', 'tye', 'cye'],
  'ちょ': ['cho', 'tyo', 'cyo'],
  
  // TH系
  'てゃ': ['tha'],
  'てぃ': ['thi'],
  'てゅ': ['thu'],
  'てぇ': ['the'],
  'てょ': ['tho'],
  
  // DH系
  'でゃ': ['dha'],
  'でぃ': ['dhi'],
  'でゅ': ['dhu'],
  'でぇ': ['dhe'],
  'でょ': ['dho'],
  
  // N系拗音
  'にゃ': ['nya'],
  'にぃ': ['nyi'],
  'にゅ': ['nyu'],
  'にぇ': ['nye'],
  'にょ': ['nyo'],
  
  // H系拗音
  'ひゃ': ['hya'],
  'ひぃ': ['hyi'],
  'ひゅ': ['hyu'],
  'ひぇ': ['hye'],
  'ひょ': ['hyo'],
  
  // B系拗音
  'びゃ': ['bya'],
  'びぃ': ['byi'],
  'びゅ': ['byu'],
  'びぇ': ['bye'],
  'びょ': ['byo'],
  
  // P系拗音
  'ぴゃ': ['pya'],
  'ぴぃ': ['pyi'],
  'ぴゅ': ['pyu'],
  'ぴぇ': ['pye'],
  'ぴょ': ['pyo'],
  
  // M系拗音
  'みゃ': ['mya'],
  'みぃ': ['myi'],
  'みゅ': ['myu'],
  'みぇ': ['mye'],
  'みょ': ['myo'],
  
  // R系拗音
  'りゃ': ['rya'],
  'りぃ': ['ryi'],
  'りゅ': ['ryu'],
  'りぇ': ['rye'],
  'りょ': ['ryo'],
  
  // F系
  'ふぁ': ['fa'],
  'ふぃ': ['fi'],
  'ふぇ': ['fe'],
  'ふぉ': ['fo'],
  
  // V系（カタカナ）
  'ヴァ': ['va'],
  'ヴィ': ['vi'],
  'ヴ': ['vu'],
  'ヴェ': ['ve'],
  'ヴォ': ['vo'],
  
  // カタカナ基本
  'ア': ['a'],
  'イ': ['i'],
  'ウ': ['u'],
  'エ': ['e'],
  'オ': ['o'],
  'カ': ['ka', 'ca'],
  'キ': ['ki'],
  'ク': ['ku', 'cu'],
  'ケ': ['ke'],
  'コ': ['ko', 'co'],
  'ガ': ['ga'],
  'ギ': ['gi'],
  'グ': ['gu'],
  'ゲ': ['ge'],
  'ゴ': ['go'],
  'サ': ['sa'],
  'シ': ['shi', 'si', 'ci'],
  'ス': ['su'],
  'セ': ['se', 'ce'],
  'ソ': ['so'],
  'ザ': ['za'],
  'ジ': ['ji', 'zi'],
  'ズ': ['zu'],
  'ゼ': ['ze'],
  'ゾ': ['zo'],
  'タ': ['ta'],
  'チ': ['chi', 'ti'],
  'ツ': ['tsu', 'tu'],
  'テ': ['te'],
  'ト': ['to'],
  'ダ': ['da'],
  'ヂ': ['di'],
  'ヅ': ['du'],
  'デ': ['de'],
  'ド': ['do'],
  'ナ': ['na'],
  'ニ': ['ni'],
  'ヌ': ['nu'],
  'ネ': ['ne'],
  'ノ': ['no'],
  'ハ': ['ha'],
  'ヒ': ['hi'],
  'フ': ['fu', 'hu'],
  'ヘ': ['he'],
  'ホ': ['ho'],
  'バ': ['ba'],
  'ビ': ['bi'],
  'ブ': ['bu'],
  'ベ': ['be'],
  'ボ': ['bo'],
  'パ': ['pa'],
  'ピ': ['pi'],
  'プ': ['pu'],
  'ペ': ['pe'],
  'ポ': ['po'],
  'マ': ['ma'],
  'ミ': ['mi'],
  'ム': ['mu'],
  'メ': ['me'],
  'モ': ['mo'],
  'ヤ': ['ya'],
  'ユ': ['yu'],
  'ヨ': ['yo'],
  'ラ': ['ra'],
  'リ': ['ri'],
  'ル': ['ru'],
  'レ': ['re'],
  'ロ': ['ro'],
  'ワ': ['wa'],
  'ヰ': ['wi'],
  'ヱ': ['we'],
  'ヲ': ['wo'],
  'ン': ['n', 'nn', 'xn'],
  
  // 記号等
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
  // カスタムパターンを優先してチェック
  const segments = analyzeHiraganaSegments(text)
  let result = ''
  
  for (const segment of segments) {
    // カスタムパターンに存在するかチェック
    if (romajiPatterns[segment]) {
      // 最初のパターン（標準的な表記）を使用
      result += romajiPatterns[segment][0]
    } else {
      // wanakakaにフォールバック
      result += toRomaji(segment)
    }
  }
  
  // 方式に応じて変換（訓令式・日本式）
  if (style === RomajiStyle.KUNREI || style === RomajiStyle.NIHON) {
    result = result
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
  
  return result
}

// 包括的なローマ字検証システム（表記ゆれ対応・使用パターン追跡）
export function validateRomajiInputWithPatterns(targetText: string, userInput: string): {
  isValid: boolean
  correctLength: number
  nextExpectedChars: string[]
  suggestions: string[]
  isComplete: boolean
  matchedPattern?: string
  usedPatterns: string[]  // 実際に使用されたパターンの配列
  displayRomaji: string   // 表示用ローマ字（実際の入力に基づく）
} {
  const segments = analyzeHiraganaSegments(targetText)
  let inputPosition = 0
  let correctLength = 0
  let currentSegmentIndex = 0
  let lastMatchedPattern: string | undefined
  let usedPatterns: string[] = []
  let displayRomaji = ''
  
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
        usedPatterns.push(bestMatch.pattern)
        displayRomaji += bestMatch.pattern
        inputPosition += bestMatch.matchLength
        currentSegmentIndex++
      } else if (bestMatch.pattern.startsWith(userInput.slice(inputPosition))) {
        // 部分一致（途中まで正しい）
        correctLength = inputPosition + bestMatch.matchLength
        const partialInput = userInput.slice(inputPosition, inputPosition + bestMatch.matchLength)
        displayRomaji += partialInput
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
  
  // 残りのセグメントのデフォルトローマ字を追加（まだ入力されていない部分）
  for (let i = currentSegmentIndex; i < segments.length; i++) {
    const segment = segments[i]
    const patterns = romajiPatterns[segment] || [segment]
    displayRomaji += patterns[0] // 最初のパターン（通常の表記）を使用
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
    matchedPattern: lastMatchedPattern,
    usedPatterns,
    displayRomaji
  }
}

// ひらがなテキストをセグメント（文字単位）に分解
function analyzeHiraganaSegments(text: string): string[] {
  const segments: string[] = []
  let i = 0
  
  while (i < text.length) {
    const char = text[i]
    
    // 3文字の組み合わせをチェック（促音+拗音など）
    if (i < text.length - 2) {
      const threeChar = text.slice(i, i + 3)
      if (romajiPatterns[threeChar]) {
        segments.push(threeChar)
        i += 3
        continue
      }
    }
    
    // 2文字の組み合わせをチェック（拗音や促音など）
    if (i < text.length - 1) {
      const twoChar = text.slice(i, i + 2)
      if (romajiPatterns[twoChar]) {
        segments.push(twoChar)
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
  private lastInputLength: number = 0
  
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
    correctKeystrokes: number
  } {
    const validation = validateRomajiInputWithPatterns(targetText, currentInput)
    
    // 入力が短くなった場合（Backspace等）は統計を更新しない
    if (currentInput.length < this.lastInputLength) {
      this.lastInput = currentInput
      this.lastInputLength = currentInput.length
      const accuracy = this.totalKeystrokes > 0 ? (this.correctKeystrokes / this.totalKeystrokes) * 100 : 100
      const elapsedMinutes = (Date.now() - this.startTime) / (1000 * 60)
      const wpm = elapsedMinutes > 0 ? (this.correctKeystrokes / 5) / elapsedMinutes : 0
      
      return {
        isCorrect: validation.isValid,
        accuracy: Math.round(accuracy * 100) / 100,
        wpm: Math.round(wpm * 100) / 100,
        totalKeystrokes: this.totalKeystrokes,
        errorCount: this.errorCount,
        correctKeystrokes: this.correctKeystrokes
      }
    }
    
    // 新しい文字が追加された場合のみ統計を更新
    if (currentInput.length > this.lastInputLength) {
      const newCharCount = currentInput.length - this.lastInputLength
      
      for (let i = 0; i < newCharCount; i++) {
        this.totalKeystrokes++
        
        // 入力位置での正確性チェック
        const inputPosition = this.lastInputLength + i
        const wasCorrect = inputPosition < validation.correctLength
        
        if (wasCorrect) {
          this.correctKeystrokes++
        } else {
          this.errorCount++
        }
      }
    }
    
    this.lastInput = currentInput
    this.lastInputLength = currentInput.length
    
    const accuracy = this.totalKeystrokes > 0 ? (this.correctKeystrokes / this.totalKeystrokes) * 100 : 100
    const elapsedMinutes = (Date.now() - this.startTime) / (1000 * 60)
    // WPM = 正しく入力した文字数 ÷ 5 ÷ 経過分数（標準的な計算方法）
    const wpm = elapsedMinutes > 0 ? (this.correctKeystrokes / 5) / elapsedMinutes : 0
    
    return {
      isCorrect: validation.isValid,
      accuracy: Math.round(accuracy * 100) / 100,
      wpm: Math.round(wpm * 100) / 100,
      totalKeystrokes: this.totalKeystrokes,
      errorCount: this.errorCount,
      correctKeystrokes: this.correctKeystrokes
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
  
  // 入力位置をリセット（単語完了時など）- 統計はリセットしない
  resetInput() {
    this.lastInput = ''
    this.lastInputLength = 0
    // 統計情報（totalKeystrokes, errorCount, correctKeystrokes）はリセットしない
  }
  
  // 完全リセット（新しいレース開始時のみ）
  reset() {
    this.startTime = Date.now()
    this.totalKeystrokes = 0
    this.correctKeystrokes = 0
    this.errorCount = 0
    this.lastInput = ''
    this.lastInputLength = 0
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

/**
 * Advanced adaptive romaji conversion with real-time pattern switching
 * 生徒の入力に合わせてリアルタイムでローマ字パターンを切り替える
 */
export function getAdaptiveRomajiPattern(japanese: string, userInput: string): {
  pattern: string
  variations: Array<{ original: string, adapted: string, reason: string }>
} {
  // 表記ゆれのパターン辞書（優先度順）
  const variationMap: { [key: string]: string[] } = {
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
    'っ': ['xtu', 'ltu', 'tsu'],
    'ー': ['-', ''],
    'を': ['wo', 'o']
  }
  
  let adaptedPattern = convertToRomaji(japanese)
  const variations: Array<{ original: string, adapted: string, reason: string }> = []
  
  // 日本語文字を順番に処理
  for (let i = 0; i < japanese.length; i++) {
    const char = japanese[i]
    
    if (variationMap[char]) {
      const patterns = variationMap[char]
      const currentPosition = convertToRomaji(japanese.substring(0, i)).length
      
      // ユーザーの入力がこの位置に達している場合
      if (userInput.length > currentPosition) {
        const userSegment = userInput.substring(currentPosition)
        
        // 最もマッチするパターンを見つける
        for (const pattern of patterns) {
          if (userSegment.startsWith(pattern) || 
              (userSegment.length < pattern.length && pattern.startsWith(userSegment))) {
            
            if (pattern !== patterns[0]) { // デフォルトと異なる場合のみ
              adaptedPattern = adaptedPattern.replace(
                new RegExp(patterns[0], 'g'),
                pattern
              )
              variations.push({
                original: patterns[0],
                adapted: pattern,
                reason: `「${char}」の入力パターンを ${patterns[0]} → ${pattern} に適応`
              })
            }
            break
          }
        }
      }
    }
  }
  
  return {
    pattern: adaptedPattern,
    variations
  }
}

/**
 * Real-time typing progress analyzer with visual feedback data
 * リアルタイムのタイピング進捗を視覚的フィードバック用に解析
 */
export function analyzeTypingProgress(japanese: string, userInput: string): {
  romajiPattern: string
  characters: Array<{
    japanese: string
    romaji: string
    status: 'correct' | 'incorrect' | 'current' | 'pending'
    position: number
    userChar?: string
  }>
  stats: {
    correct: number
    incorrect: number
    pending: number
    total: number
    accuracy: number
  }
  adaptations: Array<{ original: string, adapted: string, reason: string }>
} {
  const adaptive = getAdaptiveRomajiPattern(japanese, userInput)
  const romajiPattern = adaptive.pattern
  
  const characters: Array<{
    japanese: string
    romaji: string
    status: 'correct' | 'incorrect' | 'current' | 'pending'
    position: number
    userChar?: string
  }> = []
  
  let romajiIndex = 0
  
  // 日本語文字ごとに解析
  for (let i = 0; i < japanese.length; i++) {
    const japaneseChar = japanese[i]
    const charRomaji = convertToRomaji(japaneseChar)
    const adaptedCharRomaji = romajiPattern.substring(romajiIndex, romajiIndex + charRomaji.length)
    
    // この文字の入力状況を判定
    let status: 'correct' | 'incorrect' | 'current' | 'pending' = 'pending'
    let userChar: string | undefined
    
    if (userInput.length > romajiIndex) {
      const userSegment = userInput.substring(romajiIndex, romajiIndex + adaptedCharRomaji.length)
      
      if (userSegment.length === adaptedCharRomaji.length) {
        status = userSegment === adaptedCharRomaji ? 'correct' : 'incorrect'
        userChar = userSegment
      } else if (userSegment.length > 0) {
        // 部分入力の場合
        const isPartialCorrect = adaptedCharRomaji.startsWith(userSegment)
        status = isPartialCorrect ? 'current' : 'incorrect'
        userChar = userSegment
      }
    } else if (userInput.length === romajiIndex) {
      status = 'current'
    }
    
    characters.push({
      japanese: japaneseChar,
      romaji: adaptedCharRomaji,
      status,
      position: romajiIndex,
      userChar
    })
    
    romajiIndex += adaptedCharRomaji.length
  }
  
  // 統計計算
  const correct = characters.filter(c => c.status === 'correct').length
  const incorrect = characters.filter(c => c.status === 'incorrect').length
  const pending = characters.filter(c => c.status === 'pending').length
  const total = characters.length
  const accuracy = total > 0 ? (correct / total) * 100 : 100
  
  return {
    romajiPattern,
    characters,
    stats: {
      correct,
      incorrect,
      pending,
      total,
      accuracy
    },
    adaptations: adaptive.variations
  }
}
