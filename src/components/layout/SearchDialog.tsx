'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAppStore, type ViewMode } from '@/store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  DoorOpen,
  Layers,
  Building2,
  GraduationCap,
  BookMarked,
  Loader2,
  Search,
  SearchX,
} from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  secondary?: string;
  viewMode: ViewMode;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

// Custom event for external components to open the search dialog
export function openSearchDialog() {
  window.dispatchEvent(new CustomEvent('quacktrack:open-search'));
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setViewMode } = useAppStore();

  // Keyboard shortcut to open search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for external open events
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener('quacktrack:open-search', handleOpenEvent);
    return () => window.removeEventListener('quacktrack:open-search', handleOpenEvent);
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setInitialLoad(false);
    }
  }, [open]);

  const fetchResults = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const fetchAll = [
        fetch('/api/users').then(r => r.json()).then(data => 
          (Array.isArray(data) ? data : data.users || []).map((u: { id: string; name: string; department?: { name: string } | null; email?: string }) => ({
            id: u.id,
            name: u.name,
            secondary: u.department?.name || u.email || 'Faculty',
            viewMode: 'faculty' as ViewMode,
            icon: Users,
            category: 'Faculty',
          }))
        ).catch(() => []),
        fetch('/api/subjects').then(r => r.json()).then(data =>
          (Array.isArray(data) ? data : []).map((s: { id: string; subjectCode?: string; descriptiveTitle?: string; title?: string }) => ({
            id: s.id,
            name: s.descriptiveTitle || s.title || 'Untitled',
            secondary: s.subjectCode || '',
            viewMode: 'subjects' as ViewMode,
            icon: BookOpen,
            category: 'Subjects',
          }))
        ).catch(() => []),
        fetch('/api/rooms').then(r => r.json()).then(data =>
          (Array.isArray(data) ? data : []).map((r: { id: string; roomName?: string; name?: string; building?: string; capacity?: number }) => ({
            id: r.id,
            name: r.roomName || r.name || 'Untitled',
            secondary: r.building ? `${r.building}${r.capacity ? ` · Cap: ${r.capacity}` : ''}` : r.capacity ? `Capacity: ${r.capacity}` : '',
            viewMode: 'rooms' as ViewMode,
            icon: DoorOpen,
            category: 'Rooms',
          }))
        ).catch(() => []),
        fetch('/api/sections').then(r => r.json()).then(data =>
          (Array.isArray(data) ? data : []).map((s: { id: string; sectionName?: string; name?: string; yearLevel?: string; department?: { name: string } | null }) => ({
            id: s.id,
            name: s.sectionName || s.name || 'Untitled',
            secondary: s.department?.name || s.yearLevel || '',
            viewMode: 'sections' as ViewMode,
            icon: Layers,
            category: 'Sections',
          }))
        ).catch(() => []),
        fetch('/api/departments').then(r => r.json()).then(data =>
          (Array.isArray(data) ? data : []).map((d: { id: string; name?: string; code?: string; departmentName?: string }) => ({
            id: d.id,
            name: d.name || d.departmentName || 'Untitled',
            secondary: d.code || '',
            viewMode: 'departments' as ViewMode,
            icon: Building2,
            category: 'Departments',
          }))
        ).catch(() => []),
        fetch('/api/programs').then(r => r.json()).then(data =>
          (Array.isArray(data) ? data : []).map((p: { id: string; programName?: string; name?: string; code?: string; major?: string }) => ({
            id: p.id,
            name: p.programName || p.name || 'Untitled',
            secondary: p.code || p.major || '',
            viewMode: 'programs' as ViewMode,
            icon: GraduationCap,
            category: 'Programs',
          }))
        ).catch(() => []),
        fetch('/api/curricula').then(r => r.json()).then(data =>
          (Array.isArray(data) ? data : []).map((c: { id: string; curriculumName?: string; name?: string; program?: { programName?: string } | null; description?: string }) => ({
            id: c.id,
            name: c.curriculumName || c.name || 'Untitled',
            secondary: c.program?.programName || c.description || 'Curriculum',
            viewMode: 'curriculum' as ViewMode,
            icon: BookMarked,
            category: 'Curriculum',
          }))
        ).catch(() => []),
      ];

      const allResults = await Promise.all(fetchAll);
      const flatResults = allResults.flat();

      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase().trim();
        const filtered = flatResults.filter(
          (r) =>
            r.name.toLowerCase().includes(lowerQuery) ||
            (r.secondary && r.secondary.toLowerCase().includes(lowerQuery))
        );
        setResults(filtered);
      } else {
        // Show first 5 items per category when no search query
        const categoryOrder = ['Faculty', 'Subjects', 'Rooms', 'Sections', 'Departments', 'Programs', 'Curriculum'];
        const limited: SearchResult[] = [];
        for (const cat of categoryOrder) {
          const catItems = flatResults.filter((r) => r.category === cat).slice(0, 5);
          limited.push(...catItems);
        }
        setResults(limited);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      setResults([]);
    } finally {
      setLoading(false);
      setInitialLoad(true);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, open, fetchResults]);

  const handleSelect = (result: SearchResult) => {
    setViewMode(result.viewMode);
    setOpen(false);
  };

  // Group results by category
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const categoryOrder = ['Faculty', 'Subjects', 'Rooms', 'Sections', 'Departments', 'Programs', 'Curriculum'];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="search-input-wrapper">
        <CommandInput
          placeholder="Search faculty, subjects, rooms, curriculum..."
          value={query}
          onValueChange={setQuery}
        />
      </div>
      <CommandList>
        {!initialLoad && loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
        {initialLoad && !loading && results.length === 0 && (
          <CommandEmpty className="py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/50">
                <SearchX className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/60 max-w-[240px] text-center">
                  Try adjusting your search term or browse by category
                </p>
              </div>
            </div>
          </CommandEmpty>
        )}
        {loading && initialLoad && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Searching...</span>
          </div>
        )}
        {categoryOrder.map((category, index) => {
          const items = groupedResults[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={category}>
                {items.map((result) => {
                  const Icon = result.icon;
                  return (
                    <CommandItem
                      key={`${result.category}-${result.id}`}
                      value={`${result.category}-${result.name}`}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      <div className={cn(
                        'flex items-center justify-center h-7 w-7 rounded-lg shrink-0 mr-2',
                        result.category === 'Faculty' && 'bg-emerald-500/10',
                        result.category === 'Subjects' && 'bg-blue-500/10',
                        result.category === 'Rooms' && 'bg-amber-500/10',
                        result.category === 'Sections' && 'bg-violet-500/10',
                        result.category === 'Departments' && 'bg-teal-500/10',
                        result.category === 'Programs' && 'bg-rose-500/10',
                        result.category === 'Curriculum' && 'bg-emerald-500/10',
                      )}>
                        <Icon className={cn(
                          'h-3.5 w-3.5',
                          result.category === 'Faculty' && 'text-emerald-600 dark:text-emerald-400',
                          result.category === 'Subjects' && 'text-blue-600 dark:text-blue-400',
                          result.category === 'Rooms' && 'text-amber-600 dark:text-amber-400',
                          result.category === 'Sections' && 'text-violet-600 dark:text-violet-400',
                          result.category === 'Departments' && 'text-teal-600 dark:text-teal-400',
                          result.category === 'Programs' && 'text-rose-600 dark:text-rose-400',
                          result.category === 'Curriculum' && 'text-emerald-600 dark:text-emerald-400',
                        )} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm">{highlightMatch(result.name, query)}</span>
                        {result.secondary && (
                          <span className="truncate text-xs text-muted-foreground">
                            {highlightMatch(result.secondary, query)}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-auto text-[10px] px-1.5 py-0 shrink-0 font-normal border',
                          result.category === 'Faculty' && 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                          result.category === 'Subjects' && 'bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
                          result.category === 'Rooms' && 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
                          result.category === 'Sections' && 'bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
                          result.category === 'Departments' && 'bg-teal-500/5 text-teal-600 dark:text-teal-400 border-teal-500/20',
                          result.category === 'Programs' && 'bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
                          result.category === 'Curriculum' && 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                        )}
                      >
                        {result.category}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
      {/* Keyboard shortcut hint */}
      <div className="flex items-center justify-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground/50 select-none">
        <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd>
        <span>to close</span>
        <span className="text-muted-foreground/20">·</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
        <span>to navigate</span>
        <span className="text-muted-foreground/20">·</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
        <span>to select</span>
      </div>
    </CommandDialog>
  );
}

/** Utility: highlight matching text portions */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <span className="font-semibold text-foreground">{match}</span>
      {after}
    </>
  );
}
