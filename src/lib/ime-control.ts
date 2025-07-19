// IME制御のためのユーティリティ（強化版）

export interface IMEState {
  isActive: boolean
  composing: boolean
}

// 半角英数字モードを強制する関数
function forceHalfWidthMode(): void {
  // IMEの状態を強制的に半角英数字に設定を試行
  try {
    // Windows環境でのIME制御（可能な範囲で）
    if (typeof (window as any).ActiveXObject !== 'undefined') {
      // IE環境での制御
      const ime = new (window as any).ActiveXObject('MSIME.Document')
      if (ime) {
        ime.SetModeDefault()
      }
    }
  } catch (e) {
    // エラーは無視（ActiveXが利用できない環境）
  }
  
  // フォーカス要素のIME設定を再適用
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    activeElement.setAttribute('inputmode', 'none')
    activeElement.style.setProperty('ime-mode', 'disabled')
  }
}

// IMEを強制的に無効化する（より厳格な制御）
export function disableIME(element: HTMLElement): void {
  // 複数の方法でIMEを無効化
  (element.style as any).imeMode = 'disabled'
  element.style.setProperty('ime-mode', 'disabled')
  element.style.setProperty('-webkit-ime-mode', 'disabled')
  element.style.setProperty('-moz-ime-mode', 'disabled')
  element.style.setProperty('-ms-ime-mode', 'disabled')
  
  // 属性設定（より強力）
  element.setAttribute('lang', 'en')
  element.setAttribute('inputmode', 'none') // ソフトキーボードを無効化
  element.setAttribute('autocomplete', 'off')
  element.setAttribute('autocorrect', 'off')
  element.setAttribute('autocapitalize', 'off')
  element.setAttribute('spellcheck', 'false')
  element.setAttribute('composition', 'off')
  
  // フォーカス時にIME制御を強化
  element.addEventListener('focus', forceHalfWidthMode, true)
  element.addEventListener('click', forceHalfWidthMode, true)
  
  // compositionイベントを完全に阻止
  element.addEventListener('compositionstart', preventComposition, true)
  element.addEventListener('compositionupdate', preventComposition, true)
  element.addEventListener('compositionend', preventComposition, true)
  
  // inputイベントでも日本語入力をチェック
  element.addEventListener('input', handleInputEvent, true)
  
  // keydownイベントで不正なキーを阻止
  element.addEventListener('keydown', handleKeyDownEvent, true)
  
  // pasteイベントで日本語の貼り付けを阻止
  element.addEventListener('paste', handlePasteEvent, true)
  
  // 初期状態で半角英数字モードを強制
  forceHalfWidthMode()
}

// IMEを有効化する（元に戻す）
export function enableIME(element: HTMLElement): void {
  (element.style as any).imeMode = 'auto'
  element.style.removeProperty('ime-mode')
  element.style.removeProperty('-webkit-ime-mode')
  element.style.removeProperty('-moz-ime-mode')
  element.style.removeProperty('-ms-ime-mode')
  
  element.removeAttribute('lang')
  element.removeAttribute('inputmode')
  element.removeAttribute('autocomplete')
  element.removeAttribute('autocorrect')
  element.removeAttribute('autocapitalize')
  element.removeAttribute('spellcheck')
  element.removeAttribute('composition')
  
  element.removeEventListener('focus', forceHalfWidthMode, true)
  element.removeEventListener('click', forceHalfWidthMode, true)
  element.removeEventListener('compositionstart', preventComposition, true)
  element.removeEventListener('compositionupdate', preventComposition, true)
  element.removeEventListener('compositionend', preventComposition, true)
  element.removeEventListener('input', handleInputEvent, true)
  element.removeEventListener('keydown', handleKeyDownEvent, true)
  element.removeEventListener('paste', handlePasteEvent, true)
}

// 日本語入力（変換）を完全に阻止する
function preventComposition(event: CompositionEvent): void {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  
  // 入力フィールドをクリア
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  if (target && 'value' in target) {
    const cursorPosition = target.selectionStart || 0
    const value = target.value
    const beforeCursor = value.slice(0, cursorPosition)
    const afterCursor = value.slice(cursorPosition)
    
    // 日本語文字を除去
    const cleanBefore = beforeCursor.replace(/[^\x00-\x7F]/g, '')
    target.value = cleanBefore + afterCursor
    target.setSelectionRange(cleanBefore.length, cleanBefore.length)
  }
}

