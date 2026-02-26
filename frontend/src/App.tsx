import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { RootLayout } from '@/layouts/RootLayout';
import { useAuth } from '@/contexts/AuthContext';

// Modular Routes
import { PublicRoutes } from '@/routes/PublicRoutes';
import { DashboardRoutes } from '@/routes/DashboardRoutes';
import { AdminRoutes } from '@/routes/AdminRoutes';

// Smart redirect component
const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.default_path) {
    return <Navigate to={user.default_path} replace />;
  }

  // Fallback for unexpected cases
  return <Navigate to="/dashboard/personal" replace />;
};

// Router Configuration
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* Publicly Accessible Routes */}
      {PublicRoutes}

      {/* Primary Dashboard/Common Routes */}
      {DashboardRoutes}

      {/* Administrative and Management Modules */}
      {AdminRoutes}

      {/* Redirect /dashboard to appropriate role dashboard */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

export default router;
