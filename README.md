# ASB Frontend System

This document outlines the frontend system architecture, components, and best practices for the ASB (Automotive Service Business) application.

## 🏗️ System Architecture

### Core Technologies
- **React 18** - UI Framework
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Toast notifications
- **Recharts** - Chart library for analytics
- **Lucide React** - Icon library
- **React Tooltip** - Tooltip component for UI hints

## 🔧 Key Components & Utilities

### 1. User Preferences System (`src/utils/UserPreferences.js`)
**Use this for all user preference and favorite functionality** across the entire project.

```javascript
import { 
  getUserPreferences, 
  saveUserPreferences, 
  updatePreferences, 
  getSectionPreferences,
  resetPreferences,
  PREFERENCE_SECTIONS 
} from '../utils/UserPreferences';

// ✅ Get all preferences
const preferences = getUserPreferences();

// ✅ Update specific section
updatePreferences(PREFERENCE_SECTIONS.QUOTATIONS, {
  favoriteStatuses: ['open', 'win'],
  isFilterCollapsed: false
});

// ✅ Get section-specific preferences
const quotationPrefs = getSectionPreferences(PREFERENCE_SECTIONS.QUOTATIONS);

// ✅ Reset preferences
resetPreferences(); // Reset all
resetPreferences(PREFERENCE_SECTIONS.ANALYTICS); // Reset specific section
```

**Features:**
- **Persistent Storage**: Automatically saves to localStorage
- **Default Fallbacks**: Merges with defaults for missing properties
- **Section-based**: Organized by feature area (analytics, quotations, dashboard)
- **Type Safety**: Well-defined preference structure
- **Error Handling**: Graceful fallbacks for corrupted data

**Preference Structure:**
```javascript
{
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
    favoriteStatuses: ['open'] // User's favorite statuses
  },
  dashboard: {
    // Future dashboard preferences
  }
}
```

**Best Practices:**
- Always use `PREFERENCE_SECTIONS` constants for section names
- Use `updatePreferences()` for partial updates
- Use `getSectionPreferences()` for component-specific preferences
- Handle loading states when preferences are being applied

### 2. React Tooltip (`react-tooltip`)
**Use this for all action symbols and interactive elements** to provide user guidance.

```javascript
import { Tooltip } from 'react-tooltip';

// ✅ Correct usage for action buttons
<button
  data-tooltip-id="view-tooltip"
  data-tooltip-content="View quotation details"
  className="text-blue-600 hover:text-blue-900 p-1"
>
  <Eye className="h-4 w-4" />
</button>
<Tooltip id="view-tooltip" />

// ✅ For multiple tooltips, use unique IDs
<button data-tooltip-id="edit-tooltip" data-tooltip-content="Edit quotation">
  <Edit className="h-4 w-4" />
</button>
<Tooltip id="edit-tooltip" />
```

**Features:**
- **Automatic Positioning**: Smart positioning based on viewport
- **Accessibility**: Screen reader friendly
- **Customizable**: Styling and behavior options
- **Performance**: Lightweight and efficient

**Tooltip Guidelines:**
- **Action Buttons**: Always include tooltips for icon-only buttons
- **Status Indicators**: Explain what status colors mean
- **Form Fields**: Provide helpful hints for complex inputs
- **Navigation**: Guide users through multi-step processes

### 3. API Helper (`src/utils/ApiHelper.js`)
**Always use this for API requests** - it automatically includes JWT authentication.

```javascript
import axiosInstance from '../utils/ApiHelper';

// ✅ Correct usage
const response = await axiosInstance.get('/api/quotations');
const response = await axiosInstance.post('/api/quotations', data);
const response = await axiosInstance.put(`/api/quotations/${id}`, data);
const response = await axiosInstance.delete(`/api/quotations/${id}`);

// ❌ Don't use axios directly
import axios from 'axios'; // Don't do this
```

**Features:**
- Automatic JWT token attachment to requests
- Base URL configuration
- Request/response interceptors
- Automatic token refresh handling

### 2. Custom Dropdown (`src/components/CustomDropdown.jsx`)
**Use this for all dropdown/select components** instead of native HTML select.

```javascript
import CustomDropdown from '../components/CustomDropdown';

// ✅ Correct usage
const options = [
  { value: 'open', label: 'Open' },
  { value: 'close', label: 'Closed' }
];

<CustomDropdown
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="Select an option"
  required={true} // This prop exists but is not currently used - needs fixing
  className="mt-1"
/>
```

**Features:**
- Modern, accessible design
- Smooth animations
- Click-outside-to-close
- Keyboard navigation
- Customizable styling
- Placeholder text support

**Known Issue:** The `required` prop is defined but not currently implemented in the component logic.

### 3. Base Modal (`src/components/BaseModal.jsx`)
**Use this as the foundation for all modals** in the application.

```javascript
import BaseModal from '../components/BaseModal';

// ✅ Correct usage
<BaseModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Modal Title"
>
  {/* Modal content goes here */}
</BaseModal>
```

**Features:**
- Consistent modal styling
- Backdrop click to close
- ESC key to close
- Responsive design
- Accessibility features

