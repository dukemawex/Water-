import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Bell, LogOut, Droplets } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../services/authService';
import { useAlerts } from '../../hooks/useAlerts';

interface Props { children: ReactNode; }

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alerts', icon: Bell },
];

export default function Layout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: alertsData } = useAlerts('ACTIVE');
  const activeAlerts = (alertsData as { items: unknown[] } | null)?.items?.length ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-ocean-900 flex flex-col border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <Droplets className="text-water-500" size={24} aria-hidden="true" />
            <div>
              <p className="font-bold text-gray-100 text-sm">Water Sentinel</p>
              <p className="text-xs text-gray-500">Quality Monitor</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Main navigation">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-water-500/20 text-water-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
                {label === 'Alerts' && activeAlerts > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center" aria-label={`${activeAlerts} active alerts`}>
                    {activeAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-gray-300">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={16} aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" role="main">
        {children}
      </main>
    </div>
  );
}
