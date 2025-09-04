/**
 * Element Detector
 * Handles detection and tracking of editable elements
 */

class ElementDetector {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.lastActiveElement = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the element detector
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.addEventListener('focus', (e) => this.handleFocus(e), true);
    document.addEventListener('click', (e) => this.handleClick(e), true);
  }

  /**
   * Handle focus events
   * @param {Event} event - Focus event
   */
  handleFocus(event) {
    if (this.isEditableElement(event.target)) {
      this.lastActiveElement = event.target;
      this.eventManager.emit('elementActivated', event.target);
    }
  }

  /**
   * Handle click events
   * @param {Event} event - Click event
   */
  handleClick(event) {
    if (this.isEditableElement(event.target)) {
      this.lastActiveElement = event.target;
      this.eventManager.emit('elementActivated', event.target);
    }
  }

  /**
   * Get the currently active element
   * @returns {Element|null} - Active element or null
   */
  getActiveElement() {
    return this.lastActiveElement;
  }

  /**
   * Check if element is editable (alias for isEditableElement)
   * @param {Element} element - Element to check
   * @returns {boolean} - Whether element is editable
   */
  isEditable(element) {
    return this.isEditableElement(element);
  }

  /**
   * Check if element is editable
   * @param {Element} element - Element to check
   * @returns {boolean} - Whether element is editable
   */
  isEditableElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const editable = element.isContentEditable;
    const inputTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
    
    return editable || 
           tagName === 'textarea' || 
           (tagName === 'input' && inputTypes.includes(element.type));
  }

  /**
   * Get the last active editable element
   * @returns {Element|null} - Last active element or null
   */
  getLastActiveElement() {
    return this.lastActiveElement;
  }

  /**
   * Get the currently focused element if it's editable
   * @returns {Element|null} - Currently focused element or null
   */
  getCurrentEditableElement() {
    const active = document.activeElement;
    return this.isEditableElement(active) ? active : null;
  }

  /**
   * Find the best target element for an action
   * @returns {Element|null} - Best target element or null
   */
  getBestTargetElement() {
    // Try currently focused element first
    const current = this.getCurrentEditableElement();
    if (current) {
      return current;
    }
    
    // Fall back to last active element
    if (this.lastActiveElement && this.isEditableElement(this.lastActiveElement)) {
      return this.lastActiveElement;
    }
    
    return null;
  }

  /**
   * Check if any editable element is currently active
   * @returns {boolean} - Whether an editable element is active
   */
  hasActiveEditableElement() {
    return this.getBestTargetElement() !== null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementDetector;
} else if (typeof window !== 'undefined') {
  window.ElementDetector = ElementDetector;
}
