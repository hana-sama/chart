// ==================== LAYOUT STORAGE ====================

const LayoutStorage = {
  save(layoutKey) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAYOUT, layoutKey);
      return true;
    } catch (e) {
      console.warn('Failed to save layout preference:', e);
      return false;
    }
  },

  load(defaultLayout) {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAYOUT);
      if (saved && saved.trim()) return saved;
    } catch (e) {
      console.warn('Failed to load layout preference:', e);
    }
    return defaultLayout;
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEYS.LAYOUT);
    } catch (e) {
      console.warn('Failed to clear layout preference:', e);
    }
  },
};

// ==================== EDITOR STATE ====================

class EditorState {
  constructor() {
    this.activeDots   = new Set();
    this.brailleContent = '';
    this.textContent    = '';
    this.numberMode     = false;
    this.capitalMode    = 0;  // 0: off, 1: next capital, 2: all caps
  }

  /** Reset only the current dot input, keeping document content. */
  resetDots() {
    this.activeDots.clear();
  }

  /** Clear the entire document and all modes. */
  clearAll() {
    this.activeDots.clear();
    this.brailleContent = '';
    this.textContent    = '';
    this.numberMode     = false;
    this.capitalMode    = 0;
  }

  /** Cycle capital mode: off → next → caps-lock → off */
  cycleCapitalMode() {
    this.capitalMode = (this.capitalMode + 1) % 3;
  }

  /** Delete the last character and recalculate number mode. */
  deleteLastChar() {
    if (this.brailleContent.length === 0) return;
    this.brailleContent = this.brailleContent.slice(0, -1);
    this.textContent    = this.textContent.slice(0, -1);
    this.recalculateNumberMode();
  }

  /** Scan backwards through braille content to determine number-mode state. */
  recalculateNumberMode() {
    this.numberMode = false;
    for (let i = this.brailleContent.length - 1; i >= 0; i--) {
      const code = this.brailleContent.charCodeAt(i) - BRAILLE_START;
      if (code === NUMBER_SIGN_CODE) { this.numberMode = true;  return; }
      if (code === 0)                { this.numberMode = false; return; }
    }
  }
}

// ==================== GLOBALS ====================

let currentLayout = DEFAULT_LAYOUT;
let KEY_MAP = {};
const state = new EditorState();

// ==================== DOM ELEMENTS ====================

const dom = {
  braillePreview:       document.getElementById('braille-preview'),
  textPreview:          document.getElementById('text-preview'),
  dotsPreview:          document.getElementById('dots-preview'),
  brailleEditor:        document.getElementById('braille-editor'),
  textEditor:           document.getElementById('text-editor'),
  brailleCount:         document.getElementById('braille-count'),
  textCount:            document.getElementById('text-count'),
  alphabetGrid:         document.getElementById('alphabet-grid'),
  numberGrid:           document.getElementById('number-grid'),
  numberModeIndicator:  document.getElementById('number-mode-indicator'),
  capitalModeIndicator: document.getElementById('capital-mode-indicator'),
  statusText:           document.getElementById('status-text'),
  layoutSelector:       document.getElementById('layout-selector'),
  layoutDescription:    document.getElementById('layout-description'),
  keyboardLayout:       document.getElementById('keyboard-layout'),
  toast:                document.getElementById('toast'),
  copyBrailleBtn:       document.getElementById('btn-copy-braille'),
  copyTextBtn:          document.getElementById('btn-copy-text'),
};

// ==================== TOAST NOTIFICATION ====================

function showToast(message, duration = 2000) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  setTimeout(() => dom.toast.classList.remove('show'), duration);
}

// ==================== UTILITY FUNCTIONS ====================

function dotsToCode(dots)    { let c = 0; dots.forEach(d => c |= (1 << (d - 1))); return c; }
function codeToBraille(code) { return String.fromCharCode(BRAILLE_START + code); }
function dotsToBraille(dots) { return codeToBraille(dotsToCode(dots)); }
function codeToText(code)    { return UEB_GRADE1[code] || '?'; }
function dotsArray(dots)     { return Array.from(dots).sort((a, b) => a - b); }
function isLetterAtoJ(code)  { return code in NUMBER_MAP; }

