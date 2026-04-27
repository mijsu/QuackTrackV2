'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

interface Subject {
  id: string;
  code: string;
  title: string;
  instructorId: string;
  instructorName: string;
  semester: string;
  schoolYear: string;
}

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    instructorId: '',
    semester: '1st Semester',
    schoolYear: '2024-2025'
  });

  useEffect(() => {
    loadSubjects();
    loadFaculty();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFaculty = async () => {
    try {
      const response = await fetch('/api/admin/faculty');
      const data = await response.json();
      if (data.success) {
        setFaculty(data.faculty);
      }
    } catch (error) {
      console.error('Error loading faculty:', error);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    const code = (subject.code || '').toLowerCase();
    const title = (subject.title || '').toLowerCase();
    const instructorName = (subject.instructorName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return code.includes(search) || title.includes(search) || instructorName.includes(search);
  });

  const handleAdd = () => {
    setEditingSubject(null);
    setFormData({
      code: '',
      title: '',
      instructorId: '',
      semester: '1st Semester',
      schoolYear: '2024-2025'
    });
    setShowDialog(true);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      title: subject.title,
      instructorId: subject.instructorId,
      semester: subject.semester,
      schoolYear: subject.schoolYear
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const response = await fetch(`/api/admin/subjects?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        loadSubjects();
      } else {
        alert(data.error || 'Failed to delete subject');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedFaculty = faculty.find(f => f.id === formData.instructorId);
    
    try {
      const url = editingSubject ? '/api/admin/subjects' : '/api/admin/subjects';
      const method = editingSubject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingSubject && { id: editingSubject.id }),
          code: formData.code,
          title: formData.title,
          instructorId: formData.instructorId,
          instructorName: selectedFaculty?.name || '',
          semester: formData.semester,
          schoolYear: formData.schoolYear
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowDialog(false);
        loadSubjects();
      } else {
        alert(data.error || 'Failed to save subject');
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject');
    }
  };

  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: isMobile() ? '20px' : '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: isMobile() ? '18px' : '24px', fontWeight: 700, color: '#333', margin: 0 }}>Manage Subjects</h2>
        <button
          onClick={handleAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile() ? '8px' : '10px',
            padding: isMobile() ? '10px 20px' : '12px 28px',
            background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: isMobile() ? '6px' : '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: isMobile() ? '14px' : '16px',
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={isMobile() ? 16 : 18} /> Add Subject
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: isMobile() ? '20px' : '28px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
          <Search style={{ position: 'absolute', left: isMobile() ? '14px' : '16px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} size={isMobile() ? 18 : 20} />
          <input
            type="text"
            placeholder="Search subjects..."
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile() ? '700px' : '100%' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#333', 
                  fontSize: isMobile() ? '13px' : '15px', 
                  borderBottom: '2px solid #e0e0e0', 
                  whiteSpace: 'nowrap' 
                }}>Code</th>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#333', 
                  fontSize: isMobile() ? '13px' : '15px', 
                  borderBottom: '2px solid #e0e0e0', 
                  whiteSpace: 'nowrap' 
                }}>Title</th>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#333', 
                  fontSize: isMobile() ? '13px' : '15px', 
                  borderBottom: '2px solid #e0e0e0', 
                  whiteSpace: 'nowrap' 
                }}>Instructor</th>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#333', 
                  fontSize: isMobile() ? '13px' : '15px', 
                  borderBottom: '2px solid #e0e0e0', 
                  whiteSpace: 'nowrap' 
                }}>Semester</th>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
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
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>Loading...</td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    {searchTerm ? 'No subjects found' : 'No subjects yet. Click "Add Subject" to create one.'}
                  </td>
                </tr>
              ) : filteredSubjects.map((subject) => (
                <tr key={subject.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.15s' }}>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#333', 
                    fontSize: isMobile() ? '14px' : '16px', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap' 
                  }}>
                    {subject.code}
                  </td>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#333', 
                    fontSize: isMobile() ? '14px' : '16px',
                    whiteSpace: 'nowrap' 
                  }}>
                    {subject.title}
                  </td>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#333', 
                    fontSize: isMobile() ? '14px' : '16px',
                    whiteSpace: 'nowrap' 
                  }}>
                    {subject.instructorName}
                  </td>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#666', 
                    fontSize: isMobile() ? '13px' : '15px',
                    whiteSpace: 'nowrap' 
                  }}>
                    {subject.semester} {subject.schoolYear}
                  </td>
                  <td style={{ padding: isMobile() ? '14px 12px' : '18px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(subject)}
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
                        onClick={() => handleDelete(subject.id)}
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
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
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
                  Subject Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                  Subject Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  Instructor *
                </label>
                <select
                  required
                  value={formData.instructorId}
                  onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Instructor</option>
                  {faculty.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: isMobile() ? '18px' : '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 500, 
                  fontSize: isMobile() ? '14px' : '16px', 
                  color: '#333' 
                }}>
                  Semester *
                </label>
                <select
                  required
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile() ? '12px' : '14px 16px',
                    border: '1px solid #ddd',
                    borderRadius: isMobile() ? '6px' : '8px',
                    fontSize: isMobile() ? '14px' : '16px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
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
                  School Year *
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolYear}
                  onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                  placeholder="e.g., 2024-2025"
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
                  {editingSubject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
