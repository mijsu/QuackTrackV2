'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileJson, Printer, Loader2 } from 'lucide-react';
import { exportToCSV, exportToJSON } from '@/lib/data-export';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showPrint?: boolean;
  onPrint?: () => void;
  className?: string;
}

export function ExportButton({
  data,
  filename = 'export',
  variant = 'outline',
  size = 'sm',
  showPrint = false,
  onPrint,
  className,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Small delay so user can see the loading state
      await new Promise((resolve) => setTimeout(resolve, 300));
      exportToCSV(data, filename);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      exportToJSON(data, filename);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={exporting || data.length === 0}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={exporting}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} disabled={exporting}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        {showPrint && (
          <DropdownMenuItem onClick={handlePrint} disabled={exporting}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
