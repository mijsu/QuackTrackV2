'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiThrow } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  User,
  Cpu,
  Zap,
  Save,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Database,
  Check,
} from 'lucide-react'

/* ───── Types ───── */

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  department?: { id: string; name: string } | null
}

interface GenerationConfig {
  id: string
  name: string
  description?: string | null
  config: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  _count?: { generationSessions: number }
}

/* ───── Profile Tab ───── */

function ProfileTab() {
  const queryClient = useQueryClient()
  const user = useAppStore((s) => s.user)
  const login = useAppStore((s) => s.login)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [prevProfileId, setPrevProfileId] = useState<string | null>(null)

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const res = await api.get<UserProfile>(`/users/${user.id}`)
      return res.data ?? null
    },
    enabled: !!user?.id,
  })

  // Sync form state when profile loads
  React.useEffect(() => {
    if (profile && profile.id !== prevProfileId) {
      setPrevProfileId(profile.id)
      setName(profile.name)
      setEmail(profile.email)
      setPhone(profile.phone || '')
    }
  }, [profile, prevProfileId])

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      if (newPassword && !currentPassword) {
        throw new Error('Current password is required when setting a new password')
      }
      const updateData: Record<string, unknown> = { name, email, phone }
      if (newPassword && newPassword === confirmPassword) {
        updateData.password = newPassword
        if (currentPassword) updateData.currentPassword = currentPassword
      }
      return apiThrow(api.put(`/users/${user.id}`, updateData))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
      // Update store with new name/email
      if (user) {
        login({ ...user, name, email })
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 text-[#10B981] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current User Info */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-foreground text-lg mb-4">Current Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Role</Label>
            <Input
              value={profile?.role || user?.role || ''}
              disabled
              className="bg-secondary border-border text-muted-foreground disabled:opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-foreground text-lg mb-4">Change Password</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Current Password</Label>
            <Input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">New Password</Label>
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Confirm Password</Label>
            <Input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-red-400 text-xs mt-2">Passwords do not match</p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => updateProfileMutation.mutate()}
          disabled={updateProfileMutation.isPending}
          className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-semibold shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateProfileMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </button>
      </div>

      {updateProfileMutation.isSuccess && (
        <p className="text-green-400 text-sm text-right">Profile updated successfully!</p>
      )}
      {updateProfileMutation.isError && (
        <p className="text-red-400 text-sm text-right">Failed to update profile.</p>
      )}
    </div>
  )
}

/* ───── System Tab ───── */

