import { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Dashboard from '@/pages/Dashboard';
import ITRFiling from '@/pages/ITRFiling';
import ITRGenerator from '@/pages/ITRGenerator';
import GSTFiling from '@/pages/GSTFiling';
import GSTNSettings from '@/pages/GSTNSettings';
import TallyEntry from '@/pages/TallyEntry';
import TDSFiling from '@/pages/TDSFiling';
import FinancialStatements from '@/pages/FinancialStatements';
import Payroll from '@/pages/Payroll';
import Bookkeeping from '@/pages/Bookkeeping';
import StartupTaxSavings from '@/pages/StartupTaxSavings';
import Integrations from '@/pages/Integrations';
import SmartAlerts from '@/pages/SmartAlerts';
import Customers from '@/pages/Customers';
import News from '@/pages/News';
import Reconciliation from '@/pages/Reconciliation';
import Subscription from '@/pages/Subscription';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Killer Features */}
            <Route
              path="/startup-tax-savings"
              element={
                <ProtectedRoute>
                  <StartupTaxSavings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/smart-alerts"
              element={
                <ProtectedRoute>
                  <SmartAlerts />
                </ProtectedRoute>
              }
            />
            {/* AI Automation Features */}
            <Route
              path="/itr-filing"
              element={
                <ProtectedRoute>
                  <ITRFiling />
                </ProtectedRoute>
              }
            />
            <Route
              path="/itr-generator"
              element={
                <ProtectedRoute>
                  <ITRGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gst-filing"
              element={
                <ProtectedRoute>
                  <GSTFiling />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tally-entry"
              element={
                <ProtectedRoute>
                  <TallyEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tds-filing"
              element={
                <ProtectedRoute>
                  <TDSFiling />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financial-statements"
              element={
                <ProtectedRoute>
                  <FinancialStatements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <Payroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookkeeping"
              element={
                <ProtectedRoute>
                  <Bookkeeping />
                </ProtectedRoute>
              }
            />
            {/* Management Features */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <News />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reconciliation"
              element={
                <ProtectedRoute>
                  <Reconciliation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/gstn"
              element={
                <ProtectedRoute>
                  <GSTNSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
