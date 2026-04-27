'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, UserCheck, GraduationCap, Book, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  facultyId: string;
  facultyName: string;
  createdAt: Date;
}

interface Student {
  id: string;
  username: string;
  fullName: string;
  studentId: string;
  email: string;
}

interface Subject {
  id: string;
  code: string;
  title: string;
  instructorId: string;
  instructorName: string;
}

export default function ManageEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [groupedEnrollments, setGroupedEnrollments] = useState<Map<string, Enrollment[]>>(new Map());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    subjectIds: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const grouped = new Map<string, Enrollment[]>();
    enrollments.forEach(enrollment => {
      const existing = grouped.get(enrollment.studentId) || [];
      grouped.set(enrollment.studentId, [...existing, enrollment]);
    });
    setGroupedEnrollments(grouped);
  }, [enrollments]);

  const loadData = async () => {
    setLoading(true);
    try {
      const enrollmentsResponse = await fetch('/api/admin/enrollments');
      const enrollmentsData = await enrollmentsResponse.json();
      if (enrollmentsData.success) {
        setEnrollments(enrollmentsData.enrollments);
      }

      const studentsResponse = await fetch('/api/admin/students');
      const studentsData = await studentsResponse.json();
      if (studentsData.success) {
        setStudents(studentsData.students);
      }

      const subjectsResponse = await fetch('/api/admin/subjects');
      const subjectsData = await subjectsResponse.json();
      if (subjectsData.success) {
        setSubjects(subjectsData.subjects);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    const search = searchTerm.toLowerCase();
    const studentFilterTerm = studentFilter.toLowerCase();

    const matchesSearch =
      (enrollment.studentName || '').toLowerCase().includes(search) ||
      (enrollment.subjectCode || '').toLowerCase().includes(search) ||
      (enrollment.subjectTitle || '').toLowerCase().includes(search) ||
      (enrollment.facultyName || '').toLowerCase().includes(search);

    const matchesStudent = !studentFilterTerm ||
      enrollment.studentName?.toLowerCase().includes(studentFilterTerm) ||
      enrollment.studentId?.toLowerCase().includes(studentFilterTerm);

    return matchesSearch && matchesStudent;
  });

  const handleAdd = () => {
    setDialogMode('add');
    setEditingStudentId(null);
    setFormData({ studentId: '', subjectIds: [] });
    setShowDialog(true);
  };

  const handleEdit = (studentId: string) => {
    const studentEnrollments = groupedEnrollments.get(studentId) || [];
    const enrolledSubjectIds = studentEnrollments.map(e => e.subjectId);

    setDialogMode('edit');
    setEditingStudentId(studentId);
    setFormData({ studentId, subjectIds: enrolledSubjectIds });
    setShowDialog(true);
  };

  const handleDelete = async (studentId: string) => {
    const studentEnrollments = groupedEnrollments.get(studentId) || [];
    if (!confirm('Are you sure you want to delete all ' + studentEnrollments.length + ' enrollment(s) for ' + (students.find(s => s.id === studentId)?.fullName || 'this student') + '?')) return;

    try {
      for (const enrollment of studentEnrollments) {
        await fetch('/api/admin/enrollments?id=' + enrollment.id, {
          method: 'DELETE'
        });
      }
      // Remove from expanded state
      const newExpanded = new Set(expandedStudents);
      newExpanded.delete(studentId);
      setExpandedStudents(newExpanded);
      loadData();
    } catch (error) {
      console.error('Error deleting enrollments:', error);
      alert('Failed to delete enrollments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.studentId || formData.subjectIds.length === 0) {
      alert('Please select a student and at least one subject');
      return;
    }

    try {
      if (dialogMode === 'edit' && editingStudentId) {
        const existingEnrollments = groupedEnrollments.get(editingStudentId) || [];

        // Delete all existing enrollments for this student
        for (const enrollment of existingEnrollments) {
          await fetch('/api/admin/enrollments?id=' + enrollment.id, {
            method: 'DELETE'
          });
        }
      }

      // Send all subjects in one request
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: formData.studentId,
          subjectIds: formData.subjectIds
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create enrollment');
      }

      setShowDialog(false);
      setFormData({ studentId: '', subjectIds: [] });
      loadData();
    } catch (error: any) {
      console.error('Error saving enrollments:', error);
      alert(error.message || 'Failed to save enrollments');
    }
  };

  const getStudent = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getSubject = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId);
  };

  const toggleStudentExpand = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Manage Student Enrollments</h2>
        <button
          onClick={handleAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={16} /> Add Enrollment
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} size={18} />
          <input
            type="text"
            placeholder="Search enrollments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <UserCheck style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} size={18} />
          <input
            type="text"
            placeholder="Filter by student..."
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading enrollments...</div>
        ) : Array.from(groupedEnrollments.entries()).length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            {searchTerm || studentFilter ? 'No enrollments found' : 'No enrollments yet. Click "Add Enrollment" to create one.'}
          </div>
        ) : Array.from(groupedEnrollments.entries()).map(([studentId, studentEnrollments]) => {
          const student = getStudent(studentId);
          // Skip enrollments for deleted students
          if (!student) {
            return null;
          }
          const isExpanded = expandedStudents.has(studentId);

          return (
            <div key={studentId} style={{ borderBottom: '1px solid #e0e0e0' }}>
              <div
                onClick={() => toggleStudentExpand(studentId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  backgroundColor: isExpanded ? '#f8f9fa' : '#fff',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                    {student?.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#333' }}>{student?.fullName || 'Unknown'}</div>
                    <div style={{ fontSize: '13px', color: '#666', fontFamily: 'monospace' }}>Student ID: {student?.studentId || '-'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>{studentEnrollments.length} subject(s)</span>
                  {isExpanded ? <ChevronDown size={20} style={{ color: '#8b1a2b' }} /> : <ChevronRight size={20} style={{ color: '#8b1a2b' }} />}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(studentId);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#f0f0f0',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#333',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Edit Enrollments"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(studentId);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#fee2e2',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#dc2626',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Remove All Enrollments"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ backgroundColor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Subject Code</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Subject Title</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Professor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentEnrollments.map((enrollment, idx) => {
                        const subject = getSubject(enrollment.subjectId);
                        return (
                          <tr key={enrollment.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 14px', color: '#333', fontWeight: 500 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Book size={16} style={{ color: '#8b1a2b' }} />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{subject?.code || 'Unknown'}</div>
                                  <div style={{ fontSize: '11px', color: '#666' }}>{subject?.title || ''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#666', fontSize: '12px' }}>
                              {subject?.title || 'Unknown'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#333', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GraduationCap size={16} style={{ color: '#8b1a2b' }} />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{enrollment.facultyName}</div>
                                  <div style={{ fontSize: '11px', color: '#666' }}>ID: {enrollment.facultyId}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#333' }}>
              {dialogMode === 'edit' ? 'Edit Enrollments' : 'Add New Enrollment'}
            </h3>
            {dialogMode === 'edit' && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', color: '#856404' }}>
                Info: All existing enrollments for this student will be removed and replaced with the new selection.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: '#333' }}>
                  Select Student *
                </label>
                <select
                  required
                  disabled={dialogMode === 'edit'}
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: dialogMode === 'edit' ? '#f5f5f5' : '#fff',
                    cursor: dialogMode === 'edit' ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} - {student.studentId || student.username}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '14px', color: '#333' }}>
                  Select Subject(s) & Professor(s) *
                </label>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  Each subject includes its assigned professor. You can select multiple subjects.
                </div>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '16px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: '#fafafa'
                }}>
                  {subjects.map(subject => (
                    <label
                      key={subject.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: formData.subjectIds.includes(subject.id) ? '2px solid #8b1a2b' : '2px solid #ddd',
                        backgroundColor: formData.subjectIds.includes(subject.id) ? '#e8f4f8' : '#fff',
                        transition: 'all 0.2s',
                        marginBottom: '8px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.subjectIds.includes(subject.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            subjectIds: checked
                              ? [...prev.subjectIds, subject.id]
                              : prev.subjectIds.filter(id => id !== subject.id)
                          }));
                        }}
                        style={{ marginRight: '10px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                          {subject.code}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {subject.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {subject.instructorName}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  Selected: {formData.subjectIds.length} subject(s)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#f0f0f0',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  {dialogMode === 'edit' ? 'Update' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
