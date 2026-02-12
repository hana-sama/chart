/**
 * BRAILLE EDITOR - MAIN ENTRY POINT
 * ==================================
 * Refactored to use the modular mode system.
 * 
 * @author Hana
 * @license MIT
 */

// ==================== LAYOUT STORAGE ====================

const LayoutStorage = {
  save(layoutKey) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAYOUT, layoutKey);
      return true;
    } catch (e) {
      console.warn("Failed to save layout preference:", e);
      return false;
    }
  },

  load(defaultLayout) {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAYOUT);
      if (saved && saved.trim()) return saved;
    } catch (e) {
      console.warn("Failed to load layout preference:", e);
    }
    return defaultLayout;
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEYS.LAYOUT);
    } catch (e) {
      console.warn("Failed to clear layout preference:", e);
    }
  }
};

// ==================== GLOBALS ====================

let currentLayout = DEFAULT_LAYOUT;
let KEY_MAP = {};
let editorState = null;

// ==================== DOM ELEMENTS ====================

const dom = {
  braillePreview: document.getElementById("braille-preview"),
  textPreview: document.getElementById("text-preview"),
  dotsPreview: document.getElementById("dots-preview"),
  brailleEditor: document.getElementById("braille-editor"),
  textEditor: document.getElementById("text-editor"),
  brailleCount: document.getElementById("braille-count"),
  textCount: document.getElementById("text-count"),
  alphabetGrid: document.getElementById("alphabet-grid"),
  numberGrid: document.getElementById("number-grid"),
  numberModeIndicator: document.getElementById("number-mode-indicator"),
  capitalModeIndicator: document.getElementById("capital-mode-indicator"),
  statusText: document.getElementById("status-text"),
  layoutSelector: document.getElementById("layout-selector"),
  layoutDescription: document.getElementById("layout-description"),
  keyboardLayout: document.getElementById("keyboard-layout"),
  toast: document.getElementById("toast"),
  copyBrailleBtn: document.getElementById("btn-copy-braille"),
  copyTextBtn: document.getElementById("btn-copy-text"),
  typeformModeIndicator: document.getElementById("typeform-mode-indicator"),
  modeSelector: document.getElementById("mode-selector")
};

// ==================== TOAST NOTIFICATION ====================

function showToast(message, duration = 2000) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  setTimeout(() => dom.toast.classList.remove("show"), duration);
}

// ==================== UTILITY FUNCTIONS ====================

function codeToBraille(code) {
  return String.fromCharCode(BRAILLE_START + code);
}

function codeToDots(code) {
  const dots = [];
  for (let i = 1; i <= 6; i++) {
    if (code & (1 << (i - 1))) dots.push(i);
  }
  return dots;
}

// ==================== MODE MANAGEMENT ====================

function initModes() {
  // Register UEB Grade 1 mode
  const ueb1Mode = new UEBGrade1Mode();
  modeRegistry.register(ueb1Mode);
  
  // Set default mode
  const savedMode = modeRegistry.loadPreference(ueb1Mode.id);
  modeRegistry.setMode(savedMode);
  
  // Create editor state with current mode
  editorState = new EditorState(modeRegistry.getMode());
  
  // Listen for mode changes
  modeRegistry.addListener(handleModeChange);
}

function handleModeChange(event) {
  if (event.type === "modeChange") {
    // Update editor state with new mode
    editorState.setMode(modeRegistry.getMode());
    
    // Update UI
    updateModeSelector();
    buildAlphabetReference();
    updateEditors();
    updatePreview();
    
    showToast(`Mode: ${event.currentMode.name}`);
  }
}

function cycleToNextMode() {
  modeRegistry.cycleToNext();
}

function initModeSelector() {
  if (!dom.modeSelector) return;
  
  const modes = modeRegistry.getModeOptions();
  const currentMode = modeRegistry.getMode();
  
  dom.modeSelector.innerHTML = modes.map(mode => `
    <div class="mode-option">
      <input type="radio" id="mode-${mode.id}" name="braille-mode" 
             value="${mode.id}" ${mode.id === currentMode.id ? "checked" : ""}>
      <label for="mode-${mode.id}">${mode.name}</label>
    </div>
  `).join("");
  
  // Add event listeners
  document.querySelectorAll('input[name="braille-mode"]').forEach(radio => {
    radio.addEventListener("change", e => {
      modeRegistry.setMode(e.target.value);
    });
  });
}

function updateModeSelector() {
  const currentMode = modeRegistry.getMode();
  const radio = document.getElementById(`mode-${currentMode.id}`);
  if (radio) radio.checked = true;
}