function isLetter(code) {
  return UEB_GRADE1[code] && UEB_GRADE1[code].length === 1 &&
         UEB_GRADE1[code] >= 'a' && UEB_GRADE1[code] <= 'z';
}

// ==================== TEMPLATE HELPERS ====================

function renderKey(key, dot) {
  return `<div class="key" data-key="${key.toLowerCase()}" data-dot="${dot}">
    <span class="key-letter">${key.toUpperCase()}</span>
    <span class="key-dot">${dot}</span>
  </div>`;
}

function renderAlphaItem(braille, text, dotsStr, dataAttr, dataValue) {
  return `<div class="alpha-item" ${dataAttr}="${dataValue}">
    <span class="alpha-braille">${braille}</span>
    <span class="alpha-text">${text}</span>
    <span class="alpha-dots">${dotsStr}</span>
  </div>`;
}

function codeToDots(code) {
  const dots = [];
  for (let i = 1; i <= 6; i++) {
    if (code & (1 << (i - 1))) dots.push(i);
  }
  return dots;
}

// ==================== LAYOUT MANAGEMENT ====================

function initLayoutSelector() {
  dom.layoutSelector.innerHTML = Object.entries(LAYOUTS).map(([key, layout]) => `
    <div class="layout-option">
      <input type="radio" id="layout-${key}" name="layout" value="${key}" ${key === currentLayout ? 'checked' : ''}>
      <label for="layout-${key}">${layout.name}</label>
    </div>
  `).join('');

  document.querySelectorAll('input[name="layout"]').forEach(radio => {
    radio.addEventListener('change', (e) => setLayout(e.target.value));
  });

  updateLayoutDescription();
}

function setLayout(layoutKey) {
  if (!LAYOUTS[layoutKey]) { console.error(`Unknown layout: ${layoutKey}`); return; }

  currentLayout = layoutKey;
  const layout = LAYOUTS[layoutKey];

  // Build KEY_MAP from layout
  KEY_MAP = {};
  [...layout.leftHand, ...layout.rightHand].forEach(({ key, dot }) => {
    KEY_MAP[key.toLowerCase()] = dot;
    KEY_MAP[key.toUpperCase()] = dot;
  });

  updateLayoutDescription();
  rebuildKeyboardVisual();
  resetDotsUI();
  updateInstructions();
  LayoutStorage.save(layoutKey);

  const radio = document.getElementById(`layout-${layoutKey}`);
  if (radio) radio.checked = true;
}

function cycleToNextLayout() {
  const layouts = Object.keys(LAYOUTS);
  const nextLayout = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
  setLayout(nextLayout);
  showToast(`Layout: ${LAYOUTS[nextLayout].name}`);
}

function updateLayoutDescription() {
  dom.layoutDescription.textContent = LAYOUTS[currentLayout].description;
}

function rebuildKeyboardVisual() {
  const layout = LAYOUTS[currentLayout];
  const leftHTML  = layout.leftHand.map(({ key, dot })  => renderKey(key, dot)).join('');
  const rightHTML = layout.rightHand.map(({ key, dot }) => renderKey(key, dot)).join('');

  dom.keyboardLayout.innerHTML = `
    <div class="hand">${leftHTML}</div>
    <div class="hand">${rightHTML}</div>
  `;
  attachKeyListeners();
}

function attachKeyListeners() {
  document.querySelectorAll('.key').forEach(keyEl => {
    keyEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      state.activeDots.add(parseInt(keyEl.dataset.dot));
      keyEl.classList.add('active');
      updatePreview();
    });
    keyEl.addEventListener('mouseup',    () => keyEl.classList.remove('active'));
    keyEl.addEventListener('mouseleave', () => keyEl.classList.remove('active'));
  });
}

