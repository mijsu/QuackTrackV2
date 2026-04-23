'use client';

import { useState, useEffect, useMemo, useRef, React } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus, MoreHorizontal, Pencil, Trash2, DoorOpen, Building2,
  X, Users, Maximize, Monitor, FlaskConical, GraduationCap,
  ArrowDownAZ, ArrowUpZA, ArrowDownNarrowWide, ArrowUpNarrowWide,
  CheckCircle, XCircle, Download, Eye, MapPin, LayoutGrid, List,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RoomQuickViewModal } from './RoomQuickViewModal';
import type { Room } from '@/types';
import { EQUIPMENT_OPTIONS } from '@/types';
import { useAppStore } from '@/store';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExportButton } from '@/components/ui/ExportButton';
import { FilterBar, type FilterBarFilter } from '@/components/ui/FilterBar';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { useCountUp } from '@/hooks/use-count-up';

const ROOMS_CSV_TEMPLATE = [
  { RoomName: 'Room101', Building: 'Main Building', Capacity: '40', Type: 'lecture', Floor: '1', Equipment: '' },
  { RoomName: 'Lab201', Building: 'Science Building', Capacity: '30', Type: 'laboratory', Floor: '2', Equipment: 'Laboratory Equipment, Projector' },
];

type RoomType = 'Laboratory' | 'Lecture' | 'Computer';

function getRoomType(room: Room): RoomType {
  const equipment = Array.isArray(room.equipment) ? room.equipment : [];
  if (equipment.some(e => e.toLowerCase().includes('lab'))) return 'Laboratory';
  if (equipment.some(e => e.toLowerCase().includes('computer') || e.toLowerCase().includes('software'))) return 'Computer';
  return 'Lecture';
}

function getRoomTypeBadge(type: RoomType) {
  switch (type) {
    case 'Laboratory':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/25 text-xs font-medium">
          <FlaskConical className="h-3 w-3 mr-1" />
          Lab
        </Badge>
      );
    case 'Lecture':
      return (
        <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25 hover:bg-teal-500/25 text-xs font-medium">
          <GraduationCap className="h-3 w-3 mr-1" />
          Lecture
        </Badge>
      );
    case 'Computer':
      return (
        <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25 hover:bg-violet-500/25 text-xs font-medium">
          <Monitor className="h-3 w-3 mr-1" />
          Computer
        </Badge>
      );
  }
}

// Room card color sets for gradient left borders and icon styling
const CARD_COLOR_SETS = [
  { border: 'from-emerald-500 to-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400' },
  { border: 'from-teal-500 to-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-500/20', iconText: 'text-teal-600 dark:text-teal-400' },
  { border: 'from-amber-500 to-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
  { border: 'from-violet-500 to-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-500/20', iconText: 'text-violet-600 dark:text-violet-400' },
  { border: 'from-rose-500 to-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-400' },
  { border: 'from-cyan-500 to-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-500/20', iconText: 'text-cyan-600 dark:text-cyan-400' },
];

// Stat card configuration for animated stats
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  iconText: string;
  delay?: number;
  formatFn?: (n: number) => string;
}

function StatCardItem({ label, value, icon: Icon, gradientFrom, gradientTo, iconBg, iconText, delay = 0, formatFn }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const animatedValue = useCountUp(value, 800, isInView);
  const displayValue = formatFn ? formatFn(animatedValue) : String(animatedValue);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      <Card className="card-hover gradient-border stat-card-shine transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className={cn('h-1 rounded-t-lg bg-gradient-to-r', gradientFrom, gradientTo)} />
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="text-2xl font-bold mt-1 tabular-nums">{displayValue}</div>
            </div>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('h-5 w-5', iconText)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

type SortOption = 'name-asc' | 'name-desc' | 'capacity-high' | 'capacity-low';

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof ArrowDownAZ }[] = [
  { value: 'name-asc', label: 'Name A–Z', icon: ArrowDownAZ },
  { value: 'name-desc', label: 'Name Z–A', icon: ArrowUpZA },
  { value: 'capacity-high', label: 'Capacity High–Low', icon: ArrowDownNarrowWide },
  { value: 'capacity-low', label: 'Capacity Low–High', icon: ArrowUpNarrowWide },
];

