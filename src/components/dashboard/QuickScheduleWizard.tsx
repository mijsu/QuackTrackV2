'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  Building2,
  Settings2,
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface Department {
  id: string;
  name: string;
  code: string;
}

interface WizardOptions {
  semester: string;
  academicYear: string;
  departmentIds: string[];
  maxFacultyUnits: number;
  allowConflicts: boolean;
  timeSlotStart: string;
  timeSlotEnd: string;
  clearExisting: boolean;
}

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer'];
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];

const STEP_ICONS = [GraduationCap, Building2, Settings2, CheckCircle2];
const STEP_LABELS = ['Semester', 'Departments', 'Options', 'Review'];

const defaultOptions: WizardOptions = {
  semester: '1st Semester',
  academicYear: '2025-2026',
  departmentIds: [],
  maxFacultyUnits: 24,
  allowConflicts: false,
  timeSlotStart: '07:00',
  timeSlotEnd: '21:00',
  clearExisting: true,
};

// ============================================================================
// CONFETTI (reused pattern from WelcomeBanner)
// ============================================================================

function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full pointer-events-none"
      style={{ left: `${x}%`, backgroundColor: color }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -80, -140],
        x: [0, (Math.random() - 0.5) * 100],
        scale: [0, 1.2, 0.4],
        rotate: [0, Math.random() * 360],
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
    />
  );
}

