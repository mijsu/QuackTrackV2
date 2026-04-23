'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, Save, RotateCcw, Plus, Trash2, Info,
  Clock, Users, Building, Target, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WEIGHT_PRESETS, type ConstraintWeights } from '@/lib/scheduling-algorithm';

interface WeightConfig {
  id: string;
  name: string;
  description?: string;
  weights: ConstraintWeights;
  isPreset: boolean;
  isDefault: boolean;
}

const WEIGHT_DESCRIPTIONS: Record<keyof ConstraintWeights, { label: string; description: string; icon: React.ReactNode }> = {
  FACULTY_PREFERENCE: {
    label: 'Faculty Preference',
    description: 'How much to respect faculty\'s preferred time slots and days',
    icon: <Clock className="h-4 w-4" />,
  },
  LOAD_BALANCE: {
    label: 'Load Balance',
    description: 'Distribute workload evenly across faculty',
    icon: <Users className="h-4 w-4" />,
  },
  ROOM_EFFICIENCY: {
    label: 'Room Efficiency',
    description: 'Match section size to room capacity',
    icon: <Building className="h-4 w-4" />,
  },
  TIME_QUALITY: {
    label: 'Time Quality',
    description: 'Prefer prime time slots (morning/afternoon)',
    icon: <Clock className="h-4 w-4" />,
  },
  DAY_DISTRIBUTION: {
    label: 'Day Distribution',
    description: 'Balance schedules across all days',
    icon: <Calendar className="h-4 w-4" />,
  },
  BACKTRACK_PENALTY: {
    label: 'Backtrack Penalty',
    description: 'Penalty for assignments that cause backtracking',
    icon: <Target className="h-4 w-4" />,
  },
  DEPARTMENT_MATCH: {
    label: 'Department Match',
    description: 'Prefer faculty from same department as subject',
    icon: <Building className="h-4 w-4" />,
  },
  SPECIALIZATION_MATCH: {
    label: 'Specialization Match',
    description: 'Match faculty expertise with subject requirements',
    icon: <Target className="h-4 w-4" />,
  },
  PART_TIME_BONUS: {
    label: 'Part-time Bonus',
    description: 'Bonus for scheduling part-time faculty on weekends',
    icon: <Users className="h-4 w-4" />,
  },
  CONSECUTIVE_PENALTY: {
    label: 'Consecutive Penalty',
    description: 'Penalty for long consecutive teaching hours',
    icon: <Clock className="h-4 w-4" />,
  },
};