// 入力イベントのハンドリング（日本語検出と自動変換）
function handleInputEvent(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  if (!target || !('value' in target)) return
  
  const originalValue = target.value
  const cursorPosition = target.selectionStart || 0
  
  // 日本語文字を検出して自動的に除去・変換
  const detection = detectJapaneseInput(originalValue)
  if (detection.hasJapanese) {
    // 日本語文字を除去し、変換可能な文字は半角に変換
    let cleanValue = convertToHalfWidth(originalValue)
    cleanValue = cleanValue.replace(/[^\x00-\x7F]/g, '') // 残った日本語文字を除去
    
    target.value = cleanValue
    target.setSelectionRange(Math.min(cursorPosition, cleanValue.length), Math.min(cursorPosition, cleanValue.length))
    
    // 無音で処理（警告は出さない）
    console.log('日本語入力を自動的に半角英数字に変換しました')
  }
  
  // 全角英数字を半角に自動変換
  const halfWidthValue = convertToHalfWidth(target.value)
  if (halfWidthValue !== target.value) {
    target.value = halfWidthValue
    target.setSelectionRange(cursorPosition, cursorPosition)
  }
}

// キーダウンイベントのハンドリング（不正なキーを阻止）
function handleKeyDownEvent(event: KeyboardEvent): void {
  // IMEキーを無効化
  if (event.code === 'Lang1' || event.code === 'Lang2' || 
      event.key === 'Convert' || event.key === 'NonConvert' ||
      event.key === 'KanaMode' || event.key === 'HiraganKatakana') {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  
  // Ctrl+Spaceなどの入力切り替えを無効化
  if (event.ctrlKey && event.code === 'Space') {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  
  // Alt+~などの切り替えも無効化
  if (event.altKey && event.code === 'Backquote') {
    event.preventDefault()
    event.stopPropagation()
    return
  }
}

// ペーストイベントのハンドリング（日本語の貼り付けを阻止）
function handlePasteEvent(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData?.getData('text') || ''
  const detection = detectJapaneseInput(clipboardData)
  
  if (detection.hasJapanese) {
    event.preventDefault()
    event.stopPropagation()
    
    // 半角文字のみを抽出して貼り付け
    const cleanText = clipboardData.replace(/[^\x00-\x7F]/g, '')
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    if (target && 'value' in target) {
      const cursorPosition = target.selectionStart || 0
      const value = target.value
      const newValue = value.slice(0, cursorPosition) + cleanText + value.slice(target.selectionEnd || cursorPosition)
      target.value = newValue
      target.setSelectionRange(cursorPosition + cleanText.length, cursorPosition + cleanText.length)
    }
    
    console.warn('日本語文字を含む貼り付けが検出されました。半角文字のみ貼り付けました。')
  }
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
export function detectJapaneseInput(input: string | KeyboardEvent): {
  hasJapanese: boolean
  japaneseChars: string[]
  message?: string
} {
  const japaneseChars: string[] = []
  let text: string = ''
  
  // KeyboardEventの場合はkeyプロパティから文字を取得
  if (typeof input === 'object' && 'key' in input) {
    text = input.key || ''
  } else if (typeof input === 'string') {
    text = input
  }
  
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

/**
 * Ultimate input restriction - completely blocks all non-half-width input
 * No system configuration required, works entirely in browser
 */
export function createUltimateInputRestriction(element: HTMLInputElement | HTMLTextAreaElement): () => void {
  // 入力値を常に監視し、半角英数字以外を即座に除去
  let lastValidValue = ''
  
  const enforceHalfWidthOnly = () => {
    const currentValue = element.value
    // 半角英数字、基本的な記号、スペースのみ許可
    const filteredValue = currentValue.replace(/[^a-zA-Z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '')
    
    if (filteredValue !== currentValue) {
      element.value = filteredValue
      // カーソル位置を調整
      const cursorPos = element.selectionStart || 0
      const removedChars = currentValue.length - filteredValue.length
      element.setSelectionRange(cursorPos - removedChars, cursorPos - removedChars)
    }
    
    lastValidValue = filteredValue
  }
  
  // 最も優先度の高いイベントリスナーを設定
  const handleKeyDown = (e: KeyboardEvent) => {
    // 制御キーは許可
    if (e.ctrlKey || e.altKey || e.metaKey) return
    
    // 特殊キー（ナビゲーション、編集）は許可
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5',
      'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ]
    
    if (allowedKeys.includes(e.key)) return
    
    // 半角英数字と基本記号のみ許可
    if (!/^[a-zA-Z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]$/.test(e.key)) {
      e.preventDefault()
      e.stopImmediatePropagation()
      return false
    }
  }
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (!/^[a-zA-Z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]$/.test(e.key)) {
      e.preventDefault()
      e.stopImmediatePropagation()
      return false
    }
  }
  
  const handleInput = (e: Event) => {
    enforceHalfWidthOnly()
  }
  
  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const clipboardData = e.clipboardData?.getData('text') || ''
    const filteredData = clipboardData.replace(/[^a-zA-Z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '')
    
    const cursorPos = element.selectionStart || 0
    const value = element.value
    const newValue = value.slice(0, cursorPos) + filteredData + value.slice(element.selectionEnd || cursorPos)
    element.value = newValue
    element.setSelectionRange(cursorPos + filteredData.length, cursorPos + filteredData.length)
  }
  
  const handleCompositionStart = (e: CompositionEvent) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    return false
  }
  
  const handleCompositionUpdate = (e: CompositionEvent) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    return false
  }
  
  const handleCompositionEnd = (e: CompositionEvent) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    enforceHalfWidthOnly()
    return false
  }
  
  // フォーカス時の処理
  const handleFocus = () => {
    // IME設定を強制的に変更
    disableIME(element)
    enforceHalfWidthOnly()
    
    // 継続的な監視を開始
    const monitor = setInterval(() => {
      enforceHalfWidthOnly()
    }, 50) // 50ms間隔で監視
    
    // フォーカスが外れたら監視停止
    const handleBlur = () => {
      clearInterval(monitor)
      element.removeEventListener('blur', handleBlur)
    }
    
    element.addEventListener('blur', handleBlur, { once: true })
  }
  
  // 最高優先度でイベントリスナーを追加
  element.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })
  element.addEventListener('keypress', handleKeyPress, { capture: true, passive: false })
  element.addEventListener('input', handleInput, { capture: true })
  element.addEventListener('paste', handlePaste, { capture: true })
  element.addEventListener('compositionstart', handleCompositionStart, { capture: true, passive: false })
  element.addEventListener('compositionupdate', handleCompositionUpdate, { capture: true, passive: false })
  element.addEventListener('compositionend', handleCompositionEnd, { capture: true, passive: false })
  element.addEventListener('focus', handleFocus, { capture: true })
  
  // 初期化
  enforceHalfWidthOnly()
  
  // クリーンアップ関数
  return () => {
    element.removeEventListener('keydown', handleKeyDown, { capture: true } as any)
    element.removeEventListener('keypress', handleKeyPress, { capture: true } as any)
    element.removeEventListener('input', handleInput, { capture: true } as any)
    element.removeEventListener('paste', handlePaste, { capture: true } as any)
    element.removeEventListener('compositionstart', handleCompositionStart, { capture: true } as any)
    element.removeEventListener('compositionupdate', handleCompositionUpdate, { capture: true } as any)
    element.removeEventListener('compositionend', handleCompositionEnd, { capture: true } as any)
    element.removeEventListener('focus', handleFocus, { capture: true } as any)
  }
}

