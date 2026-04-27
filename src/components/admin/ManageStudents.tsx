'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Search, CreditCard } from 'lucide-react';

interface Student {
  id: string;
  username: string;
  fullName: string;
  studentId: string;
  email: string;
  year?: string;
  course?: string;
  role: string;
}

export default function ManageStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    studentId: '',
    email: '',
    year: '',
    course: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/students');
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = (student.fullName || '').toLowerCase();
    const username = (student.username || '').toLowerCase();
    const email = (student.email || '').toLowerCase();
    const studentId = (student.studentId || '').toLowerCase();
    const year = (student.year || '').toLowerCase();
    const course = (student.course || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || 
           username.includes(search) || 
           email.includes(search) || 
           studentId.includes(search) ||
           year.includes(search) ||
           course.includes(search);
  });

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      username: student.username,
      password: '',
      fullName: student.fullName,
      studentId: student.studentId || '',
      email: student.email || '',
      year: student.year || '',
      course: student.course || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (student: Student) => {
    const confirmMessage = `Are you sure you want to delete "${student.fullName}"?\n\nThis will also delete:\n- All their enrollments\n- All their evaluations\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/admin/students?id=${student.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        loadStudents();
        alert(`Student deleted successfully.\nRemoved ${data.deletedEnrollments} enrollment(s) and ${data.deletedEvaluations} evaluation(s).`);
      } else {
        alert(data.error || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingStudent ? '/api/admin/students' : '/api/admin/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingStudent && { id: editingStudent.id }),
          ...formData
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowDialog(false);
        loadStudents();
      } else {
        alert(data.error || 'Failed to save student');
      }
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student');
    }
  };

  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  };

  return (
    <div>
      <div style={{
        marginBottom: isMobile() ? '20px' : '32px'
      }}>
        <h2 style={{ fontSize: isMobile() ? '18px' : '24px', fontWeight: 700, color: '#333', margin: 0 }}>Manage Students</h2>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: isMobile() ? '20px' : '28px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
          <Search style={{ position: 'absolute', left: isMobile() ? '14px' : '16px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} size={isMobile() ? 18 : 20} />
          <input
            type="text"
            placeholder="Search by name, username, student ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: isMobile() ? '12px 14px 12px 44px' : '14px 16px 14px 48px',
              border: '1px solid #ddd',
              borderRadius: isMobile() ? '6px' : '8px',
              fontSize: isMobile() ? '14px' : '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff',
        borderRadius: isMobile() ? '8px' : '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile() ? '800px' : '100%' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Student ID</th>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Username</th>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Full Name</th>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Year</th>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Course</th>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Email</th>
                <th style={{
                  padding: isMobile() ? '14px 12px' : '18px 20px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: isMobile() ? '13px' : '15px',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>Loading...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    {searchTerm ? 'No students found' : 'No students yet.'}
                  </td>
                </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.15s' }}>
                  <td style={{
                    padding: isMobile() ? '14px 12px' : '18px 20px',
                    color: '#8b1a2b',
                    fontSize: isMobile() ? '14px' : '16px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} color="#8b1a2b" />
                      {student.studentId || '-'}
                    </div>
                  </td>
                  <td style={{
                    padding: isMobile() ? '14px 12px' : '18px 20px',
                    color: '#333',
                    fontSize: isMobile() ? '14px' : '16px',
                    whiteSpace: 'nowrap'
                  }}>
                    {student.username}
                  </td>
                  <td style={{
                    padding: isMobile() ? '14px 12px' : '18px 20px',
                    color: '#333',
                    fontSize: isMobile() ? '14px' : '16px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                  }}>
                    {student.fullName}
                  </td>
                  <td style={{
                    padding: isMobile() ? '14px 12px' : '18px 20px',
                    color: '#666',
                    fontSize: isMobile() ? '13px' : '15px',
                    whiteSpace: 'nowrap'
                  }}>
                    {student.year || '-'}
                  </td>
                  <td style={{
                    padding: isMobile() ? '14px 12px' : '18px 20px',
                    color: '#666',
                    fontSize: isMobile() ? '13px' : '15px',
                    whiteSpace: 'nowrap'
                  }}>
                    {student.course || '-'}
                  </td>
                  <td style={{
                    padding: isMobile() ? '14px 12px' : '18px 20px',
                    color: '#666',
                    fontSize: isMobile() ? '13px' : '15px',
                    whiteSpace: 'nowrap'
                  }}>
                    {student.email || '-'}
                  </td>
                  <td style={{ padding: isMobile() ? '14px 12px' : '18px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(student)}
                        style={{
                          padding: isMobile() ? '8px 12px' : '10px 14px',
                          background: '#f0f0f0',
                          border: 'none',
                          borderRadius: isMobile() ? '4px' : '6px',
                          cursor: 'pointer',
                          color: '#333'
                        }}
                        title="Edit"
                      >
                        <Pencil size={isMobile() ? 14 : 16} />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        style={{
                          padding: isMobile() ? '8px 12px' : '10px 14px',
                          background: '#fee2e2',
                          border: 'none',
                          borderRadius: isMobile() ? '4px' : '6px',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={isMobile() ? 14 : 16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
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
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: isMobile() ? '8px' : '12px',
            padding: isMobile() ? '24px' : '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: isMobile() ? '20px' : '24px', fontWeight: 700, marginBottom: isMobile() ? '20px' : '24px', color: '#333' }}>
              {editingStudent ? 'Edit Student' : 'Student Details'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 500, 
                  fontSize: isMobile() ? '14px' : '16px', 
                  color: '#333' 
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box',
                    backgroundColor: '#f5f5f5',
                    color: '#666'
                  }}
                />
              </div>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 500, 
                  fontSize: isMobile() ? '14px' : '16px', 
                  color: '#333' 
                }}>
                  Student ID
                </label>
                <input
                  type="text"
                  value={formData.studentId}
                  disabled
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box',
                    backgroundColor: '#f5f5f5',
                    color: '#666',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 500, 
                  fontSize: isMobile() ? '14px' : '16px', 
                  color: '#333' 
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 500, 
                  fontSize: isMobile() ? '14px' : '16px', 
                  color: '#333' 
                }}>
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  fontSize: isMobile() ? '14px' : '16px',
                  color: '#333'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  fontSize: isMobile() ? '14px' : '16px',
                  color: '#333'
                }}>
                  Year
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div style={{ marginBottom: isMobile() ? '24px' : '28px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  fontSize: isMobile() ? '14px' : '16px',
                  color: '#333'
                }}>
                  Course
                </label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  placeholder="e.g., BSIT, BSCS, BSHRM"
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  style={{
                    padding: isMobile() ? '12px 24px' : '14px 28px',
                    background: '#f0f0f0',
                    border: 'none',
                    borderRadius: isMobile() ? '6px' : '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: isMobile() ? '15px' : '16px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: isMobile() ? '12px 24px' : '14px 28px',
                    background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: isMobile() ? '6px' : '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: isMobile() ? '15px' : '16px'
                  }}
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
