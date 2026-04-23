'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Download, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CsvImportButtonProps {
  onImport: (data: Record<string, string>[]) => void;
  accept?: string;
  templateData?: Record<string, string>[];
  templateFilename?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Simple CSV parser that handles quoted values.
 * Splits by lines first, then by commas respecting quoted fields.
 */
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

/**
 * Parse a single CSV line, handling quoted values (with commas inside quotes).
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
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

/**
 * Convert data to CSV string with proper escaping.
 */
function toCSVString(data: Record<string, string>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escapeValue = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escapeValue).join(',');
  const dataLines = data.map(row =>
    headers.map(h => escapeValue(row[h] || '')).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Download a CSV string as a file.
 */
function downloadCSV(csvString: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CsvImportButton({
  onImport,
  accept = '.csv',
  templateData,
  templateFilename = 'template.csv',
  variant = 'outline',
  size = 'default',
  className,
}: CsvImportButtonProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Invalid file type. Please upload a .csv file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCSV(text);

        if (data.length === 0) {
          toast.error('No data found in CSV file. Make sure it has a header row and at least one data row.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setParsedData(data);
        setPreviewOpen(true);
      } catch {
        toast.error('Failed to parse CSV file. Please check the file format.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
      toast.error('Failed to read file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(parsedData);
      setPreviewOpen(false);
      setParsedData([]);
    } catch {
      // Error handling is done by the onImport callback
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!templateData || templateData.length === 0) {
      toast.error('No template data available');
      return;
    }
    const csv = toCSVString(templateData);
    downloadCSV(csv, templateFilename);
    toast.success('Template downloaded');
  };

  const headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
  const previewRows = parsedData.slice(0, 5);

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload CSV file"
        />
        <Button
          variant={variant}
          size={size}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={cn('h-4 w-4', size !== 'icon' && 'mr-2')} />
          {size !== 'icon' && 'Import CSV'}
        </Button>
        {templateData && templateData.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3 w-3 mr-1" />
            Template
          </Button>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              Review the data before importing. Showing first 5 of {parsedData.length} records.
            </DialogDescription>
          </DialogHeader>

          {/* Info Banner */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-3 text-sm text-blue-700 dark:text-blue-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {parsedData.length} record{parsedData.length !== 1 ? 's' : ''} found in CSV.
              Column headers: <strong>{headers.join(', ')}</strong>
            </span>
          </div>

          {/* Preview Table */}
          <div className="flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  {headers.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {idx + 1}
                    </TableCell>
                    {headers.map((header) => (
                      <TableCell key={header} className="max-w-[200px] truncate">
                        <span title={row[header] || ''}>
                          {row[header] || <span className="text-muted-foreground italic">empty</span>}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {parsedData.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              ...and {parsedData.length - 5} more record{parsedData.length - 5 !== 1 ? 's' : ''}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                setParsedData([]);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : `Import ${parsedData.length} record${parsedData.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
