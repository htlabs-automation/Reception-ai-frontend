import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UtensilsCrossed, ChefHat,
  Tag, BarChart2, FileText, LogOut, Building2, Utensils, Package,
} from 'lucide-react';
import { useAuth } from '../../store/authStore';

const adminLinks = [
  { to: '/admin', label: 'Tenants', icon: Building2, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
];

const tenantLinks = (tenantId) => [
  { to: `/tenant/${tenantId}`, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: `/tenant/${tenantId}/menu`, label: 'Menu', icon: Utensils },
  { to: `/tenant/${tenantId}/inventory`, label: 'Inventory', icon: Package },
  { to: `/tenant/${tenantId}/deals`, label: 'Special Deals', icon: Tag },
  { to: `/tenant/${tenantId}/kitchen`, label: 'Kitchen View', icon: ChefHat },
  { to: `/tenant/${tenantId}/analytics`, label: 'Analytics', icon: BarChart2 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const links = user?.role === 'superadmin'
    ? adminLinks
    : tenantLinks(user?.tenant_id);

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col py-6 px-3 fixed left-0 top-0 bottom-0 z-40">
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">AI Receptionist</span>
        </div>
        <p className="text-gray-400 text-xs mt-1 truncate">{user?.tenant_name || 'Admin Panel'}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'superadmin' && (
          <>
            <div className="border-t border-gray-800 my-3" />
            <p className="text-xs text-gray-600 px-3 mb-1 font-medium uppercase tracking-wider">Billing</p>
            <NavLink
              to="/admin/invoices"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              Invoices
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <div className="px-3 mb-3">
          <p className="text-xs font-medium text-white truncate">{user?.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
