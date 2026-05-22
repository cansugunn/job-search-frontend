import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

interface LoginLocationState {
  from?: string;
}

function getRedirectPath(state: unknown): string {
  const from = (state as LoginLocationState | null)?.from;
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return '/';
}

export default function LoginPage() {
  const { login, loggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getRedirectPath(location.state);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loggedIn) navigate(redirectTo, { replace: true });
  }, [loggedIn, navigate, redirectTo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  if (loggedIn) return null;

  return (
    <div style={{ maxWidth: 400, margin: '60px auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20, textAlign: 'center', color: '#1a73e8' }}>Sign In</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: '0.8rem', color: '#888', textAlign: 'center', lineHeight: 1.6 }}>
          Your account is managed by Supabase Authentication.
        </p>
      </div>
    </div>
  );
}
