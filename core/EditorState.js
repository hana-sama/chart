/**
 * EDITOR STATE
 * ============
 * Mode-agnostic editor state management.
 * 
 * This class manages the editor's state while delegating
 * mode-specific logic to the current BrailleMode instance.
 * 
 * @author Hana
 * @license MIT
 */

// Import for Node.js environment
const BrailleMode = require('../modes/BrailleMode.js');

class EditorState {
  /**
   * @param {BrailleMode} mode - The braille mode to use
   */
  constructor(mode) {
    this.setMode(mode);
  }

  /**
   * Set the braille mode and reset state
   * @param {BrailleMode} mode
   */
  setMode(mode) {
    this.mode = mode;
    this.activeDots = new Set();
    this.brailleContent = "";
    this.textContent = "";
    this.modeState = mode ? mode.createInitialState() : {};
    this.pendingIndicator = null;
  }

  // ==================== DOT INPUT ====================

  /**
   * Reset only the current dot input, keeping document content.
   */
  resetDots() {
    this.activeDots.clear();
  }

  /**
   * Add a dot to the current input
   * @param {number} dot - Dot number (1-6)
   */
  addDot(dot) {
    this.activeDots.add(dot);
  }

  /**
   * Remove a dot from the current input
   * @param {number} dot - Dot number (1-6)
   */
  removeDot(dot) {
    this.activeDots.delete(dot);
  }

  /**
   * Check if a dot is active
   * @param {number} dot - Dot number (1-6)
   * @returns {boolean}
   */
  hasDot(dot) {
    return this.activeDots.has(dot);
  }

  /**
   * Get current dot pattern as sorted array
   * @returns {number[]}
   */
  getDotsArray() {
    return Array.from(this.activeDots).sort((a, b) => a - b);
  }

  /**
   * Get current braille code from active dots
   * @returns {number}
   */
  getCurrentCode() {
    return this.mode.dotsToCode(this.activeDots);
  }

  /**
   * Get current braille character from active dots
   * @returns {string}
   */
  getCurrentBraille() {
    return this.mode.codeToBraille(this.getCurrentCode());
  }

  // ==================== CONTENT MANAGEMENT ====================

  /**
   * Clear the entire document and all modes.
   */
  clearAll() {
    this.activeDots.clear();
    this.brailleContent = "";
    this.textContent = "";
    this.modeState = this.mode.createInitialState();
    this.pendingIndicator = null;
  }

  /**
   * Delete the last character and recalculate state.
   */
  deleteLastChar() {
    if (this.brailleContent.length === 0) return;
    
    this.brailleContent = this.brailleContent.slice(0, -1);
    this.textContent = this.textContent.slice(0, -1);
    
    // Recalculate mode state from remaining content
    this._recalculateState();
  }

  /**
   * Add a newline
   */
  addNewline() {
    this.brailleContent += "\n";
    this.textContent += "\n";
    // Space-like behavior for state
    this.modeState = this.mode.updateState(this.modeState, 0, " ");
  }

  // ==================== CHARACTER CONFIRMATION ====================

  /**
   * Confirm the current dot pattern as a character
   * @returns {Object} - { braille: string, text: string, indicator: string|null }
   */
  confirmChar() {
    const code = this.getCurrentCode();
    const braille = this.mode.codeToBraille(code);
    let text = "";
    let indicator = null;

    // Build context for resolution
    const context = {
      precedingText: this.textContent,
      precedingBraille: this.brailleContent,
      state: this.modeState
    };

    // Check for pending indicator (second cell of sequence)
    if (this.pendingIndicator !== null) {
      const result = this.mode.resolveSequence(this.pendingIndicator, code, context);
      
      if (result) {
        // Valid indicator sequence
        indicator = result;
        text = result.text;
        
        // Add both cells to content
        this.brailleContent += this.mode.codeToBraille(this.pendingIndicator) + braille;
        this.textContent += text;
        
        // Apply indicator effect to state
        this.modeState = this.mode.applyIndicator(this.modeState, result.name);
        this.pendingIndicator = null;
        this.resetDots();
        
        return { braille, text, indicator };
      } else {
        // Not a valid sequence - process pending code as standalone
        this._processSingleCode(this.pendingIndicator);
        this.pendingIndicator = null;
        // Fall through to process current code
      }
    }

    // Check if this code starts a multi-cell sequence
    if (this.mode.getPrefixCodes().has(code)) {
      this.pendingIndicator = code;
      this.resetDots();
      return { braille, text: "", indicator: null, pending: true };
    }

    // Process as single code
    this._processSingleCode(code);
    this.resetDots();
    
    return { braille, text: this.textContent.slice(-1), indicator: null };
  }

