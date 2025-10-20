import React from 'react';

const PriceInput = ({ value, onChange, placeholder, required, className = '', ...props }) => {
  // Format number to Indonesian Rupiah format (100.000)
  const formatToIndonesian = (num) => {
    if (!num || num === 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse Indonesian format back to number
  const parseFromIndonesian = (str) => {
    if (!str) return 0;
    // Remove dots (thousand separators) and convert to number
    const cleanStr = str.replace(/\./g, '');
    return parseFloat(cleanStr) || 0;
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Remove any non-numeric characters except dots
    const cleanValue = inputValue.replace(/[^\d.]/g, '');
    
    // Parse the value to get the numeric value
    const numericValue = parseFromIndonesian(cleanValue);
    
    // Update the actual value
    onChange(numericValue);
  };

  // Display the value formatted as Indonesian Rupiah
  const displayValue = value && value > 0 ? formatToIndonesian(value) : '';

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
    </div>
  );
};

export default PriceInput;
