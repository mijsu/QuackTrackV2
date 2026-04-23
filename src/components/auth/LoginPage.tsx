'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Users, Calendar, AlertTriangle, Database, Lock, HelpCircle, Eye, EyeOff, Wrench, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { useTheme } from 'next-themes';

// ── Animated Duck SVG Mascot Component ──────────────────────────────────────
function DuckMascot({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animated && 'animate-duck-bob', className)}
      aria-label="QuackTrack duck mascot"
    >
      {/* Water ripples beneath duck */}
      {animated && (
        <g className="animate-duck-ripple" opacity="0.3">
          <ellipse cx="40" cy="68" rx="24" ry="3" className="fill-sky-300/40 dark:fill-sky-400/30" />
          <ellipse cx="40" cy="68" rx="16" ry="2" className="fill-sky-200/30 dark:fill-sky-300/20" />
        </g>
      )}
      {/* Body */}
      <ellipse cx="40" cy="48" rx="22" ry="18" className="fill-emerald-400 dark:fill-emerald-500" />
      {/* Belly highlight */}
      <ellipse cx="40" cy="52" rx="14" ry="10" className="fill-emerald-300/40 dark:fill-emerald-400/30" />
      {/* Head */}
      <circle cx="40" cy="26" r="16" className="fill-emerald-400 dark:fill-emerald-500" />
      {/* Head highlight */}
      <circle cx="38" cy="22" r="10" className="fill-emerald-300/30 dark:fill-emerald-400/20" />
      {/* Eye — white */}
      <circle cx="46" cy="22" r="5" className="fill-white" />
      {/* Eye — pupil with blink animation */}
      <g className={animated ? 'animate-duck-blink' : ''}>
        <ellipse cx="47.5" cy="21.5" rx="3" ry="3" className="fill-gray-900" />
      </g>
      {/* Eye — shine */}
      <circle cx="48.5" cy="20" rx="1.2" ry="1.2" className="fill-white" />
      {/* Cheek blush */}
      <circle cx="50" cy="28" r="3" className="fill-rose-300/30 dark:fill-rose-400/20" />
      {/* Beak */}
      <path d="M52 26 L65 23 L52 31 Z" className="fill-amber-400 dark:fill-amber-500" />
      {/* Beak line */}
      <path d="M52 27.5 L62 26" stroke="oklch(0.65 0.15 80)" strokeWidth="0.8" fill="none" />
      {/* Wing — with flap animation */}
      <g className={animated ? 'animate-duck-wing' : ''}>
        <ellipse cx="26" cy="44" rx="10" ry="14" className="fill-emerald-500 dark:fill-emerald-600" transform="rotate(-10 26 44)" />
        {/* Wing feather lines */}
        <path d="M20 38 Q24 42 20 48" stroke="oklch(0.55 0.14 145 / 0.3)" strokeWidth="0.8" fill="none" />
        <path d="M24 36 Q28 42 24 50" stroke="oklch(0.55 0.14 145 / 0.3)" strokeWidth="0.8" fill="none" />
      </g>
      {/* Tail */}
      <path d="M60 42 Q70 34 66 46 Q64 52 58 48 Z" className="fill-emerald-500 dark:fill-emerald-600" />
      {/* Feet */}
      <g className="fill-amber-500 dark:fill-amber-600">
        <path d="M32 62 L28 70 L34 68 L36 72 L38 66 Z" />
        <path d="M46 62 L44 66 L46 72 L48 68 L54 70 L50 62 Z" />
      </g>
    </svg>
  );
}

// ── Duck-themed Loading Spinner ─────────────────────────────────────────────
function DuckSpinner({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <DuckMascot className="h-5 w-5 animate-duck-spin" animated={false} />
    </span>
  );
}

