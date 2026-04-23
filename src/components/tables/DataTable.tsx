'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  SearchX,
  LayoutGrid,
  List,
  Rows3,
  Rows4,
  Columns3,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DensityMode = 'compact' | 'comfortable';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  mobileCardRender?: (item: TData) => React.ReactNode;
  zebraStriping?: boolean;
  onSearchChange?: (value: string) => void;
  isRowSelected?: (row: TData) => boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  mobileCardRender,
  zebraStriping = false,
  onSearchChange,
  isRowSelected,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [density, setDensity] = useState<DensityMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('quacktrack-table-density');
      return (stored === 'compact' || stored === 'comfortable') ? stored : 'comfortable';
    }
    return 'comfortable';
  });
  const [searchFocused, setSearchFocused] = useState(false);

  // Persist density preference to localStorage
  useEffect(() => {
    localStorage.setItem('quacktrack-table-density', density);
  }, [density]);

  const isCompact = density === 'compact';

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const totalRowCount = data.length;
  const hasActiveSearch = searchKey ? ((table.getColumn(searchKey)?.getFilterValue() as string) ?? '') !== '' : false;

  const handleClearSearch = useCallback(() => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue('');
      onSearchChange?.('');
    }
  }, [searchKey, table, onSearchChange]);
  const pageStart =
    filteredRowCount > 0
      ? table.getState().pagination.pageIndex * pageSize + 1
      : 0;
  const pageEnd = Math.min(
    (table.getState().pagination.pageIndex + 1) * pageSize,
    filteredRowCount
  );

  return (
    <div className="space-y-4">
      {/* Search, View Toggle, and Density Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Row Count Indicator */}
        {totalRowCount > 0 && (
          <span className="row-count-indicator order-last sm:order-first sm:mr-auto">
            Showing {filteredRowCount} of {totalRowCount} {totalRowCount === 1 ? 'entry' : 'entries'}
            {hasActiveSearch && ' (filtered)'}
          </span>
        )}
        {searchKey && (
          <div className={cn("table-search-wrapper flex-1 max-w-full sm:max-w-sm", searchFocused && "focus-glow")}>
            <Search className={cn("table-search-icon absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200", searchFocused ? "text-emerald-500" : "text-muted-foreground")} />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(e) => {
                table.getColumn(searchKey)?.setFilterValue(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="pl-9 pr-8"
            />
            {(table.getColumn(searchKey)?.getFilterValue() as string) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <div className="flex gap-1 sm:ml-auto">
          {/* Column Visibility Toggle — only show when > 3 columns */}
          {columns.length > 3 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <Columns3 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Toggle columns</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id.replace(/([A-Z])/g, ' $1').trim()}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Density Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCompact ? 'default' : 'outline'}
                size="icon"
                onClick={() => setDensity(isCompact ? 'comfortable' : 'compact')}
                className={cn(
                  'h-9 w-9',
                  isCompact && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {isCompact ? (
                  <Rows3 className="h-4 w-4" />
                ) : (
                  <Rows4 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isCompact ? 'Switch to comfortable rows' : 'Switch to compact rows'}
            </TooltipContent>
          </Tooltip>
          {mobileCardRender && (
            <>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('table')}
                className="h-9 w-9"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('cards')}
                className="h-9 w-9"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className={cn(
        "rounded-lg border bg-card card-inner-glow overflow-hidden",
        viewMode === 'cards' && mobileCardRender ? 'hidden' : ''
      )}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="table-header-gradient sticky top-0 z-10 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'whitespace-nowrap transition-colors duration-150',
                        isCompact ? 'h-8 px-2 text-xs' : 'h-10 px-2 text-sm',
                        header.column.getCanSort() && 'cursor-pointer select-none hover:bg-muted/50'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className={cn(
                        'flex items-center gap-1',
                        header.column.getCanSort() && 'justify-between'
                      )}>
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() && (
                          <span className="flex-shrink-0 ml-1 transition-transform duration-200">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-emerald-500" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'table-row-hover table-row-glow transition-colors duration-150',
                      'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
                      index % 2 !== 0 && 'bg-muted/30',
                      isRowSelected?.(row.original) && 'table-row-selected'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          isCompact && 'py-1.5 px-2 text-xs'
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48">
                    <div className="table-empty-state">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 border border-border/50">
                        <SearchX className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No results found</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Card View (works on all screen sizes) */}
      {mobileCardRender && viewMode === 'cards' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(index * 0.04, 0.4),
                    ease: 'easeOut',
                  }}
                  className="overflow-hidden rounded-xl card-shine data-card-item glass-card-elevated border bg-card p-4 transition-colors duration-150 hover:bg-muted/50"
                >
                  {mobileCardRender(row.original)}
                </motion.div>
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border bg-card p-8 text-center text-muted-foreground col-span-full"
              >
                No results found.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination with Row Count */}
      <div className="pagination-container">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap tabular-nums">
            {pageStart}–{pageEnd} of {filteredRowCount} {filteredRowCount === 1 ? 'row' : 'rows'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="pagination-btn h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="pagination-btn h-8 w-8"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <span className="page-info-badge">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