### 4. User Context (`src/utils/UserContext.jsx`)
**Global state management for user authentication.**

```javascript
import { useContext } from 'react';
import { UserContext } from '../utils/UserContext';

const { user, loginUser, logoutUser } = useContext(UserContext);

// User object structure:
// {
//   email: string,
//   role: string,
//   isLoggedIn: boolean
// }
```

**Features:**
- Global user state
- Automatic localStorage persistence
- Login/logout functions
- JWT token management

### 5. Protected Routes (`src/components/ProtectedRoute.jsx`)
**Wraps routes that require authentication.**

```javascript
import ProtectedRoute from '../components/ProtectedRoute';

<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

## 🎨 Styling Guidelines

### Color Scheme
- **Primary Red:** `#EF4444` (red-500)
- **Hover Red:** `#DC2626` (red-600)
- **Background:** `#F9FAFB` (gray-50)
- **Card Background:** `#FFFFFF` (white)
- **Text Primary:** `#111827` (gray-900)
- **Text Secondary:** `#6B7280` (gray-500)

### Component Styling Patterns

#### Buttons
```javascript
// Primary button
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors">
  Primary Action
</button>

// Secondary button
<button className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
  Secondary Action
</button>
```

#### Form Inputs
```javascript
<input
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
  // ... other props
/>
```

#### Cards
```javascript
<div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  {/* Card content */}
</div>
```

## 📱 Page Structure

### Standard Page Layout
```javascript
import Navigation from '../components/Navigation';

const MyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Page Title" subtitle="Page description" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page content */}
      </div>
    </div>
  );
};
```

### Loading States
```javascript
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
    </div>
  );
}
```

## 🔄 State Management Patterns

### Form State
```javascript
const [formData, setFormData] = useState({
  field1: '',
  field2: '',
  // ... other fields
});

const handleInputChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};
```

### API Data State
```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  try {
    setLoading(true);
    const response = await axiosInstance.get('/api/endpoint');
    if (response.data.success) {
      setData(response.data.data);
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to fetch data');
  } finally {
    setLoading(false);
  }
};
```

## 🚨 Error Handling

### Toast Notifications
```javascript
import toast from 'react-hot-toast';

// Success
toast.success('Operation completed successfully!');

// Error
toast.error('Something went wrong!');

// Loading
const promise = apiCall();
toast.promise(promise, {
  loading: 'Saving...',
  success: 'Saved!',
  error: 'Failed to save'
});
```

### API Error Handling
```javascript
try {
  const response = await axiosInstance.post('/api/endpoint', data);
  if (response.data.success) {
    toast.success('Success message');
    // Handle success
  }
} catch (error) {
  console.error('Error:', error);
  toast.error(error.response?.data?.message || 'Generic error message');
}
```

## 📊 Data Display Patterns

### Status Badges
```javascript
const getStatusColor = (status) => {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800';
    case 'close': return 'bg-gray-100 text-gray-800';
    case 'loss': return 'bg-red-100 text-red-800';
    case 'win': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

<span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
  {status}
</span>
```

### Currency Formatting
```javascript
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount);
};
```

### Date Formatting
```javascript
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
```

## 🔐 Authentication Flow

1. **Login/Register** → Updates UserContext
2. **UserContext** → Stores JWT in localStorage
3. **ApiHelper** → Automatically attaches JWT to requests
4. **ProtectedRoute** → Checks authentication status
5. **Navigation** → Shows user info and logout option

## 📁 File Organization

```
src/
├── components/          # Reusable UI components
│   ├── BaseModal.jsx
│   ├── CustomDropdown.jsx
│   ├── Navigation.jsx
│   ├── ProtectedRoute.jsx
│   └── ...
├── pages/              # Page components
│   ├── HomePage.jsx
│   ├── QuotationPage.jsx
│   ├── AnalyticsPage.jsx
│   └── ...
├── utils/              # Utility functions and contexts
│   ├── ApiHelper.js
│   └── UserContext.jsx
└── App.jsx            # Main app component
```

## 🚀 Development Guidelines

### Component Creation Checklist
- [ ] Use TypeScript-style prop documentation
- [ ] Include proper error handling
- [ ] Add loading states where appropriate
- [ ] Follow consistent naming conventions
- [ ] Use Tailwind classes for styling
- [ ] Include accessibility attributes

### Code Quality
- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices
- Keep components focused and reusable
- Use meaningful variable names
- Add comments for complex logic

## 🔧 Known Issues & TODOs

1. **CustomDropdown**: The `required` prop is defined but not implemented
2. **Form Validation**: Need to implement comprehensive form validation
3. **Error Boundaries**: Need to add error boundaries for better error handling
4. **Loading States**: Some components could benefit from skeleton loaders
5. **Responsive Design**: Some components need better mobile responsiveness

## 📞 Support

For questions about the frontend system, refer to:
- This README documentation
- Component source code comments
- React documentation
- Tailwind CSS documentation

---

**Last Updated:** December 2024
**Version:** 1.0.0