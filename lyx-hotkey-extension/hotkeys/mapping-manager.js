/**
 * Mapping Manager Module for LyX Hotkeys Extension
 * Handles hotkey mapping storage, lookup, and matching
 */

/**
 * Mapping Manager class for handling hotkey mappings
 */
class MappingManager {
  constructor(logger = null) {
    this.logger = logger || { debug: () => {}, trace: () => {}, info: () => {}, warn: () => {} };
    
    this.mappings = new Map();
    this.logger.debug('MappingManager initialized');
  }

  /**
   * Set all mappings
   */
  setMappings(mappings) {
    if (mappings instanceof Map) {
      this.mappings = new Map(mappings);
    } else if (typeof mappings === 'object') {
      this.mappings = new Map(Object.entries(mappings));
    } else {
      this.logger.warn('Invalid mappings provided:', mappings);
      return false;
    }
    
    this.logger.info(`Mappings updated: ${this.mappings.size} entries`);
    return true;
  }

  /**
   * Get all mappings
   */
  getMappings() {
    return new Map(this.mappings);
  }

  /**
   * Get mappings as object
   */
  getMappingsAsObject() {
    return Object.fromEntries(this.mappings);
  }

  /**
   * Add a single mapping
   */
  addMapping(keySequence, action) {
    this.mappings.set(keySequence, action);
    this.logger.debug(`Mapping added: "${keySequence}" → ${JSON.stringify(action)}`);
  }

  /**
   * Remove a mapping
   */
  removeMapping(keySequence) {
    const removed = this.mappings.delete(keySequence);
    if (removed) {
      this.logger.debug(`Mapping removed: "${keySequence}"`);
    }
    return removed;
  }

  /**
   * Clear all mappings
   */
  clearMappings() {
    const count = this.mappings.size;
    this.mappings.clear();
    this.logger.info(`Cleared ${count} mappings`);
  }

  /**
   * Find exact matching action for a key sequence
   */
  findExactMatch(sequence) {
    const action = this.mappings.get(sequence);
    if (action) {
      this.logger.debug(`Exact match found for "${sequence}": ${JSON.stringify(action)}`);
      return action;
    }
    return null;
  }

  /**
   * Find all mappings that start with the given sequence
   */
  findPartialMatches(sequence) {
    const matches = [];
    const sequenceWithSpace = sequence + ' ';
    
    for (const [key, action] of this.mappings) {
      if (key.startsWith(sequenceWithSpace)) {
        matches.push({ key, action });
      }
    }
    
    if (matches.length > 0) {
      this.logger.debug(`Found ${matches.length} partial matches for "${sequence}"`);
    }
    
    return matches;
  }

  /**
   * Check if sequence has potential matches (exact or partial)
   */
  hasMatch(sequence) {
    // Check for exact match
    if (this.mappings.has(sequence)) {
      return { type: 'exact', action: this.mappings.get(sequence) };
    }
    
    // Check for partial matches
    const partialMatches = this.findPartialMatches(sequence);
    if (partialMatches.length > 0) {
      return { type: 'partial', matches: partialMatches };
    }
    
    return null;
  }

  /**
   * Get all possible completions for a partial sequence
   */
  getCompletions(partialSequence) {
    const completions = [];
    const prefix = partialSequence + ' ';
    
    for (const key of this.mappings.keys()) {
      if (key.startsWith(prefix)) {
        // Extract the next part of the sequence
        const remainder = key.substring(prefix.length);
        const nextPart = remainder.split(' ')[0];
        
        if (nextPart && !completions.includes(nextPart)) {
          completions.push(nextPart);
        }
      }
    }
    
    return completions.sort();
  }

  /**
   * Get mapping statistics
   */
  getStats() {
    const stats = {
      total: this.mappings.size,
      byType: {},
      byKeyLength: {},
      multiKey: 0,
      singleKey: 0
    };
    
    for (const [key, action] of this.mappings) {
      // Count by action type
      const type = action.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // Count by key sequence length
      const keyParts = key.split(' ').length;
      stats.byKeyLength[keyParts] = (stats.byKeyLength[keyParts] || 0) + 1;
      
      // Count single vs multi-key
      if (keyParts === 1) {
        stats.singleKey++;
      } else {
        stats.multiKey++;
      }
    }
    
    return stats;
  }

