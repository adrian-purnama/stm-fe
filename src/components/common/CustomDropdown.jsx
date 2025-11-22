import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Star, Search, X } from 'lucide-react';

const CustomDropdown = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  required = false,
  onStarClick = null,
  starredValues = [],
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.value && String(option.value).toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchable]);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      }

      if (e.key === 'Enter' && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
        return;
      }

      // If typing and search input is not focused, focus it
      if (searchable && /^[a-zA-Z0-9\s]$/.test(e.key) && document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, highlightedIndex, filteredOptions, searchable]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsListRef.current) {
      const highlightedElement = optionsListRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1); // Reset highlight when searching
  };

  const clearSearch = () => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        required={required}
        className={`
          w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
          transition-all duration-200 ease-in-out
          ${disabled 
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'hover:border-gray-400 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-red-500 border-red-500' : ''}
          ${required && !value ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={20} 
            className={`text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div 
            ref={optionsListRef}
            className="overflow-auto max-h-[240px]"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                {searchTerm ? `No options found for "${searchTerm}"` : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-red-50 focus:bg-red-50
                    focus:outline-none transition-colors duration-150
                    flex items-center justify-between
                    ${option.value === value ? 'bg-red-50 text-red-700' : 'text-gray-900'}
                    ${index === highlightedIndex ? 'bg-red-100' : ''}
                    ${index === 0 && !searchable ? 'rounded-t-lg' : ''}
                    ${index === filteredOptions.length - 1 ? 'rounded-b-lg' : ''}
                  `}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {onStarClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStarClick(option.value);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Star 
                          size={14} 
                          className={`transition-colors ${
                            starredValues.includes(option.value)
                              ? 'text-yellow-500 fill-yellow-500' 
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    )}
                    <span className="block truncate">{option.label}</span>
                  </div>
                  {option.value === value && (
                    <Check size={16} className="text-red-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
