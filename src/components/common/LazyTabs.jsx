import React, { useState, useEffect, Suspense, lazy, useMemo, useRef } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * LazyTabs Component
 * 
 * A reusable tab system with lazy loading and permission-based filtering.
 * 
 * @param {Object} props
 * @param {Array} props.tabs - Array of tab configurations
 *   Each tab object should have:
 *   - key: string - Unique identifier for the tab
 *   - label: string - Display label for the tab
 *   - component: React.ComponentType | () => Promise<{default: React.ComponentType}> - Component or lazy import function
 *   - permissionKey: string (optional) - Permission key required to view this tab
 *   - icon: React.Component (optional) - Icon component to display
 * @param {string} props.defaultActiveTab - Default active tab key
 * @param {string} props.storageKey - localStorage key to persist active tab (optional)
 * @param {boolean} props.loadInitialTab - Whether to load the initial tab immediately (default: false)
 * @param {string} props.activeTab - Controlled active tab (optional)
 * @param {Function} props.onTabChange - Callback when tab changes (optional)
 * @param {string} props.variant - Tab style variant: 'default' | 'underline' | 'pills' (default: 'default')
 * @param {string} props.className - Additional CSS classes
 */
const LazyTabs = ({
  tabs = [],
  defaultActiveTab,
  storageKey,
  loadInitialTab = false,
  activeTab: controlledActiveTab,
  onTabChange,
  variant = 'default',
  className = ''
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(null);
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [lazyComponents, setLazyComponents] = useState({});
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(true);
  
  // Use refs to avoid dependency issues in callbacks
  const loadedTabsRef = useRef(new Set());
  const lazyComponentsRef = useRef({});
  
  // Keep refs in sync with state
  useEffect(() => {
    loadedTabsRef.current = loadedTabs;
  }, [loadedTabs]);
  
  useEffect(() => {
    lazyComponentsRef.current = lazyComponents;
  }, [lazyComponents]);

  // Extract unique permission keys from tabs (support both single string and array)
  const permissionKeys = useMemo(() => {
    const keys = new Set();
    tabs.forEach(tab => {
      if (tab.permissionKey) {
        if (Array.isArray(tab.permissionKey)) {
          tab.permissionKey.forEach(key => keys.add(key));
        } else {
          keys.add(tab.permissionKey);
        }
      }
    });
    return Array.from(keys);
  }, [tabs]);

  // Fetch permissions for all tabs
  const { loading: permissionsLoading, hasPermission } = usePermissions(permissionKeys);

  // Filter tabs based on permissions
  const visibleTabs = useMemo(() => {
    return tabs.filter(tab => {
      // If tab has no permissionKey, always show it
      if (!tab.permissionKey) {
        return true;
      }
      // Support both single permission key and array of permission keys
      if (Array.isArray(tab.permissionKey)) {
        // Show tab if user has ANY of the required permissions
        return tab.permissionKey.some(key => hasPermission(key));
      } else {
        // Check if user has the required permission
        return hasPermission(tab.permissionKey);
      }
    });
  }, [tabs, hasPermission]);

  // Determine active tab
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const activeTabMeta = useMemo(() => {
    return visibleTabs.find(t => t.key === activeTab);
  }, [visibleTabs, activeTab]);

  // Initialize active tab
  useEffect(() => {
    if (!permissionsLoading && visibleTabs.length > 0 && activeTab === null) {
      // Try to restore from localStorage
      if (storageKey) {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab && visibleTabs.some(tab => tab.key === savedTab)) {
          setInternalActiveTab(savedTab);
          return;
        }
      }
      
      // Use defaultActiveTab if provided and visible, otherwise use first visible tab
      const initialTab = defaultActiveTab && visibleTabs.some(tab => tab.key === defaultActiveTab)
        ? defaultActiveTab
        : visibleTabs[0].key;
      
      setInternalActiveTab(initialTab);
    }
  }, [permissionsLoading, visibleTabs, defaultActiveTab, storageKey, activeTab]);

  // Lazy load component when tab is first accessed
  const loadTabComponent = (tab) => {
    // Check if already loaded (using ref for current state)
    if (loadedTabsRef.current.has(tab.key)) {
      return lazyComponentsRef.current[tab.key];
    }

    // If component is already a lazy component, use it
    if (tab.component && typeof tab.component === 'object' && '_payload' in tab.component) {
      setLazyComponents(prev => ({ ...prev, [tab.key]: tab.component }));
      setLoadedTabs(prev => new Set(prev).add(tab.key));
      return tab.component;
    }

    let LazyComponent = null;

    // If component is a function (lazy import), create lazy component
    if (typeof tab.component === 'function') {
      LazyComponent = lazy(() => {
        const result = tab.component();
        // Handle both direct component returns and promise returns
        return result.then ? result : Promise.resolve({ default: result });
      });
    } 
    // If component is a regular component, wrap it in lazy
    else if (tab.component) {
      const Component = tab.component;
      LazyComponent = lazy(() => Promise.resolve({ default: Component }));
    }

    if (LazyComponent) {
      setLazyComponents(prev => ({ ...prev, [tab.key]: LazyComponent }));
      setLoadedTabs(prev => new Set(prev).add(tab.key));
      return LazyComponent;
    }

    return null;
  };

  // Load initial tab if specified
  useEffect(() => {
    if (loadInitialTab && activeTab && !loadedTabsRef.current.has(activeTab)) {
      const tab = visibleTabs.find(t => t.key === activeTab);
      if (tab) {
        loadTabComponent(tab);
      }
    }
  }, [loadInitialTab, activeTab, visibleTabs]);

  const handleTabChange = (tabKey) => {
    const tab = visibleTabs.find(t => t.key === tabKey);
    if (tab) {
      // Load the component when tab is clicked for the first time
      if (!loadedTabsRef.current.has(tabKey)) {
        loadTabComponent(tab);
      }
      
      // Update active tab
      if (controlledActiveTab === undefined) {
        setInternalActiveTab(tabKey);
      }
      
      // Save to localStorage if storageKey is provided
      if (storageKey) {
        localStorage.setItem(storageKey, tabKey);
      }
      
      // Call callback if provided
      if (onTabChange) {
        onTabChange(tabKey);
      }
    }
  };

  // Get the active tab's component
  const ActiveTabComponent = useMemo(() => {
    if (!activeTab) return null;
    
    const tab = visibleTabs.find(t => t.key === activeTab);
    if (!tab) return null;

    // Return the lazy component if already loaded
    if (lazyComponents[tab.key]) {
      return lazyComponents[tab.key];
    }

    // Load component if not already loaded (this will trigger state update)
    if (!loadedTabs.has(tab.key)) {
      return loadTabComponent(tab);
    }

    return null;
  }, [activeTab, visibleTabs, loadedTabs, lazyComponents]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );

  // Render tab button styles based on variant
  const getTabButtonClass = (isActive) => {
    const baseClass = "flex flex-1 min-w-[160px] sm:min-w-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap sm:flex-none";
    
    switch (variant) {
      case 'underline':
        return `${baseClass} border-b-2 ${
          isActive
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`;
      case 'pills':
        return `${baseClass} rounded-full ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`;
      default:
        return `${baseClass} ${
          isActive
            ? 'text-blue-600 border-b-2 border-blue-500'
            : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
        }`;
    }
  };

  if (permissionsLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <p className="text-gray-500">No tabs available. You may not have the required permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(prev => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:hidden"
          aria-expanded={isMobileNavOpen}
          aria-controls="lazy-tabs-navigation"
        >
          <span>{activeTabMeta?.label ? `Active: ${activeTabMeta.label}` : 'Tabs'}</span>
          {isMobileNavOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <nav
          id="lazy-tabs-navigation"
          className={`${isMobileNavOpen ? 'mt-3 flex' : 'hidden'} -mx-1 flex-wrap items-center ${variant === 'pills' ? 'gap-2 sm:gap-3 md:gap-4' : 'gap-2 sm:gap-4 md:gap-6'} overflow-x-auto px-1 py-1 scrollbar-hide sm:mt-0 sm:flex`}
        >
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={getTabButtonClass(isActive)}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab && ActiveTabComponent ? (
          <Suspense fallback={<LoadingSkeleton />}>
            <ActiveTabComponent />
          </Suspense>
        ) : activeTab ? (
          <LoadingSkeleton />
        ) : null}
      </div>
    </div>
  );
};

export default LazyTabs;