export function RoomsView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quickViewRoom, setQuickViewRoom] = useState<Room | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  // Display mode: cards vs table
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');

  // Filter & sort state
  const [activeTypeFilters, setActiveTypeFilters] = useState<Set<string>>(new Set());
  const [activeAvailabilityFilter, setActiveAvailabilityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');

  // Get conflict resolution context from store
  const { conflictResolutionContext, clearConflictResolutionContext } = useAppStore();

  useEffect(() => {
    fetchRooms();
  }, []);

  // Handle conflict resolution context - open add modal with minimum capacity
  useEffect(() => {
    if (!loading && conflictResolutionContext) {
      const { addRoomMinCapacity } = conflictResolutionContext;

      if (addRoomMinCapacity) {
        setSelectedRoom(null);
        setFormData({
          roomName: '',
          roomCode: '',
          capacity: addRoomMinCapacity,
          equipment: [],
          building: '',
          floor: 1,
        });
        setFormErrors({});
        setDialogOpen(true);
        clearConflictResolutionContext();
        toast.info(`Adding room with minimum capacity of ${addRoomMinCapacity} students`);
      }
    }
  }, [loading, conflictResolutionContext]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRoom(null);
    setFormData({
      roomName: '',
      roomCode: '',
      capacity: 40,
      equipment: [],
      building: '',
      floor: 1,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    setFormData({
      roomName: room.roomName,
      roomCode: room.roomCode || '',
      capacity: room.capacity,
      equipment: Array.isArray(room.equipment) ? room.equipment : [],
      building: room.building,
      floor: room.floor,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEquipmentToggle = (equipmentItem: string) => {
    const currentEquipment = (formData.equipment as string[]) || [];
    const newEquipment = currentEquipment.includes(equipmentItem)
      ? currentEquipment.filter((e) => e !== equipmentItem)
      : [...currentEquipment, equipmentItem];
    setFormData({ ...formData, equipment: newEquipment });
  };

  const handleDelete = (room: Room) => {
    setSelectedRoom(room);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.roomName || (formData.roomName as string).trim() === '') {
      errors.roomName = 'Room name is required';
    }

    if (!formData.capacity || (formData.capacity as number) < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }

    if (!formData.building || (formData.building as string).trim() === '') {
      errors.building = 'Building is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = selectedRoom ? `/api/rooms/${selectedRoom.id}` : '/api/rooms';
      const method = selectedRoom ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedRoom ? 'Room updated' : 'Room created');
        setDialogOpen(false);
        fetchRooms();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Operation failed');
      }
    } catch {
      toast.error('Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRoom) return;

    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Room deleted');
        setDeleteDialogOpen(false);
        fetchRooms();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  // Batch selection handlers
  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRows = () => {
    setSelectedRows(new Set(sortedRooms.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const batchDeleteSelected = async (ids: string[]) => {
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} room${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} room${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchRooms();
  };

  const exportSelected = (ids: string[]) => {
    const selected = sortedRooms.filter(r => ids.includes(r.id));
    if (selected.length === 0) return;
    const data = selected.map(r => ({
      Name: r.roomName,
      Code: r.roomCode || '',
      Type: getRoomType(r),
      Building: r.building,
      Capacity: r.capacity,
      Equipment: Array.isArray(r.equipment) ? r.equipment.join('; ') : '',
      Status: r.isActive ? 'Active' : 'Inactive',
    }));
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-rooms.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} rooms`);
  };

  const handleImportRooms = async (data: Record<string, string>[]) => {
    try {
      const res = await fetch('/api/rooms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: data }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.imported > 0) {
          toast.success(result.message || `Successfully imported ${result.imported} room${result.imported !== 1 ? 's' : ''}`);
        }
        if (result.failed > 0) {
          const errorDetails = result.errors
            ? ` — ${result.errors.map((e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`).slice(0, 5).join('; ')}${result.errors.length > 5 ? '...' : ''}`
            : '';
          toast.error(`Failed to import ${result.failed} record${result.failed !== 1 ? 's' : ''}.${errorDetails}`);
        }
      } else {
        toast.error(result.error || 'Failed to import rooms');
      }
    } catch {
      toast.error('Failed to import rooms');
    }

    fetchRooms();
  };

  // Extract unique buildings from rooms
  const uniqueBuildings = useMemo(() => {
    const buildings = new Set(rooms.map(room => room.building).filter(Boolean));
    return Array.from(buildings).sort();
  }, [rooms]);

  // Compute counts per room type for filter badges
  const roomTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { Laboratory: 0, Lecture: 0, Computer: 0 };
    rooms.forEach((r) => {
      const type = getRoomType(r);
      counts[type]++;
    });
    return counts;
  }, [rooms]);

  const activeRoomsCount = useMemo(() => rooms.filter(r => r.isActive).length, [rooms]);
  const inactiveRoomsCount = useMemo(() => rooms.filter(r => !r.isActive).length, [rooms]);

  // Computed stats for animated cards
  const totalCapacity = useMemo(() => rooms.reduce((sum, r) => sum + r.capacity, 0), [rooms]);
  const avgCapacity = useMemo(() => rooms.length > 0 ? Math.round(totalCapacity / rooms.length) : 0, [rooms, totalCapacity]);

  // Build FilterBar filters
  const filterBarFilters: FilterBarFilter[] = useMemo(() => [
    {
      key: 'Laboratory',
      label: 'Lab',
      icon: FlaskConical,
      count: roomTypeCounts['Laboratory'],
      active: activeTypeFilters.has('Laboratory'),
    },
    {
      key: 'Lecture',
      label: 'Lecture',
      icon: GraduationCap,
      count: roomTypeCounts['Lecture'],
      active: activeTypeFilters.has('Lecture'),
    },
    {
      key: 'Computer',
      label: 'Computer',
      icon: Monitor,
      count: roomTypeCounts['Computer'],
      active: activeTypeFilters.has('Computer'),
    },
    {
      key: 'active',
      label: 'Active',
      icon: CheckCircle,
      count: activeRoomsCount,
      active: activeAvailabilityFilter === 'active',
    },
    {
      key: 'inactive',
      label: 'Inactive',
      icon: XCircle,
      count: inactiveRoomsCount,
      active: activeAvailabilityFilter === 'inactive',
    },
  ], [activeTypeFilters, activeAvailabilityFilter, roomTypeCounts, activeRoomsCount, inactiveRoomsCount]);

  const handleFilterToggle = (key: string) => {
    if (key === 'active' || key === 'inactive') {
      setActiveAvailabilityFilter(prev => prev === key ? 'all' : key);
    } else {
      setActiveTypeFilters(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    }
  };

  const handleClearAllFilters = () => {
    setActiveTypeFilters(new Set());
    setActiveAvailabilityFilter('all');
  };

  // Filter rooms based on selected filters
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Type filter
      if (activeTypeFilters.size > 0) {
        const type = getRoomType(room);
        if (!activeTypeFilters.has(type)) return false;
      }
      // Availability filter
      if (activeAvailabilityFilter === 'active' && !room.isActive) return false;
      if (activeAvailabilityFilter === 'inactive' && room.isActive) return false;
      return true;
    });
  }, [rooms, activeTypeFilters, activeAvailabilityFilter]);

  // Sort filtered rooms
  const sortedRooms = useMemo(() => {
    const sorted = [...filteredRooms];
    switch (sortOption) {
      case 'name-asc':
        sorted.sort((a, b) => a.roomName.localeCompare(b.roomName));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.roomName.localeCompare(a.roomName));
        break;
      case 'capacity-high':
        sorted.sort((a, b) => b.capacity - a.capacity);
        break;
      case 'capacity-low':
        sorted.sort((a, b) => a.capacity - b.capacity);
        break;
    }
    return sorted;
  }, [filteredRooms, sortOption]);

  const activeFilterCount = activeTypeFilters.size + (activeAvailabilityFilter !== 'all' ? 1 : 0);

  const currentSort = SORT_OPTIONS.find(s => s.value === sortOption);

  const columns: ColumnDef<Room>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={sortedRooms.length}
          onSelectAll={selectAllRows}
          onClearSelection={clearSelection}
        />
      ),
      cell: ({ row }) => {
        const isSelected = selectedRows.has(row.original.id);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); toggleRow(row.original.id); }}
            className={cn(
              'flex items-center justify-center h-4 w-4 rounded border transition-all duration-150',
              isSelected
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-input bg-background hover:bg-muted'
            )}
            aria-label={isSelected ? 'Deselect row' : 'Select row'}
          >
            {isSelected && (
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      },
    },
    {
      accessorKey: 'roomName',
      header: 'Room Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.roomName}</p>
          {row.original.roomCode && (
            <p className="text-xs text-muted-foreground">{row.original.roomCode}</p>
          )}
        </div>
      ),
    },
    {
      id: 'roomType',
      header: 'Room Type',
      accessorFn: (row) => getRoomType(row),
      cell: ({ row }) => getRoomTypeBadge(getRoomType(row.original)),
    },
    {
      accessorKey: 'building',
      header: 'Building',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <span>{row.original.building}</span>
        </div>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => {
        const capacity = row.original.capacity;
        const maxCapacity = Math.max(...rooms.map(r => r.capacity), 1);
        const utilizationRatio = capacity / maxCapacity;
        const barColor = utilizationRatio < 0.5 ? 'bg-emerald-500' : utilizationRatio < 0.8 ? 'bg-amber-500' : 'bg-rose-500';
        const textColor = utilizationRatio < 0.5 ? 'text-emerald-600 dark:text-emerald-400' : utilizationRatio < 0.8 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
        return (
          <div className="min-w-[100px]">
            <Badge variant="secondary" className={`gap-1 ${textColor}`}>
              <Users className="h-3 w-3" />
              {capacity} seats
            </Badge>
            <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.max(utilizationRatio * 100, 4)}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'equipment',
      header: 'Equipment',
      cell: ({ row }) => {
        const equipment = row.original.equipment;
        if (!equipment || equipment.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {equipment.slice(0, 3).map((eq, i) => (
              <Badge key={i} variant="outline" className="text-xs">{eq}</Badge>
            ))}
            {equipment.length > 3 && (
              <Badge variant="outline" className="text-xs">+{equipment.length - 3}</Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const room = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(room)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setQuickViewRoom(room);
                setQuickViewOpen(true);
              }}>
                <Eye className="mr-2 h-4 w-4" />
                Quick View
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(room)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Card view renderer for DataTable
  const renderRoomCard = (room: Room) => {
    const roomType = getRoomType(room);
    const isSelected = selectedRows.has(room.id);
    return (
      <div className={cn(
        'group relative flex flex-col gap-3',
        isSelected && '-m-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
      )}>
        {/* Selection checkbox top-left */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleRow(room.id)}
            className={cn(
              'flex-shrink-0 flex items-center justify-center h-5 w-5 rounded border transition-all duration-150',
              isSelected
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-input bg-background hover:bg-muted'
            )}
            aria-label={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected && (
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {/* Room type badge top-right */}
          <div className="opacity-100 group-hover:opacity-100 transition-opacity duration-200">
            {getRoomTypeBadge(roomType)}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2.5 rounded-lg shrink-0 transition-colors duration-200',
            roomType === 'Laboratory' && 'bg-emerald-500/10 group-hover:bg-emerald-500/15',
            roomType === 'Lecture' && 'bg-teal-500/10 group-hover:bg-teal-500/15',
            roomType === 'Computer' && 'bg-violet-500/10 group-hover:bg-violet-500/15',
          )}>
            {roomType === 'Laboratory' && <FlaskConical className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            {roomType === 'Lecture' && <GraduationCap className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
            {roomType === 'Computer' && <Monitor className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors duration-200">
              {room.roomName}
            </p>
            {room.roomCode && (
              <p className="text-xs text-muted-foreground font-mono">{room.roomCode}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-teal-500" />
            <span className="truncate">{room.building}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>{room.capacity} seats</span>
            </div>
            {(() => {
              const maxCap = Math.max(...rooms.map(r => r.capacity), 1);
              const ratio = room.capacity / maxCap;
              const barColor = ratio < 0.5 ? 'bg-emerald-500' : ratio < 0.8 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.max(ratio * 100, 4)}%` }} />
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1 border-t mt-auto">
          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => handleEdit(room)}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(room)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <DoorOpen className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Rooms</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground">Manage classrooms and facilities</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Display Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('cards')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                displayMode === 'cards'
                  ? 'bg-background shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                displayMode === 'table'
                  ? 'bg-background shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          <ExportButton
            data={sortedRooms.map(r => ({
              'Room Name': r.roomName,
              'Room Type': getRoomType(r),
              'Building': r.building,
              'Capacity': r.capacity,
              'Equipment': Array.isArray(r.equipment) ? r.equipment.join(', ') : '',
              'Status': r.isActive ? 'Active' : 'Inactive',
            }))}
            filename="rooms-export"
          />
          <CsvImportButton
            onImport={handleImportRooms}
            templateData={ROOMS_CSV_TEMPLATE}
            templateFilename="rooms-template.csv"
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards with useCountUp */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardItem
          label="Total Rooms"
          value={rooms.length}
          icon={DoorOpen}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconText="text-emerald-600 dark:text-emerald-400"
          delay={0}
        />
        <StatCardItem
          label="Buildings"
          value={uniqueBuildings.length}
          icon={Building2}
          gradientFrom="from-teal-500"
          gradientTo="to-teal-400"
          iconBg="bg-teal-50 dark:bg-teal-500/10"
          iconText="text-teal-600 dark:text-teal-400"
          delay={0.08}
        />
        <StatCardItem
          label="Total Capacity"
          value={totalCapacity}
          icon={Users}
          gradientFrom="from-amber-500"
          gradientTo="to-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-500/10"
          iconText="text-amber-600 dark:text-amber-400"
          delay={0.16}
          formatFn={(n) => n.toLocaleString()}
        />
        <StatCardItem
          label="Avg Capacity"
          value={avgCapacity}
          icon={Maximize}
          gradientFrom="from-violet-500"
          gradientTo="to-violet-400"
          iconBg="bg-violet-50 dark:bg-violet-500/10"
          iconText="text-violet-600 dark:text-violet-400"
          delay={0.24}
        />
      </div>

      {/* FilterBar + Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <FilterBar
              filters={filterBarFilters}
              onToggle={handleFilterToggle}
              onClearAll={handleClearAllFilters}
              className="flex-wrap"
            />
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0">
                {currentSort && <currentSort.icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{currentSort?.label ?? 'Sort'}</span>
                <span className="sm:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortOption(opt.value)}
                    className={cn(sortOption === opt.value && 'bg-accent')}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {opt.label}
                    {sortOption === opt.value && (
                      <CheckCircle className="ml-auto h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Results count */}
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {sortedRooms.length} of {rooms.length} rooms
          {activeFilterCount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 ml-1">
              ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)
            </span>
          )}
        </div>
      </div>

      {/* Empty State */}
      {sortedRooms.length === 0 && (
        <EmptyState
          icon={DoorOpen}
          title="No rooms found"
          description={activeFilterCount > 0
            ? 'No rooms match the current filters. Try adjusting your filter criteria.'
            : 'Get started by adding your first classroom or facility.'}
          action={{
            label: activeFilterCount > 0 ? 'Clear Filters' : 'Add Room',
            onClick: activeFilterCount > 0 ? handleClearAllFilters : handleCreate,
          }}
          secondaryAction={activeFilterCount > 0 ? {
            label: 'Add Room',
            onClick: handleCreate,
          } : undefined}
        />
      )}

      {/* Card View */}
      {sortedRooms.length > 0 && displayMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRooms.map((room, index) => {
            const roomType = getRoomType(room);
            const colors = CARD_COLOR_SETS[index % CARD_COLOR_SETS.length];
            const maxCapacity = Math.max(...rooms.map(r => r.capacity), 1);
            const utilizationRatio = room.capacity / maxCapacity;

            // Capacity badge color coding
            let capacityBadgeClass = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
            if (utilizationRatio >= 0.8) {
              capacityBadgeClass = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400';
            } else if (utilizationRatio >= 0.5) {
              capacityBadgeClass = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
            }

            // Capacity bar color
            const barColor = utilizationRatio < 0.5 ? 'bg-emerald-500' : utilizationRatio < 0.8 ? 'bg-amber-500' : 'bg-rose-500';

            // Room type icon
            const RoomTypeIcon = roomType === 'Laboratory' ? FlaskConical : roomType === 'Computer' ? Monitor : GraduationCap;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] border-l-4 border-l-transparent">
                  {/* Gradient left border overlay */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b', colors.border)} />

                  <CardContent className="pt-5 pl-5">
                    {/* Top row: Icon + Name + Type badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colors.iconBg)}>
                          <RoomTypeIcon className={cn('h-5 w-5', colors.iconText)} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{room.roomName}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {room.roomCode && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">{room.roomCode}</Badge>
                            )}
                            {getRoomTypeBadge(roomType)}
                          </div>
                        </div>
                      </div>

                      {/* Hover actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(room)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(room)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Building / Floor info */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-teal-500 shrink-0" />
                        <span className="truncate">{room.building}</span>
                        {room.floor != null && (
                          <span className="text-muted-foreground/60">· Floor {room.floor}</span>
                        )}
                      </div>
                    </div>

                    {/* Capacity badge & bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', capacityBadgeClass)}>
                          <Users className="h-3.5 w-3.5" />
                          <span>{room.capacity} seats</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${Math.max(utilizationRatio * 100, 4)}%` }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-xs font-medium text-teal-700 dark:text-teal-400">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{room.building}</span>
                      </span>
                      {room.floor != null && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-xs font-medium text-violet-700 dark:text-violet-400">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Floor {room.floor}</span>
                        </span>
                      )}
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                        room.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      )}>
                        {room.isActive ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span>{room.isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {sortedRooms.length > 0 && displayMode === 'table' && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={sortedRooms}
              searchKey="roomName"
              searchPlaceholder="Search rooms..."
              isRowSelected={(room) => selectedRows.has(room.id)}
              mobileCardRender={renderRoomCard}
            />
          </CardContent>
        </Card>
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedIds={Array.from(selectedRows)}
        totalCount={sortedRooms.length}
        onClearSelection={clearSelection}
        onSelectAll={selectAllRows}
        actions={[
          {
            id: 'delete-selected',
            label: 'Delete Selected',
            icon: Trash2,
            variant: 'destructive',
            onClick: () => setBatchDeleteDialogOpen(true),
          },
          {
            id: 'export-selected',
            label: 'Export Selected',
            icon: Download,
            onClick: (ids) => exportSelected(ids),
          },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <DoorOpen className="h-4 w-4 text-emerald-600" />
              </div>
              {selectedRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
            <DialogDescription>
              {selectedRoom ? 'Update room information below.' : 'Fill in the details to add a new room.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name <span className="text-destructive">*</span></Label>
              <Input
                id="roomName"
                value={formData.roomName as string || ''}
                onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                className={formErrors.roomName ? 'border-destructive' : ''}
              />
              {formErrors.roomName && <p className="text-xs text-destructive">{formErrors.roomName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="building">Building <span className="text-destructive">*</span></Label>
              <Input
                id="building"
                value={formData.building as string || ''}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className={formErrors.building ? 'border-destructive' : ''}
              />
              {formErrors.building && <p className="text-xs text-destructive">{formErrors.building}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity <span className="text-destructive">*</span></Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity as number || 40}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className={formErrors.capacity ? 'border-destructive' : ''}
              />
              {formErrors.capacity && <p className="text-xs text-destructive">{formErrors.capacity}</p>}
            </div>
            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => {
                    const currentEquipment = (formData.equipment as string[]) || [];
                    const isChecked = currentEquipment.includes(item);
                    return (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={`equipment-${item}`}
                          checked={isChecked}
                          onCheckedChange={() => handleEquipmentToggle(item)}
                        />
                        <label
                          htmlFor={`equipment-${item}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {item}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Select the equipment available in this room</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedRoom ? 'Update Room' : 'Create Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Room
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedRoom?.roomName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Selected Rooms
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} room{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => batchDeleteSelected(Array.from(selectedRows))} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Room Quick View Modal */}
      <RoomQuickViewModal
        roomId={quickViewRoom?.id ?? null}
        roomName={quickViewRoom?.roomName ?? ''}
        isOpen={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </motion.div>
  );
}
