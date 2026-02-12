/**
 * UEB GRADE 1 MODE
 * ================
 * Unified English Braille Grade 1 (uncontracted) mode implementation.
 * 
 * Features:
 * - Full alphabet mapping
 * - Number mode with number sign
 * - Capitalization indicators
 * - Punctuation and symbols
 * - Typeform indicators (italic, bold, underline, script)
 * 
 * @author Hana
 * @license MIT
 */

// Import base class for Node.js environment
const BrailleMode = require('../BrailleMode.js');

class UEBGrade1Mode extends BrailleMode {
  constructor() {
    super({
      name: "UEB Grade 1",
      id: "ueb1",
      description: "Unified English Braille Grade 1 (uncontracted)",
      language: "en"
    });
    
    // Initialize data
    this._initData();
  }

  // ==================== DATA INITIALIZATION ====================

  _initData() {
    // Alphabet mapping (code → text)
    this.alphabet = {
      0x01: "a", 0x03: "b", 0x09: "c", 0x19: "d", 0x11: "e",
      0x0b: "f", 0x1b: "g", 0x13: "h", 0x0a: "i", 0x1a: "j",
      0x05: "k", 0x07: "l", 0x0d: "m", 0x1d: "n", 0x15: "o",
      0x0f: "p", 0x1f: "q", 0x17: "r", 0x0e: "s", 0x1e: "t",
      0x25: "u", 0x27: "v", 0x3a: "w", 0x2d: "x", 0x3d: "y", 0x35: "z"
    };

    // Number mapping (in number mode, a-j → 1-0)
    this.numberMap = {
      0x01: "1", 0x03: "2", 0x09: "3", 0x19: "4", 0x11: "5",
      0x0b: "6", 0x1b: "7", 0x13: "8", 0x0a: "9", 0x1a: "0"
    };

    // Punctuation and symbols
    this.symbols = {
      0x02: ",",   // dots 2
      0x06: ";",   // dots 23
      0x12: ":",   // dots 25
      0x32: ".",   // dots 256
      0x16: "!",   // dots 235
      0x26: "?",   // dots 236 (also opening quote)
      0x04: "'",   // dots 3
      0x24: "-",   // dots 36 (hyphen)
      0x2e: "/",   // dots 346
      0x28: '"',   // dots 46 — opening quotation
      0x1c: ")"    // dots 345
    };

    // Context-dependent codes
    this.contextDependent = {
      0x26: {
        default: "?",
        variants: { opening_quote: '"' },
        rule: "space_or_start_before"
      }
    };

    // Indicator codes
    this.indicatorCodes = {
      NUMBER_SIGN: 0x3c,    // ⠼ dots 3456
      CAPITAL_SIGN: 0x20,   // ⠠ dot 6
      CONTINUOUS_CAPS: 0x30, // dots 56
      LETTER_SIGN: 0x10     // ⠐ dot 5
    };

    // Multi-cell indicators
    this.indicators = {
      // Capitalisation
      CAPITAL_LETTER: { codes: [0x20], display: "⠠", type: "capital", action: "symbol" },
      CAPITAL_WORD: { codes: [0x20, 0x20], display: "⠠⠠", type: "capital", action: "word" },
      CAPITAL_PASSAGE: { codes: [0x20, 0x20, 0x20], display: "⠠⠠⠠", type: "capital", action: "passage" },
      CAPITAL_TERMINATOR: { codes: [0x20, 0x04], display: "⠠⠄", type: "capital", action: "end" },

      // Italic (prefix: dots 46 = 0x28)
      ITALIC_SYMBOL: { codes: [0x28, 0x06], display: "⠨⠆", type: "italic", action: "symbol" },
      ITALIC_WORD: { codes: [0x28, 0x01], display: "⠨⠁", type: "italic", action: "word" },
      ITALIC_PASSAGE: { codes: [0x28, 0x36], display: "⠨⠶", type: "italic", action: "passage" },
      ITALIC_TERMINATOR: { codes: [0x28, 0x04], display: "⠨⠄", type: "italic", action: "end" },

      // Bold (prefix: dots 45 = 0x18)
      BOLD_SYMBOL: { codes: [0x18, 0x06], display: "⠘⠆", type: "bold", action: "symbol" },
      BOLD_WORD: { codes: [0x18, 0x01], display: "⠘⠁", type: "bold", action: "word" },
      BOLD_PASSAGE: { codes: [0x18, 0x36], display: "⠘⠶", type: "bold", action: "passage" },
      BOLD_TERMINATOR: { codes: [0x18, 0x04], display: "⠘⠄", type: "bold", action: "end" },

      // Underline (prefix: dots 456 = 0x38)
      UNDERLINE_SYMBOL: { codes: [0x38, 0x06], display: "⠸⠆", type: "underline", action: "symbol" },
      UNDERLINE_WORD: { codes: [0x38, 0x01], display: "⠸⠁", type: "underline", action: "word" },
      UNDERLINE_PASSAGE: { codes: [0x38, 0x36], display: "⠸⠶", type: "underline", action: "passage" },
      UNDERLINE_TERMINATOR: { codes: [0x38, 0x04], display: "⠸⠄", type: "underline", action: "end" },

      // Script (prefix: dots 4 = 0x08)
      SCRIPT_SYMBOL: { codes: [0x08, 0x06], display: "⠈⠆", type: "script", action: "symbol" },
      SCRIPT_WORD: { codes: [0x08, 0x01], display: "⠈⠁", type: "script", action: "word" },
      SCRIPT_PASSAGE: { codes: [0x08, 0x36], display: "⠈⠶", type: "script", action: "passage" },
      SCRIPT_TERMINATOR: { codes: [0x08, 0x04], display: "⠈⠄", type: "script", action: "end" }
    };

    // Build prefix lookup
    this._buildPrefixLookup();
  }

