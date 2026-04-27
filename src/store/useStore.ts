import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: 'student' | 'admin';
  createdAt: Date;
}

interface Subject {
  id: string;
  code: string;
  title: string;
  instructorId: string;
  instructorName: string;
  semester: string;
  schoolYear: string;
  evaluationStatus: string;
}

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Current page
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Selected role
  role: 'student' | 'admin' | '';
  setRole: (role: 'student' | 'admin' | '') => void;

  // Selected subject
  selectedSubject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void;

  // Subjects list
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, currentPage: 'role-selection', role: '', selectedSubject: null, subjects: [] }),

  // Current page
  currentPage: 'role-selection',
  setCurrentPage: (currentPage) => set({ currentPage }),

  // Selected role
  role: '',
  setRole: (role) => set({ role }),

  // Selected subject
  selectedSubject: null,
  setSelectedSubject: (selectedSubject) => set({ selectedSubject }),

  // Subjects list
  subjects: [],
  setSubjects: (subjects) => set({ subjects }),

  // Loading state
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Error state
  error: null,
  setError: (error) => set({ error }),
}));
