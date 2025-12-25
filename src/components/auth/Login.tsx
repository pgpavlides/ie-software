import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Failed to sign in');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#ea2127] rounded-full blur-[180px] opacity-[0.08] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#ea2127] rounded-full blur-[180px] opacity-[0.05]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1a1a1f] rounded-full blur-[100px] opacity-50" />

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-[#ea2127]/20 to-transparent"
          style={{
            animation: 'scanLine 8s linear infinite',
          }}
        />
      </div>

      {/* Login Card */}
      <div
        className={`relative w-full max-w-md transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Card glow effect */}
        <div className="absolute -inset-px bg-gradient-to-b from-[#ea2127]/20 via-transparent to-transparent rounded-3xl blur-sm" />

        <div className="relative bg-[#0f0f12]/90 backdrop-blur-xl border border-[#1f1f28] rounded-3xl p-8 shadow-2xl">
          {/* Logo Section */}
          <div
            className={`text-center mb-8 transition-all duration-500 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="relative inline-block mb-6">
              {/* Logo glow */}
              <div className="absolute inset-0 bg-[#ea2127] rounded-2xl blur-2xl opacity-20" />
              <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] rounded-2xl border border-[#2a2a35] flex items-center justify-center shadow-xl">
                <img
                  src="/logo/logo.png"
                  alt="IE Software"
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Control Center
            </h1>
            <p className="text-[#6b6b7a] text-sm">
              Sign in to access the escape room dashboard
            </p>
          </div>

          {/* Status Indicator */}
          <div
            className={`flex items-center justify-center gap-2 mb-6 transition-all duration-500 delay-200 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
            </span>
            <span className="text-xs text-[#6b6b7a] font-medium">Secure Connection</span>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className={`space-y-5 transition-all duration-500 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 bg-[#ea2127]/10 border border-[#ea2127]/20 text-[#ff6b6b] px-4 py-3 rounded-xl animate-[fadeSlideIn_0.3s_ease-out]">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#8b8b9a]">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-[#4a4a58] group-focus-within:text-[#ea2127] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-[#141418] border border-[#2a2a35] rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#8b8b9a]">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-[#4a4a58] group-focus-within:text-[#ea2127] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#141418] border border-[#2a2a35] rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#4a4a58] hover:text-[#8b8b9a] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full group"
            >
              {/* Button glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ea2127] to-[#ff4f54] rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />

              <div className="relative w-full bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer */}
          <div
            className={`mt-8 pt-6 border-t border-[#1f1f28] text-center transition-all duration-500 delay-500 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-xs text-[#4a4a58]">
              Intelligent Entertainment Software Department
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-[#4a4a58]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>256-bit SSL</span>
              </div>
              <div className="w-px h-3 bg-[#2a2a35]" />
              <div className="flex items-center gap-1.5 text-xs text-[#4a4a58]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Protected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <div
          className={`text-center mt-6 transition-all duration-500 delay-700 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="inline-flex items-center gap-2 text-[#3a3a48] text-xs">
            <span>Press</span>
            <kbd className="px-2 py-1 bg-[#141418] rounded border border-[#2a2a35] font-mono">Enter</kbd>
            <span>to sign in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
