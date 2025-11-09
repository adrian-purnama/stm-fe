import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { buildSearchString } from '../utils/helpers/searchUtils';

const deepEqual = (a, b) => {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
};

const buildInitialFilters = (definitions = [], initialOverrides = {}) => {
  const result = {};

  definitions.forEach((definition) => {
    const { key, type, defaultValue } = definition;

    if (Object.prototype.hasOwnProperty.call(initialOverrides, key)) {
      result[key] = initialOverrides[key];
      return;
    }

    if (defaultValue !== undefined) {
      result[key] = defaultValue;
      return;
    }

    switch (type) {
      case 'multi':
        result[key] = [];
        break;
      case 'slider':
        result[key] = definition.min ?? 0;
        break;
      case 'dateRange':
        result[key] = { from: '', to: '' };
        break;
      default:
        result[key] = '';
    }
  });

  return result;
};

const shouldIncludeValue = (definition, value, filters) => {
  if (definition.shouldIncludeInParams) {
    return definition.shouldIncludeInParams(value, filters);
  }

  if (definition.type === 'multi') {
    return Array.isArray(value) && value.length > 0;
  }

  if (definition.type === 'dateRange') {
    return Boolean(value?.from || value?.to);
  }

  if (definition.type === 'slider') {
    if (definition.min !== undefined) {
      return Number(value) > Number(definition.min);
    }
  }

  return Boolean(value);
};

const shouldShowChip = (definition, value) => {
  if (definition.shouldShowChip) {
    return definition.shouldShowChip(value);
  }
  return true;
};

