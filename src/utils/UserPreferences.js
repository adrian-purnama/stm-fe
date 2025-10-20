/**
 * User Preferences Management System
 * 
 * This utility manages user preferences for dashboard customization
 * and persists them in localStorage for a personalized experience.
 */

const PREFERENCES_KEY = 'asb_user_preferences';

// Default preferences structure
const DEFAULT_PREFERENCES = {
  analytics: {
    isFilterCollapsed: true,
    sectionVisibility: {
      followUpStatus: true,
      lossAnalysis: true,
      closeAnalysis: true,
      monthlyTrend: true,
      detailedTable: true
    }
  },
  quotations: {
    isFilterCollapsed: true,
    followUpStatus: {
      red: true,
      yellow: true,
      green: true
    },
    favoriteStatuses: ['open'] // Default favorite status
  },
  dashboard: {
    // Future dashboard preferences can be added here
  }
};

/**
 * Get all user preferences from localStorage
 * @returns {Object} User preferences object
 */
export const getUserPreferences = () => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return mergeWithDefaults(parsed, DEFAULT_PREFERENCES);
    }
  } catch (error) {
    console.warn('Error loading user preferences:', error);
  }
  return DEFAULT_PREFERENCES;
};

/**
 * Save user preferences to localStorage
 * @param {Object} preferences - Preferences object to save
 */
export const saveUserPreferences = (preferences) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

/**
 * Update specific preference section
 * @param {string} section - Section name (e.g., 'analytics', 'quotations')
 * @param {Object} updates - Updates to apply to the section
 */
export const updatePreferences = (section, updates) => {
  const current = getUserPreferences();
  const updated = {
    ...current,
    [section]: {
      ...current[section],
      ...updates
    }
  };
  saveUserPreferences(updated);
  return updated;
};

/**
 * Get preferences for a specific section
 * @param {string} section - Section name
 * @returns {Object} Section preferences
 */
export const getSectionPreferences = (section) => {
  const preferences = getUserPreferences();
  return preferences[section] || DEFAULT_PREFERENCES[section] || {};
};

/**
 * Reset preferences to defaults
 * @param {string} section - Optional section to reset, or all if not provided
 */
export const resetPreferences = (section = null) => {
  if (section) {
    const current = getUserPreferences();
    const updated = {
      ...current,
      [section]: DEFAULT_PREFERENCES[section]
    };
    saveUserPreferences(updated);
    return updated;
  } else {
    saveUserPreferences(DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Merge stored preferences with defaults to ensure all properties exist
 * @param {Object} stored - Stored preferences
 * @param {Object} defaults - Default preferences
 * @returns {Object} Merged preferences
 */
const mergeWithDefaults = (stored, defaults) => {
  const result = { ...defaults };
  
  for (const key in stored) {
    if (typeof stored[key] === 'object' && stored[key] !== null && !Array.isArray(stored[key])) {
      result[key] = mergeWithDefaults(stored[key], defaults[key] || {});
    } else {
      result[key] = stored[key];
    }
  }
  
  return result;
};

/**
 * Export preference keys for easy access
 */
export const PREFERENCE_SECTIONS = {
  ANALYTICS: 'analytics',
  QUOTATIONS: 'quotations',
  DASHBOARD: 'dashboard'
};
