import { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download,
  Filter,
  Search,
  Eye,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Settings,
  ArrowLeft
} from 'lucide-react';
import Navigation from '../components/Navigation';
import CustomDropdown from '../components/CustomDropdown';
import BaseModal from '../components/BaseModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DynamicAnalyticsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [filters, setFilters] = useState({});
  const [filteredData, setFilteredData] = useState(null);
  const [selectedChart, setSelectedChart] = useState('overview');
  const [customQuery, setCustomQuery] = useState('');
  const [topN, setTopN] = useState(10);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [showAllData, setShowAllData] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [selectedChartColumn, setSelectedChartColumn] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [showInsights, setShowInsights] = useState(false);
  const [showTopN, setShowTopN] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [showItemCharts, setShowItemCharts] = useState(false);
  const [itemChartType, setItemChartType] = useState('bar');
  const [expandedColumn, setExpandedColumn] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Hanya file CSV yang didukung');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error('File CSV kosong');
          return;
        }

        // Better CSV parsing that handles commas within quotes
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
        
        const rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = parseCSVLine(line).map(v => v.replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

        const processedData = {
          headers,
          rows,
          totalRows: rows.length,
          totalColumns: headers.length
        };

        setData(processedData);
        // Reset states
        setAnalysis(null);
        setFilteredData(null);
        setFilters({});
        
        // Analyze data after setting it
        setTimeout(() => {
          analyzeData(processedData);
        }, 100);
        
        toast.success(`File berhasil diunggah: ${processedData.totalRows} baris, ${processedData.totalColumns} kolom`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing file CSV');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Analyze the data
  const analyzeData = (data) => {
    if (!data || !data.headers || !data.rows) {
      console.error('Invalid data structure for analysis');
      return;
    }
    
    const { headers, rows } = data;
    const analysis = {
      dataTypes: {},
      statistics: {},
      missingData: {},
      duplicates: 0,
      insights: [],
      correlations: {},
      outliers: {}
    };

    // Analyze each column
    headers.forEach(header => {
      const values = rows.map(row => row[header]).filter(val => val !== '');
      
      // Determine data type
      const numericValues = values.filter(val => !isNaN(parseFloat(val)) && isFinite(val));
      const dateValues = values.filter(val => !isNaN(Date.parse(val)));
      
      if (numericValues.length > values.length * 0.8) {
        analysis.dataTypes[header] = 'numeric';
        
        // Calculate statistics for numeric columns
        const nums = numericValues.map(Number);
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const sortedNums = [...nums].sort((a, b) => a - b);
        const median = sortedNums[Math.floor(sortedNums.length / 2)];
        
        analysis.statistics[header] = {
          count: nums.length,
          mean: mean,
          median: median,
          min: Math.min(...nums),
          max: Math.max(...nums),
          std: Math.sqrt(nums.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / nums.length)
        };
        
        // Detect outliers (values beyond 2 standard deviations)
        const std = analysis.statistics[header].std;
        analysis.outliers[header] = nums.filter(n => Math.abs(n - mean) > 2 * std);
        
      } else if (dateValues.length > values.length * 0.8) {
        analysis.dataTypes[header] = 'date';
      } else {
        analysis.dataTypes[header] = 'categorical';
        
        // Calculate frequency for categorical columns
        const frequency = {};
        values.forEach(val => {
          frequency[val] = (frequency[val] || 0) + 1;
        });
        analysis.statistics[header] = frequency;
      }
      
      // Check for missing data
      analysis.missingData[header] = rows.length - values.length;
    });

    // Check for duplicates
    const rowStrings = rows.map(row => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    analysis.duplicates = rowStrings.length - uniqueRows.size;

    // Generate insights
    analysis.insights = generateInsights(analysis, headers, rows.length);

    // Calculate correlations for numeric columns
    const numericHeaders = headers.filter(h => analysis.dataTypes[h] === 'numeric');
    if (numericHeaders.length > 1) {
      numericHeaders.forEach(h1 => {
        analysis.correlations[h1] = {};
        numericHeaders.forEach(h2 => {
          if (h1 !== h2) {
            analysis.correlations[h1][h2] = calculateCorrelation(
              rows.map(r => parseFloat(r[h1])).filter(n => !isNaN(n)),
              rows.map(r => parseFloat(r[h2])).filter(n => !isNaN(n))
            );
          }
        });
      });
    }

    setAnalysis(analysis);
    setFilteredData(data);
  };

  // Generate comprehensive insights based on data analysis
  const generateInsights = (analysis, headers, totalRows) => {
    const insights = [];
    const { dataTypes, statistics, missingData, outliers, duplicates, correlations } = analysis;
    
    // 1. DATASET OVERVIEW
    
    insights.push({
      type: 'success',
      title: 'Ringkasan Dataset',
      description: `Dataset berisi ${headers.length} kolom dengan ${totalRows} baris data`
    });

    // 2. DATA TYPES ANALYSIS
    const typeCounts = {};
    Object.values(dataTypes).forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    if (Object.keys(typeCounts).length > 0) {
      const typeSummary = Object.entries(typeCounts)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      insights.push({
        type: 'info',
        title: 'Jenis Data',
        description: `Dataset mengandung: ${typeSummary}`
      });
    }

    // 3. MISSING DATA ANALYSIS
    const columnsWithMissing = Object.entries(missingData)
      .filter(([_, count]) => count > 0);
    if (columnsWithMissing.length > 0) {
      const missingPercentage = columnsWithMissing.map(([col, count]) => {
        const percentage = totalRows > 0 ? ((count / totalRows) * 100).toFixed(1) : '0.0';
        return `${col} (${count} baris, ${percentage}%)`;
      });
      
      insights.push({
        type: 'warning',
        title: 'Data Hilang Ditemukan',
        description: `Kolom dengan data hilang: ${missingPercentage.join(', ')}`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Data Lengkap',
        description: 'Semua kolom memiliki data lengkap tanpa nilai yang hilang'
      });
    }

    // 4. DUPLICATE DATA ANALYSIS
    if (duplicates > 0) {
      const duplicatePercentage = totalRows > 0 ? ((duplicates / totalRows) * 100).toFixed(1) : '0.0';
      insights.push({
        type: 'warning',
        title: 'Data Duplikat',
        description: `${duplicates} baris duplikat ditemukan (${duplicatePercentage}% dari total data)`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Data Unik',
        description: 'Tidak ada baris duplikat ditemukan dalam dataset'
      });
    }

    // 5. OUTLIER ANALYSIS
    const columnsWithOutliers = Object.entries(outliers)
      .filter(([_, outliers]) => outliers.length > 0);
    if (columnsWithOutliers.length > 0) {
      const outlierDetails = columnsWithOutliers.map(([col, outliers]) => {
        const total = statistics[col]?.count || 0;
        const percentage = total > 0 ? ((outliers.length / total) * 100).toFixed(1) : '0';
        return `${col} (${outliers.length} nilai, ${percentage}%)`;
      });
      
      insights.push({
        type: 'info',
        title: 'Nilai Outlier Ditemukan',
        description: `Outlier ditemukan di: ${outlierDetails.join(', ')}`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Data Normal',
        description: 'Tidak ada nilai outlier yang signifikan ditemukan'
      });
    }

    // 6. CORRELATION ANALYSIS
    const strongCorrelations = [];
    const moderateCorrelations = [];
    Object.entries(correlations).forEach(([col1, correlations]) => {
      Object.entries(correlations).forEach(([col2, corr]) => {
        if (Math.abs(corr) > 0.8) {
          strongCorrelations.push({ col1, col2, correlation: corr });
        } else if (Math.abs(corr) > 0.5) {
          moderateCorrelations.push({ col1, col2, correlation: corr });
        }
      });
    });

    if (strongCorrelations.length > 0) {
      insights.push({
        type: 'success',
        title: 'Korelasi Kuat Ditemukan',
        description: `Korelasi sangat kuat: ${strongCorrelations.map(c => `${c.col1} ↔ ${c.col2} (${c.correlation.toFixed(2)})`).join(', ')}`
      });
    }

    if (moderateCorrelations.length > 0) {
      insights.push({
        type: 'info',
        title: 'Korelasi Sedang Ditemukan',
        description: `Korelasi sedang: ${moderateCorrelations.map(c => `${c.col1} ↔ ${c.col2} (${c.correlation.toFixed(2)})`).join(', ')}`
      });
    }

    // 7. DISTRIBUTION ANALYSIS
    const categoricalColumns = headers.filter(h => dataTypes[h] === 'categorical');
    const numericColumns = headers.filter(h => dataTypes[h] === 'numeric');
    
    if (categoricalColumns.length > 0) {
      const distributionAnalysis = categoricalColumns.map(col => {
        const freqs = Object.values(statistics[col]);
        const maxFreq = Math.max(...freqs);
        const totalFreq = freqs.reduce((a, b) => a + b, 0);
        const skew = maxFreq / totalFreq;
        const uniqueValues = Object.keys(statistics[col]).length;
        return { col, skew, uniqueValues, maxFreq, totalFreq };
      });

      // Most skewed distribution
      const mostSkewed = distributionAnalysis.sort((a, b) => b.skew - a.skew)[0];
      if (mostSkewed.skew > 0.8) {
        insights.push({
          type: 'warning',
          title: 'Distribusi Tidak Seimbang',
          description: `Kolom '${mostSkewed.col}' sangat tidak seimbang: nilai paling sering muncul ${(mostSkewed.skew * 100).toFixed(1)}% dari total`
        });
      } else if (mostSkewed.skew < 0.3) {
        insights.push({
          type: 'success',
          title: 'Distribusi Seimbang',
          description: `Kolom '${mostSkewed.col}' memiliki distribusi yang cukup seimbang`
        });
      }

      // High cardinality
      const highCardinality = distributionAnalysis.filter(d => d.uniqueValues > 50);
      if (highCardinality.length > 0) {
        insights.push({
          type: 'info',
          title: 'Kardinalitas Tinggi',
          description: `Kolom dengan nilai unik banyak: ${highCardinality.map(h => `${h.col} (${h.uniqueValues} nilai)`).join(', ')}`
        });
      }
    }

    // 8. NUMERIC DATA ANALYSIS
    if (numericColumns.length > 0) {
      const numericAnalysis = numericColumns.map(col => {
        const stats = statistics[col];
        const range = stats.max - stats.min;
        const coefficientOfVariation = stats.std / stats.mean;
        return { col, range, coefficientOfVariation, stats };
      });

      // High variability
      const highVariability = numericAnalysis.filter(n => n.coefficientOfVariation > 1);
      if (highVariability.length > 0) {
        insights.push({
          type: 'info',
          title: 'Variabilitas Tinggi',
          description: `Kolom dengan variabilitas tinggi: ${highVariability.map(h => `${h.col} (CV: ${h.coefficientOfVariation.toFixed(2)})`).join(', ')}`
        });
      }

      // Wide ranges
      const wideRanges = numericAnalysis.filter(n => n.range > n.stats.mean * 10);
      if (wideRanges.length > 0) {
        insights.push({
          type: 'info',
          title: 'Rentang Nilai Luas',
          description: `Kolom dengan rentang nilai sangat luas: ${wideRanges.map(w => `${w.col} (${w.stats.min} - ${w.stats.max})`).join(', ')}`
        });
      }
    }


    return insights;
  };

  // Calculate correlation coefficient
  const calculateCorrelation = (x, y) => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    return (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  };

  // Apply filters
  const applyFilters = () => {
    if (!data) return;
    
    let filtered = data.rows;
    
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue.trim()) {
        filtered = filtered.filter(row => {
          const value = row[column];
          if (analysis.dataTypes[column] === 'numeric') {
            // Handle numeric filters (>, <, =, >=, <=)
            if (filterValue.includes('>')) {
              const num = parseFloat(filterValue.replace('>', ''));
              return parseFloat(value) > num;
            } else if (filterValue.includes('<')) {
              const num = parseFloat(filterValue.replace('<', ''));
              return parseFloat(value) < num;
            } else if (filterValue.includes('>=')) {
              const num = parseFloat(filterValue.replace('>=', ''));
              return parseFloat(value) >= num;
            } else if (filterValue.includes('<=')) {
              const num = parseFloat(filterValue.replace('<=', ''));
              return parseFloat(value) <= num;
            } else {
              return parseFloat(value) === parseFloat(filterValue);
            }
          } else {
            // Handle text filters
            return value.toLowerCase().includes(filterValue.toLowerCase());
          }
        });
      }
    });
    
    setFilteredData({ ...data, rows: filtered });
  };

  // Handle filter change with contextual clearing
  const handleFilterChange = (column, value) => {
    const newFilters = { ...filters, [column]: value };
    
    // If setting a new filter, clear filters that become invalid
    if (value) {
      // Check which other filters become invalid with this new filter
      const validFilters = { [column]: value };
      
      // Test each existing filter to see if it's still valid
      Object.entries(newFilters).forEach(([filterColumn, filterValue]) => {
        if (filterColumn !== column && filterValue) {
          // Apply the new filter first
          let testRows = data.rows;
          Object.entries(validFilters).forEach(([testColumn, testValue]) => {
            if (testValue) {
              testRows = testRows.filter(row => {
                if (testValue.startsWith('>=')) {
                  const threshold = parseFloat(testValue.replace('>=', '').trim());
                  return !isNaN(parseFloat(row[testColumn])) && parseFloat(row[testColumn]) >= threshold;
                } else if (testValue.startsWith('<=')) {
                  const threshold = parseFloat(testValue.replace('<=', '').trim());
                  return !isNaN(parseFloat(row[testColumn])) && parseFloat(row[testColumn]) <= threshold;
                } else if (testValue.startsWith('>')) {
                  const threshold = parseFloat(testValue.replace('>', '').trim());
                  return !isNaN(parseFloat(row[testColumn])) && parseFloat(row[testColumn]) > threshold;
                } else if (testValue.startsWith('<')) {
                  const threshold = parseFloat(testValue.replace('<', '').trim());
                  return !isNaN(parseFloat(row[testColumn])) && parseFloat(row[testColumn]) < threshold;
                } else {
                  return row[testColumn] === testValue;
                }
              });
            }
          });
          
          // Check if this filter value still exists in the filtered data
          const stillValid = testRows.some(row => {
            if (filterValue.startsWith('>=')) {
              const threshold = parseFloat(filterValue.replace('>=', '').trim());
              return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) >= threshold;
            } else if (filterValue.startsWith('<=')) {
              const threshold = parseFloat(filterValue.replace('<=', '').trim());
              return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) <= threshold;
            } else if (filterValue.startsWith('>')) {
              const threshold = parseFloat(filterValue.replace('>', '').trim());
              return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) > threshold;
            } else if (filterValue.startsWith('<')) {
              const threshold = parseFloat(filterValue.replace('<', '').trim());
              return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) < threshold;
            } else {
              return row[filterColumn] === filterValue;
            }
          });
          
          if (stillValid) {
            validFilters[filterColumn] = filterValue;
          }
        }
      });
      
      setFilters(validFilters);
    } else {
      setFilters(newFilters);
    }
  };

  // Get filter options for a column with contextual filtering
  const getFilterOptions = (column) => {
    if (!data) return [];
    
    // Get filtered data based on current filters (excluding the current column)
    let relevantRows = data.rows;
    
    // Apply existing filters to get contextual data
    Object.entries(filters).forEach(([filterColumn, filterValue]) => {
      if (filterColumn !== column && filterValue) {
        relevantRows = relevantRows.filter(row => {
          if (filterValue.startsWith('>=')) {
            const threshold = parseFloat(filterValue.replace('>=', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) >= threshold;
          } else if (filterValue.startsWith('<=')) {
            const threshold = parseFloat(filterValue.replace('<=', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) <= threshold;
          } else if (filterValue.startsWith('>')) {
            const threshold = parseFloat(filterValue.replace('>', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) > threshold;
          } else if (filterValue.startsWith('<')) {
            const threshold = parseFloat(filterValue.replace('<', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) < threshold;
          } else {
            // Exact match for categorical data
            return row[filterColumn] === filterValue;
          }
        });
      }
    });
    
    // Get unique values from the filtered rows for this column
    const uniqueValues = [...new Set(relevantRows.map(row => row[column]).filter(val => val !== '' && val !== null && val !== undefined))];
    
    if (!analysis || !analysis.dataTypes || !analysis.dataTypes[column]) {
      // If analysis not ready, just show unique values
      return uniqueValues
        .sort()
        .slice(0, 100) // Limit to 100 to prevent UI issues
        .map(value => ({ value, label: value }));
    }
    
    if (analysis.dataTypes[column] === 'categorical') {
      // Calculate frequencies based on filtered data
      const frequencies = {};
      relevantRows.forEach(row => {
        const val = row[column];
        if (val !== '' && val !== null && val !== undefined) {
          frequencies[val] = (frequencies[val] || 0) + 1;
        }
      });
      
      return uniqueValues
        .sort((a, b) => (frequencies[b] || 0) - (frequencies[a] || 0))
        .map(value => ({ 
          value, 
          label: `${value} (${frequencies[value] || 0} kali)` 
        }));
    } else if (analysis.dataTypes[column] === 'numeric') {
      const stats = analysis.statistics[column];
      if (!stats) {
        // If stats not ready, just show unique numeric values
        const numericValues = uniqueValues
          .map(val => parseFloat(val))
          .filter(val => !isNaN(val))
          .sort((a, b) => b - a);
        
        return numericValues.slice(0, 50).map(val => ({ 
          value: val.toString(), 
          label: `= ${val}` 
        }));
      }
      
      const uniqueNumericValues = uniqueValues
        .map(val => parseFloat(val))
        .filter(val => !isNaN(val))
        .sort((a, b) => b - a);
      
      return [
        // Statistical filters
        { value: `>= ${stats.mean.toFixed(2)}`, label: `>= Rata-rata (${stats.mean.toFixed(2)})` },
        { value: `<= ${stats.mean.toFixed(2)}`, label: `<= Rata-rata (${stats.mean.toFixed(2)})` },
        { value: `>= ${stats.median}`, label: `>= Median (${stats.median})` },
        { value: `<= ${stats.median}`, label: `<= Median (${stats.median})` },
        { value: `> ${stats.max * 0.8}`, label: `> 80% dari Max (${(stats.max * 0.8).toFixed(2)})` },
        { value: `< ${stats.min * 1.2}`, label: `< 20% dari Min (${(stats.min * 1.2).toFixed(2)})` },
        // Top unique values (up to 50)
        ...uniqueNumericValues.slice(0, 50).map(val => ({ 
          value: val.toString(), 
          label: `= ${val}` 
        }))
      ];
    }
    
    return uniqueValues
      .sort()
      .slice(0, 100)
      .map(value => ({ value, label: value }));
  };

  // Get color intensity based on row index
  const getRowColor = (index, totalRows) => {
    const intensity = Math.floor((index / totalRows) * 100);
    return `bg-gray-${Math.max(50, 100 - intensity)}`;
  };

  // Get detailed information for a selected item
  const getItemDetails = (itemName, columnName) => {
    if (!filteredData || !filteredData.rows) return null;
    
    // Find all rows that contain this item in the selected column
    const matchingRows = filteredData.rows.filter(row => 
      row[columnName] && row[columnName].toString().toLowerCase() === itemName.toLowerCase()
    );
    
    if (matchingRows.length === 0) return null;
    
    // Aggregate data across all columns for this item
    const details = {};
    
    filteredData.headers.forEach(header => {
      const values = matchingRows.map(row => row[header]).filter(val => val !== '' && val !== null && val !== undefined);
      const uniqueValues = [...new Set(values)];
      
      details[header] = {
        totalOccurrences: values.length,
        uniqueValues: uniqueValues,
        mostCommon: uniqueValues.length > 0 ? 
          uniqueValues.reduce((a, b) => 
            values.filter(v => v === a).length > values.filter(v => v === b).length ? a : b
          ) : null,
        allValues: values
      };
    });
    
    return {
      itemName,
      columnName,
      totalRows: matchingRows.length,
      details
    };
  };

  // Handle item selection for drill-down
  const handleItemSelect = (itemName, columnName) => {
    const details = getItemDetails(itemName, columnName);
    setSelectedItemDetails(details);
    setSelectedItemName(itemName);
  };

  // Handle column expansion/collapse
  const handleColumnToggle = (columnName) => {
    setExpandedColumn(expandedColumn === columnName ? null : columnName);
  };

  // Generate chart data for item details
  const generateItemDetailChartData = (detail, chartType = 'bar') => {
    if (!detail || !detail.uniqueValues) return [];
    
    return detail.uniqueValues.map(value => {
      const count = detail.allValues.filter(v => v === value).length;
      const percentage = ((count / detail.allValues.length) * 100).toFixed(1);
      return {
        name: value.length > 20 ? `${value.substring(0, 20)}...` : value,
        value: count,
        percentage: percentage,
        fullName: value
      };
    }).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10 only
  };

  // Get top N values for a column
  const getTopNValues = (column, n = 10) => {
    if (!data || !analysis) return [];
    
    if (analysis.dataTypes[column] === 'categorical') {
      const frequencies = analysis.statistics[column];
      return Object.entries(frequencies)
        .sort(([,a], [,b]) => b - a)
        .slice(0, n)
        .map(([value, count]) => ({ value, count, percentage: (count / data.totalRows * 100).toFixed(1) }));
    } else if (analysis.dataTypes[column] === 'numeric') {
      const values = data.rows
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val))
        .sort((a, b) => b - a)
        .slice(0, n);
      
      return values.map((value, index) => ({
        value: value.toFixed(2),
        count: index + 1,
        percentage: ((n - index) / values.length * 100).toFixed(1)
      }));
    }
    return [];
  };

  // Generate chart data for filtered results
  const generateChartData = (column) => {
    if (!filteredData || !column) return null;
    
    const columnData = filteredData.rows.map(row => row[column]).filter(val => val !== '');
    
    if (analysis?.dataTypes[column] === 'categorical') {
      const frequency = {};
      columnData.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
      });
      
      return Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20) // Top 20 for better visualization
        .map(([name, value]) => ({ name, value }));
    } else if (analysis?.dataTypes[column] === 'numeric') {
      const numericValues = columnData.map(val => parseFloat(val)).filter(val => !isNaN(val));
      const bins = 10;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const binSize = (max - min) / bins;
      
      const histogram = Array(bins).fill(0).map((_, i) => ({
        name: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
        value: 0
      }));
      
      numericValues.forEach(val => {
        const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1);
        histogram[binIndex].value++;
      });
      
      return histogram.filter(bin => bin.value > 0);
    }
    
    return null;
  };

  // Export filtered data
  const exportData = () => {
    if (!filteredData) return;
    
    const csvContent = [
      filteredData.headers.join(','),
      ...filteredData.rows.map(row => 
        filteredData.headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const chartOptions = [
    { value: 'overview', label: 'Ringkasan Dataset' },
    { value: 'distribution', label: 'Distribusi Data' },
    { value: 'correlation', label: 'Matriks Korelasi' },
    { value: 'missing', label: 'Analisis Data Hilang' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Analisis Dinamis" subtitle="Analisis data CSV yang fleksibel dan cerdas" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Unggah Data CSV</h2>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pilih file CSV untuk dianalisis</h3>
            <p className="text-gray-500 mb-4">
              Unggah file CSV dengan kolom dan baris data untuk analisis otomatis
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Pilih File CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data Overview */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <BarChart3 size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Total Baris</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.totalRows.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Total Kolom</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.totalColumns}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Data Aktif</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {filteredData ? filteredData.rows.length.toLocaleString() : data.totalRows.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Add-ons Section */}
        {data && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Settings size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Add-ons Analisis</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  showInsights 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Info size={20} />
                  <span className="font-medium">Wawasan Data</span>
                </div>
                <p className="text-sm text-gray-600">Temukan insight dan pola tersembunyi</p>
              </button>
              
              <button
                onClick={() => setShowTopN(!showTopN)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  showTopN 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={20} />
                  <span className="font-medium">Analisis Top N</span>
                </div>
                <p className="text-sm text-gray-600">Lihat nilai teratas dari setiap kolom</p>
              </button>
              
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  showCharts 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={20} />
                  <span className="font-medium">Grafik Visual</span>
                </div>
                <p className="text-sm text-gray-600">Buat grafik dari data yang difilter</p>
              </button>
            </div>
          </div>
        )}

        {/* Insights Add-on */}
        {showInsights && analysis && analysis.insights.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Wawasan Data</h3>
            <div className="space-y-3">
              {analysis.insights.map((insight, index) => (
                <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
                  insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                  insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  {insight.type === 'success' ? (
                    <CheckCircle size={20} className="text-green-600 mt-0.5" />
                  ) : insight.type === 'warning' ? (
                    <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                  ) : (
                    <Info size={20} className="text-blue-600 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {data && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Filter size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filter Data</h3>
              {!analysis && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  Menganalisis data...
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {data.headers.map(header => {
                const filterOptions = getFilterOptions(header);
                const dataType = analysis?.dataTypes[header] || 'loading...';
                
                return (
                  <div key={header}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {header} ({dataType})
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: `Pilih filter untuk ${header}` },
                        ...filterOptions
                      ]}
                      value={filters[header] || ''}
                      onChange={(value) => handleFilterChange(header, value)}
                      placeholder={filterOptions.length > 0 ? `Filter ${header}...` : 'Loading options...'}
                      disabled={filterOptions.length === 0}
                    />
                    {filterOptions.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {filterOptions.length} opsi tersedia
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={applyFilters}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Search size={16} />
                Terapkan Filter
              </button>
              <button
                onClick={() => {
                  setFilters({});
                  setFilteredData(data);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                Reset
              </button>
              {filteredData && (
                <button
                  onClick={exportData}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <Download size={16} />
                  Ekspor Data
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top N Analysis Add-on */}
        {showTopN && data && analysis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Analisis Top N</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-medium text-gray-700">Kolom:</label>
                  <CustomDropdown
                    options={[
                      { value: '', label: 'Pilih kolom untuk analisis' },
                      ...data.headers.map(header => ({ 
                        value: header, 
                        label: `${header} (${analysis.dataTypes[header]})` 
                      }))
                    ]}
                    value={selectedColumn}
                    onChange={(value) => setSelectedColumn(value)}
                    placeholder="Pilih kolom"
                  />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-medium text-gray-700">Jumlah Top:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={topN}
                    onChange={(e) => setTopN(parseInt(e.target.value) || 10)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              
              {selectedColumn && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Top {topN} dari {selectedColumn}
                  </h4>
                  <div className="max-h-64 overflow-y-auto">
                    {getTopNValues(selectedColumn, topN).map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <button
                            onClick={() => handleItemSelect(item.value, selectedColumn)}
                            className="text-sm font-medium text-gray-900 hover:text-red-600 hover:underline cursor-pointer text-left"
                            title={`Klik untuk melihat detail ${item.value}`}
                          >
                            {item.value}
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{item.count} kali</div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item Details Drill-down */}
        {selectedItemDetails && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Detail: {selectedItemName}
                </h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {selectedItemDetails.totalRows} baris data
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowItemCharts(!showItemCharts)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    showItemCharts 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  <BarChart3 size={16} className="inline mr-1" />
                  {showItemCharts ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
                </button>
                <button
                  onClick={() => {
                    setSelectedItemDetails(null);
                    setSelectedItemName('');
                    setShowItemCharts(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {showItemCharts && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm font-medium text-gray-700">
                    Jenis Grafik:
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'bar', label: 'Grafik Batang' },
                      { value: 'pie', label: 'Grafik Pie' }
                    ]}
                    value={itemChartType}
                    onChange={(value) => setItemChartType(value)}
                    placeholder="Pilih jenis grafik"
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredData.headers.map(header => {
                const detail = selectedItemDetails.details[header];
                if (!detail || detail.uniqueValues.length === 0) return null;
                
                const chartData = generateItemDetailChartData(detail, itemChartType);
                const isExpanded = expandedColumn === header;
                
                return (
                  <div 
                    key={header} 
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
                      isExpanded ? 'col-span-full lg:col-span-2 xl:col-span-3 bg-gray-50 border-gray-300' : 'border-gray-200'
                    }`}
                    onClick={() => handleColumnToggle(header)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{header}</h4>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        {isExpanded ? (
                          <div className="flex items-center gap-1 text-sm">
                            <span>Collapse</span>
                            <X size={16} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm">
                            <span>Expand</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </div>
                    
                    {isExpanded ? (
                      /* Expanded Layout */
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Statistics */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Statistik</h5>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-300">
                              <span className="font-medium text-gray-700">Total:</span>
                              <span className="text-lg font-bold text-gray-900">{detail.totalOccurrences} kali</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-300">
                              <span className="font-medium text-gray-700">Unik:</span>
                              <span className="text-lg font-bold text-gray-900">{detail.uniqueValues.length} nilai</span>
                            </div>
                            {detail.mostCommon && (
                              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-300">
                                <span className="font-medium text-gray-700">Paling Sering:</span>
                                <span className="text-lg font-bold text-gray-900 truncate" title={detail.mostCommon}>
                                  {detail.mostCommon}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column - Charts */}
                        {showItemCharts && chartData.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Distribusi Nilai</h5>
                            {itemChartType === 'bar' ? (
                              <div className="space-y-3">
                                {chartData.slice(0, 8).map((item, index) => {
                                  const maxValue = Math.max(...chartData.map(d => d.value));
                                  const percentage = (item.value / maxValue) * 100;
                                  return (
                                    <div key={index} className="p-3 bg-white rounded-lg border">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-gray-900 truncate" title={item.fullName}>
                                          {item.name}
                                        </span>
                                        <span className="text-sm font-bold text-gray-600">
                                          {item.value} ({item.percentage}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-4">
                                        <div 
                                          className="bg-red-600 h-4 rounded-full flex items-center justify-end pr-2"
                                          style={{ width: `${percentage}%` }}
                                        >
                                          <span className="text-white text-xs font-medium">
                                            {item.value}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col lg:flex-row gap-6">
                                {/* Pie Chart Visualization */}
                                <div className="flex-1 flex justify-center items-center">
                                  <div className="relative w-48 h-48">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                      {chartData.slice(0, 8).map((item, index) => {
                                        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
                                        const total = chartData.reduce((sum, d) => sum + d.value, 0);
                                        const percentage = (item.value / total) * 100;
                                        const startAngle = chartData.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
                                        const endAngle = startAngle + (percentage * 360 / 100);
                                        
                                        const startAngleRad = (startAngle * Math.PI) / 180;
                                        const endAngleRad = (endAngle * Math.PI) / 180;
                                        
                                        const x1 = 50 + 35 * Math.cos(startAngleRad);
                                        const y1 = 50 + 35 * Math.sin(startAngleRad);
                                        const x2 = 50 + 35 * Math.cos(endAngleRad);
                                        const y2 = 50 + 35 * Math.sin(endAngleRad);
                                        
                                        const largeArcFlag = percentage > 50 ? 1 : 0;
                                        
                                        const pathData = [
                                          `M 50 50`,
                                          `L ${x1} ${y1}`,
                                          `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                          `Z`
                                        ].join(' ');
                                        
                                        return (
                                          <path
                                            key={index}
                                            d={pathData}
                                            fill={colors[index % colors.length]}
                                            stroke="white"
                                            strokeWidth="0.5"
                                          />
                                        );
                                      })}
                                    </svg>
                                    {/* Center circle */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                                        <span className="text-xs font-medium text-gray-600">
                                          {selectedItemDetails.totalRows}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Legend */}
                                <div className="flex-1 space-y-2">
                                  {chartData.slice(0, 8).map((item, index) => {
                                    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
                                    return (
                                      <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-300">
                                        <div 
                                          className="w-4 h-4 rounded-full" 
                                          style={{ backgroundColor: colors[index % colors.length] }}
                                        ></div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate" title={item.fullName}>
                                            {item.name}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {item.value} ({item.percentage}%)
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Full Width - All Values */}
                        <div className={`${showItemCharts && chartData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
                          <h5 className="font-medium text-gray-900 mb-3">Semua Nilai ({detail.uniqueValues.length})</h5>
                          <div className="max-h-48 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                              {detail.uniqueValues.map((value, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                                  title={value}
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Collapsed Layout */
                      <div>
                        {/* Statistics */}
                        <div className="space-y-2 mb-4">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Total:</span> {detail.totalOccurrences} kali
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Unik:</span> {detail.uniqueValues.length} nilai
                          </div>
                          {detail.mostCommon && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Paling Sering:</span> {detail.mostCommon}
                            </div>
                          )}
                        </div>

                        {/* Charts */}
                        {showItemCharts && chartData.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-medium text-gray-500 mb-2">Distribusi Nilai:</div>
                            {itemChartType === 'bar' ? (
                              <div className="space-y-1">
                                {chartData.slice(0, 3).map((item, index) => {
                                  const maxValue = Math.max(...chartData.map(d => d.value));
                                  const percentage = (item.value / maxValue) * 100;
                                  return (
                                    <div key={index} className="flex items-center gap-2">
                                      <div className="w-12 text-xs text-gray-600 truncate" title={item.fullName}>
                                        {item.name}
                                      </div>
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                                        <div 
                                          className="bg-red-600 h-2 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                      <div className="w-8 text-xs text-gray-500 text-right">
                                        {item.value}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                {/* Mini Pie Chart */}
                                <div className="flex-shrink-0">
                                  <div className="relative w-16 h-16">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                      {chartData.slice(0, 4).map((item, index) => {
                                        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
                                        const total = chartData.reduce((sum, d) => sum + d.value, 0);
                                        const percentage = (item.value / total) * 100;
                                        const startAngle = chartData.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
                                        const endAngle = startAngle + (percentage * 360 / 100);
                                        
                                        const startAngleRad = (startAngle * Math.PI) / 180;
                                        const endAngleRad = (endAngle * Math.PI) / 180;
                                        
                                        const x1 = 50 + 30 * Math.cos(startAngleRad);
                                        const y1 = 50 + 30 * Math.sin(startAngleRad);
                                        const x2 = 50 + 30 * Math.cos(endAngleRad);
                                        const y2 = 50 + 30 * Math.sin(endAngleRad);
                                        
                                        const largeArcFlag = percentage > 50 ? 1 : 0;
                                        
                                        const pathData = [
                                          `M 50 50`,
                                          `L ${x1} ${y1}`,
                                          `A 30 30 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                          `Z`
                                        ].join(' ');
                                        
                                        return (
                                          <path
                                            key={index}
                                            d={pathData}
                                            fill={colors[index % colors.length]}
                                            stroke="white"
                                            strokeWidth="1"
                                          />
                                        );
                                      })}
                                    </svg>
                                  </div>
                                </div>
                                
                                {/* Mini Legend */}
                                <div className="flex-1 space-y-1">
                                  {chartData.slice(0, 4).map((item, index) => {
                                    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
                                    return (
                                      <div key={index} className="flex items-center gap-2 text-xs">
                                        <div 
                                          className="w-2 h-2 rounded-full" 
                                          style={{ backgroundColor: colors[index % colors.length] }}
                                        ></div>
                                        <span className="text-gray-900 truncate" title={item.fullName}>
                                          {item.name}
                                        </span>
                                        <span className="text-gray-500">
                                          ({item.percentage}%)
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* All Values */}
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">Semua Nilai:</div>
                          <div className="max-h-24 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                              {detail.uniqueValues.slice(0, 6).map((value, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                  title={value}
                                >
                                  {value.length > 12 ? `${value.substring(0, 12)}...` : value}
                                </span>
                              ))}
                              {detail.uniqueValues.length > 6 && (
                                <span className="px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded">
                                  +{detail.uniqueValues.length - 6} lagi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Charts for Filtered Results Add-on */}
        {showCharts && filteredData && filteredData.rows.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Grafik Hasil Filter</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Kolom untuk Grafik
                </label>
                <CustomDropdown
                  options={[
                    { value: '', label: 'Pilih kolom untuk visualisasi' },
                    ...filteredData.headers.map(header => ({ 
                      value: header, 
                      label: `${header} (${analysis?.dataTypes[header] || 'unknown'})` 
                    }))
                  ]}
                  value={selectedChartColumn}
                  onChange={(value) => {
                    setSelectedChartColumn(value);
                    setChartData(generateChartData(value));
                  }}
                  placeholder="Pilih kolom"
                />
              </div>
              
              {selectedChartColumn && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis Grafik
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'bar', label: 'Grafik Batang' },
                      { value: 'pie', label: 'Grafik Pie' }
                    ]}
                    value={chartType}
                    onChange={(value) => setChartType(value)}
                    placeholder="Pilih jenis grafik"
                  />
                </div>
              )}
            </div>

            {chartData && chartData.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">
                  {chartType === 'bar' ? 'Grafik Batang' : 'Grafik Pie'} - {selectedChartColumn}
                </h4>
                
                {chartType === 'bar' ? (
                  <div className="space-y-2">
                    {chartData.map((item, index) => {
                      const maxValue = Math.max(...chartData.map(d => d.value));
                      const percentage = (item.value / maxValue) * 100;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-32 text-sm text-gray-600 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div 
                              className="bg-red-600 h-6 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-white text-xs font-medium">
                                {item.value}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Pie Chart Visualization */}
                    <div className="flex-1 flex justify-center items-center">
                      <div className="relative w-64 h-64">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {chartData.map((item, index) => {
                            const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
                            const total = chartData.reduce((sum, d) => sum + d.value, 0);
                            const percentage = (item.value / total) * 100;
                            const startAngle = chartData.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
                            const endAngle = startAngle + (percentage * 360 / 100);
                            
                            const startAngleRad = (startAngle * Math.PI) / 180;
                            const endAngleRad = (endAngle * Math.PI) / 180;
                            
                            const x1 = 50 + 40 * Math.cos(startAngleRad);
                            const y1 = 50 + 40 * Math.sin(startAngleRad);
                            const x2 = 50 + 40 * Math.cos(endAngleRad);
                            const y2 = 50 + 40 * Math.sin(endAngleRad);
                            
                            const largeArcFlag = percentage > 50 ? 1 : 0;
                            
                            const pathData = [
                              `M 50 50`,
                              `L ${x1} ${y1}`,
                              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              `Z`
                            ].join(' ');
                            
                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="1"
                              />
                            );
                          })}
                        </svg>
                        {/* Center circle */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                            <span className="text-sm font-medium text-gray-600">
                              {chartData.reduce((sum, d) => sum + d.value, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex-1 space-y-2">
                      {chartData.map((item, index) => {
                        const total = chartData.reduce((sum, d) => sum + d.value, 0);
                        const percentage = ((item.value / total) * 100).toFixed(1);
                        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
                        return (
                          <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-300">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: colors[index % colors.length] }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate" title={item.name}>
                                {item.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.value} ({percentage}%)
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Data Table Preview */}
        {filteredData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Preview Data</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showAllData}
                    onChange={(e) => setShowAllData(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Tampilkan semua data</span>
                </label>
                <span className="text-sm text-gray-500">
                  {showAllData 
                    ? `Menampilkan semua ${filteredData.rows.length} baris`
                    : `Menampilkan ${Math.min(100, filteredData.rows.length)} dari ${filteredData.rows.length} baris`
                  }
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      #
                    </th>
                    {filteredData.headers.map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(showAllData ? filteredData.rows : filteredData.rows.slice(0, 100)).map((row, index) => {
                    const rowNumber = index + 1;
                    const isEven = index % 2 === 0;
                    return (
                      <tr key={index} className={`hover:bg-gray-100 ${isEven ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-200">
                          {rowNumber}
                        </td>
                        {filteredData.headers.map(header => (
                          <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={row[header] || '-'}>
                              {row[header] || '-'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredData.rows.length > 100 && !showAllData && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllData(true)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Tampilkan semua {filteredData.rows.length} baris →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicAnalyticsPage;