export function WeightsConfiguration() {
  const [configs, setConfigs] = useState<WeightConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<WeightConfig | null>(null);
  const [weights, setWeights] = useState<ConstraintWeights>(WEIGHT_PRESETS.balanced);
  const [options, setOptions] = useState({
    maxConsecutiveHours: 6,
    respectLunchBreak: true,
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    partTimeMaxUnits: 12,
    useStandardTimeBlocks: true,
    autoResolveConflicts: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/generation-configs');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
        const defaultConfig = data.find((c: WeightConfig) => c.isDefault);
        if (defaultConfig) {
          setSelectedConfig(defaultConfig);
          setWeights(defaultConfig.weights);
        }
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (presetName: string) => {
    if (presetName === 'custom') {
      setSelectedConfig(null);
      return;
    }
    
    const preset = WEIGHT_PRESETS[presetName as keyof typeof WEIGHT_PRESETS];
    if (preset) {
      setWeights(preset);
      setSelectedConfig(null);
    }
  };

  const handleWeightChange = (key: keyof ConstraintWeights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value / 100 }));
  };

  const saveConfig = async () => {
    if (!configName.trim()) {
      toast.error('Please enter a configuration name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/generation-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configName,
          description: configDescription,
          weights,
          options,
          isPreset: false,
          isDefault: false,
        }),
      });

      if (res.ok) {
        const newConfig = await res.json();
        setConfigs(prev => [...prev, newConfig]);
        setConfigName('');
        setConfigDescription('');
        toast.success('Configuration saved');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const res = await fetch(`/api/generation-configs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfigs(prev => prev.filter(c => c.id !== id));
        toast.success('Configuration deleted');
      }
    } catch (error) {
      toast.error('Failed to delete configuration');
    }
  };

  const resetToDefaults = () => {
    setWeights(WEIGHT_PRESETS.balanced);
    setOptions({
      maxConsecutiveHours: 6,
      respectLunchBreak: true,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      partTimeMaxUnits: 12,
      useStandardTimeBlocks: true,
      autoResolveConflicts: true,
    });
    toast.success('Reset to default weights');
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Settings className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Preset Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Configuration
          </CardTitle>
          <CardDescription>
            Adjust weights to control how the scheduling algorithm makes decisions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Preset Selection */}
          <div className="space-y-2">
            <Label>Quick Preset</Label>
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset or customize" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">Balanced (Default)</SelectItem>
                <SelectItem value="preferencePriority">Faculty Preference Priority</SelectItem>
                <SelectItem value="loadBalanced">Load Balanced</SelectItem>
                <SelectItem value="specializationFocus">Specialization Focus</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weight Sliders */}
          <div className="space-y-4">
            <Label className="text-lg">Constraint Weights</Label>
            <div className="grid gap-4">
              {(Object.keys(WEIGHT_DESCRIPTIONS) as Array<keyof ConstraintWeights>).map(key => {
                const info = WEIGHT_DESCRIPTIONS[key];
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {info.icon}
                        <Label className="font-normal">{info.label}</Label>
                      </div>
                      <Badge variant="outline">{(weights[key] * 100).toFixed(0)}%</Badge>
                    </div>
                    <Slider
                      value={[weights[key] * 100]}
                      onValueChange={([value]) => handleWeightChange(key, value)}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Options</CardTitle>
          <CardDescription>Additional constraints for schedule generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Respect Lunch Break</Label>
                  <p className="text-xs text-muted-foreground">Avoid scheduling across 12:00-1:00 PM</p>
                </div>
                <Switch
                  checked={options.respectLunchBreak}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, respectLunchBreak: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Use Standard Time Blocks</Label>
                  <p className="text-xs text-muted-foreground">Align classes to standard blocks</p>
                </div>
                <Switch
                  checked={options.useStandardTimeBlocks}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, useStandardTimeBlocks: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Resolve Conflicts</Label>
                  <p className="text-xs text-muted-foreground">Automatically try alternatives when conflicts occur</p>
                </div>
                <Switch
                  checked={options.autoResolveConflicts}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, autoResolveConflicts: checked }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Max Consecutive Hours</Label>
                <Input
                  type="number"
                  value={options.maxConsecutiveHours}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxConsecutiveHours: parseInt(e.target.value) || 6 }))}
                  min={1}
                  max={12}
                />
                <p className="text-xs text-muted-foreground">Maximum consecutive teaching hours per day</p>
              </div>

              <div className="space-y-2">
                <Label>Part-time Max Units</Label>
                <Input
                  type="number"
                  value={options.partTimeMaxUnits}
                  onChange={(e) => setOptions(prev => ({ ...prev, partTimeMaxUnits: parseInt(e.target.value) || 12 }))}
                  min={1}
                  max={24}
                />
                <p className="text-xs text-muted-foreground">Maximum units for part-time faculty</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Save Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Configuration Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g., Heavy CS Load, Part-time Focus"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={configDescription}
                onChange={(e) => setConfigDescription(e.target.value)}
                placeholder="When to use this configuration"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
            <Button variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Configurations */}
      {configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configs.map(config => (
                <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.name}</span>
                      {config.isDefault && <Badge>Default</Badge>}
                      {config.isPreset && <Badge variant="secondary">Preset</Badge>}
                    </div>
                    {config.description && (
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConfig(config);
                        setWeights(config.weights);
                      }}
                    >
                      Apply
                    </Button>
                    {!config.isPreset && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfigToDelete(config.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Delete Configuration Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this generation configuration preset? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (configToDelete) deleteConfig(configToDelete);
                setConfigToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