// ── Main LoginPage Component ────────────────────────────────────────────────
export function LoginPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [cardLoaded, setCardLoaded] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [currentYear] = useState(() => new Date().getFullYear());

  // Wait for mount to avoid hydration mismatch with theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Loading shimmer effect — plays once on mount then fades out
  useEffect(() => {
    const timer = setTimeout(() => setCardLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid institutional email or password');
      } else {
        window.location.reload();
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Check database setup status on mount
  useEffect(() => {
    fetch('/api/setup')
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired) {
          setSetupMessage('Database needs initialization. Click the button below to set up.');
        }
      })
      .catch(() => {
        // Silent fail — setup check is optional
      });
  });

  const handleSetup = async () => {
    setSetupLoading(true);
    setSetupMessage('');
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSetupMessage(data.alreadySetup
          ? 'Database is already set up! You can log in now.'
          : 'Database initialized successfully! You can now log in as Admin.'
        );
      } else {
        setSetupMessage(`Setup failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      setSetupMessage('Failed to connect to server. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setError('');
    setAdminLoading(true);

    try {
      const result = await signIn('credentials', {
        email: 'admin@ptc.edu.ph',
        password: 'password123',
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid institutional email or password');
        setAdminLoading(false);
      } else {
        window.location.reload();
      }
    } catch {
      setError('An error occurred during login');
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-area-inset-top login-page-mesh">
      {/* Theme Toggle — Top Right Corner */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="fixed top-4 right-4 z-50 flex items-center justify-center h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background/90 hover:border-border shadow-sm transition-all duration-200 active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 transition-transform duration-300" />
          ) : (
            <Moon className="h-5 w-5 transition-transform duration-300" />
          )}
        </button>
      )}

      <div className="flex-1 flex">
        {/* ── Left Side — Branding ─────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden animate-fade-in">
          {/* Background Image */}
          <Image 
            src="/ptc-bg.png" 
            alt="PTC Background" 
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlay — emerald to teal */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/85 via-teal-900/80 to-emerald-800/85" />
          {/* Secondary gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-teal-900/20" />
          
          {/* Decorative blurred circles */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-[100px]" />
          
          {/* Floating particles with sparkle effect */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-emerald-400/30 float-particle login-sparkle" />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-teal-300/25 float-particle float-particle-delay-1 login-sparkle" />
          <div className="absolute bottom-1/3 left-1/3 w-2.5 h-2.5 rounded-full bg-emerald-300/20 float-particle float-particle-delay-2 login-sparkle" />
          <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-teal-400/20 float-particle float-particle-delay-1 login-sparkle" />
          <div className="absolute bottom-[20%] left-[20%] w-2 h-2 rounded-full bg-emerald-400/15 float-particle float-particle-delay-2 login-sparkle" />
          
          <div className="relative z-10 flex flex-col justify-center p-12 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo area with duck mascot */}
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-2xl bg-emerald-400/20 blur-lg animate-float" />
                  <Image 
                    src="/ptc-app-logo.jpg" 
                    alt="PTC Logo" 
                    width={64} 
                    height={64}
                    className="relative rounded-xl bg-white/20 backdrop-blur-sm p-1.5 ring-2 ring-white/20"
                    unoptimized
                  />
                </div>
                <DuckMascot className="h-16 w-16 shrink-0 drop-shadow-lg" />
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">QuackTrack</h1>
                  <p className="text-white/80 text-sm font-medium">Pateros Technological College</p>
                </div>
              </div>

              <h2 className="text-5xl font-extrabold mb-4 leading-tight">
                Academic<br />Scheduling System
              </h2>
              {/* Subtitle with typing cursor animation */}
              <p className="text-lg text-white/80 mb-10 max-w-md">
                <span className="typing-cursor" style={{ color: 'oklch(0.85 0.14 140)' }}>Manage faculty schedules, track teaching loads, and organize academic resources.</span>
              </p>

              {/* Feature list with glass-morphism cards */}
              <div className="space-y-3 stagger-children">
                <div className="flex items-center gap-4 rounded-xl bg-white/8 backdrop-blur-lg border border-white/12 p-4 transition-all duration-300 hover:bg-white/12 hover:border-white/20 hover-lift login-feature-card">
                  <div className="feature-icon-circle shrink-0">
                    <Calendar className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <h3 className="font-semibold hover-underline">Schedule Management</h3>
                    <p className="text-sm text-white/60">Organize classes, rooms, and time slots</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl bg-white/8 backdrop-blur-lg border border-white/12 p-4 transition-all duration-300 hover:bg-white/12 hover:border-white/20 hover-lift login-feature-card">
                  <div className="feature-icon-circle shrink-0">
                    <Users className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <h3 className="font-semibold hover-underline">Faculty & Student Records</h3>
                    <p className="text-sm text-white/60">Track teaching loads and assignments</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl bg-white/8 backdrop-blur-lg border border-white/12 p-4 transition-all duration-300 hover:bg-white/12 hover:border-white/20 hover-lift login-feature-card">
                  <div className="feature-icon-circle shrink-0">
                    <Shield className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <h3 className="font-semibold hover-underline">Admin & Faculty Access</h3>
                    <p className="text-sm text-white/60">Role-based dashboard and permissions</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl bg-white/8 backdrop-blur-lg border border-white/12 p-4 transition-all duration-300 hover:bg-white/12 hover:border-white/20 hover-lift login-feature-card">
                  <div className="feature-icon-circle shrink-0">
                    <Database className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <h3 className="font-semibold hover-underline">Courses & Departments</h3>
                    <p className="text-sm text-white/60">Manage subjects, sections, and rooms</p>
                  </div>
                </div>
              </div>

              {/* Decorative duck branding */}
              <div className="mt-8 flex items-center gap-2 text-white/40 text-sm">
                <DuckMascot className="h-5 w-5" animated={false} />
                <span>QuackTrack v2.0</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Right Side — Login Form ──────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-8 bg-background relative overflow-hidden animate-fade-in safe-area-inset-top dot-pattern">
          {/* Background Image — Light mode only */}
          <Image 
            src="/ptc-bg-right.png" 
            alt="PTC Background" 
            fill
            className="object-cover dark:opacity-0 transition-opacity duration-300"
            priority
          />
          {/* Subtle emerald tint overlay for light mode */}
          <div className="absolute inset-0 bg-emerald-50/40 dark:bg-transparent transition-colors duration-300" />
          {/* Gradient mesh accents on right side */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-teal-500/[0.03] dark:from-emerald-500/[0.05] dark:via-transparent dark:to-teal-500/[0.05]" />

          {/* Floating particles behind the login card */}
          <div className="absolute top-[15%] right-[20%] w-3 h-3 rounded-full bg-emerald-400/20 login-particle-1 z-0" />
          <div className="absolute bottom-[25%] left-[15%] w-2 h-2 rounded-full bg-teal-400/15 login-particle-2 z-0" />
          <div className="absolute top-[40%] left-[25%] w-2.5 h-2.5 rounded-full bg-emerald-300/10 login-particle-3 z-0" />
          <div className="absolute bottom-[40%] right-[25%] w-1.5 h-1.5 rounded-full bg-teal-300/12 login-particle-4 z-0" />

          {/* Animated geometric shapes for visual appeal */}
          <div className="absolute top-[8%] left-[10%] login-geo-shape-1 z-0">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-[0.06] dark:opacity-[0.08]">
              <rect x="8" y="8" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600" />
            </svg>
          </div>
          <div className="absolute bottom-[12%] right-[8%] login-geo-shape-2 z-0">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-[0.05] dark:opacity-[0.07]">
              <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" className="text-teal-500" />
            </svg>
          </div>
          <div className="absolute top-[60%] right-[12%] login-geo-shape-3 z-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="opacity-[0.04] dark:opacity-[0.06]">
              <polygon points="18,4 34,28 2,28" stroke="currentColor" strokeWidth="1.5" className="text-emerald-500" />
            </svg>
          </div>
          <div className="absolute top-[20%] right-[45%] login-geo-shape-4 z-0">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-[0.05] dark:opacity-[0.07]">
              <path d="M16 2L30 16L16 30L2 16Z" stroke="currentColor" strokeWidth="1.5" className="text-teal-400" />
            </svg>
          </div>
          <div className="absolute bottom-[30%] left-[8%] login-geo-shape-5 z-0">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-[0.04] dark:opacity-[0.06]">
              <path d="M14 2L26 8L26 20L14 26L2 20L2 8Z" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
            </svg>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md sm:max-w-md relative z-10 animate-slide-in-up mx-auto sm:mx-0"
          >
            {/* Mobile Logo — polished version with duck */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="relative">
                {/* Subtle glow behind mobile logo */}
                <div className="absolute -inset-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 blur-xl" />
                <div className="relative flex items-center gap-3 bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-2xl px-5 py-3 ring-1 ring-black/5 dark:ring-white/10 shadow-sm">
                  <Image 
                    src="/ptc-app-logo.jpg" 
                    alt="PTC Logo" 
                    width={44} 
                    height={44}
                    className="rounded-xl"
                    unoptimized
                  />
                  <DuckMascot className="h-8 w-8 shrink-0" />
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">QuackTrack</h1>
                    <p className="text-muted-foreground text-xs leading-tight">Pateros Technological College</p>
                  </div>
                </div>
              </div>
              {/* Decorative accent line */}
              <div className="mt-3 w-16 h-0.5 rounded-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
            </div>

            {/* Animated gradient border wrapper */}
            <div className="relative rounded-xl p-[2px] animate-gradient-border">
              {/* Glass-morphism login card */}
              <Card className="border-0 card-shine login-card-glass ring-1 ring-black/5 dark:ring-white/10 m-0 relative overflow-hidden">
                {/* Loading shimmer overlay — plays once on page load */}
                {!cardLoaded && (
                  <div className="absolute inset-0 z-20 pointer-events-none login-card-shimmer" />
                )}
                <CardHeader className="space-y-1 pb-4">
                  {/* Duck mascot above title */}
                  <div className="flex justify-center mb-2">
                    <DuckMascot className="h-12 w-12 drop-shadow-md" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
                  <CardDescription className="text-center">
                    Sign in with your institutional email to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email input with enhanced micro-interactions */}
                    <div className={cn(
                      "space-y-2 rounded-xl p-1 login-input-wrapper transition-all duration-300",
                      emailFocused
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 ring-2 ring-emerald-500/20 dark:ring-emerald-400/15"
                        : "bg-transparent ring-0"
                    )}>
                      <Label htmlFor="email" className={cn(
                        "transition-all duration-300",
                        emailFocused && "text-emerald-600 dark:text-emerald-400"
                      )}>
                        Institutional Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="lastname.firstname@ptc.edu.ph"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        required
                        className={cn(
                          "h-12 sm:h-11 text-base transition-all duration-300 rounded-lg",
                          emailFocused
                            ? "border-emerald-500/50 dark:border-emerald-400/40 shadow-[0_0_0_3px_rgba(16,185,129,0.08)] dark:shadow-[0_0_0_3px_rgba(16,185,129,0.06)]"
                            : ""
                        )}
                      />
                    </div>

                    {/* Password input with enhanced micro-interactions */}
                    <div className={cn(
                      "space-y-2 rounded-xl p-1 login-input-wrapper transition-all duration-300",
                      passwordFocused
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 ring-2 ring-emerald-500/20 dark:ring-emerald-400/15"
                        : "bg-transparent ring-0"
                    )}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className={cn(
                          "transition-all duration-300",
                          passwordFocused && "text-emerald-600 dark:text-emerald-400"
                        )}>
                          Password
                        </Label>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors hover-underline"
                          tabIndex={-1}
                        >
                          <HelpCircle className="h-3 w-3" />
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          required
                          className={cn(
                            "h-12 sm:h-11 text-base pr-10 transition-all duration-300 rounded-lg",
                            passwordFocused
                              ? "border-emerald-500/50 dark:border-emerald-400/40 shadow-[0_0_0_3px_rgba(16,185,129,0.08)] dark:shadow-[0_0_0_3px_rgba(16,185,129,0.06)]"
                              : ""
                          )}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Remember me checkbox */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={rememberMe}
                        onClick={() => setRememberMe(!rememberMe)}
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-[4px] border border-primary ring-offset-background transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "hover:border-primary/80",
                          rememberMe 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-background"
                        )}
                      >
                        {rememberMe && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 mx-auto">
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <label 
                        className="text-sm text-muted-foreground cursor-pointer select-none leading-none"
                        onClick={() => setRememberMe(!rememberMe)}
                      >
                        Remember me
                      </label>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="animate-scale-in">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Sign-in button — gradient with duck spinner */}
                    <Button 
                      type="submit" 
                      className={cn(
                        "w-full h-12 sm:h-11 btn-shiny card-press text-base font-semibold rounded-lg",
                        "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
                        "dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600",
                        "text-white shadow-lg shadow-emerald-500/25 transition-all duration-300",
                        !loading && "animate-pulse-ring-emerald"
                      )} 
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <DuckSpinner />
                          <span>Signing in...</span>
                        </span>
                      ) : (
                        'Sign in'
                      )}
                    </Button>

                    {/* "or" divider with animated dashes */}
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full login-animated-dashes" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    {/* Sign in with Google button (non-functional, UI only) */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 sm:h-11 gap-3 text-base font-normal border-border/80 hover:bg-muted/50 transition-colors"
                      disabled
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Sign in with Google
                      <span className="ml-1 text-[10px] text-muted-foreground/60 normal-case">(coming soon)</span>
                    </Button>

                    {/* Admin Login with pulse animation */}
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground text-center mb-3">Quick Admin Access:</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center min-h-[44px] text-sm border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 dark:hover:bg-primary/10 gap-2 btn-shiny animate-admin-pulse"
                        onClick={handleAdminLogin}
                        disabled={adminLoading}
                      >
                        {adminLoading ? (
                          <DuckSpinner />
                        ) : (
                          <Lock className="h-4 w-4 text-primary/60" />
                        )}
                        <span className="font-medium">Sign in as Admin</span>
                      </Button>
                    </div>

                    {/* Database Setup (shown when setup is needed) */}
                    {setupMessage && (
                      <div className="mt-4">
                        <Alert variant={setupMessage.includes('success') || setupMessage.includes('already') ? 'default' : 'destructive'}>
                          <Wrench className="h-4 w-4" />
                          <AlertDescription className="text-sm">{setupMessage}</AlertDescription>
                        </Alert>
                        {setupMessage.includes('needs initialization') && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full mt-2 min-h-[44px] gap-2"
                            onClick={handleSetup}
                            disabled={setupLoading}
                          >
                            {setupLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Database className="h-4 w-4" />
                            )}
                            Initialize Database
                          </Button>
                        )}
                      </div>
                    )}
                  </form>

                  {/* Registration notice */}
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                      Need an account? Contact your department administrator.
                    </p>
                  </div>

                  {/* Copyright footer with dynamic year */}
                  <div className="mt-4 text-center space-y-1.5">
                    <p className="text-[10px] text-muted-foreground/60 tracking-wide animate-subtle-pulse">
                      v2.0.0 — PTC IT Department
                    </p>
                    <p className="text-[10px] text-muted-foreground/40">
                      &copy; {currentYear} Pateros Technological College &middot; Powered by QuackTrack
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
