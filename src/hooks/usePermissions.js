import { useState, useEffect, useCallback } from 'react';
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

  const fetchPermissions = useCallback(async () => {
    if (permissionKeys.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check all permissions in parallel
      const permissionPromises = permissionKeys.map(key => 
        checkPermission(key).then(hasPermission => [key, hasPermission])
      );
      
      const results = await Promise.all(permissionPromises);
      const permissionsMap = Object.fromEntries(results);
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Set all permissions to false on error
      const permissionsMap = Object.fromEntries(
        permissionKeys.map(key => [key, false])
      );
      setPermissions(permissionsMap);
    } finally {
      setLoading(false);
    }
  }, [permissionKeys, checkPermission]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

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