function SystemTab() {
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [semester, setSemester] = useState('1st')
  const [compactView, setCompactView] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  return (
    <div className="space-y-6">
      {/* Academic Settings */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-foreground text-lg mb-4">Academic Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Academic Year</Label>
            <Input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-secondary border-border text-foreground font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Current Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="1st" className="text-accent-foreground focus:bg-accent focus:text-accent-foreground">1st Semester</SelectItem>
                <SelectItem value="2nd" className="text-accent-foreground focus:bg-accent focus:text-accent-foreground">2nd Semester</SelectItem>
                <SelectItem value="summer" className="text-accent-foreground focus:bg-accent focus:text-accent-foreground">Summer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-foreground text-lg mb-4">Display Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">Compact View</p>
              <p className="text-muted-foreground text-xs">Show more data in less space</p>
            </div>
            <Switch checked={compactView} onCheckedChange={setCompactView} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">Auto-Refresh Data</p>
              <p className="text-muted-foreground text-xs">Automatically refresh data every 30 seconds</p>
            </div>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
        </div>
      </div>

    </div>
  )
}

/* ───── Generation Tab ───── */

function GenerationTab() {
  const queryClient = useQueryClient()

  const [editingConfig, setEditingConfig] = useState<GenerationConfig | null>(null)
  const [newConfig, setNewConfig] = useState({ name: '', description: '', config: '{}' })
  const [showNewForm, setShowNewForm] = useState(false)

  const { data: configs = [], isLoading } = useQuery<GenerationConfig[]>({
    queryKey: ['generation-configs'],
    queryFn: async () => {
      const res = await api.get<GenerationConfig[]>('/generation-configs')
      const raw = res.data
      if (Array.isArray(raw)) return raw
      if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: unknown }).data)) {
        return (raw as { data: GenerationConfig[] }).data
      }
      return []
    },
  })

  const createConfigMutation = useMutation({
    mutationFn: async () => {
      return apiThrow(api.post('/generation-configs', {
        name: newConfig.name,
        description: newConfig.description,
        config: newConfig.config,
        isDefault: configs.length === 0,
      }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-configs'] })
      setNewConfig({ name: '', description: '', config: '{}' })
      setShowNewForm(false)
    },
  })

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiThrow(api.put(`/generation-configs/${id}`, data))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-configs'] })
      setEditingConfig(null)
    },
  })

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiThrow(api.delete(`/generation-configs/${id}`))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-configs'] })
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiThrow(api.put(`/generation-configs/${id}`, { isDefault: true }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-configs'] })
    },
  })

  const tryParseConfig = (configStr: string): string => {
    try {
      return JSON.stringify(JSON.parse(configStr), null, 2)
    } catch {
      return configStr
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 text-[#10B981] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-foreground text-lg">Generation Configurations</h2>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#10B981]/10 text-[#10B981] text-sm border border-[#10B981]/20 hover:bg-[#10B981]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Config
        </button>
      </div>

      {/* New Config Form */}
      {showNewForm && (
        <div className="bg-card border border-[#10B981]/20 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-bold text-foreground">Create New Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Config Name</Label>
              <Input
                value={newConfig.name}
                onChange={(e) => setNewConfig((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Optimized Schedule v2"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Description</Label>
              <Input
                value={newConfig.description}
                onChange={(e) => setNewConfig((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description..."
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Configuration (JSON)</Label>
            <Textarea
              value={newConfig.config}
              onChange={(e) => setNewConfig((p) => ({ ...p, config: e.target.value }))}
              className="bg-secondary border-border text-foreground font-mono text-xs min-h-[120px] resize-none"
              placeholder='{"maxIterations": 100, "preferAdjacency": true}'
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => createConfigMutation.mutate()}
              disabled={createConfigMutation.isPending || !newConfig.name}
              className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white text-sm font-semibold shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Create
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewConfig({ name: '', description: '', config: '{}' }) }}
              className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Configs List */}
      {configs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No generation configs found</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Create one to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <div
              key={config.id}
              className={`bg-card border rounded-2xl p-6 transition-all duration-200 ${
                config.isDefault ? 'border-[#10B981]/30' : 'border-border'
              }`}
            >
              {editingConfig?.id === config.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Config Name</Label>
                      <Input
                        value={editingConfig.name}
                        onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                        className="bg-secondary border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Description</Label>
                      <Input
                        value={editingConfig.description || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                        className="bg-secondary border-border text-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Configuration (JSON)</Label>
                    <Textarea
                      value={tryParseConfig(editingConfig.config)}
                      onChange={(e) => setEditingConfig({ ...editingConfig, config: e.target.value })}
                      className="bg-secondary border-border text-foreground font-mono text-xs min-h-[120px] resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateConfigMutation.mutate({
                        id: editingConfig.id,
                        data: {
                          name: editingConfig.name,
                          description: editingConfig.description,
                          config: editingConfig.config,
                        },
                      })}
                      disabled={updateConfigMutation.isPending}
                      className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white text-sm font-semibold shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/40 transition-all duration-300 disabled:opacity-50"
                    >
                      {updateConfigMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingConfig(null)}
                      className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-bold text-foreground">{config.name}</h3>
                        {config.isDefault && (
                          <Badge className="bg-[#10B981]/15 text-[#10B981] border-0 text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-muted-foreground text-sm mb-2">{config.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">Sessions: {config._count?.generationSessions ?? 0}</span>
                        <span>Created: {new Date(config.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!config.isDefault && (
                        <button
                          onClick={() => setDefaultMutation.mutate(config.id)}
                          disabled={setDefaultMutation.isPending}
                          className="p-2 rounded-lg text-muted-foreground hover:text-[#10B981] hover:bg-[#10B981]/10 transition-colors disabled:opacity-50"
                          title="Set as default"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingConfig({ ...config })}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        title="Edit"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteConfigMutation.mutate(config.id)}
                        disabled={deleteConfigMutation.isPending}
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Config Preview */}
                  <div className="mt-3 bg-secondary rounded-lg p-3 font-mono text-xs text-muted-foreground max-h-32 overflow-y-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap break-all">{tryParseConfig(config.config)}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───── Main Settings View ───── */

export function SettingsView() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-[#10B981]" />
        <h1 className="font-heading text-3xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-[#10B981]/15 data-[state=active]:text-[#10B981] rounded-lg text-muted-foreground transition-all gap-1.5"
          >
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-[#10B981]/15 data-[state=active]:text-[#10B981] rounded-lg text-muted-foreground transition-all gap-1.5"
            >
              <Cpu className="h-4 w-4" />
              System
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger
              value="generation"
              className="data-[state=active]:bg-[#10B981]/15 data-[state=active]:text-[#10B981] rounded-lg text-muted-foreground transition-all gap-1.5"
            >
              <Zap className="h-4 w-4" />
              Generation
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="generation">
            <GenerationTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
