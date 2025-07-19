// IME（Input Method Editor）制御のためのユーティリティ

export interface IMEState {
  isActive: boolean
  composing: boolean
}

// IMEを無効化する
export function disableIME(element: HTMLElement): void {
  // IME-modeを使用（レガシーだが最も確実）
  (element.style as any).imeMode = 'disabled'
  
  // CSS プロパティとして設定
  element.style.setProperty('ime-mode', 'disabled')
  element.setAttribute('lang', 'en')
  element.setAttribute('inputmode', 'latin')
  
  // compositionイベントを無効化
  element.addEventListener('compositionstart', preventComposition)
  element.addEventListener('compositionupdate', preventComposition)
  element.addEventListener('compositionend', preventComposition)
}

// IMEを有効化する（元に戻す）
export function enableIME(element: HTMLElement): void {
  (element.style as any).imeMode = 'auto'
  element.style.setProperty('ime-mode', 'auto')
  element.removeAttribute('lang')
  element.removeAttribute('inputmode')
  
  element.removeEventListener('compositionstart', preventComposition)
  element.removeEventListener('compositionupdate', preventComposition)
  element.removeEventListener('compositionend', preventComposition)
}

// 日本語入力（変換）を阻止する
function preventComposition(event: CompositionEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

// 入力文字が半角英数字のみかチェック
export function isValidRomajiChar(char: string): boolean {
  // 半角英数字、スペース、一般的な記号のみ許可
  return /^[a-zA-Z0-9\s\-\.,!?;:'"\(\)\[\]{}@#$%^&*+=_|\\/<>~`]*$/.test(char)
}

// 全角文字を半角に変換
export function convertToHalfWidth(text: string): string {
  return text
    // 全角英数字を半角に変換
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    })
    // 全角スペースを半角スペースに変換
    .replace(/　/g, ' ')
    // 全角記号を半角に変換
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    .replace(/；/g, ';')
    .replace(/：/g, ':')
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/［/g, '[')
    .replace(/］/g, ']')
    .replace(/｛/g, '{')
    .replace(/｝/g, '}')
}

// ひらがな・カタカナ・漢字の入力を検出して警告
export function detectJapaneseInput(text: string): {
  hasJapanese: boolean
  japaneseChars: string[]
  message?: string
} {
  const japaneseChars: string[] = []
  
  for (const char of text) {
    // ひらがな、カタカナ、漢字をチェック
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
      japaneseChars.push(char)
    }
  }
  
  const hasJapanese = japaneseChars.length > 0
  let message: string | undefined
  
  if (hasJapanese) {
    message = `日本語入力が検出されました: "${japaneseChars.join('')}"\nローマ字（半角英数字）で入力してください。`
  }
  
  return {
    hasJapanese,
    japaneseChars,
    message
  }
}

// キーボードイベントのフィルタリング
export function filterKeyboardInput(event: KeyboardEvent): boolean {
  const key = event.key
  
  // 制御キー（Enter、Backspace、Delete、Arrow keys等）は許可
  if (key.length > 1) {
    return true
  }
  
  // 半角英数字のみ許可
  if (isValidRomajiChar(key)) {
    return true
  }
  
  // 無効な文字の場合は阻止
  event.preventDefault()
  event.stopPropagation()
  return false
}

// IME状態を監視するクラス
export class IMEMonitor {
  private element: HTMLElement
  private onStateChange: (state: IMEState) => void
  private currentState: IMEState = { isActive: false, composing: false }
  
  constructor(element: HTMLElement, onStateChange: (state: IMEState) => void) {
    this.element = element
    this.onStateChange = onStateChange
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    // composition events
    this.element.addEventListener('compositionstart', this.handleCompositionStart.bind(this))
    this.element.addEventListener('compositionupdate', this.handleCompositionUpdate.bind(this))
    this.element.addEventListener('compositionend', this.handleCompositionEnd.bind(this))
    
    // input events
    this.element.addEventListener('input', this.handleInput.bind(this))
  }
  
  private handleCompositionStart(): void {
    this.currentState.composing = true
    this.currentState.isActive = true
    this.onStateChange(this.currentState)
  }
  
  private handleCompositionUpdate(): void {
    this.currentState.composing = true
    this.currentState.isActive = true
    this.onStateChange(this.currentState)
  }
  
  private handleCompositionEnd(): void {
    this.currentState.composing = false
    this.currentState.isActive = false
    this.onStateChange(this.currentState)
  }
  
  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    const detection = detectJapaneseInput(target.value)
    
    if (detection.hasJapanese) {
      // 日本語入力を検出した場合、半角に変換を試みる
      const converted = convertToHalfWidth(target.value)
      if (converted !== target.value) {
        target.value = converted
      }
    }
  }
  
  destroy(): void {
    this.element.removeEventListener('compositionstart', this.handleCompositionStart.bind(this))
    this.element.removeEventListener('compositionupdate', this.handleCompositionUpdate.bind(this))
    this.element.removeEventListener('compositionend', this.handleCompositionEnd.bind(this))
    this.element.removeEventListener('input', this.handleInput.bind(this))
  }
}