function ConfettiBurst({ show }: { show: boolean }) {
  const colors = ['#10b981', '#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.3,
    x: 30 + Math.random() * 40,
    color: colors[i % colors.length],
  }));

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((p) => (
            <ConfettiParticle key={p.id} delay={p.delay} x={p.x} color={p.color} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const Icon = STEP_ICONS[i];
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;

        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className={`
                  flex items-center justify-center rounded-full transition-all duration-300
                  ${isActive
                    ? 'h-9 w-9 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : isCompleted
                      ? 'h-8 w-8 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      : 'h-8 w-8 bg-muted text-muted-foreground'
                  }
                `}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </motion.div>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isCompleted
                      ? 'text-emerald-500/70'
                      : 'text-muted-foreground'
                }`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`w-6 sm:w-10 h-0.5 rounded-full mt-[-12px] transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// STEP 1: SEMESTER & ACADEMIC YEAR
// ============================================================================

function StepSemester({
  options,
  onChange,
}: {
  options: WizardOptions;
  onChange: (updates: Partial<WizardOptions>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        <GraduationCap className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
        <h3 className="text-lg font-semibold">Select Semester & Year</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the academic period for schedule generation
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Semester</label>
          <Select
            value={options.semester}
            onValueChange={(value) => onChange({ semester: value })}
          >
            <SelectTrigger className="w-full border-emerald-500/30 focus:border-emerald-500">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {SEMESTERS.map((sem) => (
                <SelectItem key={sem} value={sem}>
                  {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Academic Year</label>
          <Select
            value={options.academicYear}
            onValueChange={(value) => onChange({ academicYear: value })}
          >
            <SelectTrigger className="w-full border-emerald-500/30 focus:border-emerald-500">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {ACADEMIC_YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 2: DEPARTMENT SELECTION
// ============================================================================

function StepDepartments({
  options,
  onChange,
  departments,
  loading,
}: {
  options: WizardOptions;
  onChange: (updates: Partial<WizardOptions>) => void;
  departments: Department[];
  loading: boolean;
}) {
  const allSelected = departments.length > 0 && options.departmentIds.length === departments.length;

  const toggleAll = () => {
    onChange({ departmentIds: allSelected ? [] : departments.map((d) => d.id) });
  };

  const toggleOne = (id: string) => {
    if (options.departmentIds.includes(id)) {
      onChange({ departmentIds: options.departmentIds.filter((d) => d !== id) });
    } else {
      onChange({ departmentIds: [...options.departmentIds, id] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        <Building2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
        <h3 className="text-lg font-semibold">Select Departments</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which departments to include in generation
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-sm text-muted-foreground">Loading departments...</span>
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-muted-foreground">No departments found. Add departments first.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-sm mx-auto">
          {/* Select All toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Checkbox
              id="select-all-depts"
              checked={allSelected}
              onCheckedChange={toggleAll}
              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <label
              htmlFor="select-all-depts"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Select All Departments
            </label>
            <span className="text-xs text-muted-foreground">
              {options.departmentIds.length}/{departments.length}
            </span>
          </div>

          {/* Department checkboxes */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {departments.map((dept) => {
              const isChecked = options.departmentIds.includes(dept.id);
              return (
                <div
                  key={dept.id}
                  className={`
                    flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-150 cursor-pointer
                    ${isChecked
                      ? 'bg-emerald-500/8 border border-emerald-500/15'
                      : 'hover:bg-muted/50 border border-transparent'
                    }
                  `}
                  onClick={() => toggleOne(dept.id)}
                >
                  <Checkbox
                    id={`dept-${dept.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleOne(dept.id)}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer flex-1">
                    {dept.name}
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">{dept.code}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// STEP 3: CONFIGURE OPTIONS
// ============================================================================

function StepOptions({
  options,
  onChange,
}: {
  options: WizardOptions;
  onChange: (updates: Partial<WizardOptions>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        <Settings2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
        <h3 className="text-lg font-semibold">Configure Options</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Fine-tune the generation parameters
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {/* Max Faculty Units */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Faculty Units</label>
          <Input
            type="number"
            min={1}
            max={36}
            value={options.maxFacultyUnits}
            onChange={(e) => onChange({ maxFacultyUnits: parseInt(e.target.value) || 24 })}
            className="border-emerald-500/30 focus:border-emerald-500"
          />
          <p className="text-[11px] text-muted-foreground">
            Maximum teaching load per faculty member
          </p>
        </div>

        {/* Allow Conflicts */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div>
            <label className="text-sm font-medium">Allow Conflicts</label>
            <p className="text-[11px] text-muted-foreground">
              Permit scheduling conflicts when unavoidable
            </p>
          </div>
          <Switch
            checked={options.allowConflicts}
            onCheckedChange={(checked) => onChange({ allowConflicts: checked })}
          />
        </div>

        {/* Time Slot Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Time Slot Range</label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={options.timeSlotStart}
              onChange={(e) => onChange({ timeSlotStart: e.target.value })}
              className="border-emerald-500/30 focus:border-emerald-500"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="time"
              value={options.timeSlotEnd}
              onChange={(e) => onChange({ timeSlotEnd: e.target.value })}
              className="border-emerald-500/30 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Clear Existing */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div>
            <label className="text-sm font-medium">Clear Existing Schedules</label>
            <p className="text-[11px] text-muted-foreground">
              Remove all current schedules before generating
            </p>
          </div>
          <Switch
            checked={options.clearExisting}
            onCheckedChange={(checked) => onChange({ clearExisting: checked })}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 4: REVIEW & GENERATE
// ============================================================================

function StepReview({
  options,
  departments,
  onGenerate,
  generating,
}: {
  options: WizardOptions;
  departments: Department[];
  onGenerate: () => void;
  generating: boolean;
}) {
  const selectedDepts = departments.filter((d) => options.departmentIds.includes(d.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="text-center mb-4">
        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
        <h3 className="text-lg font-semibold">Review & Generate</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm your settings before generating schedules
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        {/* Summary Card */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 p-4 space-y-3">
          {/* Semester & Year */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Semester
            </span>
            <span className="text-sm font-medium">{options.semester}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Academic Year
            </span>
            <span className="text-sm font-medium">{options.academicYear}</span>
          </div>

          <div className="h-px bg-border" />

          {/* Departments */}
          <div>
            <span className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Departments ({selectedDepts.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {selectedDepts.length > 0 ? (
                selectedDepts.map((d) => (
                  <span
                    key={d.id}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  >
                    {d.code}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">All departments</span>
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Options */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Max Faculty Units
            </span>
            <span className="text-sm font-medium">{options.maxFacultyUnits}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Time Slots
            </span>
            <span className="text-sm font-medium">
              {options.timeSlotStart} — {options.timeSlotEnd}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Allow Conflicts</span>
            <span className={`text-sm font-medium ${options.allowConflicts ? 'text-amber-600' : 'text-emerald-600'}`}>
              {options.allowConflicts ? 'Yes' : 'No'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Clear Existing</span>
            <span className={`text-sm font-medium ${options.clearExisting ? 'text-amber-600' : 'text-emerald-600'}`}>
              {options.clearExisting ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={generating}
          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98]"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Schedules...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Generate Schedule
            </>
          )}
        </Button>

        {generating && (
          <p className="text-center text-[11px] text-muted-foreground animate-pulse">
            This may take up to 50 seconds. Please wait...
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// SUCCESS STATE
// ============================================================================

function SuccessState({ result, onReset }: { result: { generated: number; conflicts: number }; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      className="text-center py-6 space-y-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <CheckCircle2 className="h-8 w-8 text-white" />
      </motion.div>

      <div>
        <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Schedule Generated!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {result.generated} schedule{result.generated !== 1 ? 's' : ''} created successfully
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-center">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{result.generated}</p>
          <p className="text-[10px] text-muted-foreground">Schedules</p>
        </div>
        <div className={`rounded-lg border px-4 py-2 text-center ${
          result.conflicts > 0
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <p className={`text-xl font-bold ${
            result.conflicts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {result.conflicts}
          </p>
          <p className="text-[10px] text-muted-foreground">Conflicts</p>
        </div>
      </div>

      <Button
        onClick={onReset}
        variant="outline"
        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        Generate Another
      </Button>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuickScheduleWizard() {
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<WizardOptions>(defaultOptions);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successResult, setSuccessResult] = useState<{ generated: number; conflicts: number } | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const TOTAL_STEPS = 4;

  // Fetch departments
  useEffect(() => {
    async function fetchDepts() {
      try {
        setDeptsLoading(true);
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(
            (Array.isArray(data) ? data : []).map((d: { id: string; name: string; code: string }) => ({
              id: d.id,
              name: d.name,
              code: d.code,
            }))
          );
        }
      } catch {
        // silent
      } finally {
        setDeptsLoading(false);
      }
    }
    fetchDepts();
  }, []);

  // Fetch current settings to pre-fill semester/year
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setOptions((prev) => ({
            ...prev,
            semester: data.semester || prev.semester,
            academicYear: data.academic_year || prev.academicYear,
          }));
        }
      } catch {
        // silent
      }
    }
    fetchSettings();
  }, []);

  const updateOptions = useCallback((updates: Partial<WizardOptions>) => {
    setOptions((prev) => ({ ...prev, ...updates }));
  }, []);

  const canGoNext = (): boolean => {
    switch (step) {
      case 0:
        return !!options.semester && !!options.academicYear;
      case 1:
        return true; // Can generate with no departments selected (means all)
      case 2:
        return options.maxFacultyUnits > 0;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        clearExisting: options.clearExisting,
        semester: options.semester,
        academicYear: options.academicYear,
        maxFacultyUnits: options.maxFacultyUnits,
        allowConflicts: options.allowConflicts,
        timeSlotStart: options.timeSlotStart,
        timeSlotEnd: options.timeSlotEnd,
      };

      // If specific departments selected, include the first one as departmentId
      // (the API supports one departmentId, or all if omitted)
      if (options.departmentIds.length === 1) {
        body.departmentId = options.departmentIds[0];
      } else if (options.departmentIds.length > 1) {
        body.departmentIds = options.departmentIds;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const generated = data.schedules?.length || data.generated || data.stats?.assignedSlots || 0;
        const conflicts = data.conflicts?.length || data.violations?.length || 0;

        setSuccessResult({ generated, conflicts });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);

        toast.success('Schedule generated successfully!', {
          description: `${generated} schedule${generated !== 1 ? 's' : ''} created with ${conflicts} conflict${conflicts !== 1 ? 's' : ''}`,
          duration: 5000,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.details?.join(', ') || 'Generation failed';

        if (errorData.disabled) {
          toast.error('Schedule generation is disabled', {
            description: errorData.hint || 'Enable auto_generate_enabled in Settings > Schedule tab',
            duration: 7000,
          });
        } else {
          toast.error('Failed to generate schedule', {
            description: errorMsg,
            duration: 5000,
          });
        }
      }
    } catch {
      toast.error('Network error', {
        description: 'Could not reach the server. Please try again.',
        duration: 5000,
      });
    } finally {
      setGenerating(false);
    }
  }, [options]);

  const handleReset = useCallback(() => {
    setStep(0);
    setSuccessResult(null);
    setShowConfetti(false);
  }, []);

  return (
    <>
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Schedules?</AlertDialogTitle>
            <AlertDialogDescription>
              {options.clearExisting
                ? 'This will clear all existing schedules and generate new ones. This action cannot be undone.'
                : 'This will generate new schedules alongside existing ones. Any conflicts will be flagged for review.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleGenerate();
                setShowGenerateConfirm(false);
              }}
              className={options.clearExisting ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
            >
              Generate Schedules
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="card-hover overflow-hidden relative">
      {/* Confetti overlay */}
      <ConfettiBurst show={showConfetti} />

      {/* Emerald gradient top accent */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-500 dark:to-emerald-600" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Schedule Wizard
        </CardTitle>
        <CardDescription className="text-xs">
          Step-by-step schedule generation
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {successResult ? (
          <SuccessState result={successResult} onReset={handleReset} />
        ) : (
          <>
            {/* Step indicator */}
            <div className="mb-5">
              <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              {step === 0 && (
                <StepSemester key="step-0" options={options} onChange={updateOptions} />
              )}
              {step === 1 && (
                <StepDepartments
                  key="step-1"
                  options={options}
                  onChange={updateOptions}
                  departments={departments}
                  loading={deptsLoading}
                />
              )}
              {step === 2 && (
                <StepOptions key="step-2" options={options} onChange={updateOptions} />
              )}
              {step === 3 && (
                <StepReview
                  key="step-3"
                  options={options}
                  departments={departments}
                  onGenerate={() => setShowGenerateConfirm(true)}
                  generating={generating}
                />
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            {step < 3 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                <Button
                  size="sm"
                  onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                  disabled={!canGoNext()}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm active:scale-[0.98] transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Back button on review step (when not generating) */}
            {step === 3 && !generating && (
              <div className="flex items-center justify-start mt-4 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
}
