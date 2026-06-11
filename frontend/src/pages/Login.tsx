import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ErrorBanner, inputClass, labelClass, primaryBtn } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-600/30">
            E
          </div>
          <h1 className="text-2xl font-bold text-white">EduFlow CRM</h1>
          <p className="mt-1 text-sm text-slate-400">Student Recruitment Management</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <ErrorBanner message={error} />}
            <div>
              <label className={labelClass} htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className={inputClass}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-600">Demo accounts — click to fill</p>
            <button
              type="button"
              className="mt-1 block text-left hover:text-blue-600"
              onClick={() => { setEmail('admin@crm.com'); setPassword('admin123'); }}
            >
              Admin: <span className="font-mono">admin@crm.com</span> / <span className="font-mono">admin123</span>
            </button>
            <button
              type="button"
              className="block text-left hover:text-blue-600"
              onClick={() => { setEmail('counselor@crm.com'); setPassword('counselor123'); }}
            >
              Counselor: <span className="font-mono">counselor@crm.com</span> / <span className="font-mono">counselor123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
