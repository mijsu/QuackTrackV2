'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { api } from '@/lib/api'
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'

export function ChangePasswordScreen() {
  const user = useAppStore((s) => s.user)
  const completePasswordChange = useAppStore((s) => s.completePasswordChange)
  const logout = useAppStore((s) => s.logout)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!currentPassword) {
      setError('Current password is required')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current password')
      return
    }

    setIsLoading(true)
    const res = await api.post<{ message: string }>('/auth/change-password', {
      userId: user?.id,
      currentPassword,
      newPassword,
    })
    setIsLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      // Small delay so the user sees the success message, then redirect
      setTimeout(() => {
        completePasswordChange()
      }, 1500)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />

      {/* Radial emerald glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#10B981]/5 blur-[150px] pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          {/* Icon & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#059669] to-[#10B981] mb-4 glow-emerald">
              <ShieldCheck className="size-8 text-white" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gradient-emerald">
              Change Your Password
            </h1>
            <p className="text-muted-foreground text-sm mt-2 font-body">
              You&apos;re using a temporary password. Please set a new password to activate your account.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm text-center flex items-center justify-center gap-2">
              <ShieldCheck className="size-4" />
              Password changed successfully! Redirecting...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center flex items-center justify-center gap-2">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-transparent border-0 border-b-2 border-border focus:border-[#10B981] outline-none text-foreground py-2 text-sm transition-colors duration-300 placeholder:text-muted-foreground/40 font-mono pr-10"
                  placeholder="Enter your temporary password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent border-0 border-b-2 border-border focus:border-[#10B981] outline-none text-foreground py-2 text-sm transition-colors duration-300 placeholder:text-muted-foreground/40 font-mono pr-10"
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border-0 border-b-2 border-border focus:border-[#10B981] outline-none text-foreground py-2 text-sm transition-colors duration-300 placeholder:text-muted-foreground/40 font-mono pr-10"
                  placeholder="Re-enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= level * 3
                          ? level <= 1 ? 'bg-red-500' : level <= 2 ? 'bg-yellow-500' : 'bg-emerald-500'
                          : 'bg-secondary'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {newPassword.length < 6
                    ? 'Too short'
                    : newPassword.length < 9
                      ? 'Fair'
                      : newPassword.length < 12
                        ? 'Good'
                        : 'Strong'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-heading font-bold text-sm tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)] hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  Change Password & Activate Account
                </>
              )}
            </button>
          </form>

          {/* Logout link */}
          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