// ==================== TEMPLATE HELPERS ====================

function renderKey(key, dot) {
  return `<div class="key" data-key="${key.toLowerCase()}" data-dot="${dot}" 
    role="button" 
    tabindex="0"
    aria-label="Dot ${dot} - Key ${key.toUpperCase()}"
    aria-pressed="false">
    <span class="key-letter">${key.toUpperCase()}</span>
    <span class="key-dot">${dot}</span>
  </div>`;
}

function renderAlphaItem(braille, text, dotsStr, dataAttr, dataValue) {
  return `<div class="alpha-item" ${dataAttr}="${dataValue}" role="listitem" aria-label="${text}, dots ${dotsStr}">
    <span class="alpha-braille" aria-hidden="true">${braille}</span>
    <span class="alpha-text">${text}</span>
    <span class="alpha-dots">${dotsStr}</span>
  </div>`;
}

// ==================== LAYOUT MANAGEMENT ====================

function initLayoutSelector() {
  dom.layoutSelector.innerHTML = Object.entries(LAYOUTS)
    .map(
      ([key, layout]) => `
    <div class="layout-option">
      <input type="radio" id="layout-${key}" name="layout" value="${key}" ${key === currentLayout ? "checked" : ""} aria-describedby="layout-description">
      <label for="layout-${key}">${layout.name}</label>
    </div>
  `
    )
    .join("");

  document.querySelectorAll('input[name="layout"]').forEach(radio => {
    radio.addEventListener("change", e => setLayout(e.target.value));
  });

  updateLayoutDescription();
}

function setLayout(layoutKey) {
  if (!LAYOUTS[layoutKey]) {
    console.error(`Unknown layout: ${layoutKey}`);
    return;
  }

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
  const nextLayout =
    layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
  setLayout(nextLayout);
  showToast(`Layout: ${LAYOUTS[nextLayout].name}`);
}

function updateLayoutDescription() {
  dom.layoutDescription.textContent = LAYOUTS[currentLayout].description;
}

function rebuildKeyboardVisual() {
  const layout = LAYOUTS[currentLayout];
  const leftHTML = layout.leftHand
    .map(({ key, dot }) => renderKey(key, dot))
    .join("");
  const rightHTML = layout.rightHand
    .map(({ key, dot }) => renderKey(key, dot))
    .join("");

  dom.keyboardLayout.innerHTML = `
    <div class="hand">${leftHTML}</div>
    <div class="hand">${rightHTML}</div>
  `;
  attachKeyListeners();
}

function attachKeyListeners() {
  document.querySelectorAll(".key").forEach(keyEl => {
    keyEl.addEventListener("mousedown", e => {
      e.preventDefault();
      editorState.addDot(parseInt(keyEl.dataset.dot));
      keyEl.classList.add("active");
      keyEl.setAttribute("aria-pressed", "true");
      updatePreview();
    });
    keyEl.addEventListener("mouseup", () => {
      keyEl.classList.remove("active");
      keyEl.setAttribute("aria-pressed", "false");
    });
    keyEl.addEventListener("mouseleave", () => {
      keyEl.classList.remove("active");
      keyEl.setAttribute("aria-pressed", "false");
    });
    keyEl.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        editorState.addDot(parseInt(keyEl.dataset.dot));
        keyEl.classList.add("active");
        keyEl.setAttribute("aria-pressed", "true");
        updatePreview();
      }
    });
    keyEl.addEventListener("keyup", e => {
      if (e.key === "Enter" || e.key === " ") {
        keyEl.classList.remove("active");
        keyEl.setAttribute("aria-pressed", "false");
      }
    });
  });
}

function updateInstructions() {
  const layout = LAYOUTS[currentLayout];
  const el = document.querySelector(".instructions p:first-child");
  if (!el) return;
  const leftKeys = layout.leftHand
    .map(k => `<kbd>${k.key.toUpperCase()}</kbd>`)
    .join("");
  const rightKeys = layout.rightHand
    .map(k => `<kbd>${k.key.toUpperCase()}</kbd>`)
    .join("");
  el.innerHTML = `Hold ${leftKeys} + ${rightKeys} to form dots.`;
}

// ==================== DISPLAY FUNCTIONS ====================

