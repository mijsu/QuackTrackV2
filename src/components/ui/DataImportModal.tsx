'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  CloudUpload,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'email';
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

interface DataImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  columns: ColumnDefinition[];
  onImport: (data: Record<string, string>[]) => Promise<void>;
  templateData?: Record<string, string>;
}

// ─── CSV Parsing Utilities ───────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return rows;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  if (!email) return true; // empty is handled by required check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateNumber(value: string): boolean {
  if (!value) return true; // empty is handled by required check
  return !isNaN(Number(value));
}

function validateRow(
  row: Record<string, string>,
  columns: ColumnDefinition[],
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const col of columns) {
    const value = row[col.key] ?? '';

    if (col.required && !value) {
      errors.push({
        row: rowIndex,
        column: col.key,
        message: `${col.label} is required`,
      });
    }

    if (value && col.type === 'email' && !validateEmail(value)) {
      errors.push({
        row: rowIndex,
        column: col.key,
        message: `${col.label} is not a valid email`,
      });
    }

    if (value && col.type === 'number' && !validateNumber(value)) {
      errors.push({
        row: rowIndex,
        column: col.key,
        message: `${col.label} must be a number`,
      });
    }
  }

  return errors;
}

function validateData(
  data: Record<string, string>[],
  columns: ColumnDefinition[]
): ValidationError[] {
  const allErrors: ValidationError[] = [];
  for (let i = 0; i < data.length; i++) {
    allErrors.push(...validateRow(data[i], columns, i));
  }
  return allErrors;
}

// ─── Template Download ───────────────────────────────────────────────────────

