import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getHomeRouteForRole } from '../../../packages/shared/permissions';
import { BottomSheet } from '../../components/ui/CommonUI';
import { ThemeToggleButton } from '../../hooks/useTheme';
import { apiFetch } from '../../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Active Tenant (Ananya)', email: 'ananya.sharma@demo.pgfinder.in', password: 'Password@123' },
  { label: 'New Tenant (Rohit)', email: 'rohit.verma@demo.pgfinder.in', password: 'Password@123' },
  { label: 'PG Owner (Vikram · 4 PGs)', email: 'vikram.reddy@demo.pgfinder.in', password: 'Password@123' },
  { label: 'PG Owner (Kavya · 0 PGs)', email: 'kavya.nair@demo.pgfinder.in', password: 'Password@123' },
  { label: 'Super Admin', email: 'admin@pgfinder.in', password: 'Password@123' },
];

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryId, setRecoveryId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      showToast('Signed in', `Welcome back, ${user.fullName}`);
      const next = searchParams.get('next');
      navigate(next || getHomeRouteForRole(user.role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>('/api/v1/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ identifier: recoveryId }),
      });
      showToast('Recovery Sent', res.message, 'info');
      setForgotOpen(false);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const nextParam = searchParams.get('next');

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col justify-center px-4 py-10 transition-colors">
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to PG Finder
          </Link>
          <ThemeToggleButton />
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 sm:p-8 shadow-xs">
          <span className="font-display text-xl font-extrabold text-[#047857] dark:text-[#34D399]">PG Finder</span>
          <h1 className="mt-3 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Welcome Back</h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Sign in with your email or mobile number. Your workspace routes automatically based on your verified role.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-medium text-[#DC2626] dark:text-[#F87171]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1.5">Email or Phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@example.com or 9876543210"
                required
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:border-[#047857] dark:focus:border-[#34D399]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full min-h-[44px] pl-3.5 pr-11 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:border-[#047857] dark:focus:border-[#34D399]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#6B7280] dark:text-[#9CA3AF]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-[#4B5563] dark:text-[#9CA3AF] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="rounded border-[#E5E7EB] dark:border-[#374151] text-[#047857]"
                />
                Remember session
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] disabled:opacity-60 text-white dark:text-[#0B1220] text-sm font-semibold transition-colors"
            >
              {submitting ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            New to PG Finder?{' '}
            <Link
              to={nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : '/register'}
              className="font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
            >
              Create an account
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Development Demo Accounts (Password: Password@123)</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setIdentifier(acc.email);
                    setPassword(acc.password);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] hover:border-[#047857] dark:hover:border-[#34D399] text-xs font-medium text-[#111827] dark:text-[#F9FAFB]"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomSheet open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset Password">
        <form onSubmit={handlePasswordRecovery} className="space-y-4">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Enter your registered email address or 10-digit mobile number to receive a password reset link.
          </p>
          <input
            type="text"
            value={recoveryId}
            onChange={(e) => setRecoveryId(e.target.value)}
            placeholder="Email or mobile number"
            required
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
          />
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold"
          >
            Send Reset Instructions
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
