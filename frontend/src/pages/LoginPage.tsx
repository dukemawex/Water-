import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, Loader2 } from 'lucide-react';
import { login } from '../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F4F7' }}>
      {/* Left panel — scientific context */}
      <div
        className="hidden lg:flex flex-col justify-between p-12"
        style={{
          flex: '1 1 55%',
          background: '#003F8A',
          color: '#FFFFFF',
        }}
      >
        <div className="flex items-center gap-2">
          <Droplets size={24} style={{ color: '#00A8E0' }} aria-hidden="true" />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Water Quality Sentinel</span>
        </div>

        <div>
          <p
            style={{
              fontSize: '32px',
              fontWeight: 600,
              lineHeight: '40px',
              marginBottom: '16px',
              color: '#FFFFFF',
            }}
          >
            Global Water Quality Intelligence
          </p>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: '24px', maxWidth: '480px' }}>
            Real-time monitoring using Copernicus Marine Service, NASA MODIS/VIIRS,
            and USGS National Water Information System data — covering thousands of
            locations worldwide.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: 'Data Sources', value: 'USGS NWIS · CMEMS · NASA Earthdata · EEA' },
              { label: 'Update Frequency', value: 'Every 15 minutes (USGS) · 6 hours (Satellite)' },
              { label: 'Standards', value: 'WHO 2022 · EU WFD · US EPA NPDWR' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                  {label}
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Water Quality Sentinel · Powered by open satellite and environmental data
        </p>
      </div>

      {/* Right panel — login form */}
      <div
        className="flex flex-col items-center justify-center p-8"
        style={{ flex: '1 1 45%', background: '#FFFFFF' }}
      >
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Droplets size={20} style={{ color: '#003F8A' }} aria-hidden="true" />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Water Quality Sentinel</span>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
            Sign In
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '32px' }}>
            Access the monitoring dashboard
          </p>

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="mb-4">
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@organisation.gov"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}
                >
                  Password
                </label>
                <a href="#" style={{ fontSize: '12px', color: '#0066CC', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
            </div>

            {error && (
              <div
                className="mb-4 p-3"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#B91C1C',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
              style={{ width: '100%', padding: '10px 16px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: '#0066CC', fontWeight: 600, textDecoration: 'none' }}>
              Request access
            </Link>
          </p>

          <div
            className="mt-6 pt-4"
            style={{ borderTop: '1px solid #E5E7EB' }}
          >
            <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>
              Demo credentials: admin@watersentinel.io / Admin@123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
