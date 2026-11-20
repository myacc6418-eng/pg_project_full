import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { UserRole } from '../../../packages/shared/types';
import { getHomeRouteForRole } from '../../../packages/shared/permissions';
import { ThemeToggleButton } from '../../hooks/useTheme';
import { apiFetch } from '../../services/api';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const initialRole =
    searchParams.get('role') === UserRole.PG_OWNER ? UserRole.PG_OWNER : UserRole.TENANT;

  const navigate = useNavigate();
  const { register, verifyOtp } = useAuth();
  const { showToast } = useToast();

  const resolveDestination = (userRole: UserRole) => {
    if (nextParam && nextParam.startsWith('/')) {
      if (
        userRole === UserRole.TENANT &&
        (nextParam.startsWith('/tenant') ||
          nextParam.startsWith('/join') ||
          nextParam.startsWith('/pg') ||
          nextParam.startsWith('/explore'))
      ) {
        return nextParam;
      }
      if (userRole === UserRole.PG_OWNER && nextParam.startsWith('/owner')) {
        return nextParam;
      }
      if (userRole === UserRole.SUPER_ADMIN && nextParam.startsWith('/admin')) {
        return nextParam;
      }
    }
    return getHomeRouteForRole(userRole);
  };

  const [role, setRole] = useState<UserRole.TENANT | UserRole.PG_OWNER>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpCode, setOtpCode] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredRole, setRegisteredRole] = useState<UserRole>(UserRole.TENANT);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await register({
        role,
        fullName,
        email,
        phone,
        businessName: role === UserRole.PG_OWNER ? businessName : undefined,
        password,
        confirmPassword,
        acceptTerms: true,
      });
      setRegisteredRole(res.user.role);
      setOtpHint(res.devOtpHint || '482910');
      setStep('OTP');
      showToast('Account created', 'Complete 6-digit OTP verification to continue.');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const verifiedUser = await verifyOtp(otpCode);
      showToast(
        'Account Verified',
        verifiedUser.role === UserRole.PG_OWNER
          ? 'Owner dashboard unlocked immediately — add your first PG anytime.'
          : 'Welcome to PG Finder!'
      );
      navigate(resolveDestination(verifiedUser.role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await apiFetch('/api/v1/auth/otp/send', { method: 'POST' });
      showToast('OTP Re-sent', 'A fresh 6-digit verification code was issued.', 'info');
    } catch (err: any) {
      showToast('Rate Limit', err.message, 'error');
    }
  };

  return (
    <div className="h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B1220] overflow-y-auto overflow-x-hidden flex flex-col justify-start sm:justify-center px-4 py-8 transition-colors">
      <div className="max-w-lg w-full mx-auto">
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

          {step === 'FORM' ? (
            <>
              <h1 className="mt-3 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Create Your Account</h1>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                Choose how you want to use PG Finder. Super Admin accounts are provisioned internally only.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.TENANT)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    role === UserRole.TENANT
                      ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15'
                      : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/80'
                  }`}
                >
                  <Search className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
                  <p className="mt-2 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">I&apos;m Looking for a PG</p>
                  <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">Search verified PGs &amp; manage stay</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole(UserRole.PG_OWNER)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    role === UserRole.PG_OWNER
                      ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15'
                      : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/80'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
                  <p className="mt-2 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">I&apos;m a PG Owner</p>
                  <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">Instant dashboard access, no approval wait</p>
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-medium text-[#DC2626] dark:text-[#F87171]">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Deshmukh"
                    required
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                  />
                </div>

                {role === UserRole.PG_OWNER && (
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                      Business / Residence Name (optional)
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Emerald Living Homes"
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Mobile (10 digits)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      required
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB] tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#4B5563] dark:text-[#9CA3AF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[#E5E7EB] dark:border-[#374151]"
                  />
                  <span>
                    I agree to PG Finder&apos;s Terms of Service and Privacy Policy (including location verification and non-tracking privacy commitments).
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold transition-colors"
                >
                  {submitting ? 'Creating Account...' : 'Continue to OTP Verification'}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Already registered?{' '}
                <Link
                  to={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login'}
                  className="font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
                >
                  Login here
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                <ShieldCheck className="w-5 h-5" />
                <h1 className="font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">Verify Your Account</h1>
              </div>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                Enter the 6-digit verification code dispatched to <strong>{email}</strong>.
              </p>
              {otpHint && (
                <p className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-xs font-medium text-[#065F46] dark:text-[#34D399]">
                  Development Demo OTP Code: <span className="font-mono font-bold">{otpHint}</span>
                </p>
              )}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-medium text-[#DC2626] dark:text-[#F87171]">
                  {error}
                </div>
              )}
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] font-mono text-lg text-[#111827] dark:text-[#F9FAFB] tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold"
              >
                {submitting ? 'Verifying...' : 'Verify & Open Dashboard'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
                >
                  Resend OTP (20s cooldown)
                </button>
                <button
                  type="button"
                  onClick={() => navigate(resolveDestination(registeredRole))}
                  className="text-[#6B7280] dark:text-[#9CA3AF] hover:underline"
                >
                  Skip to Dashboard
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