  /**
   * Process a single braille code
   * @param {number} code
   * @private
   */
  _processSingleCode(code) {
    const braille = this.mode.codeToBraille(code);
    
    const context = {
      precedingText: this.textContent,
      precedingBraille: this.brailleContent,
      state: this.modeState
    };

    let text = this.mode.codeToText(code, context);

    // Handle special codes that don't produce visible text
    if (code === 0) {
      // Space
      text = " ";
    }

    // Add to content
    this.brailleContent += braille;
    this.textContent += text;

    // Update mode state
    this.modeState = this.mode.updateState(this.modeState, code, text);
  }

  /**
   * Recalculate mode state from content
   * @private
   */
  _recalculateState() {
    // Reset to initial state
    this.modeState = this.mode.createInitialState();
    
    // Replay through content to rebuild state
    // This is simplified - modes can override for more complex recalculation
    if (this.mode.recalculateNumberMode) {
      this.modeState.numberMode = this.mode.recalculateNumberMode(this.brailleContent);
    }
  }

  // ==================== STATE QUERIES ====================

  /**
   * Get current context for display/debugging
   * @returns {Object}
   */
  getContext() {
    return {
      precedingText: this.textContent,
      precedingBraille: this.brailleContent,
      state: this.modeState
    };
  }

  /**
   * Check if in number mode (UEB-specific convenience)
   * @returns {boolean}
   */
  isInNumberMode() {
    return this.modeState.numberMode || false;
  }

  /**
   * Get capital mode (UEB-specific convenience)
   * @returns {number}
   */
  getCapitalMode() {
    return this.modeState.capitalMode || 0;
  }

  /**
   * Cycle capital mode (UEB-specific convenience)
   */
  cycleCapitalMode() {
    if (this.modeState.capitalMode !== undefined) {
      this.modeState.capitalMode = (this.modeState.capitalMode + 1) % 3;
    }
  }

  /**
   * Get typeform mode (UEB-specific convenience)
   * @returns {Object|null}
   */
  getTypeformMode() {
    if (this.modeState.typeformMode) {
      return {
        mode: this.modeState.typeformMode,
        scope: this.modeState.typeformScope
      };
    }
    return null;
  }

  /**
   * Check if waiting for second cell of indicator
   * @returns {boolean}
   */
  isPendingIndicator() {
    return this.pendingIndicator !== null;
  }

  /**
   * Get pending indicator code
   * @returns {number|null}
   */
  getPendingIndicator() {
    return this.pendingIndicator;
  }

  /**
   * Cancel pending indicator
   */
  cancelPendingIndicator() {
    this.pendingIndicator = null;
  }

  // ==================== CONTENT QUERIES ====================

  /**
   * Get braille content length
   * @returns {number}
   */
  get length() {
    return this.brailleContent.length;
  }

  /**
   * Get text content length
   * @returns {number}
   */
  get textLength() {
    return this.textContent.length;
  }

  /**
   * Check if content is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.brailleContent.length === 0;
  }

  /**
   * Check if there are active dots
   * @returns {boolean}
   */
  hasActiveDots() {
    return this.activeDots.size > 0;
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = EditorState;
}