  /**
   * Validate a mapping action
   */
  validateAction(action) {
    if (!action || typeof action !== 'object') {
      return { valid: false, error: 'Action must be an object' };
    }
    
    if (!action.type) {
      return { valid: false, error: 'Action must have a type' };
    }
    
    const validTypes = ['insert', 'wrap', 'navigation', 'deletion', 'selection', 'clipboard', 'edit'];
    if (!validTypes.includes(action.type)) {
      return { valid: false, error: `Invalid action type: ${action.type}` };
    }
    
    // Type-specific validation
    switch (action.type) {
      case 'insert':
        if (typeof action.text !== 'string') {
          return { valid: false, error: 'Insert action must have text property' };
        }
        break;
        
      case 'wrap':
        if (typeof action.before !== 'string' || typeof action.after !== 'string') {
          return { valid: false, error: 'Wrap action must have before and after properties' };
        }
        break;
        
      case 'navigation':
        if (!action.navigation) {
          return { valid: false, error: 'Navigation action must have navigation property' };
        }
        break;
        
      case 'deletion':
        if (!action.deletion) {
          return { valid: false, error: 'Deletion action must have deletion property' };
        }
        break;
        
      case 'clipboard':
        if (!action.clipboard) {
          return { valid: false, error: 'Clipboard action must have clipboard property' };
        }
        break;
        
      case 'edit':
        if (!action.edit) {
          return { valid: false, error: 'Edit action must have edit property' };
        }
        break;
    }
    
    return { valid: true };
  }

  /**
   * Import mappings from various formats
   */
  importMappings(data, format = 'object') {
    try {
      let mappings;
      
      switch (format) {
        case 'object':
          mappings = data;
          break;
          
        case 'map':
          mappings = Object.fromEntries(data);
          break;
          
        case 'json':
          mappings = JSON.parse(data);
          break;
          
        case 'array':
          // Array of [key, action] pairs
          mappings = Object.fromEntries(data);
          break;
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      // Validate all actions
      const invalidActions = [];
      for (const [key, action] of Object.entries(mappings)) {
        const validation = this.validateAction(action);
        if (!validation.valid) {
          invalidActions.push({ key, error: validation.error });
        }
      }
      
      if (invalidActions.length > 0) {
        this.logger.warn('Invalid actions found during import:', invalidActions);
        // Remove invalid actions
        for (const { key } of invalidActions) {
          delete mappings[key];
        }
      }
      
      this.setMappings(mappings);
      
      return {
        success: true,
        imported: Object.keys(mappings).length,
        skipped: invalidActions.length,
        errors: invalidActions
      };
      
    } catch (error) {
      this.logger.error('Failed to import mappings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export mappings in various formats
   */
  exportMappings(format = 'object') {
    try {
      switch (format) {
        case 'object':
          return Object.fromEntries(this.mappings);
          
        case 'map':
          return new Map(this.mappings);
          
        case 'json':
          return JSON.stringify(Object.fromEntries(this.mappings), null, 2);
          
        case 'array':
          return Array.from(this.mappings);
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Failed to export mappings:', error);
      return null;
    }
  }

  /**
   * Search mappings by pattern
   */
  searchMappings(pattern, field = 'key') {
    const results = [];
    const regex = new RegExp(pattern, 'i');
    
    for (const [key, action] of this.mappings) {
      let match = false;
      
      switch (field) {
        case 'key':
          match = regex.test(key);
          break;
          
        case 'action':
          match = regex.test(JSON.stringify(action));
          break;
          
        case 'text':
          match = action.text && regex.test(action.text);
          break;
          
        case 'type':
          match = regex.test(action.type);
          break;
          
        case 'any':
          match = regex.test(key) || regex.test(JSON.stringify(action));
          break;
      }
      
      if (match) {
        results.push({ key, action });
      }
    }
    
    this.logger.debug(`Search for "${pattern}" in ${field} found ${results.length} results`);
    return results;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { MappingManager };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXMappingManager = { MappingManager };
}