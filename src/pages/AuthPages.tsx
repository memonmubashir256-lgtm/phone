import React, {useState} from 'react';
import {Lock, Mail, Phone, User} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {TechNovaLogo} from '../components/BrandLogo';

interface AuthPagesProps {
  mode: 'login' | 'signup' | 'forgot' | 'reset';
}

export const AuthPages: React.FC<AuthPagesProps> = ({mode}) => {
  const {navigate, apiFetch, setSession, showToast, searchParams} = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState(searchParams.get('token') || '');
  const [demoTokenHint, setDemoTokenHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({email, password}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        return;
      }
      setSession(data.user, data.token);
      showToast(`Welcome back, ${data.user.fullName}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({fullName, email, phone, password}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to create account.');
        return;
      }
      setSession(data.user, data.token);
      showToast('Account created! Welcome to TechNova.');
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({email}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not process request.');
        return;
      }
      if (data.demoResetToken) {
        setDemoTokenHint(data.demoResetToken);
        setResetToken(data.demoResetToken);
      }
      showToast(data.message || 'Reset link generated.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({email, token: resetToken, newPassword: password}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reset password.');
        return;
      }
      showToast('Password updated! Please sign in.');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16 pb-24">
      <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <TechNovaLogo className="h-9 w-9" />
          <div>
            <h1 className="font-display text-xl font-bold text-[#101828]">
              {mode === 'login'
                ? 'Sign in to TechNova'
                : mode === 'signup'
                  ? 'Create your account'
                  : mode === 'forgot'
                    ? 'Forgot password'
                    : 'Set a new password'}
            </h1>
            <p className="text-xs text-[#667085]">
              {mode === 'login'
                ? 'Access orders, saved addresses, and wishlist.'
                : mode === 'signup'
                  ? 'Join TechNova for fast checkout & order alerts.'
                  : 'Recover access to your TechNova customer account.'}
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#475467] mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@technova.pk"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#475467]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs font-semibold text-[#0860E8] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0860E8] py-3 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 transition cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="rounded-xl bg-[#F4F8FF] p-3 text-xs text-[#475467]">
              Demo customer: <strong>sarah@technova.pk</strong> / <strong>TechNova@2026</strong>
              <button
                type="button"
                onClick={() => {
                  setEmail('sarah@technova.pk');
                  setPassword('TechNova@2026');
                }}
                className="ml-2 font-semibold text-[#0860E8] underline cursor-pointer"
              >
                Fill
              </button>
            </div>

            <p className="text-center text-xs text-[#667085]">
              New to TechNova?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-semibold text-[#0860E8] hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </p>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-[#475467] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ali Hassan"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-[#475467] mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ali@example.com"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-phone" className="block text-xs font-semibold text-[#475467] mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-[#475467] mb-1">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0860E8] py-3 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 transition cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-center text-xs text-[#667085]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-semibold text-[#0860E8] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-semibold text-[#475467] mb-1">
                Account Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0860E8] py-3 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 transition cursor-pointer"
            >
              {loading ? 'Generating...' : 'Send Reset Link'}
            </button>

            {demoTokenHint && (
              <div className="rounded-xl bg-[#F4F8FF] p-3 text-xs text-[#475467] space-y-2">
                <p>
                  Demo reset token: <code className="font-mono font-bold text-[#0860E8]">{demoTokenHint}</code>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(demoTokenHint)}`
                    )
                  }
                  className="font-semibold text-[#0860E8] underline cursor-pointer"
                >
                  Continue to Reset Password
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="block w-full text-center text-xs font-semibold text-[#667085] hover:text-[#101828] cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[#475467] mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reset-token" className="block text-xs font-semibold text-[#475467] mb-1">
                Reset Token
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 font-mono text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reset-pass" className="block text-xs font-semibold text-[#475467] mb-1">
                New Password
              </label>
              <input
                id="reset-pass"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0860E8] py-3 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 transition cursor-pointer"
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
