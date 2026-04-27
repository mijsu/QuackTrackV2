// Firestore Database Helper v3
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where as whereClause, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTIXZcNDAJU-VwA93fVNdvqgWmIgZIpwA",
  authDomain: "evaluation-b38b8.firebaseapp.com",
  projectId: "evaluation-b38b8",
  storageBucket: "evaluation-b38b8.firebasestorage.app",
  messagingSenderId: "658850406057",
  appId: "1:658850406057:web:02c9580815489ac65293b8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Helper to generate unique ID
export const generateId = () => {
  return doc(collection(firestore, '_')).id;
};

// Helper to safely parse JSON
const safeJsonParse = (value: any, defaultValue: any = []) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

// Firestore database helper
export const db = {
  // User operations
  user: {
    count: async ({ where }: { where?: any } = {}) => {
      const constraints: any[] = [];
      if (where?.role) constraints.push(whereClause('role', '==', where.role));
      
      const q = query(collection(firestore, 'users'), ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.size;
    },
    
    findFirst: async ({ where }: { where: { username?: string; role?: string; studentId?: string; id?: string } }) => {
      const constraints: any[] = [];
      if (where.username) constraints.push(whereClause('username', '==', where.username));
      if (where.role) constraints.push(whereClause('role', '==', where.role));
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      if (where.id) constraints.push(whereClause('id', '==', where.id));
      
      const q = query(collection(firestore, 'users'), ...constraints);
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },
    
    findUnique: async ({ where }: { where: { id?: string; username?: string; studentId?: string } }) => {
      if (where.id) {
        const docRef = doc(firestore, 'users', where.id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      const constraints: any[] = [];
      if (where.username) constraints.push(whereClause('username', '==', where.username));
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      
      const q = query(collection(firestore, 'users'), ...constraints);
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },
    
    findMany: async ({ where, orderBy: orderClause }: { where?: any; orderBy?: any } = {}) => {
      const constraints: any[] = [];
      if (where?.role) constraints.push(whereClause('role', '==', where.role));
      
      const q = query(collection(firestore, 'users'), ...constraints);
      const snapshot = await getDocs(q);
      
      let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory if needed
      if (orderClause === 'createdAt_desc' || orderClause?.createdAt === 'desc') {
        users.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
          return bTime - aTime;
        });
      }
      
      return users;
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const now = Timestamp.now();
      const docData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
        isFirstLogin: data.isFirstLogin !== undefined ? data.isFirstLogin : true
      };
      await setDoc(doc(firestore, 'users', id), docData);
      return docData;
    },
    
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const docRef = doc(firestore, 'users', where.id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...docSnap.data() };
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      await deleteDoc(doc(firestore, 'users', where.id));
      return { success: true };
    }
  },
  
  // Faculty operations
  faculty: {
    count: async () => {
      const q = query(collection(firestore, 'faculty'));
      const snapshot = await getDocs(q);
      return snapshot.size;
    },
    
    findMany: async ({ orderBy: orderClause }: { orderBy?: any } = {}) => {
      const q = query(collection(firestore, 'faculty'));
      const snapshot = await getDocs(q);
      
      let faculty = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory
      faculty.sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      
      return faculty;
    },
    
    findUnique: async ({ where }: { where: { id: string } }) => {
      const docRef = doc(firestore, 'faculty', where.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const now = Timestamp.now();
      const docData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(firestore, 'faculty', id), docData);
      return docData;
    },
    
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const docRef = doc(firestore, 'faculty', where.id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      await deleteDoc(doc(firestore, 'faculty', where.id));
      return { success: true };
    }
  },
  
  // Subject operations
  subject: {
    count: async () => {
      const q = query(collection(firestore, 'subjects'));
      const snapshot = await getDocs(q);
      return snapshot.size;
    },
    
    findMany: async ({ where, orderBy: orderClause, include }: { where?: any; orderBy?: any; include?: any } = {}) => {
      let subjects = await db.subject._fetchAll();
      
      // Filter in memory for 'in' operator
      if (where?.id?.in) {
        subjects = subjects.filter((s: any) => where.id.in.includes(s.id));
      }
      if (where?.instructorId) {
        subjects = subjects.filter((s: any) => s.instructorId === where.instructorId);
      }
      
      // Handle include
      if (include?.instructor) {
        for (const subject of subjects) {
          if (subject.instructorId) {
            subject.instructor = await db.faculty.findUnique({ where: { id: subject.instructorId } });
          }
        }
      }
      
      // Sort in memory
      subjects.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      
      return subjects;
    },
    
    _fetchAll: async () => {
      const q = query(collection(firestore, 'subjects'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    
    findUnique: async ({ where }: { where: { id: string; code?: string } }) => {
      if (where.id) {
        const docRef = doc(firestore, 'subjects', where.id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      if (where.code) {
        const q = query(collection(firestore, 'subjects'), whereClause('code', '==', where.code));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() };
      }
      
      return null;
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const now = Timestamp.now();
      const docData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(firestore, 'subjects', id), docData);
      return docData;
    },
    
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const docRef = doc(firestore, 'subjects', where.id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      await deleteDoc(doc(firestore, 'subjects', where.id));
      return { success: true };
    }
  },
  
  // Enrollment operations
  enrollment: {
    findMany: async ({ where, include, orderBy }: { where?: any; include?: any; orderBy?: any } = {}) => {
      const constraints: any[] = [];
      if (where?.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      if (where?.status) constraints.push(whereClause('status', '==', where.status));
      
      const q = query(collection(firestore, 'enrollments'), ...constraints);
      const snapshot = await getDocs(q);
      
      let enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Handle include
      if (include?.student) {
        for (const enrollment of enrollments) {
          if (enrollment.studentId) {
            enrollment.student = await db.user.findUnique({ where: { id: enrollment.studentId } });
          }
        }
      }
      
      // Sort in memory
      enrollments.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      
      return enrollments;
    },
    
    findFirst: async ({ where, include }: { where: { studentId?: string; id?: string }; include?: any }) => {
      const constraints: any[] = [];
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      
      const q = query(collection(firestore, 'enrollments'), ...constraints);
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const enrollment: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      
      // Handle include
      if (include?.student && enrollment.studentId) {
        enrollment.student = await db.user.findUnique({ where: { id: enrollment.studentId } });
      }
      
      return enrollment;
    },
    
    findUnique: async ({ where, include }: { where: { id: string }; include?: any }) => {
      const docRef = doc(firestore, 'enrollments', where.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      
      const enrollment: any = { id: docSnap.id, ...docSnap.data() };
      
      // Handle include
      if (include?.student && enrollment.studentId) {
        enrollment.student = await db.user.findUnique({ where: { id: enrollment.studentId } });
      }
      
      return enrollment;
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const now = Timestamp.now();
      const docData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(firestore, 'enrollments', id), docData);
      return docData;
    },
    
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const docRef = doc(firestore, 'enrollments', where.id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      await deleteDoc(doc(firestore, 'enrollments', where.id));
      return { success: true };
    },
    
    deleteMany: async ({ where }: { where: { studentId: string } }) => {
      const constraints: any[] = [];
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      
      const q = query(collection(firestore, 'enrollments'), ...constraints);
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(firestore, 'enrollments', docSnap.id)));
      await Promise.all(deletePromises);
      
      return { count: snapshot.size };
    }
  },
  
  // Evaluation operations
  evaluation: {
    count: async ({ where }: { where?: any } = {}) => {
      const constraints: any[] = [];
      if (where?.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      if (where?.subjectId) constraints.push(whereClause('subjectId', '==', where.subjectId));
      if (where?.facultyId) constraints.push(whereClause('facultyId', '==', where.facultyId));
      
      const q = query(collection(firestore, 'evaluations'), ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.size;
    },
    
    findMany: async ({ where, take, orderBy, include }: { where?: any; take?: number; orderBy?: any; include?: any } = {}) => {
      const constraints: any[] = [];
      if (where?.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      if (where?.subjectId) constraints.push(whereClause('subjectId', '==', where.subjectId));
      if (where?.facultyId) constraints.push(whereClause('facultyId', '==', where.facultyId));
      
      const q = query(collection(firestore, 'evaluations'), ...constraints);
      const snapshot = await getDocs(q);
      
      let evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by submittedAt desc
      evaluations.sort((a: any, b: any) => {
        const aTime = a.submittedAt?.seconds || a.submittedAt?.getTime?.() || 0;
        const bTime = b.submittedAt?.seconds || b.submittedAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      
      // Apply take limit
      if (take) {
        evaluations = evaluations.slice(0, take);
      }
      
      // Handle include relations
      if (include) {
        for (const evaluation of evaluations) {
          if (include.student && evaluation.studentId) {
            evaluation.student = await db.user.findUnique({ where: { id: evaluation.studentId } });
          }
          if (include.subject && evaluation.subjectId) {
            evaluation.subject = await db.subject.findUnique({ where: { id: evaluation.subjectId } });
          }
          if (include.faculty && evaluation.facultyId) {
            evaluation.faculty = await db.faculty.findUnique({ where: { id: evaluation.facultyId } });
          }
        }
      }
      
      return evaluations;
    },
    
    findFirst: async ({ where }: { where: { studentId?: string; subjectId?: string } }) => {
      const constraints: any[] = [];
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      if (where.subjectId) constraints.push(whereClause('subjectId', '==', where.subjectId));
      
      const q = query(collection(firestore, 'evaluations'), ...constraints);
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const now = Timestamp.now();
      const docData = {
        ...data,
        id,
        submittedAt: now
      };
      await setDoc(doc(firestore, 'evaluations', id), docData);
      return docData;
    },
    
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const docRef = doc(firestore, 'evaluations', where.id);
      await updateDoc(docRef, data);
      return { success: true };
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      await deleteDoc(doc(firestore, 'evaluations', where.id));
      return { success: true };
    },
    
    deleteMany: async ({ where }: { where: { studentId?: string; subjectId?: string; facultyId?: string } }) => {
      const constraints: any[] = [];
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      if (where.subjectId) constraints.push(whereClause('subjectId', '==', where.subjectId));
      if (where.facultyId) constraints.push(whereClause('facultyId', '==', where.facultyId));
      
      const q = query(collection(firestore, 'evaluations'), ...constraints);
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(firestore, 'evaluations', docSnap.id)));
      await Promise.all(deletePromises);
      
      return { count: snapshot.size };
    }
  },
  
  // PreRegisteredStudent operations
  preRegisteredStudent: {
    findMany: async ({ where }: { where?: any } = {}) => {
      const constraints: any[] = [];
      if (where?.registered !== undefined) constraints.push(whereClause('registered', '==', where.registered));
      
      const q = query(collection(firestore, 'preRegisteredStudents'), ...constraints);
      const snapshot = await getDocs(q);
      
      let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory
      students.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      
      return students;
    },
    
    findUnique: async ({ where }: { where: { id?: string; studentId?: string } }) => {
      if (where.id) {
        const docRef = doc(firestore, 'preRegisteredStudents', where.id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      if (where.studentId) {
        const q = query(collection(firestore, 'preRegisteredStudents'), whereClause('studentId', '==', where.studentId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() };
      }
      
      return null;
    },
    
    findFirst: async ({ where }: { where: { studentId?: string; id?: string; NOT?: any } }) => {
      const constraints: any[] = [];
      if (where.studentId) constraints.push(whereClause('studentId', '==', where.studentId));
      
      const q = query(collection(firestore, 'preRegisteredStudents'), ...constraints);
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      // Handle NOT clause in memory
      let result = snapshot.docs[0];
      if (where.NOT?.id) {
        for (const doc of snapshot.docs) {
          if (doc.id !== where.NOT.id) {
            result = doc;
            break;
          }
        }
      }
      
      return { id: result.id, ...result.data() };
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const now = Timestamp.now();
      const docData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(firestore, 'preRegisteredStudents', id), docData);
      return docData;
    },
    
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const docRef = doc(firestore, 'preRegisteredStudents', where.id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      await deleteDoc(doc(firestore, 'preRegisteredStudents', where.id));
      return { success: true };
    },
    
    updateMany: async ({ where, data }: { where: { userId?: string }; data: any }) => {
      const constraints: any[] = [];
      if (where.userId) constraints.push(whereClause('userId', '==', where.userId));
      
      const q = query(collection(firestore, 'preRegisteredStudents'), ...constraints);
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(docSnap => 
        updateDoc(doc(firestore, 'preRegisteredStudents', docSnap.id), {
          ...data,
          updatedAt: Timestamp.now()
        })
      );
      await Promise.all(updatePromises);
      
      return { count: snapshot.size };
    }
  },
  
  // Settings operations
  settings: {
    findFirst: async () => {
      const q = query(collection(firestore, 'settings'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        // Create default settings
        const id = generateId();
        const defaultSettings = {
          id,
          evaluationOpen: true,
          currentSemester: '1st Semester',
          currentSchoolYear: '2024-2025',
          updatedAt: Timestamp.now()
        };
        await setDoc(doc(firestore, 'settings', id), defaultSettings);
        return defaultSettings;
      }
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },
    
    update: async ({ where, data }: { where?: { id: string }; data: any }) => {
      let settingsId = where?.id;
      if (!settingsId) {
        const settings = await db.settings.findFirst();
        settingsId = settings.id;
      }
      const docRef = doc(firestore, 'settings', settingsId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    },
    
    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = {
        ...data,
        id,
        updatedAt: Timestamp.now()
      };
      await setDoc(doc(firestore, 'settings', id), docData);
      return docData;
    }
  }
};

export default app;
