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
import Navigation from '../components/common/Navigation';
import CustomDropdown from '../components/common/CustomDropdown';
import BaseModal from '../components/modals/BaseModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DynamicAnalyticsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [filters, setFilters] = useState({}); // Changed to support arrays: {column: [value1, value2, ...]}
  const [filteredData, setFilteredData] = useState(null);
  const [topN, setTopN] = useState(10);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [showAllData, setShowAllData] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [selectedChartColumn, setSelectedChartColumn] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [showAllChartValues, setShowAllChartValues] = useState(false);
  const [showAllTopN, setShowAllTopN] = useState(false);
  const [expandTopNList, setExpandTopNList] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showTopN, setShowTopN] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [showItemCharts, setShowItemCharts] = useState(false);
  const [itemChartType, setItemChartType] = useState('bar');
  const [showAllItemChartValues, setShowAllItemChartValues] = useState(false);
  const [expandItemAllValues, setExpandItemAllValues] = useState(false);
  const [expandedColumn, setExpandedColumn] = useState(null);
  const [customDateRanges, setCustomDateRanges] = useState({}); // {column: {from: '', to: ''}}
  const [expandedFilters, setExpandedFilters] = useState({}); // {column: true/false}
  const fileInputRef = useRef(null);
  const [showComparative, setShowComparative] = useState(false);
  const sourceKey = 'Source';
  const [selectedMetric, setSelectedMetric] = useState('');
  const [selectedCategoryForCompare, setSelectedCategoryForCompare] = useState('');
  const [topKCompare] = useState(10);
  const [multiFiles, setMultiFiles] = useState([]); // [{name, headers, rows, totalRows, totalColumns}]
  const [activeDatasetIndex, setActiveDatasetIndex] = useState(0);
  const [selectedCategoryValues, setSelectedCategoryValues] = useState([]); // for multi-line
  const [categoryShowAll, setCategoryShowAll] = useState(false);
  const [categoryTopK, setCategoryTopK] = useState(10);
  const [categoryMetricType, setCategoryMetricType] = useState('count'); // 'count' | 'sum'
  const [includedDatasets, setIncludedDatasets] = useState(new Set());

  const getRowsWithSource = () => {
    if (multiFiles.length > 0) {
      const included = includedDatasets.size > 0
        ? new Set(includedDatasets)
        : new Set(multiFiles.map(ds => ds.name));
      const rows = [];
      multiFiles.forEach(ds => {
        if (!included.has(ds.name)) return;
        ds.rows.forEach(r => {
          rows.push({ ...r, [sourceKey]: ds.name });
        });
      });
      return rows;
    }
    return (filteredData || data)?.rows || [];
  };
  // Future: two-source diff controls

  // Parse single CSV text to dataset
  const parseCsvText = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;
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
      return result.map(v => v.replace(/"/g, ''));
        };
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
        const rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
        const values = parseCSVLine(line);
            const row = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
            return row;
          });
    return { headers, rows, totalRows: rows.length, totalColumns: headers.length };
  };

  const detectYear = (fname) => {
    const m = String(fname).match(/(20\d{2})/);
    return m ? parseInt(m[1]) : null;
  };

  // Handle multi-file upload (CSV only) - keep datasets separate
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setLoading(true);
    try {
      const datasets = [];
      for (const f of files) {
        const ext = f.name.toLowerCase().split('.').pop();
        if (ext === 'csv') {
          const text = await f.text();
          const ds = parseCsvText(text);
          if (ds) datasets.push({ name: f.name, year: detectYear(f.name), ...ds });
        } else {
          toast.error(`Hanya CSV yang didukung: ${f.name}`);
        }
      }
      if (datasets.length === 0) {
        toast.error('Tidak ada file yang berhasil diproses');
        return;
      }
      // Append to existing list
      const updated = [...multiFiles, ...datasets];
      setMultiFiles(updated);
      // initialize included set
      const newIncluded = new Set(includedDatasets);
      datasets.forEach(d => newIncluded.add(d.name));
      setIncludedDatasets(newIncluded);
      // set active dataset to the first newly added if none active
      const nextActive = activeDatasetIndex ?? 0;
      const useIndex = updated.length > 0 ? nextActive : 0;
      const active = updated[useIndex] || datasets[0];
      if (active) {
        setData(active);
        setAnalysis(null);
        setFilteredData(null);
        setFilters({});
        setTimeout(() => { analyzeData(active); }, 50);
      }
      toast.success(`Berhasil memuat ${datasets.length} file (tanpa menggabungkan)`);
      setShowComparative(updated.length > 1);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memproses file');
      } finally {
        setLoading(false);
      }
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
      
      // Determine data type with improved date detection
      const numericValues = values.filter(val => !isNaN(parseFloat(val)) && isFinite(val));
      
      // Enhanced date detection - check multiple date formats
      const dateValues = values.filter(val => {
        if (!val || val.trim() === '') return false;
        
        // Try different date parsing methods
        const date1 = new Date(val);
        const date2 = Date.parse(val);
        const date3 = new Date(val.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')); // YYYYMMDD format
        
        return !isNaN(date1.getTime()) || !isNaN(date2) || !isNaN(date3.getTime());
      });
      
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
        
        // Calculate date statistics
        const dates = dateValues.map(val => {
          // Try different parsing methods
          let date = new Date(val);
          if (isNaN(date.getTime())) {
            date = new Date(val.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
          }
          return date;
        }).filter(date => !isNaN(date.getTime()));
        
        if (dates.length > 0) {
          const sortedDates = [...dates].sort((a, b) => a - b);
          const minDate = sortedDates[0];
          const maxDate = sortedDates[sortedDates.length - 1];
          const dateRange = maxDate - minDate;
          const medianDate = sortedDates[Math.floor(sortedDates.length / 2)];
          
          // Calculate common date ranges
          const today = new Date();
          const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
          
          analysis.statistics[header] = {
            count: dates.length,
            min: minDate,
            max: maxDate,
            median: medianDate,
            range: dateRange,
            rangeDays: Math.ceil(dateRange / (24 * 60 * 60 * 1000)),
            today: today,
            oneWeekAgo: oneWeekAgo,
            oneMonthAgo: oneMonthAgo,
            oneYearAgo: oneYearAgo
          };
          
          // Detect date outliers (dates that are significantly different from the median)
          const medianTime = medianDate.getTime();
          const timeRange = dateRange;
          const outlierThreshold = timeRange * 0.3; // 30% of the range
          analysis.outliers[header] = dates.filter(date => 
            Math.abs(date.getTime() - medianTime) > outlierThreshold
          );
        }
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
      .filter(([, count]) => count > 0);
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
      .filter(([, outlierArr]) => outlierArr.length > 0);
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

  // Apply filters with multiple selections support
  const applyFilters = () => {
    if (!data) return;
    
    let filtered = data.rows;
    
    Object.entries(filters).forEach(([column, filterValues]) => {
      if (filterValues && filterValues.length > 0) {
        filtered = filtered.filter(row => {
          const value = row[column];
          
          // Check if any of the selected filter values match
          return filterValues.some(filterValue => {
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
            } else if (analysis.dataTypes[column] === 'date') {
              // Handle date filters
              if (filterValue.startsWith('custom_range:')) {
                // Handle custom date range
                const rangePart = filterValue.replace('custom_range:', '');
                const [fromStr, toStr] = rangePart.split(' to ');
                if (fromStr && toStr) {
                  const fromDate = new Date(fromStr);
                  const toDate = new Date(toStr);
                  const rowDate = new Date(value);
                  return rowDate >= fromDate && rowDate <= toDate;
                }
                return false;
              } else if (filterValue.includes('>=')) {
                const filterDate = new Date(filterValue.replace('>=', ''));
                const rowDate = new Date(value);
                return rowDate >= filterDate;
              } else if (filterValue.includes('<=')) {
                const filterDate = new Date(filterValue.replace('<=', ''));
                const rowDate = new Date(value);
                return rowDate <= filterDate;
              } else if (filterValue.includes('>')) {
                const filterDate = new Date(filterValue.replace('>', ''));
                const rowDate = new Date(value);
                return rowDate > filterDate;
              } else if (filterValue.includes('<')) {
                const filterDate = new Date(filterValue.replace('<', ''));
                const rowDate = new Date(value);
                return rowDate < filterDate;
          } else {
                // Exact date match
                const filterDate = new Date(filterValue);
                const rowDate = new Date(value);
                return rowDate.getTime() === filterDate.getTime();
              }
            } else {
              // Handle categorical/text filters - exact match
              return value === filterValue;
            }
          });
        });
      }
    });
    
    setFilteredData({ ...data, rows: filtered });
  };

  // Handle multiple filter selection
  const handleFilterChange = (column, value, isChecked) => {
    const currentFilters = { ...filters };
    const currentColumnFilters = currentFilters[column] || [];
    
    if (isChecked) {
      // Add value to the filter array
      if (!currentColumnFilters.includes(value)) {
        currentFilters[column] = [...currentColumnFilters, value];
      }
                } else {
      // Remove value from the filter array
      currentFilters[column] = currentColumnFilters.filter(v => v !== value);
      // If no filters left for this column, remove the column entirely
      if (currentFilters[column].length === 0) {
        delete currentFilters[column];
      }
    }
    
    setFilters(currentFilters);
  };

  // Toggle filter column expansion
  const toggleFilterExpansion = (column) => {
    setExpandedFilters(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Handle custom date range selection
  const handleCustomDateRange = (column, fromDate, toDate) => {
    if (!fromDate || !toDate) return;
    
    const currentFilters = { ...filters };
    const currentColumnFilters = currentFilters[column] || [];
    
    // Remove any existing custom range
    const filteredValues = currentColumnFilters.filter(v => !v.startsWith('custom_range:'));
    
    // Add the new custom range
    const customRangeValue = `custom_range:${fromDate} to ${toDate}`;
    currentFilters[column] = [...filteredValues, customRangeValue];
    
    setFilters(currentFilters);
  };

  // Clear all filters for a specific column
  const clearColumnFilters = (column) => {
    const newFilters = { ...filters };
    delete newFilters[column];
    setFilters(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({});
    setFilteredData(data);
  };

  // Generate insights based on filtered data
  const generateFilteredInsights = () => {
    if (!analysis || !data) return [];
    
    const dataToAnalyze = filteredData || data;
    const insights = [];
    
    // Dataset overview for filtered data
    if (filteredData) {
      const originalCount = data.totalRows;
      const filteredCount = filteredData.rows.length;
      const percentage = ((filteredCount / originalCount) * 100).toFixed(1);
      
      insights.push({
        type: 'info',
        title: 'Data yang Difilter',
        description: `Menampilkan ${filteredCount} dari ${originalCount} baris data (${percentage}% dari total)`
      });
    }
    
    // Analyze filtered data for each column
    data.headers.forEach(header => {
      const values = dataToAnalyze.rows.map(row => row[header]).filter(val => val !== '');
      const dataType = analysis.dataTypes[header];
      
      if (dataType === 'categorical' && values.length > 0) {
        const frequencies = {};
        values.forEach(val => {
          frequencies[val] = (frequencies[val] || 0) + 1;
        });
        
        const sortedFreq = Object.entries(frequencies).sort(([,a], [,b]) => b - a);
        const mostCommon = sortedFreq[0];
        const uniqueCount = sortedFreq.length;
        
        if (mostCommon) {
          const percentage = ((mostCommon[1] / values.length) * 100).toFixed(1);
          insights.push({
            type: 'info',
            title: `Distribusi ${header}`,
            description: `Nilai paling sering: "${mostCommon[0]}" (${mostCommon[1]} kali, ${percentage}%). Total ${uniqueCount} nilai unik.`
          });
        }
      } else if (dataType === 'numeric' && values.length > 0) {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length > 0) {
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
          const min = Math.min(...nums);
          const max = Math.max(...nums);
          const range = max - min;
          
          insights.push({
            type: 'info',
            title: `Statistik ${header}`,
            description: `Rata-rata: ${mean.toFixed(2)}, Range: ${min} - ${max} (${range.toFixed(2)}), Total: ${nums.length} nilai`
          });
        }
      } else if (dataType === 'date' && values.length > 0) {
        const dates = values.map(val => new Date(val)).filter(date => !isNaN(date.getTime()));
        if (dates.length > 0) {
          const sortedDates = [...dates].sort((a, b) => a - b);
          const minDate = sortedDates[0];
          const maxDate = sortedDates[sortedDates.length - 1];
          const rangeDays = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000));
          
          insights.push({
            type: 'info',
            title: `Rentang Tanggal ${header}`,
            description: `Dari ${minDate.toLocaleDateString('id-ID')} hingga ${maxDate.toLocaleDateString('id-ID')} (${rangeDays} hari), Total: ${dates.length} tanggal`
          });
          }
        }
      });
      
    // If no insights generated, show a message
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        title: 'Tidak Ada Data',
        description: 'Tidak ada data yang dapat dianalisis dengan filter saat ini'
      });
    }
    
    return insights;
  };

  // Get filter options for a column with contextual filtering
  const getFilterOptions = (column) => {
    if (!data) return [];
    
    // Get filtered data based on current filters (excluding the current column)
    let relevantRows = data.rows;
    
    // Apply existing filters to get contextual data
    Object.entries(filters).forEach(([filterColumn, filterValues]) => {
      if (filterColumn !== column && filterValues && filterValues.length > 0) {
        relevantRows = relevantRows.filter(row => {
          // Check if any of the selected filter values match
          return filterValues.some(filterValue => {
            if (analysis.dataTypes[filterColumn] === 'numeric') {
              if (filterValue.includes('>=')) {
            const threshold = parseFloat(filterValue.replace('>=', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) >= threshold;
              } else if (filterValue.includes('<=')) {
            const threshold = parseFloat(filterValue.replace('<=', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) <= threshold;
              } else if (filterValue.includes('>')) {
            const threshold = parseFloat(filterValue.replace('>', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) > threshold;
              } else if (filterValue.includes('<')) {
            const threshold = parseFloat(filterValue.replace('<', '').trim());
            return !isNaN(parseFloat(row[filterColumn])) && parseFloat(row[filterColumn]) < threshold;
              } else {
                return parseFloat(row[filterColumn]) === parseFloat(filterValue);
              }
            } else if (analysis.dataTypes[filterColumn] === 'date') {
              if (filterValue.includes('>=')) {
                const filterDate = new Date(filterValue.replace('>=', ''));
                const rowDate = new Date(row[filterColumn]);
                return rowDate >= filterDate;
              } else if (filterValue.includes('<=')) {
                const filterDate = new Date(filterValue.replace('<=', ''));
                const rowDate = new Date(row[filterColumn]);
                return rowDate <= filterDate;
              } else if (filterValue.includes('>')) {
                const filterDate = new Date(filterValue.replace('>', ''));
                const rowDate = new Date(row[filterColumn]);
                return rowDate > filterDate;
              } else if (filterValue.includes('<')) {
                const filterDate = new Date(filterValue.replace('<', ''));
                const rowDate = new Date(row[filterColumn]);
                return rowDate < filterDate;
              } else {
                const filterDate = new Date(filterValue);
                const rowDate = new Date(row[filterColumn]);
                return rowDate.getTime() === filterDate.getTime();
              }
          } else {
            // Exact match for categorical data
            return row[filterColumn] === filterValue;
          }
          });
        });
      }
    });
    
    // Get unique values from the filtered rows for this column (limit for performance)
    const uniqueValues = [...new Set(relevantRows.slice(0, 1000).map(row => row[column]).filter(val => val !== '' && val !== null && val !== undefined))];
    
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
        .slice(0, 50) // Limit to top 50 for performance
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
    } else if (analysis.dataTypes[column] === 'date') {
      const stats = analysis.statistics[column];
      if (!stats) {
        return [];
      }
      
      // Minimal preset set; detailed format helpers removed
      
      // const formatDateTime = (date) => {
      //   return date.toLocaleString('id-ID', {
      //     year: 'numeric',
      //     month: '2-digit',
      //     day: '2-digit',
      //     hour: '2-digit',
      //     minute: '2-digit'
      //   });
      // };
      
      // Calculate more preset dates
      // Reduced: remove additional relative presets
      
      // Current quarter calculations
      // Keep currentQuarter calculation removed from use
      // const lastQuarterEnd = new Date(stats.today.getFullYear(), (currentQuarter - 1) * 3, 0);
      
      return [
        // Minimal, useful presets
        { value: `>= ${stats.oneWeekAgo.toISOString().split('T')[0]}`, label: `📅 Last 7 days`, type: 'preset' },
        { value: `>= ${stats.oneMonthAgo.toISOString().split('T')[0]}`, label: `📅 Last 30 days`, type: 'preset' },
        { value: `>= ${new Date(stats.today.getFullYear(), 0, 1).toISOString().split('T')[0]}`, label: `📅 This year`, type: 'preset' },
        // Custom range option
        { value: 'custom_range', label: `🎯 Custom date range...`, type: 'custom' }
      ];
    }
    
    return uniqueValues
      .sort()
      .slice(0, 100)
      .map(value => ({ value, label: value }));
  };

  // Get color intensity based on row index
  // const getRowColor = (index, totalRows) => {
  //   const intensity = Math.floor((index / totalRows) * 100);
  //   return `bg-gray-${Math.max(50, 100 - intensity)}`;
  // };

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
  const generateItemDetailChartData = (detail, header, includeAll = false) => {
    if (!detail) return [];
    const type = analysis?.dataTypes?.[header];
    const values = detail.allValues.filter(v => v !== '' && v !== null && v !== undefined);
    
    if (type === 'numeric') {
      const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (nums.length === 0) return [];
      const bins = 10;
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const binSize = (max - min) / bins || 1;
      const histogram = Array(bins).fill(0).map((_, i) => ({
        name: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
        value: 0
      }));
      nums.forEach(n => {
        const idx = Math.min(Math.floor((n - min) / binSize), bins - 1);
        histogram[idx].value++;
      });
      return histogram.filter(b => b.value > 0);
    }
    
    if (type === 'date') {
      const dates = values.map(v => new Date(v)).filter(d => !isNaN(d.getTime())).sort((a,b)=>a-b);
      if (dates.length === 0) return [];
      const formatDay = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const formatMonth = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const dayCounts = {};
      dates.forEach(d=>{ const k = formatDay(d); dayCounts[k] = (dayCounts[k]||0)+1; });
      const distinctDays = Object.keys(dayCounts).length;
      if (distinctDays > 100) {
        const monthCounts = {};
        dates.forEach(d=>{ const k = formatMonth(d); monthCounts[k] = (monthCounts[k]||0)+1; });
        const entries = Object.entries(monthCounts).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>({name,value}));
        return includeAll ? entries : entries.slice(-24);
      }
      const dayEntries = Object.entries(dayCounts).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>({name,value}));
      return includeAll ? dayEntries : dayEntries.slice(-50);
    }
    
    // categorical (default)
    const freq = {};
    values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const entries = Object.entries(freq)
      .map(([name,value])=>({
        name: name.length > 20 ? `${name.substring(0,20)}...` : name,
        fullName: name,
        value,
        percentage: ((value / values.length) * 100).toFixed(1)
      }))
      .sort((a,b)=>b.value - a.value);
    return includeAll ? entries : entries.slice(0, 10);
  };

  // Get top N values for a column (works with filtered data)
  const getTopNValues = (column, n = 10) => {
    if (!data || !analysis) return [];
    
    // Use filtered data if available, otherwise use original data
    const dataToAnalyze = filteredData || data;
    
    if (analysis.dataTypes[column] === 'categorical') {
      // Calculate frequencies from the current dataset (filtered or original)
      const frequencies = {};
      dataToAnalyze.rows.forEach(row => {
        const val = row[column];
        if (val !== '' && val !== null && val !== undefined) {
          frequencies[val] = (frequencies[val] || 0) + 1;
        }
      });
      
      return Object.entries(frequencies)
        .sort(([,a], [,b]) => b - a)
        .slice(0, n)
        .map(([value, count]) => ({ 
          value, 
          count, 
          percentage: (count / dataToAnalyze.rows.length * 100).toFixed(1) 
        }));
    } else if (analysis.dataTypes[column] === 'numeric') {
      const values = dataToAnalyze.rows
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val))
        .sort((a, b) => b - a)
        .slice(0, n);
      
      return values.map((value, index) => ({
        value: value.toFixed(2),
        count: index + 1,
        percentage: ((n - index) / values.length * 100).toFixed(1)
      }));
    } else if (analysis.dataTypes[column] === 'date') {
      const values = dataToAnalyze.rows
        .map(row => new Date(row[column]))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => b - a)
        .slice(0, n);
      
      return values.map((value, index) => ({
        value: value.toLocaleDateString('id-ID'),
        count: index + 1,
        percentage: ((n - index) / values.length * 100).toFixed(1)
      }));
    }
    return [];
  };

  // Generate chart data for filtered results
  const generateChartData = (column, includeAll = false) => {
    if (!filteredData || !column) return null;
    
    const columnData = filteredData.rows.map(row => row[column]).filter(val => val !== '');
    
    if (analysis?.dataTypes[column] === 'categorical') {
      const frequency = {};
      columnData.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
      });
      
      const entries = Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .map(([name, value]) => ({ name, value }));
      
      return includeAll ? entries : entries.slice(0, 20);
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
    } else if (analysis?.dataTypes[column] === 'date') {
      // Group dates by day or by month depending on volume
      const dates = columnData
        .map(val => new Date(val))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b);
      if (dates.length === 0) return [];
      
      // If too many distinct days, bucket by month
      const formatDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const formatMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const dayCounts = {};
      dates.forEach(d => {
        const key = formatDay(d);
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      });
      const distinctDays = Object.keys(dayCounts).length;
      
      if (distinctDays > 100) {
        // Bucket by month
        const monthCounts = {};
        dates.forEach(d => {
          const key = formatMonth(d);
          monthCounts[key] = (monthCounts[key] || 0) + 1;
        });
        const entries = Object.entries(monthCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => ({ name, value }));
        return includeAll ? entries : entries.slice(-24); // last 24 months
      }
      
      // Use daily counts
      const dayEntries = Object.entries(dayCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => ({ name, value }));
      return includeAll ? dayEntries : dayEntries.slice(-50); // last 50 days
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

  // const chartOptions = [
  //   { value: 'overview', label: 'Ringkasan Dataset' },
  //   { value: 'distribution', label: 'Distribusi Data' },
  //   { value: 'correlation', label: 'Matriks Korelasi' },
  //   { value: 'missing', label: 'Analisis Data Hilang' }
  // ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Analisis Dinamis" subtitle="Analisis data CSV yang fleksibel dan cerdas" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
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
              multiple
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
              {data.headers.map(header => {
                const filterOptions = getFilterOptions(header);
                const dataType = analysis?.dataTypes[header] || 'loading...';
                const selectedFilters = filters[header] || [];
                const hasSelections = selectedFilters.length > 0;
                
                const isExpanded = expandedFilters[header] === true; // Default to closed
                
                return (
                  <div key={header} className="border rounded-lg bg-gray-50">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleFilterExpansion(header)}
                    >
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">
                          {header} ({dataType})
                        </label>
                        {hasSelections && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            {selectedFilters.length} selected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasSelections && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilters(header);
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                          >
                            Clear
                          </button>
                        )}
                        <div className="text-gray-400">
                          {isExpanded ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4">
                    
                    {filterOptions.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filterOptions.map((option, index) => {
                          const isSelected = selectedFilters.includes(option.value);
                          const isCustomRange = option.value === 'custom_range';
                          const hasCustomRange = selectedFilters.some(f => f.startsWith('custom_range:'));
                          
                          return (
                            <div key={index}>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`${header}-${index}`}
                                  checked={isSelected || hasCustomRange || (isCustomRange && customDateRanges[header])}
                                  onChange={(e) => {
                                    if (isCustomRange) {
                                      // For custom range, just toggle the checkbox state
                                      if (e.target.checked) {
                                        // Initialize custom date range state
                                        const newRanges = { ...customDateRanges };
                                        if (!newRanges[header]) {
                                          newRanges[header] = { from: '', to: '' };
                                        }
                                        setCustomDateRanges(newRanges);
                                      } else {
                                        // Remove custom range if unchecked
                                        const newFilters = { ...filters };
                                        const currentColumnFilters = newFilters[header] || [];
                                        newFilters[header] = currentColumnFilters.filter(v => !v.startsWith('custom_range:'));
                                        if (newFilters[header].length === 0) {
                                          delete newFilters[header];
                                        }
                                        setFilters(newFilters);
                                        
                                        // Clear custom date ranges
                                        const newRanges = { ...customDateRanges };
                                        delete newRanges[header];
                                        setCustomDateRanges(newRanges);
                                      }
                                    } else {
                                      handleFilterChange(header, option.value, e.target.checked);
                                    }
                                  }}
                                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <label
                                  htmlFor={`${header}-${index}`}
                                  className="text-sm text-gray-700 cursor-pointer flex-1"
                                >
                                  {option.label}
                                </label>
                              </div>
                              
                              {/* Custom Date Range Picker */}
                              {isCustomRange && (isSelected || hasCustomRange || customDateRanges[header]) && analysis?.dataTypes[header] === 'date' && (
                                <div className="ml-6 mt-2 p-3 bg-white border border-gray-200 rounded-lg">
                                  <div className="text-xs font-medium text-gray-600 mb-2">Custom Date Range:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">From:</label>
                                      <input
                                        type="date"
                                        value={customDateRanges[header]?.from || ''}
                                        onChange={(e) => {
                                          const newRanges = { ...customDateRanges };
                                          if (!newRanges[header]) newRanges[header] = {};
                                          newRanges[header].from = e.target.value;
                                          setCustomDateRanges(newRanges);
                                          
                                          // Auto-apply if both dates are set
                                          if (newRanges[header].to) {
                                            handleCustomDateRange(header, e.target.value, newRanges[header].to);
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-red-500 focus:border-red-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">To:</label>
                                      <input
                                        type="date"
                                        value={customDateRanges[header]?.to || ''}
                                        onChange={(e) => {
                                          const newRanges = { ...customDateRanges };
                                          if (!newRanges[header]) newRanges[header] = {};
                                          newRanges[header].to = e.target.value;
                                          setCustomDateRanges(newRanges);
                                          
                                          // Auto-apply if both dates are set
                                          if (newRanges[header].from) {
                                            handleCustomDateRange(header, newRanges[header].from, e.target.value);
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-red-500 focus:border-red-500"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      // Remove custom range
                                      const newFilters = { ...filters };
                                      const currentColumnFilters = newFilters[header] || [];
                                      newFilters[header] = currentColumnFilters.filter(v => !v.startsWith('custom_range:'));
                                      if (newFilters[header].length === 0) {
                                        delete newFilters[header];
                                      }
                                      setFilters(newFilters);
                                      
                                      // Clear custom date ranges
                                      const newRanges = { ...customDateRanges };
                                      delete newRanges[header];
                                      setCustomDateRanges(newRanges);
                                    }}
                                    className="mt-2 text-xs text-red-600 hover:text-red-700"
                                  >
                                    Remove custom range
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        {analysis ? 'Tidak ada opsi filter tersedia' : 'Menganalisis data...'}
                      </div>
                    )}
                    
                    {hasSelections && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 mb-2">Selected:</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedFilters.slice(0, 3).map((value, index) => {
                            const option = filterOptions.find(opt => opt.value === value);
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                              >
                                {option?.label || value}
                              </span>
                            );
                          })}
                          {selectedFilters.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              +{selectedFilters.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                        {filterOptions.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            {filterOptions.length} opsi tersedia
                          </p>
                        )}
                      </div>
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
                onClick={clearAllFilters}
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

        

        
        {data && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Settings size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Analisis Data</h3>
              <span className="text-sm text-gray-500">
                {filteredData ? `Menganalisis ${filteredData.rows.length} baris data yang difilter` : `Menganalisis ${data.totalRows} baris data`}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-gray-600">
                  {filteredData ? 'Temukan insight dari data yang difilter' : 'Temukan insight dan pola tersembunyi'}
                </p>
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
                <p className="text-sm text-gray-600">
                  {filteredData ? 'Lihat nilai teratas dari data yang difilter' : 'Lihat nilai teratas dari setiap kolom'}
                </p>
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
                <p className="text-sm text-gray-600">
                  {filteredData ? 'Buat grafik dari data yang difilter' : 'Buat grafik dari data yang difilter'}
                </p>
              </button>

              <button
                onClick={() => setShowComparative(!showComparative)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  showComparative 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Settings size={20} />
                  <span className="font-medium">Analisis Komparatif</span>
                </div>
                <p className="text-sm text-gray-600">Bandingkan antar file</p>
              </button>

              {/* Active dataset selector */}
              <div className="p-4 rounded-lg border-2 border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">Pilih Dataset Aktif</div>
                {multiFiles.length === 0 ? (
                  <div className="text-xs text-gray-500">Hanya 1 dataset.</div>
                ) : (
                  <select
                    className="w-full text-sm border rounded px-2 py-1"
                    value={activeDatasetIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value) || 0;
                      setActiveDatasetIndex(idx);
                      const ds = multiFiles[idx];
                      if (ds) {
                        setData(ds);
                        setAnalysis(null);
                        setFilteredData(null);
                        setFilters({});
                        setTimeout(() => analyzeData(ds), 50);
                      }
                    }}
                  >
                    {multiFiles.map((ds, i) => (
                      <option key={i} value={i}>{ds.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comparative Analysis Section */}
        {showComparative && analysis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Analisis Komparatif</h3>
              <span className="text-sm text-gray-500">Sumber: {sourceKey}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Metric (numerik)</label>
                <CustomDropdown
                  options={[{ value: '', label: 'Pilih metric' }, ...data.headers
                    .filter(h => analysis.dataTypes[h] === 'numeric')
                    .map(h => ({ value: h, label: h }))]}
                  value={selectedMetric}
                  onChange={(v) => setSelectedMetric(v)}
                  placeholder="Pilih metric"
                />
              </div>
              {/* Removed duplicate category/topK controls to avoid confusion */}
            </div>

            {selectedMetric && (
              <div className="space-y-8">
                {/* Perbandingan Kategori (Multi-line by file) */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Perbandingan Kategori per File (Multi-line)</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kolom Kategori</label>
                      <CustomDropdown
                        options={[...data.headers
                          .filter(h => analysis.dataTypes[h] === 'categorical')
                          .map(h => ({ value: h, label: h }))]}
                        value={selectedCategoryForCompare}
                        onChange={(v) => setSelectedCategoryForCompare(v)}
                        placeholder="Pilih kolom kategori"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
                      <CustomDropdown
                        options={[
                          { value: 'count', label: 'Count (jumlah baris)' },
                          { value: 'sum', label: 'Sum (jumlah nilai numerik)' }
                        ]}
                        value={categoryMetricType}
                        onChange={(v) => setCategoryMetricType(v)}
                        placeholder="Pilih metric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Top K</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={categoryTopK}
                        onChange={(e) => setCategoryTopK(parseInt(e.target.value) || 10)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={categoryShowAll}
                          onChange={(e) => setCategoryShowAll(e.target.checked)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">Tampilkan semua kategori</span>
                      </label>
                    </div>
                  </div>
                  {selectedCategoryForCompare && (
                    <div className="p-3 bg-gray-50 rounded border">
                      {(() => {
                        const rows = getRowsWithSource();
                        const included = includedDatasets.size > 0 ? new Set(includedDatasets) : new Set(Array.from(new Set(rows.map(r => r[sourceKey] || 'Unknown'))));
                        const sources = Array.from(included).sort();
                        const cat = selectedCategoryForCompare;
                        // Compute per-file metric for each category value
                        const valueSet = new Set(rows.map(r => r[cat] || '-'));
                        const valueList = Array.from(valueSet);
                        const metricOf = (list) => {
                          if (categoryMetricType === 'count') return list.length;
                          const nums = list.map(x => parseFloat(x[selectedMetric])).filter(n => !isNaN(n));
                          return nums.reduce((a,b)=>a+b,0);
                        };
                        // total per value across included sources
                        const totals = {};
                        valueList.forEach(v => {
                          const rel = rows.filter(r => (r[cat] || '-') === v && included.has(r[sourceKey] || 'Unknown'));
                          totals[v] = metricOf(rel);
                        });
                        const orderedValues = valueList
                          .map(v => ({ v, t: totals[v] }))
                          .sort((a,b)=>b.t - a.t)
                          .map(o => o.v);
                        const usedValues = categoryShowAll ? orderedValues : orderedValues.slice(0, categoryTopK);
                        if (usedValues.length === 0) return <div className="text-sm text-gray-500">Tidak ada kategori.</div>;
                        // Build lines: one line per source
                        const series = sources.map((src, si) => ({
                          name: src,
                          color: ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#6366f1','#6b7280'][si % 8],
                          points: usedValues.map(val => {
                            const rel = rows.filter(r => (r[cat] || '-') === val && (r[sourceKey] || 'Unknown') === src);
                            return { x: val, y: metricOf(rel) };
                          })
                        }));
                        const yMax = Math.max(1, ...series.flatMap(s => s.points.map(p => p.y)));
                        const width = 720; const height = 300; const padding = 60;
                        const xPositions = usedValues.reduce((acc, v, idx) => {
                          acc[v] = padding + (idx / Math.max(1, usedValues.length - 1)) * (width - padding * 2);
                          return acc;
                        }, {});
                        const yScale = (y) => height - padding - (y / yMax) * (height - padding * 2);
                        return (
                          <div>
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                              {/* Axes */}
                              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#9CA3AF" strokeWidth="1" />
                              <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#9CA3AF" strokeWidth="1" />
                              {/* X labels */}
                              {usedValues.map((v, i) => (
                                <g key={i}>
                                  <line x1={xPositions[v]} y1={height - padding} x2={xPositions[v]} y2={height - padding + 4} stroke="#9CA3AF" />
                                  <text x={xPositions[v]} y={height - padding + 22} fontSize="10" textAnchor="end" transform={`rotate(45 ${xPositions[v]} ${height - padding + 22})`} fill="#4B5563">{v}</text>
                                </g>
                              ))}
                              {/* Y ticks */}
                              {[0,0.25,0.5,0.75,1].map((t,i)=>{
                                const yy = yScale(t * yMax);
                                return (
                                  <g key={i}>
                                    <line x1={padding - 4} y1={yy} x2={padding} y2={yy} stroke="#9CA3AF" />
                                    <text x={padding - 6} y={yy + 3} fontSize="10" textAnchor="end" fill="#4B5563">{(t * yMax).toFixed(0)}</text>
                                  </g>
                                );
                              })}
                              {/* Lines */}
                              {series.map((s, si) => {
                                const d = s.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xPositions[p.x]} ${yScale(p.y)}`).join(' ');
                                return <path key={si} d={d} fill="none" stroke={s.color} strokeWidth="2" />;
                              })}
                              {/* Dots */}
                              {series.map((s, si) => s.points.map((p, pi) => (
                                <circle key={`${si}-${pi}`} cx={xPositions[p.x]} cy={yScale(p.y)} r="3" fill={s.color} />
                              )))}
                            </svg>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-2">
                              {series.map((s, si) => (
                                <div key={si} className="flex items-center gap-2 text-xs bg-white border px-2 py-1 rounded">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></span>
                                  <span className="text-gray-800">{s.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {/* Trend kategori: multi-line per Source */}
                <div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kolom Kategori</label>
                      <CustomDropdown
                        options={[...data.headers
                          .filter(h => analysis.dataTypes[h] === 'categorical')
                          .map(h => ({ value: h, label: h }))]}
                        value={selectedCategoryForCompare}
                        onChange={(v) => setSelectedCategoryForCompare(v)}
                        placeholder="Pilih kolom kategori"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nilai Kategori (multi)</label>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 border rounded">
                        {selectedCategoryForCompare && Array.from(new Set(getRowsWithSource().map(r => r[selectedCategoryForCompare] || '-')))
                          .sort()
                          .map(val => (
                            <label key={val} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded border">
                              <input
                                type="checkbox"
                                checked={selectedCategoryValues.includes(val)}
                                onChange={(e) => {
                                  const next = new Set(selectedCategoryValues);
                                  if (e.target.checked) next.add(val); else next.delete(val);
                                  setSelectedCategoryValues(Array.from(next));
                                }}
                              />
                              <span>{val}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sumber ditampilkan</label>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 border rounded">
                        {Array.from(new Set(getRowsWithSource().map(r => r[sourceKey] || 'Unknown')))
                          .sort()
                          .map(src => (
                            <label key={src} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded border">
                              <input
                                type="checkbox"
                                defaultChecked
                                onChange={(e) => {
                                  const next = new Set(includedDatasets);
                                  if (!e.target.checked) next.delete(src); else next.add(src);
                                  setIncludedDatasets(next);
                                }}
                              />
                              <span>{src}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>
                  {selectedCategoryForCompare && selectedCategoryValues.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded border">
                      {(() => {
                        // Prepare multi-line data by year (from filename) and category values
                        const rows = getRowsWithSource();
                        const parseYear = (s) => {
                          const m = String(s).match(/(20\d{2})/);
                          return m ? parseInt(m[1]) : null;
                        };
                        // Aggregate sum per year per category value for included sources
                        const included = includedDatasets.size > 0 ? new Set(includedDatasets) : new Set(Array.from(new Set(rows.map(r => r[sourceKey] || 'Unknown'))));
                        const map = {}; // {year: {valueName: sum}}
                        rows.forEach(r => {
                          const src = r[sourceKey] || 'Unknown';
                          if (!included.has(src)) return;
                          const yr = parseYear(src);
                          if (!yr) return;
                          const catVal = (r[selectedCategoryForCompare] || '-');
                          if (!selectedCategoryValues.includes(catVal)) return;
                          const num = parseFloat(r[selectedMetric]);
                          if (isNaN(num)) return;
                          if (!map[yr]) map[yr] = {};
                          map[yr][catVal] = (map[yr][catVal] || 0) + num;
                        });
                        const years = Object.keys(map).map(n => parseInt(n,10)).sort((a,b)=>a-b);
                        if (years.length === 0) return <div className="text-sm text-gray-500">Tidak ada data untuk pilihan ini.</div>;
                        // Build polylines per selected category value
                        const series = selectedCategoryValues.map(val => ({ name: val, points: years.map(y => ({ x: y, y: map[y]?.[val] || 0 })) }));
                        // SVG chart
                        const width = 640; const height = 260; const padding = 40;
                        const xMin = years[0]; const xMax = years[years.length - 1];
                        const yMax = Math.max(1, ...series.flatMap(s => s.points.map(p => p.y)));
                        const xScale = (x) => padding + (years.length > 1 ? (x - xMin) / (xMax - xMin) : 0) * (width - padding * 2);
                        const yScale = (y) => height - padding - (y / yMax) * (height - padding * 2);
                        const colors = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#6366f1','#6b7280'];
                        return (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Trend: {selectedCategoryForCompare} ({selectedCategoryValues.join(', ')})</div>
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                              {/* Axes */}
                              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#9CA3AF" strokeWidth="1" />
                              <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#9CA3AF" strokeWidth="1" />
                              {/* X ticks (years) */}
                              {years.map((y,i)=> (
                                <g key={i}>
                                  <line x1={xScale(y)} y1={height - padding} x2={xScale(y)} y2={height - padding + 4} stroke="#9CA3AF" />
                                  <text x={xScale(y)} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="#4B5563">{y}</text>
                                </g>
                              ))}
                              {/* Y ticks */}
                              {[0,0.25,0.5,0.75,1].map((t,i)=>{
                                const yy = yScale(t * yMax);
                                return (
                                  <g key={i}>
                                    <line x1={padding - 4} y1={yy} x2={padding} y2={yy} stroke="#9CA3AF" />
                                    <text x={padding - 6} y={yy + 3} fontSize="10" textAnchor="end" fill="#4B5563">{(t * yMax).toFixed(0)}</text>
                                  </g>
                                );
                              })}
                              {/* Lines */}
                              {series.map((s, si) => {
                                const d = s.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`).join(' ');
                                return <path key={si} d={d} fill="none" stroke={colors[si % colors.length]} strokeWidth="2" />;
                              })}
                              {/* Dots */}
                              {series.map((s, si) => s.points.map((p, pi) => (
                                <circle key={`${si}-${pi}`} cx={xScale(p.x)} cy={yScale(p.y)} r="3" fill={colors[si % colors.length]} />
                              )))}
                            </svg>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-2">
                              {series.map((s, si) => (
                                <div key={si} className="flex items-center gap-2 text-xs bg-white border px-2 py-1 rounded">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[si % colors.length] }}></span>
                                  <span className="text-gray-800">{s.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {/* Per-source metric summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Ringkasan {selectedMetric} per {sourceKey}</h4>
                  <div className="space-y-2">
                    {(() => {
                      const bySource = {};
                      getRowsWithSource().forEach(r => {
                        const src = r[sourceKey] || 'Unknown';
                        const val = parseFloat(r[selectedMetric]);
                        if (!isNaN(val)) {
                          bySource[src] = (bySource[src] || 0) + val;
                        }
                      });
                      const entries = Object.entries(bySource).sort((a,b)=>b[1]-a[1]);
                      const maxVal = Math.max(...entries.map(([,v]) => v), 1);
                      return entries.map(([src, total]) => (
                        <div key={src} className="flex items-center gap-3">
                          <div className="w-32 text-sm text-gray-600">{src}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${(total / maxVal) * 100}%` }}></div>
                          </div>
                          <div className="w-24 text-sm text-gray-700 text-right">{total.toFixed(2)}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Grouped bar: category vs source */}
                {selectedCategoryForCompare && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Perbandingan {selectedMetric} per {selectedCategoryForCompare} dan {sourceKey}</h4>
                    {(() => {
                      const rows = getRowsWithSource();
                      const sources = Array.from(new Set(rows.map(r => r[sourceKey] || 'Unknown')));
                      const map = {};
                      rows.forEach(r => {
                        const cat = r[selectedCategoryForCompare] || '-';
                        const src = r[sourceKey] || 'Unknown';
                        const val = parseFloat(r[selectedMetric]);
                        if (isNaN(val)) return;
                        if (!map[cat]) map[cat] = {};
                        map[cat][src] = (map[cat][src] || 0) + val;
                      });
                      const cats = Object.keys(map).map(c => ({
                        name: c,
                        total: sources.reduce((s, src) => s + (map[c][src] || 0), 0)
                      }))
                      .sort((a,b)=>b.total - a.total)
                      .slice(0, topKCompare)
                      .map(o => o.name);
                      const maxVal = Math.max(1, ...cats.map(c => Math.max(...sources.map(src => map[c][src] || 0))));
                      return (
                        <div className="space-y-4">
                          {cats.map(cat => (
                            <div key={cat} className="border rounded-lg p-3">
                              <div className="font-medium text-gray-800 mb-2">{cat}</div>
                              <div className="space-y-2">
                                {sources.map(src => {
                                  const val = map[cat][src] || 0;
                                  const width = (val / maxVal) * 100;
                                  return (
                                    <div key={src} className="flex items-center gap-3">
                                      <div className="w-32 text-xs text-gray-600">{src}</div>
                                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                                        <div className="bg-purple-600 h-3 rounded-full" style={{ width: `${width}%` }}></div>
                                      </div>
                                      <div className="w-20 text-xs text-gray-700 text-right">{val.toFixed(2)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Insights Add-on - Now below add-ons */}
        {showInsights && analysis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Info size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Wawasan Data</h3>
              <span className="text-sm text-gray-500">
                {filteredData ? `dari ${filteredData.rows.length} baris data yang difilter` : `dari ${data.totalRows} baris data`}
              </span>
            </div>
            <div className="space-y-3">
              {generateFilteredInsights().map((insight, index) => (
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

        {/* Top N Analysis Add-on */}
        {showTopN && data && analysis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={20} className="text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Analisis Top N</h3>
              <span className="text-sm text-gray-500">
                {filteredData ? `dari ${filteredData.rows.length} baris data yang difilter` : `dari ${data.totalRows} baris data`}
              </span>
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
                    max="200"
                    value={topN}
                    onChange={(e) => setTopN(parseInt(e.target.value) || 10)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                {selectedColumn && (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      id="show-all-topn"
                      type="checkbox"
                      checked={showAllTopN}
                      onChange={(e) => setShowAllTopN(e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="show-all-topn" className="text-sm text-gray-700">
                      Tampilkan semua nilai unik
                    </label>
                  </div>
                )}
              </div>
              
              {selectedColumn && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {showAllTopN ? 'Semua nilai dari' : `Top ${topN} dari`} {selectedColumn}
                  </h4>
                    <div className={`${expandTopNList ? 'max-h-[600px]' : 'max-h-64'} overflow-y-auto`}>
                    {(showAllTopN ? getTopNValues(selectedColumn, 100000) : getTopNValues(selectedColumn, topN)).map((item, index) => (
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
                    <div className="mt-3 flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={expandTopNList}
                          onChange={(e) => setExpandTopNList(e.target.checked)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">Perluas daftar (lebih tinggi)</span>
                      </label>
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
                
                const chartData = generateItemDetailChartData(detail, header, showAllItemChartValues);
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
                          <div onClick={(e) => e.stopPropagation()}>
                            <h5 className="font-medium text-gray-900 mb-3">Distribusi Nilai</h5>
                            <div className="mb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                id={`show-all-item-${header}`}
                                type="checkbox"
                                checked={showAllItemChartValues}
                                onChange={(e) => setShowAllItemChartValues(e.target.checked)}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              <label htmlFor={`show-all-item-${header}`} className="text-xs text-gray-700">Tampilkan semua nilai</label>
                            </div>
                            {(() => {
                              const visibleData = showAllItemChartValues ? chartData : chartData.slice(0, 8);
                              const dataSortedByValue = [...visibleData].sort((a, b) => b.value - a.value);
                              return itemChartType === 'bar' ? (
                              <div className="space-y-3">
                                {dataSortedByValue.map((item, index) => {
                                  const maxValue = Math.max(...dataSortedByValue.map(d => d.value));
                                  const totalValue = dataSortedByValue.reduce((sum, d) => sum + d.value, 0);
                                  const percentage = (item.value / maxValue) * 100;
                                  const percentOfTotal = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
                                  return (
                                    <div key={index} className="p-3 bg-white rounded-lg border">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-gray-900 truncate" title={item.fullName}>
                                          {item.name}
                                        </span>
                                        <span className="text-sm font-bold text-gray-600">
                                          {item.value} ({percentOfTotal}%)
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
                                      {dataSortedByValue.map((item, index) => {
                                        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
                                        const total = dataSortedByValue.reduce((sum, d) => sum + d.value, 0);
                                        const percentage = (item.value / total) * 100;
                                        const startAngle = dataSortedByValue.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
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
                                          {(showAllItemChartValues ? chartData : chartData.slice(0, 8)).reduce((sum, d) => sum + d.value, 0)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Legend */}
                                <div className="flex-1 space-y-2">
                                  {dataSortedByValue.map((item, index) => {
                                    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#6b7280'];
                                    const total = dataSortedByValue.reduce((sum, d) => sum + d.value, 0);
                                    const percentOfTotal = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
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
                                            {item.value} ({percentOfTotal}%)
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Full Width - All Values */}
                        <div className={`${showItemCharts && chartData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
                          <h5 className="font-medium text-gray-900 mb-3">Semua Nilai ({detail.uniqueValues.length})</h5>
                          <div className={`${expandItemAllValues ? 'max-h-none' : 'max-h-48'} overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const counts = {};
                                detail.allValues.forEach(v => { if (v !== '' && v !== null && v !== undefined) counts[v] = (counts[v] || 0) + 1; });
                                return Object.entries(counts)
                                  .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
                                  .map(([value, count], index) => (
                                <span
                                  key={index}
                                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                                      title={`${value} — ${count} kali`}
                                >
                                  {value}
                                </span>
                                  ));
                              })()}
                            </div>
                          </div>
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={expandItemAllValues}
                                onChange={(e) => setExpandItemAllValues(e.target.checked)}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-xs text-gray-700">Perluas daftar nilai</span>
                            </label>
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
                    setChartData(generateChartData(value, showAllChartValues));
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
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      id="show-all-chart-values"
                      type="checkbox"
                      checked={showAllChartValues}
                      onChange={(e) => {
                        setShowAllChartValues(e.target.checked);
                        setChartData(generateChartData(selectedChartColumn, e.target.checked));
                      }}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="show-all-chart-values" className="text-sm text-gray-700">
                      Tampilkan semua nilai (mungkin panjang)
                    </label>
                  </div>
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
