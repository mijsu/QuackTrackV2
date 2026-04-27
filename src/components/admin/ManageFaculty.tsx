'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
}

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    email: ''
  });

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/faculty');
      const data = await response.json();
      if (data.success) {
        setFaculty(data.faculty);
      }
    } catch (error) {
      console.error('Error loading faculty:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = faculty.filter(f => {
    const name = (f.name || '').toLowerCase();
    const department = (f.department || '').toLowerCase();
    const email = (f.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || department.includes(search) || email.includes(search);
  });

  const handleAdd = () => {
    setEditingFaculty(null);
    setFormData({ name: '', department: '', email: '' });
    setShowDialog(true);
  };

  const handleEdit = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFormData({
      name: fac.name,
      department: fac.department,
      email: fac.email
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this faculty member?')) return;

    try {
      const response = await fetch(`/api/admin/faculty?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        loadFaculty();
      } else {
        alert(data.error || 'Failed to delete faculty');
      }
    } catch (error) {
      console.error('Error deleting faculty:', error);
      alert('Failed to delete faculty');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingFaculty ? '/api/admin/faculty' : '/api/admin/faculty';
      const method = editingFaculty ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingFaculty && { id: editingFaculty.id }),
          ...formData
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowDialog(false);
        loadFaculty();
      } else {
        alert(data.error || 'Failed to save faculty');
      }
    } catch (error) {
      console.error('Error saving faculty:', error);
      alert('Failed to save faculty');
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
        <h2 style={{ fontSize: isMobile() ? '18px' : '24px', fontWeight: 700, color: '#333', margin: 0 }}>Manage Faculty</h2>
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
          <Plus size={isMobile() ? 16 : 18} /> Add Faculty
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: isMobile() ? '20px' : '28px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
          <Search style={{ position: 'absolute', left: isMobile() ? '14px' : '16px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} size={isMobile() ? 18 : 20} />
          <input
            type="text"
            placeholder="Search faculty..."
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile() ? '600px' : '100%' }}>
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
                }}>Name</th>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#333', 
                  fontSize: isMobile() ? '13px' : '15px', 
                  borderBottom: '2px solid #e0e0e0', 
                  whiteSpace: 'nowrap' 
                }}>Department</th>
                <th style={{ 
                  padding: isMobile() ? '14px 12px' : '18px 24px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#333', 
                  fontSize: isMobile() ? '13px' : '15px', 
                  borderBottom: '2px solid #e0e0e0', 
                  whiteSpace: 'nowrap' 
                }}>Email</th>
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
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>Loading...</td>
                </tr>
              ) : filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    {searchTerm ? 'No faculty found' : 'No faculty members yet. Click "Add Faculty" to create one.'}
                  </td>
                </tr>
              ) : filteredFaculty.map((fac) => (
                <tr key={fac.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.15s' }}>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#333', 
                    fontSize: isMobile() ? '14px' : '16px', 
                    fontWeight: 500,
                    whiteSpace: 'nowrap' 
                  }}>
                    {fac.name}
                  </td>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#333', 
                    fontSize: isMobile() ? '14px' : '16px',
                    whiteSpace: 'nowrap' 
                  }}>
                    {fac.department}
                  </td>
                  <td style={{ 
                    padding: isMobile() ? '14px 12px' : '18px 24px', 
                    color: '#666', 
                    fontSize: isMobile() ? '13px' : '15px',
                    whiteSpace: 'nowrap' 
                  }}>
                    {fac.email || '-'}
                  </td>
                  <td style={{ padding: isMobile() ? '14px 12px' : '18px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(fac)}
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
                        onClick={() => handleDelete(fac.id)}
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
              {editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
              <div style={{ marginBottom: isMobile() ? '24px' : '28px' }}>
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
                  {editingFaculty ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
