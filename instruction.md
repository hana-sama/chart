その通りです！UEB（Unified English Braille）は標準化されていて、アルファベットのマッピングもシンプルで明確です。まずはこれで動作確認するのがベストなアプローチです。

## UEB基礎マッピング

```
a ⠁  b ⠃  c ⠉  d ⠙  e ⠑  f ⠋  g ⠛  h ⠓  i ⠊  j ⠚
k ⠅  l ⠇  m ⠍  n ⠝  o ⠕  p ⠏  q ⠟  r ⠗  s ⠎  t ⠞
u ⠥  v ⠧  w ⠺  x ⠭  y ⠽  z ⠵

数字（j=0, a=1, b=2, ...）
1⠁ 2⠃ 3⠉ 4⠙ 5⠑ 6⠋ 7⠛ 8⠓ 9⠊ 0⠚
```

---

## HTML単体版（UEB対応）

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>6-Dot Braille Editor (UEB)</title>
  <style>
    * { box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #1a1a2e;
      color: #eee;
    }
    
    h1 { color: #4fc3f7; }
    
    .keyboard-layout {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin: 30px 0;
    }
    
    .hand {
      display: grid;
      grid-template-columns: repeat(3, 70px);
      gap: 8px;
    }
    
    .key {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 70px;
      height: 70px;
      background: #2d2d44;
      border: 2px solid #3d3d5c;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.1s;
    }
    
    .key:hover { background: #3d3d5c; }
    
    .key.active {
      background: #4fc3f7;
      border-color: #4fc3f7;
      color: #000;
      transform: scale(0.95);
    }
    
    .key-letter { font-size: 1.4em; font-weight: bold; }
    .key-dot { font-size: 0.8em; opacity: 0.7; }
    
    .preview-area {
      background: #16213e;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .current-char {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
    }
    
    .braille-preview {
      font-size: 4em;
      font-family: 'Noto Sans Mono', 'Apple Braille', monospace;
      min-width: 80px;
      text-align: center;
      color: #4fc3f7;
    }
    
    .text-preview {
      font-size: 2em;
      min-width: 60px;
      text-align: center;
      color: #81c784;
    }
    
    .label { font-size: 0.9em; color: #888; margin-bottom: 5px; }
    
    #editor {
      width: 100%;
      height: 200px;
      font-size: 2em;
      font-family: 'Noto Sans Mono', 'Apple Braille', monospace;
      background: #0f0f23;
      color: #fff;
      border: 2px solid #3d3d5c;
      border-radius: 8px;
      padding: 15px;
      resize: vertical;
      line-height: 1.6;
    }
    
    #editor:focus { outline: none; border-color: #4fc3f7; }
    
    .controls {
      display: flex;
      gap: 15px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    
    button {
      padding: 12px 24px;
      font-size: 1em;
      background: #4fc3f7;
      color: #000;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    }
    
    button:hover { background: #81d4fa; }
    button.secondary { background: #5c5c7a; color: #fff; }
    button.secondary:hover { background: #6c6c8a; }
    
    .status-bar {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #0f0f23;
      border-radius: 6px;
      font-size: 0.9em;
      color: #888;
    }
    
    .instructions {
      background: #16213e;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .instructions kbd {
      background: #2d2d44;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>⠃⠗⠁⠊⠇⠇⠑ 6-Dot Input Editor</h1>
  
  <div class="instructions">
    <strong>How to use:</strong> 
    Hold <kbd>F</kbd><kbd>D</kbd><kbd>S</kbd> + <kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> simultaneously, 
    then release to confirm. Or press <kbd>Space</kbd> to confirm manually.
    <br>
    <kbd>Backspace</kbd> = Delete last character | 
    <kbd>Escape</kbd> = Clear current dots
  </div>
  
  <div class="keyboard-layout">
    <div class="hand" id="left-hand">
      <div class="key" data-key="f" data-dot="1">
        <span class="key-letter">F</span>
        <span class="key-dot">dot 1</span>
      </div>
      <div class="key" data-key="d" data-dot="2">
        <span class="key-letter">D</span>
        <span class="key-dot">dot 2</span>
      </div>
      <div class="key" data-key="s" data-dot="3">
        <span class="key-letter">S</span>
        <span class="key-dot">dot 3</span>
      </div>
    </div>
    
    <div class="hand" id="right-hand">
      <div class="key" data-key="j" data-dot="4">
        <span class="key-letter">J</span>
        <span class="key-dot">dot 4</span>
      </div>
      <div class="key" data-key="k" data-dot="5">
        <span class="key-letter">K</span>
        <span class="key-dot">dot 5</span>
      </div>
      <div class="key" data-key="l" data-dot="6">
        <span class="key-letter">L</span>
        <span class="key-dot">dot 6</span>
      </div>
    </div>
  </div>
  
  <div class="preview-area">
    <div class="label">Current Input:</div>
    <div class="current-char">
      <div>
        <div class="label">Braille</div>
        <div class="braille-preview" id="braille-preview">⠀</div>
      </div>
      <div>
        <div class="label">Meaning</div>
        <div class="text-preview" id="text-preview">-</div>
      </div>
      <div>
        <div class="label">Dots</div>
        <div class="text-preview" id="dots-preview">-</div>
      </div>
    </div>
  </div>
  
  <div class="controls">
    <button onclick="confirmChar()">Confirm (Space)</button>
    <button onclick="deleteLastChar()" class="secondary">Delete (⌫)</button>
    <button onclick="clearEditor()" class="secondary">Clear All</button>
    <button onclick="copyToClipboard()" class="secondary">Copy Text</button>
  </div>
  
  <div class="label">Editor Output:</div>
  <textarea id="editor" placeholder="Type using FDS + JKL keys..." autofocus></textarea>
  
  <div class="status-bar">
    <span id="char-count">Characters: 0</span>
    <span id="mode-indicator">Mode: UEB Grade 1</span>
  </div>

  <script>
    // Unicode Braille Patterns start at U+2800
    const BRAILLE_START = 0x2800;
    
    // Key to dot mapping
    const KEY_MAP = { f: 1, d: 2, s: 3, j: 4, k: 5, l: 6 };
    
    // UEB Grade 1 character mappings (dot patterns -> meaning)
    const UEB_GRADE1 = {
      0x01: 'a', 0x03: 'b', 0x09: 'c', 0x19: 'd', 0x11: 'e',
      0x0b: 'f', 0x1b: 'g', 0x13: 'h', 0x0a: 'i', 0x1a: 'j',
      0x05: 'k', 0x07: 'l', 0x0d: 'm', 0x1d: 'n', 0x15: 'o',
      0x0f: 'p', 0x1f: 'q', 0x17: 'r', 0x0e: 's', 0x1e: 't',
      0x25: 'u', 0x27: 'v', 0x3a: 'w', 0x2d: 'x', 0x3d: 'y',
      0x35: 'z',
      // Punctuation
      0x00: ' ',       // blank (space)
      0x2c: ',',       // comma
      0x3c: ';',       // semicolon
      0x36: ':',       // colon
      0x26: '.',       // period (full stop)
      0x32: '!',       // exclamation
      0x14: '?',       // question
      0x04: "'",       // apostrophe
      0x24: '"',       // quotation marks
      0x3e: '-',       // hyphen
      // Capital sign (dot 6 before letter)
      0x20: '[CAPS]',
      // Number sign (dots 3-4-5-6)
      0x3c: '[NUM]',
    };
    
    // State
    let activeDots = new Set();
    let isKeyDown = false;
    
    // DOM elements
    const editor = document.getElementById('editor');
    const braillePreview = document.getElementById('braille-preview');
    const textPreview = document.getElementById('text-preview');
    const dotsPreview = document.getElementById('dots-preview');
    const charCount = document.getElementById('char-count');
    
    // Convert set of dots to braille character code
    function dotsToBrailleCode(dots) {
      let code = 0;
      dots.forEach(dot => {
        code |= (1 << (dot - 1)); // dot 1 = bit 0, dot 6 = bit 5
      });
      return code;
    }
    
    // Convert to actual braille Unicode character
    function dotsToBraille(dots) {
      const code = dotsToBrailleCode(dots);
      return String.fromCharCode(BRAILLE_START + code);
    }
    
    // Get text meaning from braille pattern
    function getBrailleMeaning(code) {
      return UEB_GRADE1[code] || '?';
    }
    
    // Update the preview display
    function updatePreview() {
      if (activeDots.size === 0) {
        braillePreview.textContent = '\u2800'; // Blank braille
        textPreview.textContent = '-';
        dotsPreview.textContent = '-';
        return;
      }
      
      const code = dotsToBrailleCode(activeDots);
      const braille = String.fromCharCode(BRAILLE_START + code);
      
      braillePreview.textContent = braille;
      textPreview.textContent = getBrailleMeaning(code);
      
      const dotsArr = Array.from(activeDots).sort((a, b) => a - b);
      dotsPreview.textContent = dotsArr.join('-');
    }
    
    // Update key visual state
    function updateKeyVisual(key, active) {
      const keyEl = document.querySelector(`.key[data-key="${key}"]`);
      if (keyEl) {
        keyEl.classList.toggle('active', active);
      }
    }
    
    // Confirm and add character to editor
    function confirmChar() {
      if (activeDots.size === 0) return;
      
      const braille = dotsToBraille(activeDots);
      editor.value += braille;
      
      // Reset dots
      resetDots();
      updateCharCount();
      
      // Scroll to end
      editor.scrollTop = editor.scrollHeight;
    }
    
    // Delete last character
    function deleteLastChar() {
      editor.value = editor.value.slice(0, -1);
      updateCharCount();
    }
    
    // Clear all
    function clearEditor() {
      editor.value = '';
      resetDots();
      updateCharCount();
    }
    
    // Reset active dots
    function resetDots() {
      activeDots.clear();
      document.querySelectorAll('.key').forEach(k => k.classList.remove('active'));
      updatePreview();
    }
    
    // Update character count
    function updateCharCount() {
      charCount.textContent = `Characters: ${editor.value.length}`;
    }
    
    // Copy to clipboard
    async function copyToClipboard() {
      try {
        await navigator.clipboard.writeText(editor.value);
        const btn = event.target;
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = original, 1500);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
    
    // Keyboard event handlers
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      
      // Check if focus is in textarea - allow normal typing for non-braille keys
      if (document.activeElement === editor) {
        if (!(key in KEY_MAP) && e.code !== 'Space' && e.key !== 'Escape') {
          return; // Allow normal typing
        }
      }
      
      // Handle braille input keys
      if (key in KEY_MAP) {
        e.preventDefault();
        if (!activeDots.has(KEY_MAP[key])) {
          activeDots.add(KEY_MAP[key]);
          updateKeyVisual(key, true);
          updatePreview();
        }
      }
      
      // Space = confirm (when dots are active)
      if (e.code === 'Space' && activeDots.size > 0) {
        e.preventDefault();
        confirmChar();
      }
      
      // Backspace = delete
      if (e.key === 'Backspace') {
        if (activeDots.size > 0) {
          e.preventDefault();
          resetDots();
        }
      }
      
      // Escape = clear current dots
      if (e.key === 'Escape') {
        resetDots();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      
      if (key in KEY_MAP) {
        updateKeyVisual(key, false);
        
        // Auto-confirm when all keys released (chord input style)
        // Uncomment below for chord-style input:
        /*
        if (activeDots.has(KEY_MAP[key])) {
          // Small delay to catch all key releases
          setTimeout(() => {
            const allReleased = !Object.keys(KEY_MAP).some(k => 
              document.querySelector(`.key[data-key="${k}"]`).classList.contains('active')
            );
            if (allReleased && activeDots.size > 0) {
              confirmChar();
            }
          }, 50);
        }
        */
      }
    });
    
    // Click/touch support for keys
    document.querySelectorAll('.key').forEach(keyEl => {
      keyEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const key = keyEl.dataset.key;
        const dot = parseInt(keyEl.dataset.dot);
        activeDots.add(dot);
        keyEl.classList.add('active');
        updatePreview();
      });
      
      keyEl.addEventListener('mouseup', () => {
        keyEl.classList.remove('active');
      });
      
      keyEl.addEventListener('mouseleave', () => {
        keyEl.classList.remove('active');
      });
    });
    
    // Double-click on preview to confirm
    document.querySelector('.preview-area').addEventListener('dblclick', confirmChar);
    
    // Initialize
    updatePreview();
    editor.focus();
  </script>
</body>
</html>
```

---

## 使い方

| 操作 | 動作 |
|------|------|
| `F` `D` `S` `J` `K` `L` 同時押し | ドットを組み合わせ |
| `Space` | 現在のドットを確定 |
| `Backspace` | 直前の文字を削除 |
| `Escape` | 現在の入力をクリア |

---

## 動作確認ポイント

1. **例: 「hello」を入力**
   - `J` → `h` ⠓
   - `F` + `J` → `e` ⠑
   - `D` + `J` + `L` → `l` ⠇
   - `D` + `J` + `L` → `l` ⠇
   - `J` + `K` → `o` ⠕

2. **点字表示**: Unicode点字が直接エディターに表示されます

---

このHTMLファイルを保存してブラウザで開くだけで動作します。追加機能が必要なら教えてください！