function downloadTemplate(
  columns: ColumnDefinition[],
  templateData?: Record<string, string>
) {
  const headers = columns.map((c) => c.label);
  const BOM = '\uFEFF';

  let csv = headers.join(',') + '\n';

  if (templateData) {
    const row = columns.map((c) => {
      const value = templateData[c.key] || '';
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += row.join(',') + '\n';
  }

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BATCH_SIZE = 50;
const PREVIEW_ROWS = 5;

// ─── Component ────────────────────────────────────────────────────────────────

export function DataImportModal({
  open,
  onOpenChange,
  title,
  description,
  columns,
  onImport,
  templateData,
}: DataImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Determine the current step
  const currentStep = isImporting
    ? progress >= 100 ? 3 : 2
    : file
      ? 2
      : 1;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reset state when modal closes ──
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setIsDragOver(false);
        setIsImporting(false);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // ── Process file ──
  const processFile = useCallback(
    (selectedFile: File) => {
      if (!selectedFile.name.toLowerCase().endsWith('.csv') && selectedFile.type !== 'text/csv') {
        toast.error('Invalid file type. Please upload a .csv file.');
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }

      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const data = parseCSV(text);

          if (data.length === 0) {
            toast.error(
              'No data found in CSV file. Make sure it has a header row and at least one data row.'
            );
            setFile(null);
            return;
          }

          setParsedData(data);
          const validationErrors = validateData(data, columns);
          setErrors(validationErrors);
        } catch {
          toast.error('Failed to parse CSV file. Please check the file format.');
          setFile(null);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file.');
        setFile(null);
      };

      reader.readAsText(selectedFile);
    },
    [columns]
  );

  // ── File input change ──
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processFile(selectedFile);
      }
    },
    [processFile]
  );

  // ── Drag & drop handlers ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        processFile(droppedFile);
      }
    },
    [processFile]
  );

  // ── Remove selected file ──
  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Download template ──
  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(columns, templateData);
    toast.success('Template downloaded');
  }, [columns, templateData]);

  // ── Build row-keyed data from column definitions ──
  const buildRowData = useCallback(
    (row: Record<string, string>): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const col of columns) {
        result[col.key] = row[col.key] ?? '';
      }
      return result;
    },
    [columns]
  );

  // ── Import with batched progress ──
  const handleImport = useCallback(async () => {
    if (errors.length > 0) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const totalRows = parsedData.length;
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const start = batchIdx * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalRows);
        const batch = parsedData.slice(start, end).map(buildRowData);

        await onImport(batch);

        const processedCount = Math.min(end, totalRows);
        setProgress(Math.round((processedCount / totalRows) * 100));
      }

      toast.success(`Successfully imported ${parsedData.length} record${parsedData.length !== 1 ? 's' : ''}`);
      handleOpenChange(false);
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  }, [errors, parsedData, buildRowData, onImport, handleOpenChange]);

  // ── Error lookups ──
  const getCellErrors = useCallback(
    (rowIdx: number, columnKey: string): ValidationError[] => {
      return errors.filter((e) => e.row === rowIdx && e.column === columnKey);
    },
    [errors]
  );

  const hasErrorsInRow = useCallback(
    (rowIdx: number): boolean => {
      return errors.some((e) => e.row === rowIdx);
    },
    [errors]
  );

  // ── Step indicator helper ──
  const getStepDotClass = (step: number) => {
    if (step < currentStep) return 'step-dot step-dot-completed';
    if (step === currentStep) return 'step-dot step-dot-active';
    return 'step-dot';
  };

  // ── Render ──
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="import-glass max-w-2xl max-h-[85vh] flex flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="step-indicator px-1">
          <div className={cn('step-dot', currentStep >= 1 && 'step-dot-active', currentStep > 1 && 'step-dot-completed')}>
            {currentStep > 1 ? <Check className="h-3.5 w-3.5" /> : '1'}
          </div>
          <div className={cn('step-connector', currentStep > 1 && 'step-connector-active')} />
          <div className={cn('step-dot', currentStep >= 2 && 'step-dot-active', currentStep > 2 && 'step-dot-completed')}>
            {currentStep > 2 ? <Check className="h-3.5 w-3.5" /> : '2'}
          </div>
          <div className={cn('step-connector', currentStep > 2 && 'step-connector-active')} />
          <div className={cn('step-dot', currentStep >= 3 && 'step-dot-active')}>
            {currentStep >= 3 ? <Check className="h-3.5 w-3.5" /> : '3'}
          </div>
          <div className="flex items-center gap-3 ml-2 text-xs text-muted-foreground">
            <span className={currentStep >= 1 ? 'text-foreground font-medium' : ''}>Upload</span>
            <span className={currentStep >= 2 ? 'text-foreground font-medium' : ''}>Process</span>
            <span className={currentStep >= 3 ? 'text-foreground font-medium' : ''}>Complete</span>
          </div>
        </div>

        {/* Upload & Template Row */}
        <div className="flex flex-col gap-4">
          {/* Drag & Drop Zone */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload CSV file"
                  className={cn(
                    'import-dropzone import-dropzone-glow flex flex-col items-center justify-center gap-3 p-8 transition-all cursor-pointer',
                    isDragOver && 'drag-over'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300',
                      isDragOver
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 scale-110'
                        : 'bg-muted'
                    )}
                  >
                    <CloudUpload
                      className={cn(
                        'h-7 w-7 transition-all duration-300',
                        isDragOver
                          ? 'text-emerald-600'
                          : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Drop your CSV file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV files only, up to 5MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-3">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB &middot;{' '}
                      {parsedData.length} record{parsedData.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleRemoveFile}
                    disabled={isImporting}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Download Template Button */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isImporting}
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/30 dark:text-emerald-400"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>

        {/* Validation Errors Summary */}
        {errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">
                {errors.length} validation error{errors.length !== 1 ? 's' : ''} found
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground max-h-24 overflow-y-auto">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    Row {err.row + 1}: {err.message}
                  </li>
                ))}
                {errors.length > 5 && (
                  <li className="text-xs">
                    ...and {errors.length - 5} more error{errors.length - 5 !== 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">
                Preview
                {parsedData.length > PREVIEW_ROWS && (
                  <span className="text-muted-foreground font-normal">
                    {' '}(showing {PREVIEW_ROWS} of {parsedData.length})
                  </span>
                )}
              </p>
              {errors.length === 0 && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All valid
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-md border max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col.key} className="whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.required && (
                            <span className="text-destructive">*</span>
                          )}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, PREVIEW_ROWS).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {idx + 1}
                      </TableCell>
                      {columns.map((col) => {
                        const cellErrors = getCellErrors(idx, col.key);
                        const value = row[col.key] ?? '';
                        const isEmpty = !value;
                        const isRequiredEmpty = col.required && isEmpty;

                        return (
                          <TableCell
                            key={col.key}
                            className={cn(
                              'max-w-[200px] truncate',
                              (cellErrors.length > 0 || isRequiredEmpty) &&
                                'ring-2 ring-destructive/50 rounded-sm'
                            )}
                            title={
                              cellErrors.length > 0
                                ? cellErrors.map((e) => e.message).join(', ')
                                : value || undefined
                            }
                          >
                            <span
                              className={cn(
                                isEmpty && 'italic text-muted-foreground',
                                cellErrors.length > 0 && 'text-destructive'
                              )}
                            >
                              {value || 'empty'}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(isImporting || progress > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className={cn('h-4 w-4', isImporting && 'animate-spin')} />
                {progress >= 100 ? 'Import complete!' : `Importing... (${Math.round((progress / 100) * parsedData.length)} of ${parsedData.length})`}
              </span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden bg-muted">
              <div
                className="progress-bar-gradient h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              parsedData.length === 0 ||
              errors.length > 0 ||
              isImporting
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {parsedData.length} record{parsedData.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
