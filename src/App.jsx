import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './components/Login'
import Register from './components/Register'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import QuotationPage from './pages/quotation/QuotationPage'
import QuotationFormPage from './pages/quotation/QuotationFormPage'
import QuotationDownloadPage from './pages/quotation/QuotationDownloadPage'
import QuotationAnalysisPage from './pages/QuotationAnalysisPage'
import DynamicAnalyticsPage from './pages/DynamicAnalyticsPage'
import ProfilePage from './pages/ProfilePage'
import DebugResponse from './components/DebugResponse'
import TruckTypesPage from './pages/TruckTypesPage'
import DrawingSpecificationsPage from './pages/DrawingSpecificationsPage'
import UserManagementPage from './pages/UserManagementPage'
import PermissionManagementPage from './pages/RoleManagementPage'
import { UserContextProvider } from './utils/UserContext'

function App() {
  return (
    <UserContextProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dynamic-analytics" 
          element={
            <ProtectedRoute>
              <DynamicAnalyticsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quotations" 
          element={
            <ProtectedRoute>
              <QuotationPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quotations/form/:quotationId?" 
          element={
            <ProtectedRoute>
              <QuotationFormPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quotations/details/:quotationId" 
          element={
            <ProtectedRoute>
              <QuotationDownloadPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quotations/rfq/:rfqId" 
          element={
            <ProtectedRoute>
              <QuotationPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quotations/analysis" 
          element={
            <ProtectedRoute>
              <QuotationAnalysisPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/debug" 
          element={
            <ProtectedRoute>
              <DebugResponse />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/data/truck-types" 
          element={
            <ProtectedRoute>
              <TruckTypesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/data/drawing-specifications" 
          element={
            <ProtectedRoute>
              <DrawingSpecificationsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/permissions" 
          element={
            <ProtectedRoute>
              <PermissionManagementPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </UserContextProvider>
  )
}

export default App
