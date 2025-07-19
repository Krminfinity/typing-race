// ローマ字変換とバリエーション対応

export interface RomajiVariation {
  [key: string]: string[]
}

// ひらがな→ローマ字の変換表（複数の入力方式対応）
export const hiraganaToRomaji: RomajiVariation = {
  'あ': ['a'],
  'い': ['i'],
  'う': ['u'],
  'え': ['e'],
  'お': ['o'],
  'か': ['ka'],
  'き': ['ki'],
  'く': ['ku'],
  'け': ['ke'],
  'こ': ['ko'],
  'が': ['ga'],
  'ぎ': ['gi'],
  'ぐ': ['gu'],
  'げ': ['ge'],
  'ご': ['go'],
  'さ': ['sa'],
  'し': ['si', 'shi'],
  'す': ['su'],
  'せ': ['se'],
  'そ': ['so'],
  'ざ': ['za'],
  'じ': ['zi', 'ji'],
  'ず': ['zu'],
  'ぜ': ['ze'],
  'ぞ': ['zo'],
  'た': ['ta'],
  'ち': ['ti', 'chi'],
  'つ': ['tu', 'tsu'],
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
  'ふ': ['hu', 'fu'],
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
  'を': ['wo', 'o'],
  'ん': ['n', 'nn'],
  'ー': ['-'],
  '。': ['.'],
  '、': [','],
  ' ': [' '],
  '　': [' '],
  // 小さい文字
  'ゃ': ['ya'],
  'ゅ': ['yu'],
  'ょ': ['yo'],
  'っ': [''],
  // 拗音
  'きゃ': ['kya'],
  'きゅ': ['kyu'],
  'きょ': ['kyo'],
  'しゃ': ['sya', 'sha'],
  'しゅ': ['syu', 'shu'],
  'しょ': ['syo', 'sho'],
  'ちゃ': ['tya', 'cha'],
  'ちゅ': ['tyu', 'chu'],
  'ちょ': ['tyo', 'cho'],
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
  'じゃ': ['zya', 'ja'],
  'じゅ': ['zyu', 'ju'],
  'じょ': ['zyo', 'jo'],
  'びゃ': ['bya'],
  'びゅ': ['byu'],
  'びょ': ['byo'],
  'ぴゃ': ['pya'],
  'ぴゅ': ['pyu'],
  'ぴょ': ['pyo']
}

// カタカナ→ローマ字の変換表
export const katakanaToRomaji: RomajiVariation = {
  'ア': ['a'],
  'イ': ['i'],
  'ウ': ['u'],
  'エ': ['e'],
  'オ': ['o'],
  'カ': ['ka'],
  'キ': ['ki'],
  'ク': ['ku'],
  'ケ': ['ke'],
  'コ': ['ko'],
  'ガ': ['ga'],
  'ギ': ['gi'],
  'グ': ['gu'],
  'ゲ': ['ge'],
  'ゴ': ['go'],
  'サ': ['sa'],
  'シ': ['si', 'shi'],
  'ス': ['su'],
  'セ': ['se'],
  'ソ': ['so'],
  'ザ': ['za'],
  'ジ': ['zi', 'ji'],
  'ズ': ['zu'],
  'ゼ': ['ze'],
  'ゾ': ['zo'],
  'タ': ['ta'],
  'チ': ['ti', 'chi'],
  'ツ': ['tu', 'tsu'],
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
  'フ': ['hu', 'fu'],
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
  'ヲ': ['wo', 'o'],
  'ン': ['n', 'nn'],
  'ー': ['-'],
  '。': ['.'],
  '、': [','],
  ' ': [' '],
  '　': [' '],
  // 小さい文字
  'ャ': ['ya'],
  'ュ': ['yu'],
  'ョ': ['yo'],
  'ッ': [''],
  // 拗音
  'キャ': ['kya'],
  'キュ': ['kyu'],
  'キョ': ['kyo'],
  'シャ': ['sya', 'sha'],
  'シュ': ['syu', 'shu'],
  'ショ': ['syo', 'sho'],
  'チャ': ['tya', 'cha'],
  'チュ': ['tyu', 'chu'],
  'チョ': ['tyo', 'cho'],
  'ニャ': ['nya'],
  'ニュ': ['nyu'],
  'ニョ': ['nyo'],
  'ヒャ': ['hya'],
  'ヒュ': ['hyu'],
  'ヒョ': ['hyo'],
  'ミャ': ['mya'],
  'ミュ': ['myu'],
  'ミョ': ['myo'],
  'リャ': ['rya'],
  'リュ': ['ryu'],
  'リョ': ['ryo'],
  'ギャ': ['gya'],
  'ギュ': ['gyu'],
  'ギョ': ['gyo'],
  'ジャ': ['zya', 'ja'],
  'ジュ': ['zyu', 'ju'],
  'ジョ': ['zyo', 'jo'],
  'ビャ': ['bya'],
  'ビュ': ['byu'],
  'ビョ': ['byo'],
  'ピャ': ['pya'],
  'ピュ': ['pyu'],
  'ピョ': ['pyo']
}

