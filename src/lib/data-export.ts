/**
 * Data Export Utilities
 * Provides functions for exporting data to CSV and JSON formats.
 */

/**
 * Escape a value for safe CSV output.
 * Handles commas, quotes, and newlines.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to CSV and trigger a browser download.
 * Includes BOM character for Excel UTF-8 compatibility.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [headers.map(escapeCSVValue).join(',')];

  for (const row of data) {
    const values = headers.map((header) => escapeCSVValue(row[header]));
    csvRows.push(values.join(','));
  }

  const BOM = '\uFEFF';
  const csvContent = BOM + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Convert data to formatted JSON and trigger a browser download.
 */
export function exportToJSON(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Create a temporary anchor element and trigger a download from a Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
