import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ApiHelper from '../utils/api/ApiHelper';

// Cache for permissions to avoid redundant API calls
const permissionsCache = new Map();
const permissionsCacheTimeout = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook to check user permissions
 * @param {string[]} permissionKeys - Array of permission keys to check
 * @param {boolean} forceRefresh - Force refresh permissions cache
 * @returns {Object} { permissions, loading, hasPermission }
 */
export const usePermissions = (permissionKeys = [], forceRefresh = false) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Create a stable string representation of permissionKeys for comparison
  const permissionKeysString = useMemo(() => {
    const sorted = [...(permissionKeys || [])].sort();
    return JSON.stringify(sorted);
  }, [permissionKeys]);
  
  // Use ref to track the last fetched permissionKeys string
  const lastFetchedKeysRef = useRef('');

  const checkPermission = useCallback(async (permissionKey) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && permissionsCache.has(permissionKey)) {
      const cached = permissionsCache.get(permissionKey);
      // Check if cache is still valid
      if (Date.now() - cached.timestamp < permissionsCacheTimeout) {
        return cached.hasPermission;
      }
      // Cache expired, remove it
      permissionsCache.delete(permissionKey);
    }

    try {
      const response = await ApiHelper.get(`/api/auth/ispermission/${permissionKey}`, {
        params: { _t: Date.now() } // Cache busting if needed
      });
      
      const hasPermission = response.data.message?.hasPermission || false;
      
      // Cache the result
      permissionsCache.set(permissionKey, {
        hasPermission,
        timestamp: Date.now()
      });
      
      return hasPermission;
    } catch (error) {
      console.error(`Error checking permission ${permissionKey}:`, error);
      return false;
    }
  }, [forceRefresh]);

  useEffect(() => {
    // Only fetch if permissionKeys actually changed
    if (lastFetchedKeysRef.current === permissionKeysString) {
      return;
    }
    
    lastFetchedKeysRef.current = permissionKeysString;
    
    // Parse the permissionKeys from the string
    let keysToCheck = [];
    try {
      keysToCheck = JSON.parse(permissionKeysString);
    } catch {
      keysToCheck = permissionKeys || [];
    }
    
    if (keysToCheck.length === 0) {
      setLoading(false);
      setPermissions({});
      return;
    }

    const fetchPermissionsAsync = async () => {
      setLoading(true);
      try {
        // Check all permissions in parallel
        const permissionPromises = keysToCheck.map(key => 
          checkPermission(key).then(hasPermission => [key, hasPermission])
        );
        
        const results = await Promise.all(permissionPromises);
        const permissionsMap = Object.fromEntries(results);
        
        setPermissions(permissionsMap);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        // Set all permissions to false on error
        const permissionsMap = Object.fromEntries(
          keysToCheck.map(key => [key, false])
        );
        setPermissions(permissionsMap);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPermissionsAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionKeysString]);

  const fetchPermissions = useCallback(async () => {
    // Parse the permissionKeys from the string
    let keysToCheck = [];
    try {
      const sorted = [...(permissionKeys || [])].sort();
      keysToCheck = sorted;
    } catch {
      keysToCheck = permissionKeys || [];
    }
    
    if (keysToCheck.length === 0) {
      setLoading(false);
      setPermissions({});
      return;
    }

    setLoading(true);
    try {
      // Check all permissions in parallel
      const permissionPromises = keysToCheck.map(key => 
        checkPermission(key).then(hasPermission => [key, hasPermission])
      );
      
      const results = await Promise.all(permissionPromises);
      const permissionsMap = Object.fromEntries(results);
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Set all permissions to false on error
      const permissionsMap = Object.fromEntries(
        keysToCheck.map(key => [key, false])
      );
      setPermissions(permissionsMap);
    } finally {
      setLoading(false);
    }
  }, [permissionKeys, checkPermission]);

  const hasPermission = useCallback((permissionKey) => {
    return permissions[permissionKey] || false;
  }, [permissions]);

  return {
    permissions,
    loading,
    hasPermission,
    refetch: fetchPermissions
  };
};

/**
 * Helper function to clear permissions cache
 */
export const clearPermissionsCache = () => {
  permissionsCache.clear();
};