// 文字列を解析してローマ字パターンに変換
export function convertToRomajiPatterns(text: string): string[] {
  const result: string[] = []
  let i = 0
  
  while (i < text.length) {
    let matched = false
    
    // 3文字の組み合わせをチェック（拗音など）
    if (i + 2 < text.length) {
      const threeChar = text.substring(i, i + 3)
      if (hiraganaToRomaji[threeChar] || katakanaToRomaji[threeChar]) {
        const patterns = hiraganaToRomaji[threeChar] || katakanaToRomaji[threeChar]
        patterns.forEach(pattern => {
          if (pattern !== '') result.push(pattern)
        })
        i += 3
        matched = true
      }
    }
    
    // 2文字の組み合わせをチェック
    if (!matched && i + 1 < text.length) {
      const twoChar = text.substring(i, i + 2)
      if (hiraganaToRomaji[twoChar] || katakanaToRomaji[twoChar]) {
        const patterns = hiraganaToRomaji[twoChar] || katakanaToRomaji[twoChar]
        patterns.forEach(pattern => {
          if (pattern !== '') result.push(pattern)
        })
        i += 2
        matched = true
      }
    }
    
    // 1文字をチェック
    if (!matched) {
      const oneChar = text[i]
      if (hiraganaToRomaji[oneChar] || katakanaToRomaji[oneChar]) {
        const patterns = hiraganaToRomaji[oneChar] || katakanaToRomaji[oneChar]
        patterns.forEach(pattern => {
          if (pattern !== '') result.push(pattern)
        })
      } else {
        // 漢字や英数字などはそのまま
        result.push(oneChar)
      }
      i += 1
    }
  }
  
  return result
}

// ローマ字入力の妥当性チェック（複数パターン対応）
export function validateRomajiInput(targetText: string, userInput: string): {
  isValid: boolean
  correctLength: number
  expectedNext: string[]
} {
  // 全ての可能なローマ字パターンを生成
  const allPossibleInputs = generateAllRomajiCombinations(targetText)
  
  let bestMatch = {
    isValid: false,
    correctLength: 0,
    expectedNext: [] as string[]
  }
  
  // 各パターンで検証
  for (const possibleInput of allPossibleInputs) {
    let currentPos = 0
    let correctChars = 0
    
    for (let i = 0; i < userInput.length; i++) {
      if (currentPos < possibleInput.length && userInput[i] === possibleInput[currentPos]) {
        currentPos++
        correctChars++
      } else {
        break
      }
    }
    
    const isValid = correctChars === userInput.length
    const expectedNext = currentPos < possibleInput.length ? [possibleInput[currentPos]] : []
    
    // より良いマッチを見つけた場合は更新
    if (correctChars > bestMatch.correctLength || (correctChars === bestMatch.correctLength && isValid)) {
      bestMatch = {
        isValid,
        correctLength: correctChars,
        expectedNext
      }
    }
  }
  
  return bestMatch
}

// 全ての可能なローマ字の組み合わせを生成
function generateAllRomajiCombinations(text: string): string[] {
  const segments: string[][] = []
  let i = 0
  
  while (i < text.length) {
    let matched = false
    
    // 3文字の組み合わせをチェック
    if (i + 2 < text.length) {
      const threeChar = text.substring(i, i + 3)
      if (hiraganaToRomaji[threeChar] || katakanaToRomaji[threeChar]) {
        segments.push(hiraganaToRomaji[threeChar] || katakanaToRomaji[threeChar])
        i += 3
        matched = true
      }
    }
    
    // 2文字の組み合わせをチェック
    if (!matched && i + 1 < text.length) {
      const twoChar = text.substring(i, i + 2)
      if (hiraganaToRomaji[twoChar] || katakanaToRomaji[twoChar]) {
        segments.push(hiraganaToRomaji[twoChar] || katakanaToRomaji[twoChar])
        i += 2
        matched = true
      }
    }
    
    // 1文字をチェック
    if (!matched) {
      const oneChar = text[i]
      if (hiraganaToRomaji[oneChar] || katakanaToRomaji[oneChar]) {
        segments.push(hiraganaToRomaji[oneChar] || katakanaToRomaji[oneChar])
      } else {
        segments.push([oneChar])
      }
      i += 1
    }
  }
  
  // 全ての組み合わせを生成
  function generateCombinations(segmentIndex: number, currentCombination: string): string[] {
    if (segmentIndex >= segments.length) {
      return [currentCombination]
    }
    
    const results = []
    const currentSegment = segments[segmentIndex]
    
    for (const option of currentSegment) {
      const newCombinations = generateCombinations(segmentIndex + 1, currentCombination + option)
      results.push(...newCombinations)
    }
    
    return results
  }
  
  return generateCombinations(0, '')
}

// 進捗計算（ローマ字ベース、複数パターン対応）
export function calculateRomajiProgress(targetText: string, userInput: string): {
  progress: number
  isComplete: boolean
} {
  const allPossibleInputs = generateAllRomajiCombinations(targetText)
  
  let bestProgress = 0
  let isComplete = false
  
  for (const possibleInput of allPossibleInputs) {
    const validation = validateRomajiInputSingle(possibleInput, userInput)
    const progress = possibleInput.length > 0 ? (validation.correctLength / possibleInput.length) * 100 : 0
    
    if (progress > bestProgress) {
      bestProgress = progress
    }
    
    if (validation.correctLength >= possibleInput.length) {
      isComplete = true
    }
  }
  
  return {
    progress: Math.min(bestProgress, 100),
    isComplete
  }
}

// 単一パターンでの検証（内部用）
function validateRomajiInputSingle(targetRomaji: string, userInput: string): {
  correctLength: number
} {
  let correctChars = 0
  
  for (let i = 0; i < userInput.length; i++) {
    if (i < targetRomaji.length && userInput[i] === targetRomaji[i]) {
      correctChars++
    } else {
      break
    }
  }
  
  return { correctLength: correctChars }
}
