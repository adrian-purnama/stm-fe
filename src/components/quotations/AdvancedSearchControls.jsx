import React from 'react';
import {
  Info,
  SlidersHorizontal,
  XCircle,
  Search,
} from 'lucide-react';

const capitalize = (value = '') =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const AdvancedSearchControls = ({
  searchInput,
  setSearchInput,
  onSubmitSearch,
  searchPlaceholder = 'Search...',
  chips = [],
  onRemoveChip,
  onClearChips,
  showAdvancedFilters,
  setShowAdvancedFilters,
  advancedFilterCount = 0,
  filterDefinitions = [],
  filters = {},
  toggleMultiFilter,
  toggleSingleFilter,
  setFilterValue,
  clearAdvancedFilters,
  advancedFilterChips = [],
  additionalChips = [],
  infoContent,
  onOpenInfo,
  extraActions,
}) => {
  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmitSearch();
    }
  };

  const handleToggleAdvanced = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          {onOpenInfo && (
            <button
              onClick={onOpenInfo}
              className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Search help"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
          {extraActions}
        </div>
        {filterDefinitions.length > 0 && (
          <button
            onClick={handleToggleAdvanced}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showAdvancedFilters ? 'Hide advanced filters' : 'Show advanced filters'}
            {advancedFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-white text-blue-600 font-semibold">
                {advancedFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {(chips.length > 0 || additionalChips.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, index) => (
            <span
              key={`${chip.type}-${chip.value}-${index}`}
              className="bg-blue-100 rounded text-blue-800 px-2 py-1 text-xs inline-flex items-center"
            >
              {chip.type}:{chip.value}
              <button className="ml-1" onClick={() => onRemoveChip(index)}>
                <XCircle className="w-3 h-3" />
              </button>
            </span>
          ))}
          {additionalChips}
          {chips.length > 0 && (
            <button
              onClick={onClearChips}
              className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200 transition-colors"
            >
              Clear search filters
            </button>
          )}
        </div>
      )}

      {advancedFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {advancedFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="text-purple-500 hover:text-purple-700"
              >
                <XCircle className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAdvancedFilters}
            className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Clear advanced filters
          </button>
        </div>
      )}

      {showAdvancedFilters && filterDefinitions.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterDefinitions
              .filter((definition) => definition.type !== 'slider')
              .map((definition) => {
                const value = filters[definition.key];
                const options = definition.options || [];

                if (definition.type === 'multi') {
                  return (
                    <div key={definition.key} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {definition.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const isActive = Array.isArray(value) && value.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              onClick={() => toggleMultiFilter(definition.key, option.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                isActive
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                              }`}
                            >
                              {option.label || capitalize(option.value)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (definition.type === 'single') {
                  return (
                    <div key={definition.key} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {definition.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const isActive = value === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => toggleSingleFilter(definition.key, option.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                isActive
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                              }`}
                            >
                              {option.label || capitalize(option.value)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (definition.type === 'date') {
                  const minValue =
                    definition.minKey && filters[definition.minKey]
                      ? filters[definition.minKey]
                      : definition.min;
                  const maxValue =
                    definition.maxKey && filters[definition.maxKey]
                      ? filters[definition.maxKey]
                      : definition.max;

                  return (
                    <div key={definition.key} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {definition.label}
                      </p>
                      <input
                        type="date"
                        value={value || ''}
                        onChange={(event) =>
                          setFilterValue(definition.key, event.target.value)
                        }
                        min={minValue}
                        max={maxValue}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  );
                }

                if (definition.type === 'text') {
                  return (
                    <div key={definition.key} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {definition.label}
                      </p>
                      <input
                        type="text"
                        value={value || ''}
                        onChange={(event) =>
                          setFilterValue(definition.key, event.target.value)
                        }
                        placeholder={definition.placeholder || ''}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  );
                }

                if (definition.type === 'dateRange') {
                  const rangeValue = value || { from: '', to: '' };
                  return (
                    <div key={definition.key} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {definition.label}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            {definition.fromLabel || 'From'}
                          </label>
                          <input
                            type="date"
                            value={rangeValue.from || ''}
                            onChange={(event) =>
                              setFilterValue(definition.key, {
                                ...(rangeValue || {}),
                                from: event.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            {definition.toLabel || 'To'}
                          </label>
                          <input
                            type="date"
                            value={rangeValue.to || ''}
                            min={rangeValue.from || undefined}
                            onChange={(event) =>
                              setFilterValue(definition.key, {
                                ...(rangeValue || {}),
                                to: event.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
          </div>

          {filterDefinitions.some((definition) => definition.type === 'slider') && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              {filterDefinitions
                .filter((definition) => definition.type === 'slider')
                .map((definition) => {
                  const value = filters[definition.key] ?? definition.min ?? 0;
                  return (
                    <div key={definition.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {definition.label}
                        </p>
                        <span className="text-sm font-semibold text-blue-600">
                          {definition.formatValue
                            ? definition.formatValue(value)
                            : `${value}`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={definition.min ?? 0}
                        max={definition.max ?? 100}
                        step={definition.step ?? 1}
                        value={value}
                        onChange={(event) =>
                          setFilterValue(definition.key, Number(event.target.value))
                        }
                        className="w-full accent-blue-600"
                      />
                      {definition.sliderFooter && (
                        <div className="text-xs text-gray-500">
                          {definition.sliderFooter(value)}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {infoContent}
    </div>
  );
};

export default AdvancedSearchControls;

