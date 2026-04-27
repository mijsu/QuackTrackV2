export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  studentId?: string;
  createdAt: Date;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  instructorId: string;
  instructorName: string;
  createdAt: Date;
}

export interface Enrollment {
  id: string;
  studentId: string;
  subjectId: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}

export interface Evaluation {
  id: string;
  studentId: string;
  subjectId: string;
  facultyId: string;
  responses: EvaluationResponse[];
  totalScore: number;
  submittedAt: Date;
}

export interface EvaluationResponse {
  section: string;
  itemIndex: number;
  question: string;
  rating: number;
}

export interface Faculty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string; // Prof., Mr., Engr., Dr., etc.
  department: string;
  createdAt: Date;
}

export interface SystemSettings {
  id: string;
  evaluationOpen: boolean;
  currentSemester: string;
  currentYear: string;
  updatedAt: Date;
}

export interface EvaluationFormData {
  studentId: string;
  subjectId: string;
  facultyId: string;
  responses: EvaluationResponse[];
}