function updatePreview() {
  const mode = modeRegistry.getMode();
  
  if (!editorState.hasActiveDots()) {
    // Show pending indicator hint when waiting for second cell
    if (editorState.isPendingIndicator()) {
      const pendingCode = editorState.getPendingIndicator();
      dom.braillePreview.textContent = codeToBraille(pendingCode);
      dom.textPreview.textContent = "pending…";
      dom.dotsPreview.textContent = codeToDots(pendingCode).join("-");
      dom.braillePreview.classList.add("has-input");
    } else {
      dom.braillePreview.textContent = "\u2800";
      dom.textPreview.textContent = "-";
      dom.dotsPreview.textContent = "-";
    }
    clearAlphabetHighlight();
    return;
  }

  const code = editorState.getCurrentCode();
  const braille = editorState.getCurrentBraille();
  const context = editorState.getContext();
  let text = mode.codeToText(code, context);
  const dots = editorState.getDotsArray().join("-");

  // Show what the sequence would resolve to if pending
  if (editorState.isPendingIndicator()) {
    const result = mode.resolveSequence(editorState.getPendingIndicator(), code, context);
    if (result) {
      text = `${result.text} (${result.name.toLowerCase().replace(/_/g, " ")})`;
    }
  }

  // Apply capitalization preview
  const capitalMode = editorState.getCapitalMode();
  if (capitalMode > 0 && mode.isLetter(code)) {
    text = text.toUpperCase();
  }

  dom.braillePreview.textContent = braille;
  dom.textPreview.textContent = text;
  dom.dotsPreview.textContent = dots;
  dom.braillePreview.classList.toggle("has-input", editorState.hasActiveDots());

  // Highlight in reference
  if (editorState.isInNumberMode() && mode.isLetterAtoJ(code)) {
    highlightNumber(code);
  } else {
    highlightAlphabet(code);
  }
}

function updateEditors() {
  dom.brailleEditor.innerHTML =
    editorState.brailleContent + '<span class="cursor"></span>';
  dom.textEditor.innerHTML = editorState.textContent + '<span class="cursor"></span>';
  dom.brailleCount.textContent = `${editorState.length} chars`;
  dom.textCount.textContent = `${editorState.textLength} chars`;
  dom.textEditor.scrollTop = dom.brailleEditor.scrollTop;
  dom.numberModeIndicator.classList.toggle("active", editorState.isInNumberMode());

  // Status text — show most specific active mode
  if (editorState.isPendingIndicator()) {
    dom.statusText.textContent =
      "Pending: " + codeToBraille(editorState.getPendingIndicator()) + " …";
  } else {
    const typeform = editorState.getTypeformMode();
    if (typeform) {
      dom.statusText.textContent =
        typeform.mode.charAt(0).toUpperCase() +
        typeform.mode.slice(1) +
        " (" +
        typeform.scope +
        ")";
    } else if (editorState.isInNumberMode()) {
      dom.statusText.textContent = "Number Mode Active";
    } else {
      dom.statusText.textContent = "Ready";
    }
  }

  updateCapitalModeIndicator();
  updateTypeformIndicator();
}

