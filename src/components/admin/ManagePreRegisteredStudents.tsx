'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit, Search, Users, User, AlertCircle, CheckCircle, CreditCard, Mail, Key, RefreshCw, Copy, Eye, Send, X } from 'lucide-react';

interface PreRegisteredStudent {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName?: string; // For backward compatibility
  studentId: string;
  email: string;
  temporaryPassword: string;
  registered: boolean;
  userId?: string;
  createdAt: Date;
  registeredAt?: Date;
}

// Helper function to generate temporary password (6 uppercase letters)
const generateTempPassword = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return password;
};

export default function ManagePreRegisteredStudents() {
  const [students, setStudents] = useState<PreRegisteredStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<PreRegisteredStudent | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    studentId: '',
    email: ''
  });
  const [regeneratePassword, setRegeneratePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [previewPassword, setPreviewPassword] = useState('');
  const [successData, setSuccessData] = useState<{ studentId: string; password: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadStudents();
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pre-registered-students');
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Error loading pre-registered students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Handle showing the preview modal
  const handleShowPreview = () => {
    setError('');
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.studentId.trim() || !formData.email.trim()) {
      setError('First Name, Last Name, Student ID, and Email are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Generate preview password
    const tempPassword = generateTempPassword();
    setPreviewPassword(tempPassword);
    setShowAddModal(false);
    setShowPreviewModal(true);
  };

  // Handle actual student addition after preview confirmation
  const handleConfirmAddStudent = async () => {
    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/admin/pre-registered-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          temporaryPassword: previewPassword // Send the generated password to backend
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student');
      }

      // Store success data for the success modal
      setSuccessData({
        studentId: formData.studentId.toUpperCase(),
        password: previewPassword,
        name: formData.middleName 
          ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
          : `${formData.firstName} ${formData.lastName}`
      });

      // Close preview modal and show success modal
      setShowPreviewModal(false);
      setShowSuccessModal(true);
      setFormData({ firstName: '', middleName: '', lastName: '', studentId: '', email: '' });
      setPreviewPassword('');
      loadStudents();
    } catch (err: any) {
      setError(err.message);
      setShowPreviewModal(false);
      setShowAddModal(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch('/api/admin/pre-registered-students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStudent.id,
          ...formData,
          regeneratePassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update student');
      }

      if (data.newPassword) {
        setNewPassword(data.newPassword);
        setSuccess('Student updated successfully! New password generated. Check the email or copy it below.');
      } else {
        setSuccess('Student updated successfully!');
        setShowEditModal(false);
        setSelectedStudent(null);
        setFormData({ firstName: '', middleName: '', lastName: '', studentId: '', email: '' });
        setRegeneratePassword(false);
      }
      loadStudents();
      setTimeout(() => {
        if (!data.newPassword) setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      const response = await fetch(`/api/admin/pre-registered-students?id=${selectedStudent.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete student');
      }

      setSuccess('Student removed successfully!');
      setShowDeleteConfirm(false);
      setSelectedStudent(null);
      loadStudents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (student: PreRegisteredStudent) => {
    setSelectedStudent(student);
    setFormData({
      firstName: student.firstName || student.fullName?.split(' ')[0] || '',
      middleName: student.middleName || '',
      lastName: student.lastName || student.fullName?.split(' ').slice(-1)[0] || '',
      studentId: student.studentId,
      email: student.email || ''
    });
    setNewPassword('');
    setRegeneratePassword(false);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (student: PreRegisteredStudent) => {
    setSelectedStudent(student);
    setShowDeleteConfirm(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Password copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const getFullName = (student: PreRegisteredStudent) => {
    if (student.firstName && student.lastName) {
      return student.middleName 
        ? `${student.firstName} ${student.middleName} ${student.lastName}`
        : `${student.firstName} ${student.lastName}`;
    }
    return student.fullName || 'N/A';
  };

  const filteredStudents = students.filter(s =>
    getFullName(s).toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const registeredCount = students.filter(s => s.registered).length;
  const pendingCount = students.filter(s => !s.registered).length;

  return (
    <div style={{ padding: isMobile ? '0' : '0' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '16px' : '24px',
        marginBottom: isMobile ? '16px' : '24px',
        color: 'white'
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px', fontWeight: 700 }}>
          Pre-Registered Students
        </h2>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: isMobile ? '13px' : '15px' }}>
          Add students with their email and temporary password will be sent automatically
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #28a745',
          color: '#155724',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {error && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #dc3545',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? '12px' : '16px',
        marginBottom: isMobile ? '16px' : '24px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: isMobile ? '14px' : '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={24} color="#1976d2" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#666' }}>Total Pre-Registered</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>{students.length}</div>
            </div>
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: isMobile ? '14px' : '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#e8f5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={24} color="#28a745" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#666' }}>Registered</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#28a745' }}>{registeredCount}</div>
            </div>
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: isMobile ? '14px' : '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fff3e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserPlus size={24} color="#ff9800" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#666' }}>Pending Registration</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ff9800' }}>{pendingCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        background: '#fff',
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '14px' : '20px',
        marginBottom: isMobile ? '16px' : '24px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            position: 'relative',
            flex: isMobile ? '1' : '0 1 300px'
          }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999'
            }} />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          <button
            onClick={() => {
              setFormData({ firstName: '', middleName: '', lastName: '', studentId: '', email: '' });
              setShowAddModal(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              color: 'white',
              border: 'none',
              padding: isMobile ? '12px 16px' : '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <UserPlus size={18} />
            Add Pre-Registered Student
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div style={{
        background: '#fff',
        borderRadius: isMobile ? '8px' : '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <Users size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>No students found</p>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {searchTerm ? 'Try a different search term' : 'Click "Add Pre-Registered Student" to get started'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee' }}>Name</th>
                  <th style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee' }}>Student ID</th>
                  <th style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee' }}>Email</th>
                  <th style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee' }}>Status</th>
                  <th style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: isMobile ? '12px 10px' : '14px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="#666" />
                        {getFullName(student)}
                      </div>
                    </td>
                    <td style={{ padding: isMobile ? '12px 10px' : '14px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={16} color="#666" />
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.studentId}</span>
                      </div>
                    </td>
                    <td style={{ padding: isMobile ? '12px 10px' : '14px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} color="#666" />
                        <span style={{ fontSize: '13px' }}>{student.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'center' }}>
                      {student.registered ? (
                        <span style={{
                          background: '#d4edda',
                          color: '#155724',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          ✓ Registered
                        </span>
                      ) : (
                        <span style={{
                          background: '#fff3cd',
                          color: '#856404',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: isMobile ? '12px 10px' : '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(student)}
                          style={{
                            background: '#e3f2fd',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          title="Edit"
                        >
                          <Edit size={16} color="#1976d2" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(student)}
                          style={{
                            background: '#ffebee',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} color="#d32f2f" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700, color: '#333' }}>
              Add Pre-Registered Student
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666' }}>
              Fill in the student's details. A temporary password will be generated and sent to their email.
            </p>
            
            {/* Name Section */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#8b1a2b' }}>
                Name Information
              </label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  placeholder="Middle name (optional)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Account Section */}
            <div style={{ marginBottom: '8px', marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#8b1a2b' }}>
                Account Information
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Student ID *
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value.toUpperCase() })}
                placeholder="Enter student ID (e.g., 2024-00001)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#888' }}>
                Student will use this as their username to login
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter student's email address"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#888' }}>
                Temporary password will be sent to this email
              </p>
            </div>

            <div style={{ 
              background: '#f0f7ff', 
              border: '1px solid #b3d7ff', 
              borderRadius: '8px', 
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#1976d2" />
                <span style={{ fontSize: '13px', color: '#1565c0', fontWeight: 600 }}>
                  A 6-character temporary password will be auto-generated
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={handleShowPreview}
                style={{
                  background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Eye size={18} />
                Preview Credentials
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ firstName: '', middleName: '', lastName: '', studentId: '', email: '' });
                  setError('');
                }}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700, color: '#333' }}>
              Edit Pre-Registered Student
            </h3>
            
            {/* Name Section */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#8b1a2b' }}>
                Name Information
              </label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Account Section */}
            <div style={{ marginBottom: '8px', marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#8b1a2b' }}>
                Account Information
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Student ID
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value.toUpperCase() })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Password Section */}
            <div style={{ 
              background: '#fff8e1', 
              border: '1px solid #ffc107', 
              borderRadius: '8px', 
              padding: '16px',
              marginBottom: '16px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={16} color="#f57c00" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e65100' }}>
                    Generate new temporary password
                  </span>
                </div>
              </label>
              {regeneratePassword && (
                <p style={{ margin: '10px 0 0 28px', fontSize: '12px', color: '#666' }}>
                  A new password will be generated and sent to the student's email
                </p>
              )}
            </div>

            {/* Show new password if generated */}
            {newPassword && (
              <div style={{ 
                background: '#e8f5e9', 
                border: '1px solid #28a745', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '4px' }}>New Temporary Password:</div>
                    <div style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '20px', 
                      fontWeight: 700, 
                      color: '#1b5e20',
                      letterSpacing: '2px'
                    }}>
                      {newPassword}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(newPassword)}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px'
                    }}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={handleEditStudent}
                style={{
                  background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStudent(null);
                  setFormData({ firstName: '', middleName: '', lastName: '', studentId: '', email: '' });
                  setRegeneratePassword(false);
                  setNewPassword('');
                  setError('');
                }}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ffebee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <Trash2 size={32} color="#d32f2f" />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: '#333' }}>
              Remove Pre-Registered Student?
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              Are you sure you want to remove this student?
            </p>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', fontWeight: 600, color: '#333' }}>
              {getFullName(selectedStudent)} ({selectedStudent.studentId})
            </p>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={handleDeleteStudent}
                style={{
                  background: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Yes, Remove
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedStudent(null);
                }}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Credentials Modal */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '0',
            width: '100%',
            maxWidth: '450px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Eye size={32} color="white" />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'white' }}>
                Preview Credentials
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                Review before sending to student
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Student Name */}
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Student Name</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 600, color: '#333' }}>
                  {formData.middleName 
                    ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
                    : `${formData.firstName} ${formData.lastName}`}
                </p>
              </div>

              {/* Student ID */}
              <div style={{ 
                background: '#f8f9fa', 
                borderRadius: '12px', 
                padding: '16px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                  Student ID (Username)
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: 700, 
                  color: '#8b1a2b',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}>
                  {formData.studentId.toUpperCase()}
                </p>
              </div>

              {/* Temporary Password */}
              <div style={{ 
                background: '#e8f5e9', 
                borderRadius: '12px', 
                padding: '16px',
                marginBottom: '20px',
                border: '2px solid #28a745'
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#2e7d32', marginBottom: '4px' }}>
                  Generated Temporary Password
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '28px', 
                    fontWeight: 700, 
                    color: '#1b5e20',
                    fontFamily: 'monospace',
                    letterSpacing: '3px'
                  }}>
                    {previewPassword}
                  </p>
                  <button
                    onClick={() => copyToClipboard(previewPassword)}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px'
                    }}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>

              {/* Email Info */}
              <div style={{ 
                background: '#fff3e0', 
                borderRadius: '8px', 
                padding: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} color="#f57c00" />
                  <span style={{ fontSize: '13px', color: '#e65100' }}>
                    Credentials will be sent to: <strong>{formData.email}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button
                  onClick={handleConfirmAddStudent}
                  disabled={processing}
                  style={{
                    background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: processing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: processing ? 0.7 : 1
                  }}
                >
                  {processing ? (
                    <>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Add Student & Send Email
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setShowAddModal(true);
                    setPreviewPassword('');
                  }}
                  disabled={processing}
                  style={{
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: processing ? 'not-allowed' : 'pointer',
                    opacity: processing ? 0.7 : 1
                  }}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '0',
            width: '100%',
            maxWidth: '450px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <CheckCircle size={32} color="white" />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'white' }}>
                Student Added Successfully!
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                Credentials have been sent to the student's email
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Student Name */}
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Student Name</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 600, color: '#333' }}>
                  {successData.name}
                </p>
              </div>

              {/* Credentials Card */}
              <div style={{ 
                background: '#f8f9fa', 
                borderRadius: '12px', 
                padding: '20px',
                marginBottom: '20px',
                border: '2px solid #28a745'
              }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#333', textAlign: 'center' }}>
                  Login Credentials
                </p>
                
                {/* Student ID */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Student ID (Username)</p>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: '#8b1a2b',
                    fontFamily: 'monospace'
                  }}>
                    {successData.studentId}
                  </p>
                </div>

                {/* Temporary Password */}
                <div style={{ 
                  background: 'white', 
                  borderRadius: '8px', 
                  padding: '12px',
                  border: '1px solid #ddd'
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Temporary Password</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '22px', 
                      fontWeight: 700, 
                      color: '#1b5e20',
                      fontFamily: 'monospace',
                      letterSpacing: '2px'
                    }}>
                      {successData.password}
                    </p>
                    <button
                      onClick={() => copyToClipboard(successData.password)}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div style={{ 
                background: '#e3f2fd', 
                borderRadius: '8px', 
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#1565c0', lineHeight: '1.5' }}>
                  <strong>Note:</strong> The student will be required to create their own password on first login using the temporary password above.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessData(null);
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
