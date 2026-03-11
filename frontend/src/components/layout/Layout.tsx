import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Map,
  MapPin,
  Bell,
  LogOut,
  Droplets,
  Activity,
  BarChart2,
  FileText,
  Satellite,
  Radio,
  Cpu,
  Users,
  Settings,
  Sliders,
  ClipboardList,
  ShieldAlert,
  HeartPulse,
  Key,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../services/authService';
import { useAlerts } from '../../hooks/useAlerts';

interface Props { children: ReactNode; }

type NavItem = {
  path: string;
  label: string;
  icon: React.ElementType;
};

type NavSection = {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
};

const navSections: NavSection[] = [
  {
    title: 'MONITORING',
    items: [
      { path: '/dashboard', label: 'Dashboard / Map', icon: Map },
      { path: '/locations', label: 'Locations', icon: MapPin },
      { path: '/sensors', label: 'Sensors', icon: Radio },
    ],
  },
  {
    title: 'ANALYSIS',
    items: [
      { path: '/readings', label: 'Readings', icon: Activity },
      { path: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    title: 'ALERTS',
    items: [
      { path: '/alerts', label: 'Active Alerts', icon: Bell },
      { path: '/alerts/history', label: 'Alert History', icon: ClipboardList },
    ],
  },
  {
    title: 'DATA SOURCES',
    items: [
      { path: '/satellite', label: 'Satellite Data', icon: Satellite },
      { path: '/river-gauges', label: 'River Gauges (USGS)', icon: BarChart2 },
      { path: '/iot-sensors', label: 'IoT Sensors', icon: Cpu },
    ],
  },
  {
    title: 'ADMINISTRATION',
    adminOnly: true,
    items: [
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/thresholds', label: 'Thresholds', icon: Sliders },
      { path: '/admin/ingestion', label: 'Ingestion Status', icon: HeartPulse },
      { path: '/admin/audit', label: 'Audit Log', icon: ShieldAlert },
    ],
  },
  {
    title: 'USER',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
      { path: '/api-keys', label: 'API Keys', icon: Key },
      { path: '/help', label: 'Help & Documentation', icon: HelpCircle },
    ],
  },
];

export default function Layout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: alertsData } = useAlerts('ACTIVE');
  const activeAlerts = (alertsData as { items: unknown[] } | null)?.items?.length ?? 0;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F2F4F7' }}>
      {/* Sidebar — 240px fixed, white, 1px right border */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-y-auto"
        style={{
          width: '240px',
          background: '#FFFFFF',
          borderRight: '1px solid #D1D5DB',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-4 flex-shrink-0"
          style={{
            height: '56px',
            borderBottom: '1px solid #D1D5DB',
          }}
        >
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <Droplets size={20} style={{ color: '#003F8A' }} aria-hidden="true" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Water Quality Sentinel
            </span>
          </Link>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 py-3" aria-label="Main navigation">
          {navSections.map((section) => {
            if (section.adminOnly && !isAdmin) return null;
            return (
              <div key={section.title} className="mb-4">
                <p
                  className="px-4 mb-1 section-label"
                  style={{ color: '#9CA3AF' }}
                >
                  {section.title}
                </p>
                {section.items.map(({ path, label, icon: Icon }) => {
                  const active =
                    location.pathname === path ||
                    (path !== '/dashboard' && location.pathname.startsWith(path));
                  return (
                    <Link
                      key={path}
                      to={path}
                      className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                      style={{
                        color: active ? '#003F8A' : '#374151',
                        backgroundColor: active ? 'rgba(0,63,138,0.08)' : 'transparent',
                        fontWeight: active ? 600 : 400,
                        borderLeft: active ? '3px solid #003F8A' : '3px solid transparent',
                      }}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="flex-1 truncate">{label}</span>
                      {label === 'Active Alerts' && activeAlerts > 0 && (
                        <span
                          className="flex items-center justify-center text-xs font-bold rounded-full"
                          style={{
                            background: '#B91C1C',
                            color: '#FFFFFF',
                            minWidth: '18px',
                            height: '18px',
                            padding: '0 4px',
                            fontSize: '11px',
                          }}
                          aria-label={`${activeAlerts} active alerts`}
                        >
                          {activeAlerts}
                        </span>
                      )}
                      {active && <ChevronRight size={14} style={{ color: '#003F8A' }} aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User panel */}
        <div
          className="flex-shrink-0 p-3"
          style={{ borderTop: '1px solid #D1D5DB' }}
        >
          <div className="px-2 py-1.5 mb-1">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{user?.name}</p>
            <p style={{ fontSize: '11px', color: '#6B7280' }}>{user?.role}</p>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 px-2 py-2 w-full transition-colors"
            style={{
              fontSize: '13px',
              color: '#6B7280',
              borderRadius: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Top bar + main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar — 56px, white, 1px bottom border */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{
            height: '56px',
            background: '#FFFFFF',
            borderBottom: '1px solid #D1D5DB',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC
          </div>
          <div className="flex items-center gap-4">
            <span
              className="flex items-center gap-1.5"
              style={{ fontSize: '12px', color: '#6B7280' }}
            >
              <span
                className="status-dot"
                style={{ background: '#1A7A4A' }}
                aria-label="System online"
              />
              System Online
            </span>
            {user && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  background: '#F2F4F7',
                  border: '1px solid #D1D5DB',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {user.name}
              </span>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}