function updateInstructions() {
  const layout = LAYOUTS[currentLayout];
  const el = document.querySelector('.instructions p:first-child');
  if (!el) return;
  const leftKeys  = layout.leftHand.map(k  => `<kbd>${k.key.toUpperCase()}</kbd>`).join('');
  const rightKeys = layout.rightHand.map(k => `<kbd>${k.key.toUpperCase()}</kbd>`).join('');
  el.innerHTML = `Hold ${leftKeys} + ${rightKeys} to form dots.`;
}

// ==================== DISPLAY FUNCTIONS ====================

function updatePreview() {
  if (state.activeDots.size === 0) {
    dom.braillePreview.textContent = '\u2800';
    dom.textPreview.textContent = '-';
    dom.dotsPreview.textContent = '-';
    clearAlphabetHighlight();
    return;
  }

  const code    = dotsToCode(state.activeDots);
  const braille = codeToBraille(code);
  const text    = (state.numberMode && isLetterAtoJ(code)) ? NUMBER_MAP[code] : codeToText(code);
  const dots    = dotsArray(state.activeDots).join('-');

  dom.braillePreview.textContent = braille;
  dom.textPreview.textContent    = text;
  dom.dotsPreview.textContent    = dots;
  dom.braillePreview.classList.toggle('has-input', state.activeDots.size > 0);

  if (state.numberMode && isLetterAtoJ(code)) {
    highlightNumber(code);
  } else {
    highlightAlphabet(code);
  }
}

function updateEditors() {
  dom.brailleEditor.innerHTML = state.brailleContent + '<span class="cursor"></span>';
  dom.textEditor.innerHTML    = state.textContent    + '<span class="cursor"></span>';
  dom.brailleCount.textContent = `${state.brailleContent.length} chars`;
  dom.textCount.textContent    = `${state.textContent.length} chars`;
  dom.textEditor.scrollTop     = dom.brailleEditor.scrollTop;
  dom.numberModeIndicator.classList.toggle('active', state.numberMode);
  dom.statusText.textContent = state.numberMode ? 'Number Mode Active' : 'Ready';
}

function updateKeyVisual(key, active) {
  const el = document.querySelector(`.key[data-key="${key.toLowerCase()}"]`);
  if (el) el.classList.toggle('active', active);
}

// ==================== ALPHABET / NUMBER REFERENCE ====================

function buildAlphabetReference() {
  dom.alphabetGrid.innerHTML = 'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => {
    const code = TEXT_TO_BRAILLE[letter];
    if (code === undefined) return '';
    return renderAlphaItem(codeToBraille(code), letter, codeToDots(code).join(''), 'data-code', code);
  }).join('');

  dom.numberGrid.innerHTML = '1234567890'.split('').map(num => {
    const code = NUMBER_TO_BRAILLE[num];
    if (code === undefined) return '';
    return renderAlphaItem(codeToBraille(code), num, UEB_GRADE1[code], 'data-number-code', code);
  }).join('');
}

function highlightAlphabet(code) {
  clearAlphabetHighlight();
  const item = document.querySelector(`.alpha-item[data-code="${code}"]`);
  if (item) item.classList.add('highlight');
}

function highlightNumber(code) {
  clearAlphabetHighlight();
  const item = document.querySelector(`.alpha-item[data-number-code="${code}"]`);
  if (item) item.classList.add('highlight');
}

function clearAlphabetHighlight() {
  document.querySelectorAll('.alpha-item.highlight').forEach(el => el.classList.remove('highlight'));
}

// ==================== CAPITAL MODE INDICATOR ====================

function updateCapitalModeIndicator() {
  const indicator = dom.capitalModeIndicator;
  if (state.capitalMode === 1) {
    indicator.querySelector('span:last-child').textContent = 'Capital (next)';
    indicator.classList.remove('caps-lock');
    indicator.style.display = 'flex';
  } else if (state.capitalMode === 2) {
    indicator.querySelector('span:last-child').textContent = 'CAPS LOCK';
    indicator.classList.add('caps-lock');
    indicator.style.display = 'flex';
  } else {
    indicator.style.display = 'none';
  }
}

// ==================== INPUT ACTIONS ====================

