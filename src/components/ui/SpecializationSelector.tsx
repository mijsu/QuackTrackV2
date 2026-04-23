'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Plus,
  X,
  Loader2,
  Sparkles,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { SPECIALIZATION_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';
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

interface SpecializationSelectorProps {
  /** Currently selected specializations */
  selected: string[];
  /** Callback when selection changes */
  onChange: (selected: string[]) => void;
  /** Whether the user is admin (enables add/delete/rename) */
  isAdmin: boolean;
  /** Label for the field */
  label?: string;
  /** Hint text below the selector */
  hint?: string;
  /** Unique prefix for checkbox IDs */
  idPrefix?: string;
  /** Max height of the selector area */
  maxHeight?: string;
  /** Additional className for the container */
  className?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
}

interface SpecializationData {
  specializations: string[];
}

export function SpecializationSelector({
  selected,
  onChange,
  isAdmin = false,
  label = 'Specializations',
  hint = 'Select subjects this faculty can teach',
  idPrefix = 'spec',
  maxHeight = 'max-h-40',
  className,
  disabled = false,
}: SpecializationSelectorProps) {
  const [allSpecializations, setAllSpecializations] = useState<string[]>(SPECIALIZATION_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [newSpecName, setNewSpecName] = useState('');
  const [addingSpec, setAddingSpec] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [editingSpec, setEditingSpec] = useState<string | null>(null);
  const [editSpecName, setEditSpecName] = useState('');
  const [renamingSpec, setRenamingSpec] = useState(false);
  const [deletingSpec, setDeletingSpec] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const fetchSpecializations = useCallback(async () => {
    try {
      const res = await fetch('/api/specializations');
      if (res.ok) {
        const data: SpecializationData = await res.json();
        setAllSpecializations(data.specializations);
      } else {
        setAllSpecializations(SPECIALIZATION_OPTIONS);
      }
    } catch {
      setAllSpecializations(SPECIALIZATION_OPTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecializations();
  }, [fetchSpecializations]);

  const handleAddSpecialization = async () => {
    const trimmed = newSpecName.trim();
    if (!trimmed) return;

    if (allSpecializations.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This specialization already exists');
      return;
    }

    setAddingSpec(true);
    try {
      const res = await fetch('/api/specializations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        const data: SpecializationData = await res.json();
        setAllSpecializations(data.specializations);
        // Auto-select the newly added specialization
        onChange([...selected, data.added || trimmed]);
        setNewSpecName('');
        setShowAddInput(false);
        toast.success(`Added specialization: ${data.added || trimmed}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add specialization');
      }
    } catch {
      toast.error('Failed to add specialization');
    } finally {
      setAddingSpec(false);
    }
  };

  const handleDeleteSpecialization = async (name: string) => {
    setDeletingSpec(name);
    try {
      const res = await fetch('/api/specializations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data: SpecializationData = await res.json();
        setAllSpecializations(data.specializations);
        // Remove from selection if it was selected
        if (selected.includes(name)) {
          onChange(selected.filter(s => s !== name));
        }
        toast.success(`Removed specialization: ${name}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove specialization');
      }
    } catch {
      toast.error('Failed to remove specialization');
    } finally {
      setDeletingSpec(null);
    }
  };

  const handleStartEdit = (spec: string) => {
    setEditingSpec(spec);
    setEditSpecName(spec);
    // Focus the input after a tick
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleRenameSpecialization = async () => {
    if (!editingSpec) return;
    const trimmed = editSpecName.trim();
    if (!trimmed || trimmed === editingSpec) {
      setEditingSpec(null);
      setEditSpecName('');
      return;
    }

    // Check for duplicates
    if (allSpecializations.some(s => s !== editingSpec && s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('A specialization with this name already exists');
      return;
    }

    setRenamingSpec(true);
    try {
      const res = await fetch('/api/specializations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: editingSpec, newName: trimmed }),
      });

      if (res.ok) {
        const data: SpecializationData & { renamed?: { from: string; to: string } } = await res.json();
        setAllSpecializations(data.specializations);
        // Update selection if the renamed spec was selected
        if (selected.includes(editingSpec)) {
          onChange(selected.map(s => s === editingSpec ? trimmed : s));
        }
        toast.success(`Renamed "${editingSpec}" to "${trimmed}"`);
        // Refresh to get latest data (PUT also updates users/subjects)
        fetchSpecializations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to rename specialization');
      }
    } catch {
      toast.error('Failed to rename specialization');
    } finally {
      setRenamingSpec(false);
      setEditingSpec(null);
      setEditSpecName('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSpecialization();
    } else if (e.key === 'Escape') {
      setEditingSpec(null);
      setEditSpecName('');
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSpecialization();
    } else if (e.key === 'Escape') {
      setShowAddInput(false);
      setNewSpecName('');
    }
  };

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <div className={cn('grid grid-cols-2 gap-2 p-3 border rounded-lg', maxHeight, 'overflow-y-auto')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded border bg-muted animate-pulse" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className={cn('border rounded-lg overflow-hidden', disabled && 'opacity-50 pointer-events-none')}>
        {/* Specialization checkboxes */}
        <div className={cn('grid grid-cols-2 gap-1.5 p-3', maxHeight, 'overflow-y-auto custom-scrollbar')}>
          {allSpecializations.map((spec) => {
            const isChecked = selected.includes(spec);
            const isEditing = editingSpec === spec;
            const isDeleting = deletingSpec === spec;

            return (
              <div key={spec} className="flex items-center justify-between group/spec">
                {isEditing ? (
                  /* Inline rename input */
                  <div className="flex items-center gap-1.5 col-span-2 w-full">
                    <Input
                      ref={editInputRef}
                      value={editSpecName}
                      onChange={(e) => setEditSpecName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="h-6 text-xs flex-1 py-0 px-2"
                      disabled={renamingSpec}
                    />
                    <button
                      type="button"
                      onClick={handleRenameSpecialization}
                      disabled={renamingSpec || !editSpecName.trim() || editSpecName.trim() === editingSpec}
                      className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
                    >
                      {renamingSpec ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingSpec(null); setEditSpecName(''); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  /* Normal display with checkbox + actions */
                  <>
                    <div className="flex items-center space-x-2 min-w-0">
                      <Checkbox
                        id={`${idPrefix}-${spec}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const newSpecs = checked
                            ? [...selected, spec]
                            : selected.filter(s => s !== spec);
                          onChange(newSpecs);
                        }}
                        disabled={disabled}
                      />
                      <label
                        htmlFor={`${idPrefix}-${spec}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {spec}
                      </label>
                    </div>
                    {/* Action buttons - visible on hover (admin only) */}
                    {isAdmin && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/spec:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleStartEdit(spec);
                          }}
                          className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                          title="Rename specialization"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteTarget(spec);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={isDeleting}
                          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title="Delete specialization"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new specialization (admin only) */}
        {isAdmin && (
          <div className="border-t bg-muted/30 px-3 py-2">
            {!showAddInput ? (
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add new specialization
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="Enter new specialization..."
                  className="h-8 text-xs flex-1"
                  autoFocus
                  disabled={addingSpec}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSpecialization}
                  disabled={addingSpec || !newSpecName.trim()}
                  className="h-8 px-3 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  {addingSpec ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {addingSpec ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewSpecName('');
                  }}
                  className="h-8 px-2 text-xs"
                  disabled={addingSpec}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Specialization?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget}&quot;? Faculty and subjects using this specialization will lose this assignment. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                handleDeleteSpecialization(deleteTarget);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