/**
 * Advanced IME detection and automatic switching
 * Automatically switches to half-width mode when IME is detected
 */
export function createAutoHalfWidthSwitcher(element: HTMLInputElement | HTMLTextAreaElement): () => void {
  let isMonitoring = false
  
  const forceHalfWidthMode = () => {
    // 複数の方法でIMEを無効化
    element.style.imeMode = 'disabled'
    element.style.webkitUserModify = 'read-write-plaintext-only'
    element.setAttribute('inputmode', 'latin')
    element.setAttribute('autocomplete', 'off')
    element.setAttribute('autocorrect', 'off')
    element.setAttribute('autocapitalize', 'off')
    element.setAttribute('spellcheck', 'false')
    
    // CSS属性でも制御
    element.classList.add('ime-disabled')
  }
  
  const detectAndSwitch = () => {
    // IMEの状態を検出し、自動的に切り替え
    const computedStyle = window.getComputedStyle(element)
    const imeMode = computedStyle.imeMode
    
    if (imeMode !== 'disabled') {
      forceHalfWidthMode()
    }
    
    // 日本語入力の検出
    const value = element.value
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF01-\uFF5E]/.test(value)) {
      // 日本語文字を検出したら半角に変換
      const convertedValue = value.replace(/[\uFF01-\uFF5E]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      }).replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
      
      element.value = convertedValue
    }
  }
  
  const startMonitoring = () => {
    if (isMonitoring) return
    isMonitoring = true
    
    forceHalfWidthMode()
    
    // 継続的な監視
    const monitor = setInterval(() => {
      detectAndSwitch()
    }, 100)
    
    // フォーカスが外れたら監視停止
    const stopMonitoring = () => {
      isMonitoring = false
      clearInterval(monitor)
      element.removeEventListener('blur', stopMonitoring)
    }
    
    element.addEventListener('blur', stopMonitoring, { once: true })
  }
  
  element.addEventListener('focus', startMonitoring)
  element.addEventListener('click', startMonitoring)
  
  // 初期設定
  if (document.activeElement === element) {
    startMonitoring()
  }
  
  return () => {
    element.removeEventListener('focus', startMonitoring)
    element.removeEventListener('click', startMonitoring)
  }
}