function confirmChar() {
  const code    = dotsToCode(state.activeDots);
  const braille = codeToBraille(code);
  let text;

  if (code === 0) {
    // Space — ends number mode
    text = ' ';
    state.numberMode  = false;
    state.capitalMode = 0;
  } else if (code === NUMBER_SIGN_CODE) {
    state.numberMode = true;
    text = '';
  } else if (code === CAPITAL_SIGN_CODE) {
    state.capitalMode = 1;
    text = '';
  } else if (code === CONTINUOUS_CAPS_CODE) {
    state.capitalMode = 2;
    text = '';
  } else if (state.numberMode && isLetterAtoJ(code)) {
    text = NUMBER_MAP[code];
  } else {
    text = codeToText(code);

    // Apply single-letter capitalisation
    if (state.capitalMode === 1 && text.length === 1 && text >= 'a' && text <= 'z') {
      text = text.toUpperCase();
      state.capitalMode = 0;
    }

    // Non-digit exits number mode (except comma and period)
    if (state.numberMode && !isLetterAtoJ(code) && !',.'.includes(text)) {
      state.numberMode = false;
    }
  }

  state.brailleContent += braille;
  state.textContent    += text;

  resetDotsUI();
  updateEditors();
  updateCapitalModeIndicator();
}

function deleteLastChar() {
  state.deleteLastChar();
  updateEditors();
}

function addNewline() {
  state.brailleContent += '\n';
  state.textContent    += '\n';
  state.numberMode = false;
  updateEditors();
}

function clearEditor() {
  state.clearAll();
  resetDotsUI();
  updateEditors();
}

function resetDotsUI() {
  state.resetDots();
  document.querySelectorAll('.key').forEach(k => k.classList.remove('active'));
  updatePreview();
}

async function copyToClipboard(type) {
  const text = type === 'braille' ? state.brailleContent : state.textContent;
  const btn  = type === 'braille' ? dom.copyBrailleBtn   : dom.copyTextBtn;

  try {
    await navigator.clipboard.writeText(text);

    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.style.background = '#4caf50';
      setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 1500);
    }
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

// ==================== EVENT HANDLERS (dispatch map) ====================

function handleBrailleDotKey(key) {
  if (!state.activeDots.has(KEY_MAP[key])) {
    state.activeDots.add(KEY_MAP[key]);
    updateKeyVisual(key, true);
    updatePreview();
  }
}

const KEY_ACTIONS = {
  Space:     () => confirmChar(),
  Backspace: () => state.activeDots.size > 0 ? resetDotsUI() : deleteLastChar(),
  Escape:    () => resetDotsUI(),
  Enter:     () => addNewline(),
};

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Braille dot input
  if (key in KEY_MAP) {
    e.preventDefault();
    handleBrailleDotKey(key);
    return;
  }

  // Ctrl+L = cycle layout
  if (key === 'l' && e.ctrlKey) {
    e.preventDefault();
    cycleToNextLayout();
    return;
  }

  // Alt+C or CapsLock = cycle capital mode
  if ((e.key === 'c' && e.altKey) || e.key === 'CapsLock') {
    e.preventDefault();
    state.cycleCapitalMode();
    updateCapitalModeIndicator();
    return;
  }

  // Mapped action keys
  const action = KEY_ACTIONS[e.code] || KEY_ACTIONS[e.key];
  if (action) {
    e.preventDefault();
    action();
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key in KEY_MAP) updateKeyVisual(key, false);
});

// Sync scroll between editors
dom.brailleEditor.addEventListener('scroll', () => { dom.textEditor.scrollTop = dom.brailleEditor.scrollTop; });
dom.textEditor.addEventListener('scroll',    () => { dom.brailleEditor.scrollTop = dom.textEditor.scrollTop; });

// ==================== INITIALIZATION ====================

function init() {
  initLayoutSelector();
  setLayout(LayoutStorage.load(DEFAULT_LAYOUT));
  buildAlphabetReference();
  updateEditors();
  updatePreview();
}

init();
