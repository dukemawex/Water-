import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, Loader2, Check } from 'lucide-react';
import { apiFetch } from '../services/api';

const INTENDED_USE_OPTIONS = [
  'Research',
  'Government / Regulatory',
  'Environmental NGO',
  'Industry',
  'Education',
  'Personal',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organisation: '',
    country: '',
    intendedUse: '',
    acceptedTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = (() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel =
    passwordStrength <= 1
      ? { text: 'Weak', color: '#B91C1C' }
      : passwordStrength <= 3
        ? { text: 'Fair', color: '#B45309' }
        : { text: 'Strong', color: '#1A7A4A' };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!form.acceptedTerms) {
      setError('You must accept the Terms of Service to continue');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          organisation: form.organisation || undefined,
          country: form.country,
          intendedUse: form.intendedUse,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#F2F4F7' }}>
        <div className="card text-center" style={{ maxWidth: '420px', padding: '48px 40px' }}>
          <div
            className="flex items-center justify-center mx-auto mb-6"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
            }}
          >
            <Check size={28} style={{ color: '#1A7A4A' }} aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Check your email
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '20px', marginBottom: '24px' }}>
            We&apos;ve sent a verification link to <strong>{form.email}</strong>.
            Please verify your email address within 24 hours to access the platform.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
            style={{ width: '100%', padding: '10px 16px' }}
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F4F7' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12"
        style={{ flex: '1 1 45%', background: '#003F8A', color: '#FFFFFF' }}
      >
        <div className="flex items-center gap-2">
          <Droplets size={24} style={{ color: '#00A8E0' }} aria-hidden="true" />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Water Quality Sentinel</span>
        </div>

        <div>
          <p style={{ fontSize: '30px', fontWeight: 600, lineHeight: '38px', marginBottom: '16px' }}>
            Global Water Quality Intelligence
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', lineHeight: '24px', maxWidth: '400px', marginBottom: '32px' }}>
            Real-time satellite monitoring of water quality worldwide — powered by
            Copernicus Marine Service, NASA Earthdata, and USGS NWIS.
          </p>

          <div className="space-y-3">
            {[
              'Access real-time water quality readings globally',
              'Satellite data from Copernicus, NASA, and USGS',
              'Automated alerts for regulatory threshold breaches',
              'Compliance reports against WHO/EU/EPA standards',
            ].map((point) => (
              <div key={point} className="flex items-start gap-2">
                <Check size={16} style={{ color: '#00A8E0', marginTop: '2px', flexShrink: 0 }} aria-hidden="true" />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Water Quality Sentinel · Open data. Scientific standards.
        </p>
      </div>

      {/* Right panel — registration form */}
      <div
        className="flex flex-col items-center justify-center p-8 overflow-y-auto"
        style={{ flex: '1 1 55%', background: '#FFFFFF' }}
      >
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Droplets size={20} style={{ color: '#003F8A' }} aria-hidden="true" />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Water Quality Sentinel</span>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
            Create Account
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '28px' }}>
            Request access to the monitoring platform
          </p>

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoComplete="name"
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div>
                <label htmlFor="country" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  className="input-field"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  required
                  placeholder="United Kingdom"
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="you@organisation.gov"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="organisation" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Organisation{' '}
                <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
              </label>
              <input
                id="organisation"
                type="text"
                className="input-field"
                value={form.organisation}
                onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                placeholder="Environment Agency"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="intendedUse" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Intended Use
              </label>
              <select
                id="intendedUse"
                className="input-field"
                value={form.intendedUse}
                onChange={(e) => setForm({ ...form, intendedUse: e.target.value })}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="">Select intended use...</option>
                {INTENDED_USE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label htmlFor="password" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            {form.password && (
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: '#E5E7EB' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(passwordStrength / 5) * 100}%`,
                      background: strengthLabel.color,
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: strengthLabel.color, whiteSpace: 'nowrap' }}>
                  {strengthLabel.text}
                </span>
              </div>
            )}

            <div className="mb-6 flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={(e) => setForm({ ...form, acceptedTerms: e.target.checked })}
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <label htmlFor="terms" style={{ fontSize: '13px', color: '#4B5563', lineHeight: '20px' }}>
                I agree to the{' '}
                <a href="/terms" style={{ color: '#0066CC' }} target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{' '}
                and understand that use of this platform for non-research purposes
                requires regulatory compliance with applicable water quality laws.
              </label>
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
              className="btn-primary flex items-center justify-center gap-2"
              disabled={loading}
              style={{ width: '100%', padding: '10px 16px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p style={{ marginTop: '20px', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#0066CC', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
