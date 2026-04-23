'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, Calendar, Clock, MapPin, User, BookOpen, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleResult {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  status: string;
  subject?: {
    subjectCode: string;
    subjectName: string;
    units?: number;
  } | null;
  faculty?: {
    id: string;
    name: string;
  } | null;
  room?: {
    roomName: string;
    building?: string;
  } | null;
  section?: {
    sectionName: string;
  } | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 300;

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 text-[10px] px-1.5 py-0">
          Approved
        </Badge>
      );
    case 'generated':
      return (
        <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25 text-[10px] px-1.5 py-0">
          Generated
        </Badge>
      );
    case 'modified':
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 text-[10px] px-1.5 py-0">
          Modified
        </Badge>
      );
    case 'conflict':
      return (
        <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25 text-[10px] px-1.5 py-0">
          Conflict
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      );
  }
}

function filterSchedules(allSchedules: ScheduleResult[], query: string): ScheduleResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return allSchedules.filter((s) => {
    const subjectCode = (s.subject?.subjectCode || '').toLowerCase();
    const subjectName = (s.subject?.subjectName || '').toLowerCase();
    const facultyName = (s.faculty?.name || '').toLowerCase();
    const roomName = (s.room?.roomName || '').toLowerCase();
    const sectionName = (s.section?.sectionName || '').toLowerCase();
    const day = (s.day || '').toLowerCase();

    return (
      subjectCode.includes(q) ||
      subjectName.includes(q) ||
      facultyName.includes(q) ||
      roomName.includes(q) ||
      sectionName.includes(q) ||
      day.includes(q)
    );
  }).slice(0, MAX_RESULTS);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuickScheduleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScheduleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [allSchedules, setAllSchedules] = useState<ScheduleResult[]>([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setViewMode = useAppStore((s) => s.setViewMode);

  // Load all schedules once on mount for client-side filtering
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllSchedules(data);
          setAllLoaded(true);
        }
      }
    } catch {
      // Silently fail — search won't work until data is loaded
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search — all setState calls happen inside the setTimeout callback
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setHighlightIndex(-1);
        return;
      }

      if (!allLoaded) {
        return;
      }

      const filtered = filterSchedules(allSchedules, query);
      setResults(filtered);
      setHighlightIndex(-1);
      setOpen(true);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, allSchedules, allLoaded]);

  // Handle selecting a result
  const handleSelect = useCallback(
    (schedule: ScheduleResult) => {
      setOpen(false);
      setQuery('');
      // Navigate to Calendar view
      setViewMode('calendar');
    },
    [setViewMode]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < results.length) {
            handleSelect(results[highlightIndex]);
          }
          break;
        case 'Escape':
          setOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [open, results, highlightIndex, handleSelect]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-result-item]');
      const target = items[highlightIndex] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  // Handle "View all in Schedules" link
  const handleViewAll = useCallback(() => {
    setOpen(false);
    setQuery('');
    setViewMode('schedules');
  }, [setViewMode]);

  // Highlight matched text
  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const lowerText = text.toLowerCase();
    const lowerQ = q.toLowerCase();
    const idx = lowerText.indexOf(lowerQ);
    if (idx === -1) return text;

    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <Popover open={open && query.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search schedules, faculty, rooms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim() && results.length > 0) {
                setOpen(true);
              }
            }}
            className="pl-9 pr-4 h-9 bg-muted/50 border-border/50 focus:bg-background transition-colors text-sm"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <motion.div
                className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}
        </div>
      </PopoverTrigger>

      <AnimatePresence>
        {open && query.length > 0 && (
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            sideOffset={8}
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="rounded-lg border shadow-lg overflow-hidden"
            >
              {/* Results list */}
              <div
                ref={listRef}
                className="max-h-96 overflow-y-auto"
              >
                {loading && !allLoaded ? (
                  // Loading state
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    <motion.div
                      className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full mr-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Loading schedules...
                  </div>
                ) : results.length === 0 ? (
                  // No results state
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No schedules found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try searching by subject code, faculty name, room, or section
                    </p>
                  </div>
                ) : (
                  // Results
                  <div className="divide-y">
                    {results.map((schedule, index) => (
                      <button
                        key={schedule.id}
                        data-result-item
                        onClick={() => handleSelect(schedule)}
                        onMouseEnter={() => setHighlightIndex(index)}
                        className={cn(
                          'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                          index === highlightIndex
                            ? 'bg-emerald-500/5'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        {/* Subject icon */}
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-500/10 shrink-0 mt-0.5">
                          <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Subject code + name */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">
                              {schedule.subject?.subjectCode
                                ? highlightMatch(
                                    schedule.subject.subjectCode,
                                    query.trim()
                                  )
                                : 'N/A'}
                            </span>
                            {schedule.subject?.subjectName && (
                              <span className="text-xs text-muted-foreground truncate">
                                {highlightMatch(
                                  schedule.subject.subjectName,
                                  query.trim()
                                )}
                              </span>
                            )}
                          </div>

                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            {schedule.faculty?.name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {highlightMatch(schedule.faculty.name, query.trim())}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {DAY_SHORT[schedule.day] || schedule.day}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime12(schedule.startTime)}–
                              {formatTime12(schedule.endTime)}
                            </span>
                            {schedule.room?.roomName && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {highlightMatch(schedule.room.roomName, query.trim())}
                              </span>
                            )}
                            {schedule.section?.sectionName && (
                              <span className="flex items-center gap-1">
                                Sec: {highlightMatch(schedule.section.sectionName, query.trim())}
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div>{getStatusBadge(schedule.status)}</div>
                        </div>

                        {/* Arrow indicator */}
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 mt-2 transition-opacity',
                            index === highlightIndex
                              ? 'opacity-100 text-emerald-500'
                              : 'opacity-0 group-hover:opacity-50'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with view all link */}
              {results.length > 0 && (
                <div className="border-t bg-muted/30 px-4 py-2.5">
                  <button
                    onClick={handleViewAll}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                  >
                    <span>View all in Schedules</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
