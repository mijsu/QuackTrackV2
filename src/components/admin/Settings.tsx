'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Bell, Calendar, Lock, Shield, Settings as SettingsIcon } from 'lucide-react';

interface SystemSettings {
  evaluationOpen: boolean;
  currentSemester: string;
  currentSchoolYear: string;
  evaluationStartDate?: string;
  evaluationEndDate?: string;
  notificationsEnabled: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    evaluationOpen: true,
    currentSemester: '1st Semester',
    currentSchoolYear: '2024-2025',
    evaluationStartDate: '',
    evaluationEndDate: '',
    notificationsEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const toggleEvaluation = () => {
    setSettings({ ...settings, evaluationOpen: !settings.evaluationOpen });
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading settings...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>System Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            opacity: saving ? 0.6 : 1
          }}
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message.text && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: message.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
          borderRadius: '6px',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {/* Evaluation Period Settings */}
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Calendar size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#333', margin: 0 }}>Evaluation Period</h3>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
              Evaluation Status
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '8px',
              background: settings.evaluationOpen ? '#dcfce7' : '#fee2e2',
              border: `2px solid ${settings.evaluationOpen ? '#22c55e' : '#ef4444'}`
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: settings.evaluationOpen ? '#22c55e' : '#ef4444',
                marginRight: '12px',
                animation: settings.evaluationOpen ? 'pulse 2s infinite' : 'none'
              }} />
              <span style={{
                fontSize: '16px',
                fontWeight: 600,
                color: settings.evaluationOpen ? '#166534' : '#991b1b'
              }}>
                {settings.evaluationOpen ? 'Open' : 'Closed'}
              </span>
              <button
                onClick={toggleEvaluation}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  background: settings.evaluationOpen ? '#fee2e2' : '#dcfce7',
                  color: settings.evaluationOpen ? '#991b1b' : '#166534',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                {settings.evaluationOpen ? 'Close' : 'Open'} Evaluations
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
              Current Semester *
            </label>
            <select
              value={settings.currentSemester}
              onChange={(e) => setSettings({ ...settings, currentSemester: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
              School Year *
            </label>
            <input
              type="text"
              value={settings.currentSchoolYear}
              onChange={(e) => setSettings({ ...settings, currentSchoolYear: e.target.value })}
              placeholder="e.g., 2024-2025"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Bell size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#333', margin: 0 }}>Notifications</h3>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f9f9f9', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                  Email Notifications
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Receive email alerts when evaluations are submitted
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
                style={{
                  width: '50px',
                  height: '26px',
                  borderRadius: '13px',
                  background: settings.notificationsEnabled ? '#22c55e' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '3px',
                  left: settings.notificationsEnabled ? '27px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s'
                }} />
              </button>
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f9f9f9' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '8px' }}>
              Notification Recipients
            </div>
            <input
              type="text"
              placeholder="admin@cnscc.edu.ph, dean@cnscc.edu.ph"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
              Separate multiple email addresses with commas
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Lock size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#333', margin: 0 }}>Security</h3>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f9f9f9', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '8px' }}>
              Password Policy
            </div>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
              • Minimum 6 characters<br />
              • Recommended to include uppercase, lowercase, numbers<br />
              • Password changes require current password verification
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f9f9f9' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '8px' }}>
              Session Timeout
            </div>
            <select
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>2 hours</option>
              <option>4 hours</option>
            </select>
          </div>
        </div>

        {/* System Info */}
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <SettingsIcon size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#333', margin: 0 }}>System Information</h3>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f9f9f9', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#666' }}>System Version</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#666' }}>Database</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>Firebase Firestore</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#666' }}>Last Updated</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <button
            style={{
              width: '100%',
              padding: '12px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Shield size={16} /> View Security Logs
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