function updateKeyVisual(key, active) {
  const el = document.querySelector(`.key[data-key="${key.toLowerCase()}"]`);
  if (el) {
    el.classList.toggle("active", active);
    el.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

// ==================== ALPHABET / NUMBER REFERENCE ====================

function buildAlphabetReference() {
  const mode = modeRegistry.getMode();
  const alphabet = mode.getAlphabet();
  
  dom.alphabetGrid.innerHTML = Object.entries(alphabet)
    .map(([code, letter]) => {
      return renderAlphaItem(
        codeToBraille(parseInt(code)),
        letter,
        codeToDots(parseInt(code)).join(""),
        "data-code",
        code
      );
    })
    .join("");

  const numberMap = mode.getNumberMap();
  dom.numberGrid.innerHTML = Object.entries(numberMap)
    .map(([code, num]) => {
      return renderAlphaItem(
        codeToBraille(parseInt(code)),
        num,
        codeToDots(parseInt(code)).join(""),
        "data-number-code",
        code
      );
    })
    .join("");
}

function highlightAlphabet(code) {
  clearAlphabetHighlight();
  const item = document.querySelector(`.alpha-item[data-code="${code}"]`);
  if (item) item.classList.add("highlight");
}

function highlightNumber(code) {
  clearAlphabetHighlight();
  const item = document.querySelector(
    `.alpha-item[data-number-code="${code}"]`
  );
  if (item) item.classList.add("highlight");
}

function clearAlphabetHighlight() {
  document
    .querySelectorAll(".alpha-item.highlight")
    .forEach(el => el.classList.remove("highlight"));
}

// ==================== CAPITAL MODE INDICATOR ====================

function updateCapitalModeIndicator() {
  const indicator = dom.capitalModeIndicator;
  const capitalMode = editorState.getCapitalMode();
  
  if (capitalMode === 1) {
    indicator.querySelector("span:last-child").textContent = "Capital (next)";
    indicator.classList.remove("caps-lock");
    indicator.style.display = "flex";
  } else if (capitalMode === 2) {
    indicator.querySelector("span:last-child").textContent = "CAPS LOCK";
    indicator.classList.add("caps-lock");
    indicator.style.display = "flex";
  } else {
    indicator.style.display = "none";
  }
}

// ==================== TYPEFORM MODE INDICATOR ====================

function updateTypeformIndicator() {
  const indicator = dom.typeformModeIndicator;
  if (!indicator) return;

  const typeform = editorState.getTypeformMode();
  if (typeform) {
    const icons = { italic: "𝑰", bold: "𝐁", underline: "U̲", script: "𝒮" };
    const icon = icons[typeform.mode] || "✦";
    const label =
      typeform.mode.charAt(0).toUpperCase() +
      typeform.mode.slice(1) +
      " (" +
      typeform.scope +
      ")";

    indicator.querySelector("span:first-child").textContent = icon;
    indicator.querySelector("span:last-child").textContent = label;
    indicator.className = "typeform-indicator typeform-" + typeform.mode;
    indicator.style.display = "flex";
  } else {
    indicator.style.display = "none";
  }
}

// ==================== INPUT ACTIONS ====================

function confirmChar() {
  editorState.confirmChar();
  updateEditors();
}

function deleteLastChar() {
  editorState.deleteLastChar();
  updateEditors();
}

function addNewline() {
  editorState.addNewline();
  updateEditors();
}

function clearEditor() {
  editorState.clearAll();
  resetDotsUI();
  updateEditors();
}

function resetDotsUI() {
  editorState.resetDots();
  document.querySelectorAll(".key").forEach(k => k.classList.remove("active"));
  updatePreview();
}

async function copyToClipboard(type) {
  const text = type === "braille" ? editorState.brailleContent : editorState.textContent;
  const btn = type === "braille" ? dom.copyBrailleBtn : dom.copyTextBtn;

  try {
    await navigator.clipboard.writeText(text);

    if (btn) {
      const original = btn.textContent;
      btn.textContent = "✓ Copied!";
      btn.style.background = "#4caf50";
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = "";
      }, 1500);
    }
  } catch (err) {
    console.error("Copy failed:", err);
  }
}

// ==================== EVENT HANDLERS ====================

function handleBrailleDotKey(key) {
  if (!editorState.hasDot(KEY_MAP[key])) {
    editorState.addDot(KEY_MAP[key]);
    updateKeyVisual(key, true);
    updatePreview();
  }
}

const KEY_ACTIONS = {
  Space: () => confirmChar(),
  Backspace: () =>
    editorState.hasActiveDots() ? resetDotsUI() : deleteLastChar(),
  Delete: () => deleteLastChar(),
  Escape: () => resetDotsUI(),
  Enter: () => addNewline()
};

document.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  // Braille dot input
  if (key in KEY_MAP) {
    e.preventDefault();
    handleBrailleDotKey(key);
    return;
  }

  // Ctrl+L = cycle layout
  if (key === "l" && e.ctrlKey) {
    e.preventDefault();
    cycleToNextLayout();
    return;
  }

  // Ctrl+M or Alt+M = cycle mode
  if (key === "m" && (e.ctrlKey || e.altKey)) {
    e.preventDefault();
    cycleToNextMode();
    return;
  }

  // Alt+C or CapsLock = cycle capital mode
  if ((e.key === "c" && e.altKey) || e.key === "CapsLock") {
    e.preventDefault();
    editorState.cycleCapitalMode();
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

document.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  if (key in KEY_MAP) updateKeyVisual(key, false);
});

// Sync scroll between editors
dom.brailleEditor.addEventListener("scroll", () => {
  dom.textEditor.scrollTop = dom.brailleEditor.scrollTop;
});
dom.textEditor.addEventListener("scroll", () => {
  dom.brailleEditor.scrollTop = dom.textEditor.scrollTop;
});

// ==================== INITIALIZATION ====================

function init() {
  // Initialize mode system first
  initModes();
  
  // Initialize UI
  initLayoutSelector();
  initModeSelector();
  setLayout(LayoutStorage.load(DEFAULT_LAYOUT));
  buildAlphabetReference();
  updateEditors();
  updatePreview();
}

init();
