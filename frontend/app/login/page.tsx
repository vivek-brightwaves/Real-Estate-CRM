"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState("CapsLock"));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setIsSuccess(false);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      setIsSuccess(true);
      setAuth(res.data.access_token, res.data.refresh_token, res.data.user);
      
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full relative font-sans selection:bg-blue-600 selection:text-white animate-in fade-in duration-500 p-6 flex flex-col justify-center overflow-hidden">
      
      {/* Background Image Layer (Cover, Center, No-repeat, Fixed, blurred 24px and scaled to prevent border bleed) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed blur-[24px] scale-110 pointer-events-none" 
        style={{ backgroundImage: "url('/real_estate_skyline_bg.png')" }}
      />

      {/* Subtle white overlay (rgba(255,255,255,0.12)) */}
      <div className="absolute inset-0 bg-white/12 pointer-events-none" />

      {/* Cool blue overlay (rgba(59,130,246,0.08)) */}
      <div className="absolute inset-0 bg-blue-500/[0.08] pointer-events-none" />

      {/* Soft radial light from the top center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />

      {/* Outer Card Grid Container (Touch each other, rounded-3xl, overflow-hidden, border) */}
      <div className="w-full max-w-[1440px] mx-auto h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[55%_45%] gap-0 rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 relative bg-transparent">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Enterprise Features & Visuals (55%)             */}
        {/* ============================================================ */}
        <div className="hidden md:flex flex-col justify-between p-[24px] bg-gradient-to-br from-[#0B122B]/90 via-[#121B3D]/95 to-[#1B214A]/90 backdrop-blur-md relative overflow-hidden shrink-0 h-full">
          
          {/* Subtle square grid pattern overlay (6%) */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.06] pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

          {/* Top Logo and Badge */}
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">RealEstate <span className="text-[#3B82F6] font-extrabold">CRM</span></span>
            </div>

            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-blue-500/35 bg-blue-500/10 text-blue-400 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Enterprise Property Management
            </div>
          </div>

          {/* Hero Heading and Description */}
          <div className="relative z-10 max-w-[500px]">
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight max-w-[460px] mb-3">
              Manage your entire real estate portfolio in one platform.
            </h1>
            <p className="text-slate-305 text-slate-300 text-base leading-relaxed mt-4 max-w-[500px]">
              Track leads, track site visits, automate bookings, and gain real-time sales insights with our next-generation CRM platform.
            </p>

            {/* Feature Grid: 2 Columns, Gap 16px (Height 96px, bg-white/5, hover bg-white/8 and -translate-y-1) */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              
              {/* Card 1 */}
              <div className="h-[96px] p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:bg-white/8 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-[32px] h-[32px] rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-[13px] font-bold text-white">Lead Pipelines</h4>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal">Pipeline management & agency triggers.</p>
              </div>

              {/* Card 2 */}
              <div className="h-[96px] p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:bg-white/8 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-[32px] h-[32px] rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="text-[13px] font-bold text-white">Customer Portal</h4>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal">Direct portal & contract review logs.</p>
              </div>

              {/* Card 3 */}
              <div className="h-[96px] p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:bg-white/8 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-[32px] h-[32px] rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h4 className="text-[13px] font-bold text-white">Smart Inventory</h4>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal">Unit configuration listing & availability.</p>
              </div>

              {/* Card 4 */}
              <div className="h-[96px] p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:bg-white/8 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-[32px] h-[32px] rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-[13px] font-bold text-white">Live Analytics</h4>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal">Unified reports & target dashboards.</p>
              </div>

            </div>

          </div>

          {/* Bottom Trust/Status (mt-auto ensures it remains anchored inside viewport) */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 mt-auto">
            <span className="flex items-center gap-1.5 font-medium">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Trusted by 10,000+ Professionals
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operational
            </span>
          </div>

        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: Glassmorphism Login Card Centered Container     */}
        {/* ============================================================ */}
        <div className="w-full flex items-center justify-center p-6 sm:p-8 h-full relative bg-transparent">
          
          {/* Centered Glassmorphic Login Card (Width 400px [max-w-md], p-10, frosted glass parameters) */}
          <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.18)] p-10 z-10 rounded-3xl transition-all duration-300 max-h-[500px] flex flex-col justify-between overflow-hidden">
            
            <div>
              {/* Logo Header inside login card (Visible on mobile/tablet only) */}
              <div className="flex md:hidden items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center text-white shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-slate-900">RealEstate <span className="text-blue-600">CRM</span></span>
              </div>

              {/* Title & Subtitle */}
              <div className="text-left mb-4">
                <h2 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
                  Welcome Back
                </h2>
                <p className="text-sm text-slate-700">
                  Sign in to continue to your CRM Dashboard.
                </p>
              </div>

              {/* Alerts Banners */}
              {error && (
                <div className="mb-3.5 p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-200">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {isSuccess && (
                <div className="mb-3.5 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Authentication successful! Redirecting...</span>
                </div>
              )}

              {/* Login Form: Spacing between inputs 16px (space-y-4) */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-800 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      required
                      className="w-full h-[46px] pl-10 pr-4 py-2 bg-white/35 backdrop-blur-md border border-white/30 rounded-xl text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@gmail.com"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold tracking-wide text-slate-800">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full h-[46px] pl-10 pr-11 py-2 bg-white/35 backdrop-blur-md border border-white/30 rounded-xl text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={handleKeyUp}
                      onKeyDown={handleKeyUp}
                      placeholder="••••••••"
                    />
                    
                    {/* Toggle View Password Icon */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-655 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.962 8.962 0 013.682-.763c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.692-4.692a3 3 0 00-4.243-4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Caps Lock warning banner */}
                  {isCapsLockOn && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Caps Lock is ON</span>
                    </div>
                  )}
                </div>

                {/* Options row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-655 text-slate-805 text-slate-800 hover:text-slate-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer transition-all"
                    />
                    <span className="font-semibold text-slate-700">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="font-bold text-blue-650 text-blue-600 hover:underline transition-all"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit button (Height 48px, rounded-xl, gradient, hover shadow-2xl and lift translate-y-[-2px]) */}
                <button
                  type="submit"
                  disabled={loading || isSuccess}
                  className="btn-login-premium w-full mt-5 gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing In...</span>
                    </>
                  ) : isSuccess ? (
                    <span>Success!</span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Secure Information (Margin top 20px) */}
            <div className="mt-5">
              
              {/* Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-white/20 border-t"></div>
                </div>
                <span className="relative px-3.5 bg-transparent text-[9px] text-slate-800 font-bold uppercase tracking-widest">Secure Portal</span>
              </div>

              {/* Encryption Subtitle */}
              <div className="text-center">
                <p className="text-xs text-slate-800 font-medium tracking-wide">
                  Protected by Enterprise Grade Security & SSL Encryption
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