/**
 * System-level input method configuration instructions
 */
export function getSystemInputMethodInstructions(): {
  success: boolean
  instructions: string[]
  powershellScript?: string
} {
  const instructions = [
    "Windowsの入力方式を半角英数字に固定する方法：",
    "",
    "【個別PC設定】",
    "1. システム設定による方法：",
    "   - Windows設定 → 時刻と言語 → 言語と地域",
    "   - 「日本語」をクリック → 「言語のオプション」",
    "   - 「Microsoft IME」→「キーボードオプション」",
    "   - 「全般」タブで「既定の入力モード」を「英数」に設定",
    "",
    "2. レジストリによる方法（管理者権限必要）：",
    "   - 以下のPowerShellスクリプトを管理者として実行",
    "",
    "【教室環境での一括設定】",
    "3. グループポリシーによる方法（ドメイン環境）：",
    "   - gpedit.msc → ユーザーの構成 → 管理用テンプレート",
    "   - Windows コンポーネント → IME",
    "   - 「既定の入力モードを設定する」を有効にして「英数」を選択",
    "",
    "4. MDM（Microsoft Intune）での一括管理：",
    "   - デバイス構成プロファイルでIME設定を一括配布"
  ]
  
  const powershellScript = `# Windows IME を英数モードに固定するPowerShellスクリプト
# 管理者権限で実行してください

Write-Host "Windows IME設定を英数モードに変更しています..."

try {
    # レジストリキーの設定
    $regPath = "HKCU:\\Software\\Microsoft\\IME\\15.0\\IMEJP\\MSIME"
    
    # レジストリキーが存在しない場合は作成
    if (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    
    # 既定の入力モードを英数（1）に設定
    Set-ItemProperty -Path $regPath -Name "Default Input Mode" -Value 1 -Type DWord
    
    # Caps Lockキーでの切り替えを無効化
    Set-ItemProperty -Path $regPath -Name "CapsLock" -Value 0 -Type DWord
    
    # Shift+Spaceでの切り替えを無効化  
    Set-ItemProperty -Path $regPath -Name "ShiftSpace" -Value 0 -Type DWord
    
    Write-Host "✓ IME設定が正常に変更されました"
    Write-Host "✓ 次回ログイン時から有効になります"
    
} catch {
    Write-Error "❌ 設定の変更に失敗しました: $_"
}

Write-Host ""
Write-Host "追加の推奨設定："
Write-Host "1. タスクバーの言語バーを右クリック → プロパティ"
Write-Host "2. 「詳細なキー設定」タブで不要なキーシーケンスを無効化"
Write-Host "3. 「言語バー」タブで「デスクトップ上でフロート表示する」をオフ"
`
  
  return {
    success: false,
    instructions,
    powershellScript
  }
}
