/**
 * MODE REGISTRY
 * =============
 * Central registry for managing braille modes.
 * 
 * Features:
 * - Register new braille modes
 * - Switch between modes
 * - Persist mode preference
 * - Notify listeners on mode change
 * 
 * @author Hana
 * @license MIT
 */

class ModeRegistry {
  constructor() {
    this.modes = new Map();
    this.currentMode = null;
    this.listeners = new Set();
    this.storageKey = "brailleEditorMode";
  }

  // ==================== REGISTRATION ====================

  /**
   * Register a new braille mode
   * @param {BrailleMode} mode - Mode instance to register
   * @throws {Error} If mode is invalid or already registered
   */
  register(mode) {
    if (!mode || !mode.id || !mode.name) {
      throw new Error("Invalid mode: must have id and name");
    }
    
    if (this.modes.has(mode.id)) {
      throw new Error(`Mode already registered: ${mode.id}`);
    }
    
    this.modes.set(mode.id, mode);
    console.log(`[ModeRegistry] Registered mode: ${mode.name} (${mode.id})`);
  }

  /**
   * Unregister a mode
   * @param {string} modeId - Mode ID to unregister
   */
  unregister(modeId) {
    if (this.currentMode && this.currentMode.id === modeId) {
      this.currentMode = null;
    }
    this.modes.delete(modeId);
  }

  // ==================== MODE SELECTION ====================

  /**
   * Set the current mode
   * @param {string} modeId - Mode ID to activate
   * @throws {Error} If mode is not registered
   */
  setMode(modeId) {
    if (!this.modes.has(modeId)) {
      throw new Error(`Unknown mode: ${modeId}`);
    }
    
    const previousMode = this.currentMode;
    this.currentMode = this.modes.get(modeId);
    
    // Persist selection
    this.savePreference(modeId);
    
    // Notify listeners
    this.notifyListeners({
      type: "modeChange",
      previousMode: previousMode ? previousMode.getInfo() : null,
      currentMode: this.currentMode.getInfo()
    });
    
    console.log(`[ModeRegistry] Switched to mode: ${this.currentMode.name}`);
  }

  /**
   * Get the current mode
   * @returns {BrailleMode|null}
   */
  getMode() {
    return this.currentMode;
  }

  /**
   * Get a specific mode by ID
   * @param {string} modeId
   * @returns {BrailleMode|undefined}
   */
  getModeById(modeId) {
    return this.modes.get(modeId);
  }

  /**
   * Get all registered modes
   * @returns {BrailleMode[]}
   */
  getAllModes() {
    return Array.from(this.modes.values());
  }

  /**
   * Get mode info for UI display
   * @returns {Object[]}
   */
  getModeOptions() {
    return this.getAllModes().map(mode => mode.getInfo());
  }

  // ==================== CYCLING ====================

  /**
   * Cycle to the next mode
   * @returns {BrailleMode} The new current mode
   */
  cycleToNext() {
    const modeIds = Array.from(this.modes.keys());
    if (modeIds.length === 0) {
      throw new Error("No modes registered");
    }
    
    const currentIndex = this.currentMode 
      ? modeIds.indexOf(this.currentMode.id) 
      : -1;
    
    const nextIndex = (currentIndex + 1) % modeIds.length;
    this.setMode(modeIds[nextIndex]);
    
    return this.currentMode;
  }

  /**
   * Cycle to the previous mode
   * @returns {BrailleMode} The new current mode
   */
  cycleToPrevious() {
    const modeIds = Array.from(this.modes.keys());
    if (modeIds.length === 0) {
      throw new Error("No modes registered");
    }
    
    const currentIndex = this.currentMode 
      ? modeIds.indexOf(this.currentMode.id) 
      : -1;
    
    const previousIndex = (currentIndex - 1 + modeIds.length) % modeIds.length;
    this.setMode(modeIds[previousIndex]);
    
    return this.currentMode;
  }

  // ==================== PERSISTENCE ====================

  /**
   * Save mode preference to localStorage
   * @param {string} modeId
   */
  savePreference(modeId) {
    try {
      localStorage.setItem(this.storageKey, modeId);
    } catch (e) {
      console.warn("[ModeRegistry] Failed to save mode preference:", e);
    }
  }

  /**
   * Load mode preference from localStorage
   * @param {string} defaultModeId - Default mode if no preference saved
   * @returns {string} The mode ID to use
   */
  loadPreference(defaultModeId) {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && this.modes.has(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn("[ModeRegistry] Failed to load mode preference:", e);
    }
    return defaultModeId;
  }

  /**
   * Clear saved preference
   */
  clearPreference() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn("[ModeRegistry] Failed to clear mode preference:", e);
    }
  }

  // ==================== EVENT HANDLING ====================

  /**
   * Add a mode change listener
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove a mode change listener
   * @param {Function} listener
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a change
   * @param {Object} event
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error("[ModeRegistry] Listener error:", e);
      }
    });
  }

  // ==================== UTILITY ====================

  /**
   * Check if a mode is registered
   * @param {string} modeId
   * @returns {boolean}
   */
  hasMode(modeId) {
    return this.modes.has(modeId);
  }

  /**
   * Get number of registered modes
   * @returns {number}
   */
  get modeCount() {
    return this.modes.size;
  }

  /**
   * Check if a mode is currently active
   * @param {string} modeId
   * @returns {boolean}
   */
  isModeActive(modeId) {
    return this.currentMode && this.currentMode.id === modeId;
  }
}

// Create singleton instance
const modeRegistry = new ModeRegistry();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ModeRegistry, modeRegistry };
}
