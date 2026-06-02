'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/app-store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader2, ShieldCheck, FileText, Lock, Server, Eye, Ban } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function LoginScreen() {
  const login = useAppStore((s) => s.login)
  const [email, setEmail] = useState('admin@quacktrack.com')
  const [password, setPassword] = useState('password123')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const res = await api.post<{ user: { id: string; name: string; email: string; role: string; departmentId?: string }; mustChangePassword?: boolean }>('/auth', { email, password })
    if (res.error) {
      setError(res.error)
    } else if (res.data?.user) {
      login(res.data.user, res.data.mustChangePassword ?? false)
    }
    setIsLoading(false)
  }

  return (
    <>
      {/* Terms of Service Consent Modal */}
      <Dialog open={!termsAccepted} onOpenChange={(open) => { if (!open) return }}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20">
                <ShieldCheck className="size-5 text-[#10B981]" />
              </div>
              <DialogTitle className="text-xl">Terms & Privacy Notice</DialogTitle>
            </div>
            <DialogDescription className="text-left sr-only">
              Please read and accept our Terms of Service and Privacy Policy to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-muted-foreground max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-foreground font-medium">
              Before using QuackTrack, please review and accept the following:
            </p>

            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <FileText className="size-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Data Collection & Usage</p>
                  <p>We collect and process your name, email, and institutional data (departments, programs, subjects, schedules) solely for the purpose of academic scheduling and faculty workload management within Pateros Technological College.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Lock className="size-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Data Security</p>
                  <p>Your data is stored securely and protected using industry-standard encryption. Passwords are hashed and never stored in plain text. Access is restricted to authorized personnel only.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Server className="size-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">System Usage</p>
                  <p>This system generates academic schedules using algorithm-based conflict detection and workload balancing. Generated schedules are recommendations and should be reviewed by authorized personnel before implementation.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Eye className="size-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Data Retention & Access</p>
                  <p>Your data is retained for the duration of your institution's operational needs. You may request access to, correction of, or deletion of your personal data by contacting the system administrator.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Ban className="size-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Prohibited Use</p>
                  <p>Unauthorized access, distribution, or misuse of system data is strictly prohibited. Any violations may result in immediate account suspension and possible legal action.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                By clicking <strong className="text-foreground">"I Agree & Continue"</strong>, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => setTermsAccepted(true)}
              className="w-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold hover:shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] transition-all"
            >
              I Agree & Continue
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You must accept the terms to use QuackTrack.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
      {/* Background image */}
      <Image
        src="/ptc-bg-right.png"
        alt="Background"
        fill
        className="object-cover"
        priority
      />
      {/* Grid pattern overlay - on top of background */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" style={{ '--grid-line-color': 'rgba(16, 185, 129, 0.35)' } as React.CSSProperties} />
      {/* Radial glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm md:max-w-4xl relative z-10">
        <Card className="overflow-hidden p-0 border-border">
          <CardContent className="grid p-0 md:grid-cols-2">
            {/* Left: Login Form */}
            <form onSubmit={handleLogin} className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden mb-2">
                    <Image
                      src="/logo.jpg"
                      alt="QuackTrack Logo"
                      width={48}
                      height={48}
                      className="object-cover rounded-xl"
                    />
                  </div>
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Login to your QuackTrack account
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                    {error}
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="m@example.com"
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-2 hover:underline text-muted-foreground"
                      onClick={(e) => e.preventDefault()}
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold hover:shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </Field>

                <FieldDescription className="text-center space-y-1">
                  <span className="block">Demo credentials — password: <code className="font-mono text-[#10B981]">password123</code></span>
                  <span className="block text-[11px] text-muted-foreground/50">
                    admin · dean.cs · ph.bscs · hr · registrar · faculty @quacktrack.com
                  </span>
                </FieldDescription>
              </FieldGroup>
            </form>

            {/* Right: Image with Logo Overlay */}
            <div className="relative hidden bg-muted md:flex md:flex-col md:items-center md:justify-start">
              <Image
                src="/ptc-bg.png"
                alt="Pateros Technological College"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 backdrop-blur-[2px] backdrop-brightness-[0.85] bg-gradient-to-t from-black/20 to-transparent" />
              <div className="relative z-10 flex flex-col items-center gap-4 p-8 text-center pt-20">
                <Image
                  src="/logo-ptc.png"
                  alt="PTC Logo"
                  width={100}
                  height={100}
                  className="object-contain drop-shadow-lg"
                />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Pateros Technological College</h2>
                  <p className="text-base text-white/80 drop-shadow-sm max-w-[280px] mx-auto text-center">
                    Algorithm-Driven Academic Scheduling &amp; Faculty Workload Management System
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}