  _buildPrefixLookup() {
    this.prefixCodes = new Set();
    this.sequenceMap = {};

    for (const [name, ind] of Object.entries(this.indicators)) {
      if (ind.codes.length >= 2) {
        this.prefixCodes.add(ind.codes[0]);
        const key = `${ind.codes[0]}:${ind.codes[1]}`;
        this.sequenceMap[key] = name;
      }
    }
  }

  // ==================== IMPLEMENT REQUIRED METHODS ====================

  codeToText(code, context = {}) {
    const state = context.state || {};
    
    // Number mode: a-j → 1-0
    if (state.numberMode && this.numberMap[code]) {
      return this.numberMap[code];
    }

    // Check alphabet
    if (this.alphabet[code]) {
      let text = this.alphabet[code];
      
      // Apply capitalization
      if (state.capitalMode === 1) {
        text = text.toUpperCase();
      } else if (state.capitalMode === 2) {
        text = text.toUpperCase();
      }
      
      return text;
    }

    // Check symbols
    if (this.symbols[code]) {
      return this.symbols[code];
    }

    // Check context-dependent
    if (this.contextDependent[code]) {
      return this._resolveContextDependent(code, context);
    }

    // Indicator signs (display as braille symbol)
    if (code === this.indicatorCodes.NUMBER_SIGN) return "⠼";
    if (code === this.indicatorCodes.CAPITAL_SIGN) return "⠠";
    if (code === this.indicatorCodes.LETTER_SIGN) return "⠐";

    // Space
    if (code === 0) return " ";

    return "?";
  }

  getAlphabet() {
    return { ...this.alphabet };
  }

  getNumberMap() {
    return { ...this.numberMap };
  }

  getIndicators() {
    return { ...this.indicators };
  }

  getPrefixCodes() {
    return this.prefixCodes;
  }

  // ==================== CONTEXT RESOLUTION ====================

  _resolveContextDependent(code, context) {
    const entry = this.contextDependent[code];
    if (!entry) return "?";

    if (entry.rule === "space_or_start_before") {
      const lastChar = context.precedingText ? context.precedingText.slice(-1) : "";
      if (lastChar === "" || lastChar === " " || lastChar === "\n") {
        return entry.variants.opening_quote;
      }
    }

    return entry.default;
  }

