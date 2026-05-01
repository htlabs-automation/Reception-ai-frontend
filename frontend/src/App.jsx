import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/authStore';
import { RequireAuth, RequireSuperAdmin, RoleRedirect } from './pages/RequireAuth';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login';

// Admin pages
import TenantsPage from './pages/admin/TenantsPage';
import UsersPage from './pages/admin/UsersPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import InvoicePage from './pages/admin/InvoicePage';
import AdminTenantView from './pages/admin/AdminTenantView';

// Tenant pages
import TenantDashboardPage from './pages/tenant/TenantDashboardPage';
import MenuPage from './pages/tenant/MenuPage';
import InventoryPage from './pages/tenant/InventoryPage';
import DealsPage from './pages/tenant/DealsPage';
import KitchenPage from './pages/tenant/KitchenPage';
import AnalyticsPage from './pages/tenant/AnalyticsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* ── Authenticated shell ── */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

          {/* Admin-only routes */}
          <Route path="/admin" element={<RequireSuperAdmin><TenantsPage /></RequireSuperAdmin>} />
          <Route path="/admin/users" element={<RequireSuperAdmin><UsersPage /></RequireSuperAdmin>} />
          <Route path="/admin/analytics" element={<RequireSuperAdmin><AdminAnalyticsPage /></RequireSuperAdmin>} />
          <Route path="/admin/invoices" element={<RequireSuperAdmin><InvoicePage /></RequireSuperAdmin>} />
          <Route path="/admin/tenant/:tenantId" element={<RequireSuperAdmin><AdminTenantView /></RequireSuperAdmin>} />

          {/* Tenant routes — accessible by staff (scoped) and superadmin (any tenant) */}
          <Route path="/tenant/:tenantId" element={<TenantDashboardPage />} />
          <Route path="/tenant/:tenantId/menu" element={<MenuPage />} />
          <Route path="/tenant/:tenantId/inventory" element={<InventoryPage />} />
          <Route path="/tenant/:tenantId/deals" element={<DealsPage />} />
          <Route path="/tenant/:tenantId/kitchen" element={<KitchenPage />} />
          <Route path="/tenant/:tenantId/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
