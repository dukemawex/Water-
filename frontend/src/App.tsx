import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import PublicDashboard from './pages/PublicDashboard';
import AnalystDashboard from './pages/AnalystDashboard';
import LocationDetail from './pages/LocationDetail';
import AlertCenter from './pages/AlertCenter';
import LoginPage from './pages/LoginPage';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalystDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <LocationDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Layout>
                  <AlertCenter />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