  // ==================== SEQUENCE RESOLUTION ====================

  resolveSequence(prefixCode, baseCode, context = {}) {
    const key = `${prefixCode}:${baseCode}`;
    const indicatorName = this.sequenceMap[key];
    
    if (!indicatorName) return null;
    
    const indicator = this.indicators[indicatorName];
    return {
      name: indicatorName,
      text: indicator.display,
      type: indicator.type,
      action: indicator.action
    };
  }

  // ==================== STATE MANAGEMENT ====================

  createInitialState() {
    return {
      numberMode: false,
      capitalMode: 0,  // 0: off, 1: next capital, 2: all caps
      typeformMode: null,  // 'italic' | 'bold' | 'underline' | 'script' | null
      typeformScope: null, // 'symbol' | 'word' | 'passage' | null
      pendingIndicator: null
    };
  }

  updateState(state, code, text) {
    const newState = { ...state };

    // Space: ends number mode, clears single capital
    if (code === 0) {
      newState.numberMode = false;
      newState.capitalMode = 0;
      if (newState.typeformScope === "symbol") {
        newState.typeformMode = null;
        newState.typeformScope = null;
      }
    }
    // Number sign: starts number mode
    else if (code === this.indicatorCodes.NUMBER_SIGN) {
      newState.numberMode = true;
    }
    // Capital sign: next letter capital
    else if (code === this.indicatorCodes.CAPITAL_SIGN) {
      newState.capitalMode = 1;
    }
    // Continuous caps
    else if (code === this.indicatorCodes.CONTINUOUS_CAPS) {
      newState.capitalMode = 2;
    }
    // Letter sign: ends number mode
    else if (code === this.indicatorCodes.LETTER_SIGN) {
      newState.numberMode = false;
    }
    // Letter: consume capital mode
    else if (this.alphabet[code] && state.capitalMode === 1) {
      newState.capitalMode = 0;
    }
    // Non-digit exits number mode (except comma and period)
    else if (state.numberMode && !this.numberMap[code] && !",.".includes(text)) {
      newState.numberMode = false;
    }

    return newState;
  }

  /**
   * Apply indicator effect to state
   * @param {Object} state - Current state
   * @param {string} indicatorName - Name of indicator
   * @returns {Object} - New state
   */
  applyIndicator(state, indicatorName) {
    const indicator = this.indicators[indicatorName];
    if (!indicator) return state;

    const newState = { ...state };

    if (["italic", "bold", "underline", "script"].includes(indicator.type)) {
      if (indicator.action === "end") {
        newState.typeformMode = null;
        newState.typeformScope = null;
      } else {
        newState.typeformMode = indicator.type;
        newState.typeformScope = indicator.action;
      }
    }

    if (indicator.type === "capital") {
      if (indicator.action === "word" || indicator.action === "passage") {
        newState.capitalMode = 2;
      } else if (indicator.action === "end") {
        newState.capitalMode = 0;
      }
    }

    return newState;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if code is a letter a-j (used in number mode)
   * @param {number} code
   * @returns {boolean}
   */
  isLetterAtoJ(code) {
    return code in this.numberMap;
  }

  /**
   * Check if code is a letter a-z
   * @param {number} code
   * @returns {boolean}
   */
  isLetter(code) {
    return this.alphabet[code] && this.alphabet[code].length === 1;
  }

  /**
   * Recalculate number mode from braille content
   * @param {string} brailleContent - Braille string
   * @returns {boolean}
   */
  recalculateNumberMode(brailleContent) {
    for (let i = brailleContent.length - 1; i >= 0; i--) {
      const code = brailleContent.charCodeAt(i) - this.BRAILLE_START;
      if (code === this.indicatorCodes.NUMBER_SIGN) {
        return true;
      }
      if (code === 0) {
        return false;
      }
    }
    return false;
  }

  requiresContext() {
    return true;
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = UEBGrade1Mode;
}