export const useAdvancedSearch = ({
  filterDefinitions = [],
  initialFilters = {},
  initialChips = [],
  initialSearchInput = '',
} = {}) => {
  const definitionMap = useMemo(() => {
    const map = new Map();
    filterDefinitions.forEach((definition) => {
      map.set(definition.key, definition);
    });
    return map;
  }, [filterDefinitions]);

  const initialFiltersSignature = useMemo(
    () => JSON.stringify(initialFilters || {}),
    [initialFilters]
  );

  const normalizedInitialFilters = useMemo(() => {
    if (!initialFilters) {
      return {};
    }
    try {
      return JSON.parse(initialFiltersSignature);
    } catch (error) {
      console.warn('Failed to normalize initialFilters for useAdvancedSearch', error);
      return {};
    }
  }, [initialFiltersSignature]);

  const resolvedInitialFilters = useMemo(
    () => buildInitialFilters(filterDefinitions, normalizedInitialFilters),
    [filterDefinitions, normalizedInitialFilters]
  );

  const initialFiltersRef = useRef(resolvedInitialFilters);

  useEffect(() => {
    if (!deepEqual(initialFiltersRef.current, resolvedInitialFilters)) {
      initialFiltersRef.current = resolvedInitialFilters;
    }
  }, [resolvedInitialFilters]);

  const [searchInput, setSearchInput] = useState(initialSearchInput);
  const [chips, setChips] = useState(initialChips);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState(resolvedInitialFilters);

  useEffect(() => {
    setFilters((prev) =>
      deepEqual(prev, resolvedInitialFilters) ? prev : resolvedInitialFilters
    );
  }, [resolvedInitialFilters]);

  const addChipsFromTokens = useCallback((tokens) => {
    if (!Array.isArray(tokens) || tokens.length === 0) return;
    setChips((prev) => [...prev, ...tokens]);
  }, []);

  const removeChip = useCallback((index) => {
    setChips((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const clearChips = useCallback(() => {
    setChips([]);
  }, []);

  const toggleMultiFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  }, []);

  const toggleSingleFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? '' : value,
    }));
  }, []);

  const setFilterValue = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearAdvancedFilters = useCallback(() => {
    setFilters(initialFiltersRef.current);
  }, []);

  const advancedFilterChips = useMemo(() => {
    const chipsCollection = [];

    filterDefinitions.forEach((definition) => {
      const { key, label, type } = definition;
      const value = filters[key];

      if (type === 'multi' && Array.isArray(value)) {
        value.forEach((item) => {
          if (!shouldShowChip(definition, item)) return;
          const chipLabel = definition.getChipLabel
            ? definition.getChipLabel(item, filters, definition)
            : `${label}: ${item}`;

          chipsCollection.push({
            key: `${key}-${item}`,
            label: chipLabel,
            onRemove: () =>
              setFilters((prev) => {
                const current = Array.isArray(prev[key]) ? prev[key] : [];
                return {
                  ...prev,
                  [key]: current.filter((option) => option !== item),
                };
              }),
          });
        });
      } else if (type === 'dateRange') {
        if (value?.from && shouldShowChip(definition, value.from)) {
          const chipLabel = definition.getFromChipLabel
            ? definition.getFromChipLabel(value.from, filters, definition)
            : `${label} From: ${value.from}`;
          chipsCollection.push({
            key: `${key}-from`,
            label: chipLabel,
            onRemove: () =>
              setFilters((prev) => ({
                ...prev,
                [key]: { ...(prev[key] || {}), from: '' },
              })),
          });
        }

        if (value?.to && shouldShowChip(definition, value.to)) {
          const chipLabel = definition.getToChipLabel
            ? definition.getToChipLabel(value.to, filters, definition)
            : `${label} To: ${value.to}`;
          chipsCollection.push({
            key: `${key}-to`,
            label: chipLabel,
            onRemove: () =>
              setFilters((prev) => ({
                ...prev,
                [key]: { ...(prev[key] || {}), to: '' },
              })),
          });
        }
      } else if (type === 'slider') {
        if (!shouldShowChip(definition, value)) return;
        const chipLabel = definition.getChipLabel
          ? definition.getChipLabel(value, filters, definition)
          : `${label}: ${value}`;

        chipsCollection.push({
          key: `${key}`,
          label: chipLabel,
          onRemove: () =>
            setFilters((prev) => ({
              ...prev,
              [key]: definition.min ?? 0,
            })),
        });
      } else if (type === 'date') {
        if (!value || !shouldShowChip(definition, value)) return;
        const chipLabel = definition.getChipLabel
          ? definition.getChipLabel(value, filters, definition)
          : `${label}: ${value}`;
        chipsCollection.push({
          key: key,
          label: chipLabel,
          onRemove: () =>
            setFilters((prev) => ({
              ...prev,
              [key]: '',
            })),
        });
      } else if (type === 'text') {
        if (!value || !shouldShowChip(definition, value)) return;
        const chipLabel = definition.getChipLabel
          ? definition.getChipLabel(value, filters, definition)
          : `${label}: ${value}`;
        chipsCollection.push({
          key: key,
          label: chipLabel,
          onRemove: () =>
            setFilters((prev) => ({
              ...prev,
              [key]: '',
            })),
        });
      } else if (value && shouldShowChip(definition, value)) {
        const chipLabel = definition.getChipLabel
          ? definition.getChipLabel(value, filters, definition)
          : `${label}: ${value}`;
        chipsCollection.push({
          key: key,
          label: chipLabel,
          onRemove: () =>
            setFilters((prev) => ({
              ...prev,
              [key]: '',
            })),
        });
      }
    });

    return chipsCollection;
  }, [filterDefinitions, filters]);

  const advancedFilterCount = useMemo(
    () => advancedFilterChips.length,
    [advancedFilterChips]
  );

  const searchString = useMemo(
    () => buildSearchString(chips, searchInput),
    [chips, searchInput]
  );

  const queryParams = useMemo(() => {
    const params = {};
    const search = buildSearchString(chips, searchInput);

    if (search) {
      params.search = search;
    }

    filterDefinitions.forEach((definition) => {
      const { key, type } = definition;
      const paramKey = definition.paramKey || key;
      const value = filters[key];

      if (!shouldIncludeValue(definition, value, filters)) {
        return;
      }

      if (definition.getParams) {
        Object.assign(params, definition.getParams(value, filters, definition));
        return;
      }

      if (type === 'dateRange') {
        if (value?.from) {
          params[definition.fromParam || 'from'] = value.from;
        }
        if (value?.to) {
          params[definition.toParam || 'to'] = value.to;
        }
        return;
      }

      params[paramKey] = value;
    });

    return params;
  }, [chips, searchInput, filterDefinitions, filters]);

  return {
    searchInput,
    setSearchInput,
    chips,
    setChips,
    addChipsFromTokens,
    removeChip,
    clearChips,
    showAdvancedFilters,
    setShowAdvancedFilters,
    filters,
    setFilters,
    toggleMultiFilter,
    toggleSingleFilter,
    setFilterValue,
    clearAdvancedFilters,
    advancedFilterChips,
    advancedFilterCount,
    searchString,
    queryParams,
    filterDefinitions,
  };
};

