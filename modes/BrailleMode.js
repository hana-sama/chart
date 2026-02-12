/**
 * BRAILLE MODE BASE CLASS
 * =======================
 * Abstract base class for all braille modes (UEB Grade 1, UEB Grade 2, Japanese Kana, etc.)
 * 
 * Each mode must implement the required methods to provide:
 * - Character mapping (braille code ↔ text)
 * - Indicator handling
 * - State management
 * - Context-dependent resolution
 * 
 * @author Hana
 * @license MIT
 */

class BrailleMode {
  /**
   * @param {Object} config - Mode configuration
   * @param {string} config.name - Display name (e.g., "UEB Grade 1")
   * @param {string} config.id - Unique identifier (e.g., "ueb1")
   * @param {string} config.description - Short description
   * @param {string} config.language - Language code (e.g., "en", "ja")
   */
  constructor(config) {
    if (this.constructor === BrailleMode) {
      throw new Error("BrailleMode is an abstract class and cannot be instantiated directly");
    }
    
    this.name = config.name;
    this.id = config.id;
    this.description = config.description;
    this.language = config.language || "en";
    
    // Braille Unicode constants
    this.BRAILLE_START = 0x2800;
  }

  // ==================== REQUIRED METHODS ====================
  // Subclasses MUST implement these methods

  /**
   * Convert a braille code to text character(s)
   * @param {number} code - Braille dot pattern code (0-63)
   * @param {Object} context - Current editor context
   * @param {string} context.precedingText - Text before current position
   * @param {string} context.precedingBraille - Braille before current position
   * @param {Object} context.state - Current mode-specific state
   * @returns {string} - The text representation
   */
  codeToText(code, context) {
    throw new Error("codeToText() must be implemented by subclass");
  }

  /**
   * Get the alphabet mapping for this mode
   * @returns {Object} - Map of code → text for alphabet characters
   */
  getAlphabet() {
    throw new Error("getAlphabet() must be implemented by subclass");
  }

  /**
   * Get all indicators for this mode
   * @returns {Object} - Map of indicator name → indicator config
   */
  getIndicators() {
    return {};
  }

  // ==================== OPTIONAL OVERRIDES ====================
  // Subclasses MAY override these methods for custom behavior

  /**
   * Convert text to braille code
   * @param {string} text - Text character
   * @returns {number|undefined} - Braille code or undefined if not found
   */
  textToCode(text) {
    const alphabet = this.getAlphabet();
    for (const [code, char] of Object.entries(alphabet)) {
      if (char === text) return parseInt(code);
    }
    return undefined;
  }

  /**
   * Get the number mapping for this mode (if applicable)
   * @returns {Object} - Map of code → digit
   */
  getNumberMap() {
    return {};
  }

  /**
   * Get prefix codes that start multi-cell sequences
   * @returns {Set} - Set of prefix codes
   */
  getPrefixCodes() {
    return new Set();
  }

  /**
   * Resolve a multi-cell sequence
   * @param {number} prefixCode - First cell code
   * @param {number} baseCode - Second cell code
   * @param {Object} context - Current editor context
   * @returns {Object|null} - { text: string, action: string } or null if not a valid sequence
   */
  resolveSequence(prefixCode, baseCode, context) {
    return null;
  }

  /**
   * Check if this mode requires context for resolution
   * @returns {boolean}
   */
  requiresContext() {
    return false;
  }

  /**
   * Get context-dependent codes and their rules
   * @returns {Object} - Map of code → context rule
   */
  getContextDependent() {
    return {};
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Create initial mode-specific state
   * @returns {Object} - Initial state object
   */
  createInitialState() {
    return {};
  }

  /**
   * Update state after processing a code
   * @param {Object} state - Current state
   * @param {number} code - Braille code just processed
   * @param {string} text - Text that was output
   * @returns {Object} - New state object
   */
  updateState(state, code, text) {
    return { ...state };
  }

  /**
   * Reset state (e.g., when deleting characters)
   * @param {Object} state - Current state
   * @returns {Object} - Reset state
   */
  resetState(state) {
    return this.createInitialState();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Convert a code to braille character
   * @param {number} code - Braille dot pattern code (0-63)
   * @returns {string} - Unicode braille character
   */
  codeToBraille(code) {
    return String.fromCharCode(this.BRAILLE_START + code);
  }

  /**
   * Convert braille character to code
   * @param {string} braille - Unicode braille character
   * @returns {number} - Braille dot pattern code
   */
  brailleToCode(braille) {
    return braille.charCodeAt(0) - this.BRAILLE_START;
  }

  /**
   * Convert dot array to code
   * @param {number[]} dots - Array of dot numbers (1-6)
   * @returns {number} - Braille code
   */
  dotsToCode(dots) {
    let code = 0;
    dots.forEach(d => (code |= 1 << (d - 1)));
    return code;
  }

  /**
   * Convert code to dot array
   * @param {number} code - Braille code
   * @returns {number[]} - Array of dot numbers
   */
  codeToDots(code) {
    const dots = [];
    for (let i = 1; i <= 6; i++) {
      if (code & (1 << (i - 1))) dots.push(i);
    }
    return dots;
  }

  /**
   * Get display name for the mode
   * @returns {string}
   */
  toString() {
    return this.name;
  }

  /**
   * Get mode info for UI display
   * @returns {Object}
   */
  getInfo() {
    return {
      name: this.name,
      id: this.id,
      description: this.description,
      language: this.language
    };
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = BrailleMode;
}

// Make available globally for browser
if (typeof window !== "undefined") {
  window.BrailleMode = BrailleMode;
}
