'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, LogOut, ArrowLeft, FileText, Download, X, CheckCircle, Shield, User, Save } from 'lucide-react';
import AdminDashboard from '@/components/admin/AdminDashboard';

// Helper function to check if device is mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

interface Subject {
  id: string;
  code: string;
  title: string;
  instructorName: string;
  status: 'pending' | 'completed';
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState('role-selection');
  const [role, setRole] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form states
  const [loginRole, setLoginRole] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Registration states
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Forgot password states
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  // Subject list state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Data Privacy Notice state - show on every page load
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  const handleAcceptPrivacy = () => {
    setShowPrivacyNotice(false);
  };

  // Load enrolled subjects when entering evaluation page
  useEffect(() => {
    if (currentPage === 'evaluation') {
      loadEnrolledSubjects();
    }
  }, [currentPage]);

  const loadEnrolledSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/student/subjects?studentId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load subjects');
      }

      const formattedSubjects = data.subjects.map((subject: any) => ({
        id: subject.id,
        code: subject.code,
        title: subject.title,
        instructorName: subject.instructorName,
        instructorId: subject.instructorId,
        status: subject.evaluationStatus === 'completed' ? 'completed' : 'pending',
        evaluationStatus: subject.evaluationStatus
      }));

      console.log('Load Subjects - Loaded subjects with status:', formattedSubjects.map(s => ({ id: s.id, status: s.evaluationStatus })));

      setSubjects(formattedSubjects);
    } catch (err: any) {
      console.error('Load subjects error:', err);
      setError(err.message || 'Failed to load subjects');
      // If API fails, use empty array instead of mock data
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    
    if (!loginRole || !loginUsername || !loginPassword) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: loginRole,
          username: loginUsername,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user info
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('Login successful!');
      
      if (loginRole === 'admin') {
        setCurrentPage('admin-dashboard');
      } else {
        // Check if this is the student's first login
        if (data.isFirstLogin) {
          // Redirect to account setup page instead of dashboard
          setCurrentPage('account-setup');
        } else {
          setCurrentPage('evaluation');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentPage('role-selection');
    setLoginRole('');
    setLoginUsername('');
    setLoginPassword('');
    setShowLogoutConfirm(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccess('');
        setCurrentPage('evaluation');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');

    if (!regUsername || !regPassword || !regConfirmPassword || !regFullName || !regStudentId) {
      setError('Please fill in all required fields');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          fullName: regFullName,
          studentId: regStudentId,
          role: 'student'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! You can now login.');
      setRegUsername('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegFullName('');
      setRegStudentId('');

      setTimeout(() => {
        setSuccess('');
        setCurrentPage('login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    if (!forgotUsername) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername,
          email: forgotEmail
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset');
      }

      setSuccess('Password reset sent! Check with your administrator.');
      setForgotUsername('');
      setForgotEmail('');

      setTimeout(() => {
        setSuccess('');
        setCurrentPage('login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset');
    } finally {
      setLoading(false);
    }
  };

  // Load user profile
  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/student/profile?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load profile');
      }

      setProfileData(data.user);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setProfileError(err.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName: profileData?.fullName,
          email: profileData?.email,
          year: profileData?.year,
          course: profileData?.course,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update localStorage with new user data
      localStorage.setItem('user', JSON.stringify(data.user));
      setProfileSuccess('Profile updated successfully!');

      setTimeout(() => {
        setProfileSuccess('');
        setShowProfileModal(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Open profile modal
  const handleOpenProfile = () => {
    loadProfile();
    setShowProfileModal(true);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <LoginPage
            setCurrentPage={setCurrentPage}
            setRole={setRole}
            role={role}
            loginRole={loginRole}
            setLoginRole={setLoginRole}
            loginUsername={loginUsername}
            setLoginUsername={setLoginUsername}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            handleLogin={handleLogin}
            loading={loading}
            error={error}
            setError={setError}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        );
      case 'register':
        return (
          <RegisterPage
            setCurrentPage={setCurrentPage}
            regUsername={regUsername}
            setRegUsername={setRegUsername}
            regPassword={regPassword}
            setRegPassword={setRegPassword}
            regConfirmPassword={regConfirmPassword}
            setRegConfirmPassword={setRegConfirmPassword}
            regFullName={regFullName}
            setRegFullName={setRegFullName}
            regStudentId={regStudentId}
            setRegStudentId={setRegStudentId}
            handleRegister={handleRegister}
            loading={loading}
            error={error}
            success={success}
            showRegPassword={showRegPassword}
            setShowRegPassword={setShowRegPassword}
            showRegConfirmPassword={showRegConfirmPassword}
            setShowRegConfirmPassword={setShowRegConfirmPassword}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPage
            setCurrentPage={setCurrentPage}
            forgotUsername={forgotUsername}
            setForgotUsername={setForgotUsername}
            forgotEmail={forgotEmail}
            setForgotEmail={setForgotEmail}
            handleForgotPassword={handleForgotPassword}
            loading={loading}
            error={error}
            success={success}
          />
        );
      case 'role-selection':
        return <RoleSelectionPage setCurrentPage={setCurrentPage} setRole={setRole} />;
      case 'evaluation':
        return (
          <EvaluationPage
            setCurrentPage={setCurrentPage}
            setSelectedSubject={setSelectedSubject}
            subjects={subjects}
            loading={loading}
            handleLogoutClick={handleLogoutClick}
            handleOpenProfile={handleOpenProfile}
            loadEnrolledSubjects={loadEnrolledSubjects}
            error={error}
            setError={setError}
            setSuccess={setSuccess}
          />
        );
      case 'evaluation-form':
        return (
          <EvaluationFormPage
            setCurrentPage={setCurrentPage}
            selectedSubject={selectedSubject}
            onEvaluationComplete={() => {
              loadEnrolledSubjects();
              setCurrentPage('evaluation');
            }}
          />
        );
      case 'change-password':
        return (
          <ChangePasswordPage
            setCurrentPage={setCurrentPage}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            handleChangePassword={handleChangePassword}
            loading={loading}
            error={error}
            success={success}
          />
        );
      case 'account-setup':
        return (
          <AccountSetupPage
            setCurrentPage={setCurrentPage}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            success={success}
            setSuccess={setSuccess}
          />
        );
      case 'admin-dashboard':
        return <AdminDashboard handleLogoutClick={handleLogoutClick} />;
      default:
        return <RoleSelectionPage setCurrentPage={setCurrentPage} setRole={setRole} />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#d3d3d3' }}>
      {renderPage()}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <LogOut size={32} style={{ color: '#dc2626' }} />
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '12px',
                marginTop: 0
              }}>
                Confirm Logout
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#666',
                marginBottom: '28px',
                lineHeight: '1.5'
              }}>
                Are you sure you want to log out? You'll need to log in again to access your account.
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'column'
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '14px 24px',
                    backgroundColor: '#8b0000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6b0000'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b0000'}
                >
                  Yes, Log Out
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    padding: '14px 24px',
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Privacy Notice Modal */}
      {showPrivacyNotice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '0',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              padding: '24px',
              borderRadius: '16px 16px 0 0',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Shield size={32} color="white" />
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: 'white',
                margin: 0
              }}>
                Data Privacy Notice
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '8px 0 0 0'
              }}>
                Data Privacy Act of 2012
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{
                fontSize: '14px',
                color: '#444',
                lineHeight: '1.7',
                marginBottom: '16px'
              }}>
                In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, this office is committed to protecting and respecting your privacy and personal information.
              </p>

              <p style={{
                fontSize: '14px',
                color: '#444',
                lineHeight: '1.7',
                marginBottom: '20px'
              }}>
                The personal information collected and displayed on this platform — including your name and schedule — are used solely for the purpose of administering the <strong>Faculty Evaluation System</strong> of this institution.
              </p>

              {/* Rights Section */}
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#8b1a2b',
                  margin: '0 0 12px 0'
                }}>
                  Your Rights Under RA 10173:
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#555',
                  lineHeight: '1.8'
                }}>
                  <li>Right to be informed about the processing of your personal data</li>
                  <li>Right to access your personal data</li>
                  <li>Right to correct any inaccurate personal data</li>
                  <li>Right to object to the processing of your personal data</li>
                  <li>Right to lodge a complaint before the National Privacy Commission</li>
                </ul>
              </div>

              {/* Data Protection Section */}
              <div style={{
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#2e7d32',
                  margin: '0 0 12px 0'
                }}>
                  Data Protection:
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#555',
                  lineHeight: '1.7'
                }}>
                  All personal data is processed lawfully and in good faith. Access to this information is limited to authorized personnel only. We do not share, sell, or disclose your personal information to unauthorized third parties.
                </p>
              </div>

              <p style={{
                fontSize: '13px',
                color: '#666',
                lineHeight: '1.7',
                marginBottom: '20px',
                fontStyle: 'italic'
              }}>
                By clicking "I Understand", you acknowledge that you have read and understood this Data Privacy Notice and consent to the processing of your personal information for the stated purpose.
              </p>

              <p style={{
                fontSize: '12px',
                color: '#888',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                For concerns or inquiries regarding your personal data, please contact the Data Protection Officer of this institution.
              </p>

              {/* Accept Button */}
              <button
                onClick={handleAcceptPrivacy}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 26, 43, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '0',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              padding: '24px',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={24} color="white" />
                </div>
                <div>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: 0
                  }}>
                    My Profile
                  </h2>
                  <p style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    margin: '4px 0 0 0'
                  }}>
                    Update your personal information
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {profileLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #8b1a2b',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p style={{ color: '#666' }}>Loading profile...</p>
                </div>
              ) : (
                <>
                  {profileError && (
                    <div style={{
                      padding: '12px 16px',
                      marginBottom: '20px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #dc2626',
                      borderRadius: '8px',
                      color: '#dc2626',
                      fontSize: '14px'
                    }}>
                      {profileError}
                    </div>
                  )}

                  {profileSuccess && (
                    <div style={{
                      padding: '12px 16px',
                      marginBottom: '20px',
                      backgroundColor: '#d4edda',
                      border: '1px solid #28a745',
                      borderRadius: '8px',
                      color: '#155724',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      ✓ {profileSuccess}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Student ID - Read Only */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={profileData?.studentId || ''}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '8px',
                          backgroundColor: '#f5f5f5',
                          color: '#666',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace'
                        }}
                      />
                      <p style={{
                        fontSize: '12px',
                        color: '#888',
                        margin: '4px 0 0 0',
                        fontStyle: 'italic'
                      }}>
                        Student ID cannot be changed
                      </p>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData?.fullName || ''}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #ddd',
                          borderRadius: '8px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#8b1a2b'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData?.email || ''}
                        readOnly
                        placeholder="Email address"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '8px',
                          backgroundColor: '#f5f5f5',
                          color: '#666',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box'
                        }}
                      />
                      <p style={{
                        fontSize: '12px',
                        color: '#888',
                        margin: '4px 0 0 0',
                        fontStyle: 'italic'
                      }}>
                        Email cannot be changed
                      </p>
                    </div>

                    {/* Course */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Course
                      </label>
                      <select
                        value={profileData?.course || ''}
                        onChange={(e) => setProfileData({ ...profileData, course: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #ddd',
                          borderRadius: '8px',
                          outline: 'none',
                          backgroundColor: 'white',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select Course</option>
                        <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                        <option value="BSBA">BSBA - Bachelor of Science in Business Administration</option>
                        <option value="BSED">BSED - Bachelor of Secondary Education</option>
                        <option value="BEED">BEED - Bachelor of Elementary Education</option>
                        <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
                        <option value="BSTM">BSTM - Bachelor of Science in Tourism Management</option>
                        <option value="BSA">BSA - Bachelor of Science in Accountancy</option>
                        <option value="BSAgri">BSAgri - Bachelor of Science in Agriculture</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    {/* Year */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Year Level
                      </label>
                      <select
                        value={profileData?.year || ''}
                        onChange={(e) => setProfileData({ ...profileData, year: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #ddd',
                          borderRadius: '8px',
                          outline: 'none',
                          backgroundColor: 'white',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '28px',
                    flexDirection: 'column'
                  }}>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={profileSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '14px 24px',
                        background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: profileSaving ? 'wait' : 'pointer',
                        opacity: profileSaving ? 0.7 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <Save size={18} />
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setShowProfileModal(false)}
                      style={{
                        padding: '14px 24px',
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ROLE SELECTION PAGE ====================
function RoleSelectionPage({ setCurrentPage, setRole }: any) {
  const mobile = isMobile();
  const styles: { [key: string]: React.CSSProperties } = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#d3d3d3',
      padding: mobile ? '16px' : '24px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: mobile ? '12px' : '16px',
      padding: mobile ? '24px 20px' : '36px 32px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    header: {
      textAlign: 'center',
      marginBottom: mobile ? '20px' : '32px',
    },
    logoContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: mobile ? '12px' : '16px',
      marginBottom: mobile ? '16px' : '20px',
    },
    logo: {
      width: mobile ? '70px' : '80px',
      height: mobile ? '70px' : '80px',
      objectFit: 'contain',
    },
    logo2: {
      width: mobile ? '90px' : '100px',
      height: mobile ? '90px' : '100px',
      objectFit: 'contain',
    },
    collegeName: {
      fontSize: mobile ? '22px' : '28px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 8px 0',
      letterSpacing: '0.5px',
      lineHeight: '1.3',
    },
    subtitle: {
      fontSize: mobile ? '16px' : '19px',
      color: '#555',
      margin: '0 0 4px 0',
    },
    systemSubtitle: {
      fontSize: mobile ? '14px' : '17px',
      color: '#666',
      margin: '0',
      fontWeight: 500,
    },
    buttonsContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: mobile ? '14px' : '16px',
    },
    button: {
      padding: mobile ? '16px 24px' : '22px 36px',
      fontSize: mobile ? '16px' : '19px',
      fontWeight: 'bold',
      color: '#333',
      backgroundColor: '#f5f5f5',
      border: '2px solid #ddd',
      borderRadius: mobile ? '8px' : '10px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minHeight: mobile ? '54px' : '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonHover: {
      backgroundColor: '#e8e8e8',
      borderColor: '#ccc',
    },
    registerButton: {
      backgroundColor: '#8B0000',
      color: 'white',
      borderColor: '#8B0000',
    },
    registerButtonHover: {
      backgroundColor: '#666600',
      borderColor: '#666600',
    },
    registerButtonSize: {
      padding: mobile ? '12px 20px' : '14px 24px',
      fontSize: mobile ? '14px' : '15px',
      minHeight: mobile ? '44px' : '48px',
    },
    divider: {
      borderTop: '2px solid #e0e0e0',
      paddingTop: mobile ? '20px' : '24px',
      marginTop: mobile ? '12px' : '16px',
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
              alt="CNSC Logo 1"
              style={styles.logo}
            />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
              alt="CNSC Logo 2"
              style={styles.logo2}
            />
          </div>
          <h1 style={styles.collegeName}>CAMARINES NORTE STATE COLLEGE</h1>
          <p style={styles.subtitle}>College of Trades and Technology</p>
          <p style={styles.systemSubtitle}>Online Faculty Evaluation System</p>
        </div>

        {/* Buttons */}
        <div style={styles.buttonsContainer}>
          <button
            onClick={() => {
              setRole('student');
              setCurrentPage('login');
            }}
            style={styles.button}
          >
            STUDENT
          </button>

          <button
            onClick={() => {
              setRole('admin');
              setCurrentPage('login');
            }}
            style={styles.button}
          >
            ADMINISTRATOR
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage({
  setCurrentPage,
  setRole,
  role,
  loginRole,
  setLoginRole,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  handleLogin,
  loading,
  error,
  setError,
  showPassword,
  setShowPassword
}: any) {
  const mobile = isMobile();
  // Sync loginRole with the role prop whenever role changes
  useEffect(() => {
    if (role) {
      setLoginRole(role);
    }
  }, [role, setLoginRole]);

  // Handle going back to role selection - reset all form state
  const handleBackToRoleSelection = () => {
    setLoginUsername('');
    setLoginPassword('');
    setError('');
    setRole('');
    setLoginRole('');
    setCurrentPage('role-selection');
  };

  const styles: { [key: string]: React.CSSProperties } = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#d3d3d3',
      padding: mobile ? '16px' : '24px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: mobile ? '12px' : '16px',
      padding: mobile ? '28px 24px' : '40px 36px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: mobile ? '450px' : '500px',
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    header: {
      textAlign: 'center',
      marginBottom: mobile ? '24px' : '32px',
    },
    logoContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: mobile ? '12px' : '16px',
      marginBottom: mobile ? '16px' : '20px',
    },
    logo: {
      width: mobile ? '70px' : '80px',
      height: mobile ? '70px' : '80px',
      objectFit: 'contain',
    },
    logo2: {
      width: mobile ? '90px' : '100px',
      height: mobile ? '90px' : '100px',
      objectFit: 'contain',
    },
    collegeName: {
      fontSize: mobile ? '20px' : '24px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 8px 0',
      letterSpacing: '0.5px',
      lineHeight: '1.3',
    },
    subtitle: {
      fontSize: mobile ? '15px' : '16px',
      color: '#555',
      margin: '0 0 4px 0',
    },
    systemSubtitle: {
      fontSize: mobile ? '13px' : '15px',
      color: '#666',
      margin: '0',
      fontWeight: 500,
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      border: '1px solid #dc2626',
      color: '#dc2626',
      padding: mobile ? '14px 18px' : '18px 24px',
      borderRadius: mobile ? '6px' : '8px',
      marginBottom: mobile ? '18px' : '24px',
      fontSize: mobile ? '15px' : '16px',
      wordBreak: 'break-word' as const,
    },
    formGroup: {
      marginBottom: mobile ? '20px' : '24px',
    },
    label: {
      display: 'block',
      marginBottom: mobile ? '10px' : '12px',
      fontSize: mobile ? '15px' : '17px',
      fontWeight: '600',
      color: '#333',
    },
    input: {
      width: '100%',
      padding: mobile ? '14px 18px' : '16px 20px',
      fontSize: mobile ? '17px' : '18px',
      border: '1px solid #ddd',
      borderRadius: mobile ? '6px' : '8px',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    inputFocus: {
      borderColor: '#666',
      boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.1)',
    },
    passwordContainer: {
      position: 'relative',
    },
    togglePassword: {
      position: 'absolute',
      right: mobile ? '14px' : '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#666',
      cursor: 'pointer',
      padding: '8px',
    },
    loginButton: {
      width: '100%',
      padding: mobile ? '16px 24px' : '18px 28px',
      fontSize: mobile ? '17px' : '18px',
      fontWeight: 'bold',
      color: 'white',
      backgroundColor: '#8B0000',
      border: 'none',
      borderRadius: mobile ? '8px' : '10px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      minHeight: mobile ? '54px' : '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginButtonHover: {
      backgroundColor: '#666600',
    },
    loginButtonDisabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
    forgotLinkContainer: {
      textAlign: 'center',
      marginTop: mobile ? '20px' : '24px',
    },
    forgotLink: {
      color: '#0066cc',
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: mobile ? '15px' : '16px',
      fontWeight: '500',
      cursor: 'pointer',
      textDecoration: 'underline',
      transition: 'color 0.2s',
    },
    select: {
      width: '100%',
      padding: mobile ? '14px 18px' : '16px 20px',
      fontSize: mobile ? '17px' : '18px',
      border: '1px solid #ddd',
      borderRadius: mobile ? '6px' : '8px',
      backgroundColor: '#fafafa',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: mobile ? '10px 16px' : '12px 18px',
      fontSize: mobile ? '14px' : '15px',
      fontWeight: '600',
      color: '#666',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: mobile ? '6px' : '8px',
      cursor: 'pointer',
      marginBottom: mobile ? '20px' : '24px',
      transition: 'all 0.2s',
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBackToRoleSelection}
          style={styles.backButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e8e8e8';
            e.currentTarget.style.borderColor = '#ccc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = '#ddd';
          }}
        >
          <ArrowLeft size={18} />
          Back to Role Selection
        </button>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
              alt="CNSC Logo 1"
              style={styles.logo}
            />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
              alt="CNSC Logo 2"
              style={styles.logo2}
            />
          </div>
          <h1 style={styles.collegeName}>CAMARINES NORTE STATE COLLEGE</h1>
          <p style={styles.subtitle}>College of Trades and Technology</p>
          <p style={styles.systemSubtitle}>Online Faculty Evaluation System</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={styles.formGroup}>
          <label style={styles.label}>{loginRole === 'admin' ? 'Username' : 'Student ID'}</label>
          <input
            type="text"
            placeholder={loginRole === 'admin' ? 'Enter your username' : 'Enter your Student ID'}
            value={loginUsername}
            onChange={(e) => setLoginUsername(loginRole === 'admin' ? e.target.value : e.target.value.toUpperCase())}
            style={loginRole === 'admin' ? styles.input : { ...styles.input, fontFamily: 'monospace', textTransform: 'uppercase' }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <div style={styles.passwordContainer}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              style={styles.input}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.togglePassword}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div style={styles.formGroup}>
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              ...styles.loginButton,
              ...(loading ? styles.loginButtonDisabled : {})
            }}
          >
            {loading ? 'Logging in...' : 'LOG IN'}
          </button>
        </div>

        {/* Forgot Password Link */}
        <div style={styles.forgotLinkContainer}>
          <button
            type="button"
            onClick={() => setCurrentPage('forgot-password')}
            style={styles.forgotLink}
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== EVALUATION PAGE ====================
function EvaluationPage({
  setCurrentPage,
  setSelectedSubject,
  subjects,
  loading,
  handleLogoutClick,
  handleOpenProfile,
  loadEnrolledSubjects,
  error,
  setError,
  setSuccess
}: any) {
  const [evaluationOpen, setEvaluationOpen] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [localSuccess, setLocalSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setEvaluationOpen(data.settings.evaluationOpen !== false); // Default to true if not set
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Load evaluation summary data
  const loadSummaryData = async () => {
    setSummaryLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/student/evaluations/summary?studentId=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setSummaryData(data);
        setShowSummaryModal(true);
      } else {
        setError('Failed to load evaluation summary');
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      setError('Failed to load evaluation summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Download PDF summary
  const handleDownloadPDF = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/student/evaluations/summary/pdf?studentId=${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('PDF generation error:', errorData);
        setError(errorData.error || errorData.details || 'Failed to generate PDF');
        return;
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'Evaluation_Summary.pdf';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      setError(error.message || 'Failed to download PDF');
    }
  };

  const handleEvaluate = (subject: any) => {
    if (!evaluationOpen) {
      return; // Don't allow evaluation if closed
    }

    // Check if already completed
    if (subject.evaluationStatus === 'completed') {
      alert('You have already completed the evaluation for this subject.');
      return;
    }

    setSelectedSubject(subject);
    setCurrentPage('evaluation-form');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Calculate evaluation progress based on both drafts (localStorage) and completed (database)
  const totalSubjects = subjects.length;
  
  // Count completed evaluations from database
  const completedCount = subjects.filter((s: any) => s.evaluationStatus === 'completed').length;
  
  // Count drafts from localStorage (only if not already completed)
  const draftCount = subjects.filter((s: any) => {
    if (s.evaluationStatus === 'completed') return false; // Don't count if already completed
    const draftKey = `evaluation_draft_${user.id}_${s.id}`;
    return localStorage.getItem(draftKey) !== null;
  }).length;
  
  const evaluatedCount = completedCount + draftCount;
  const remainingCount = totalSubjects - evaluatedCount;
  const isComplete = remainingCount === 0;
  const progressPercentage = totalSubjects > 0 ? (evaluatedCount / totalSubjects) * 100 : 0;

  console.log('Progress Calculation:', { totalSubjects, completedCount, draftCount, evaluatedCount, remainingCount, isComplete });

  // Handle submit all evaluations
  const handleSubmitAll = async () => {
    if (!evaluationOpen) {
      setError('Evaluations are currently closed. Please contact your administrator.');
      return;
    }

    if (!isComplete) {
      setError('Please complete all evaluations before submitting.');
      return;
    }

    setSubmitLoading(true);
    try {
      // Collect all drafts
      const drafts: any[] = [];
      subjects.forEach((subject: any) => {
        const draftKey = `evaluation_draft_${user.id}_${subject.id}`;
        const draftData = localStorage.getItem(draftKey);
        if (draftData) {
          const draft = JSON.parse(draftData);
          drafts.push({
            ...draft,
            studentId: user.id,
            subjectId: subject.id,
            facultyId: subject.instructorId || subject.id
          });
        }
      });

      console.log('Submit All - Collected drafts:', drafts.length);

      if (drafts.length === 0) {
        setError('No evaluations to submit.');
        return;
      }

      console.log('Submit All - First draft sample:', drafts[0]);

      // Submit all evaluations to API
      const response = await fetch('/api/student/evaluations/submit-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations: drafts })
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error message
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((d: any) => `${d.subjectId}: ${d.error}`).join(', ');
          throw new Error(errorMessages || data.error || 'Failed to submit evaluations');
        }
        throw new Error(data.error || 'Failed to submit evaluations');
      }

      // Clear all drafts after successful submission
      subjects.forEach((subject: any) => {
        const draftKey = `evaluation_draft_${user.id}_${subject.id}`;
        localStorage.removeItem(draftKey);
      });

      console.log('Submit All - Drafts cleared, reloading subjects...');

      // Wait a moment for database writes to commit, then reload subjects
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload subjects to show updated status
      await loadEnrolledSubjects();

      console.log('Submit All - Subjects reloaded successfully');

      setLocalSuccess('All evaluations submitted successfully!');
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (err: any) {
      console.error('Submit All - Error:', err);
      setError(err.message || 'Failed to submit evaluations');
    } finally {
      setSubmitLoading(false);
    }
  };

  const mobile = isMobile();

  const styles: { [key: string]: React.CSSProperties } = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#d3d3d3',
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
    headerBar: {
      background: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
      padding: mobile ? '10px 12px' : '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: mobile ? '8px' : '16px',
      flexWrap: 'wrap',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: mobile ? '8px' : '14px',
      flex: mobile ? '1 1 auto' : '0 0 auto',
      minWidth: 0,
    },
    logoSmall: {
      width: mobile ? '32px' : '44px',
      height: mobile ? '32px' : '44px',
      objectFit: 'contain',
      flexShrink: 0,
    },
    headerTitle: {
      color: 'white',
      fontSize: mobile ? '12px' : '18px',
      fontWeight: 'bold',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.85)',
      fontSize: mobile ? '10px' : '13px',
      marginTop: '2px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    headerButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: mobile ? '6px' : '10px',
      flexShrink: 0,
    },
    profileButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: mobile ? '6px' : '8px',
      padding: mobile ? '6px 10px' : '10px 18px',
      fontSize: mobile ? '11px' : '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transition: 'all 0.2s',
      minHeight: mobile ? '36px' : '40px',
      minWidth: mobile ? '36px' : 'auto',
    },
    logoutButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      color: '#8B0000',
      border: 'none',
      borderRadius: mobile ? '6px' : '8px',
      padding: mobile ? '6px 10px' : '10px 18px',
      fontSize: mobile ? '11px' : '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transition: 'all 0.2s',
      minHeight: mobile ? '36px' : '40px',
      minWidth: mobile ? '36px' : 'auto',
    },
    mainContent: {
      padding: mobile ? '16px' : '24px',
    },
    header: {
      textAlign: 'center',
      marginBottom: mobile ? '24px' : '32px',
    },
    logoContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: mobile ? '12px' : '16px',
      marginBottom: mobile ? '14px' : '18px',
    },
    logo: {
      width: mobile ? '50px' : '60px',
      height: mobile ? '50px' : '60px',
      objectFit: 'contain',
    },
    logo2: {
      width: mobile ? '70px' : '80px',
      height: mobile ? '70px' : '80px',
      objectFit: 'contain',
    },
    collegeName: {
      fontSize: mobile ? '18px' : '24px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 6px 0',
      letterSpacing: '0.5px',
      lineHeight: '1.3',
    },
    subtitle: {
      fontSize: mobile ? '14px' : '16px',
      color: '#555',
      margin: '0 0 4px 0',
    },
    systemSubtitle: {
      fontSize: mobile ? '12px' : '14px',
      color: '#666',
      margin: '0',
      fontWeight: 500,
    },
    contentCard: {
      maxWidth: '100%',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: mobile ? '10px' : '14px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      padding: mobile ? '20px 18px' : '32px 28px',
    },
    welcomeSection: {
      marginBottom: mobile ? '24px' : '32px',
    },
    welcomeText: {
      fontSize: mobile ? '20px' : '26px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 8px 0',
    },
    systemTitle: {
      fontSize: mobile ? '15px' : '18px',
      color: '#666',
      margin: '0',
    },
    tableSection: {
      marginTop: mobile ? '20px' : '24px',
    },
    sectionTitle: {
      fontSize: mobile ? '18px' : '22px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: mobile ? '14px' : '16px',
    },
    tableWrapper: {
      overflowX: 'auto',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: mobile ? '13px' : '16px',
    },
    tableHeader: {
      backgroundColor: '#f5f5f5',
    },
    th: {
      padding: mobile ? '12px 10px' : '14px 18px',
      textAlign: 'left' as const,
      borderBottom: '2px solid #ddd',
      fontWeight: '600',
      color: '#444',
    },
    tableRow: {
      borderBottom: '1px solid #eee',
    },
    td: {
      padding: mobile ? '14px 16px' : '18px 22px',
      color: '#333',
    },
    evaluateButton: {
      backgroundColor: '#8B0000',
      color: 'white',
      border: 'none',
      borderRadius: mobile ? '6px' : '8px',
      padding: mobile ? '10px 18px' : '12px 26px',
      fontSize: mobile ? '13px' : '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    evaluateButtonDisabled: {
      backgroundColor: '#ccc',
      color: '#666',
      border: 'none',
      borderRadius: mobile ? '6px' : '8px',
      padding: mobile ? '10px 18px' : '12px 26px',
      fontSize: mobile ? '13px' : '16px',
      fontWeight: 'bold',
      cursor: 'not-allowed',
    },
    completedStatus: {
      color: '#4CAF50',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
    },
    draftStatus: {
      color: '#ff9800',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
    },
    submitAllButton: {
      width: '100%',
      padding: mobile ? '16px 24px' : '18px 28px',
      fontSize: mobile ? '17px' : '18px',
      fontWeight: 'bold',
      color: 'white',
      backgroundColor: isComplete ? '#28a745' : '#ccc',
      border: 'none',
      borderRadius: mobile ? '8px' : '10px',
      cursor: isComplete ? 'pointer' : 'not-allowed',
      transition: 'background-color 0.2s',
      minHeight: mobile ? '54px' : '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: mobile ? '20px' : '24px',
    },
    submitAllButtonHover: {
      backgroundColor: isComplete ? '#218838' : '#ccc',
    },
    loadingText: {
      textAlign: 'center',
      padding: '24px',
      color: '#666',
    },
    closedNotice: {
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      color: '#856404',
      padding: mobile ? '14px 18px' : '18px 26px',
      borderRadius: mobile ? '6px' : '8px',
      marginBottom: mobile ? '24px' : '32px',
      fontSize: mobile ? '15px' : '17px',
      textAlign: 'center',
      fontWeight: '500',
    },
    progressSection: {
      backgroundColor: isComplete ? '#d4edda' : '#fff3cd',
      border: isComplete ? '2px solid #28a745' : '2px solid #ffc107',
      borderRadius: mobile ? '8px' : '10px',
      padding: mobile ? '16px 20px' : '20px 24px',
      marginBottom: mobile ? '20px' : '24px',
    },
    progressHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: mobile ? '12px' : '16px',
    },
    progressTitle: {
      fontSize: mobile ? '16px' : '18px',
      fontWeight: 'bold',
      color: isComplete ? '#155724' : '#856404',
      margin: 0,
    },
    progressCount: {
      fontSize: mobile ? '14px' : '16px',
      fontWeight: '600',
      color: isComplete ? '#155724' : '#856404',
    },
    progressBarContainer: {
      width: '100%',
      height: mobile ? '24px' : '28px',
      backgroundColor: '#f0f0f0',
      borderRadius: mobile ? '12px' : '14px',
      overflow: 'hidden',
      border: '1px solid #ddd',
    },
    progressBar: {
      height: '100%',
      backgroundColor: isComplete ? '#28a745' : '#ffc107',
      transition: 'width 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: mobile ? '11px' : '13px',
      fontWeight: 'bold',
      color: '#333',
    },
    warningMessage: {
      marginTop: mobile ? '12px' : '16px',
      padding: mobile ? '12px 16px' : '14px 18px',
      backgroundColor: '#f8d7da',
      border: '1px solid #dc3545',
      borderRadius: mobile ? '6px' : '8px',
      color: '#721c24',
      fontSize: mobile ? '13px' : '15px',
      fontWeight: '500',
      textAlign: 'left',
    },
    warningIcon: {
      fontSize: mobile ? '16px' : '18px',
      marginRight: '8px',
    },
    successMessage: {
      marginTop: mobile ? '12px' : '16px',
      padding: mobile ? '12px 16px' : '14px 18px',
      backgroundColor: '#d4edda',
      border: '1px solid #28a745',
      borderRadius: mobile ? '6px' : '8px',
      color: '#155724',
      fontSize: mobile ? '14px' : '16px',
      fontWeight: '500',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header Bar */}
      <div style={styles.headerBar}>
        <div style={styles.headerLeft}>
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
            alt="CNSC Logo"
            style={styles.logoSmall}
          />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={styles.headerTitle}>
              {mobile ? 'CNSC Faculty Evaluation' : 'CNSC Faculty Evaluation'}
            </div>
            {!mobile && (
              <div style={styles.headerSubtitle}>College of Trades and Technology</div>
            )}
          </div>
        </div>
        <div style={styles.headerButtons}>
          <button
            onClick={handleOpenProfile}
            style={styles.profileButton}
            title="Profile"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            <User size={mobile ? 16 : 18} />
            {mobile ? '' : 'Profile'}
          </button>
          <button
            onClick={handleLogoutClick}
            style={styles.logoutButton}
            title="Logout"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <LogOut size={mobile ? 16 : 18} />
            {mobile ? '' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
              alt="CNSC Logo 1"
              style={styles.logo}
            />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
              alt="CNSC Logo 2"
              style={styles.logo2}
            />
          </div>
          <h1 style={styles.collegeName}>CAMARINES NORTE STATE COLLEGE</h1>
          <p style={styles.subtitle}>College of Trades and Technology</p>
          <p style={styles.systemSubtitle}>Online Faculty Evaluation System</p>
        </div>

        {/* Content Card */}
        <div style={styles.contentCard}>
          {/* Evaluation Closed Notice */}
          {!settingsLoading && !evaluationOpen && (
            <div style={styles.closedNotice}>
              ⚠️ Evaluations are currently closed. Please contact your administrator for more information.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '20px',
              backgroundColor: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
        )}

        {/* Success Message */}
        {localSuccess && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            backgroundColor: '#d4edda',
            border: '1px solid #28a745',
            borderRadius: '6px',
            color: '#155724',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✓ {localSuccess}
          </div>
        )}

        {/* Welcome Section */}
        <div style={styles.welcomeSection}>
          <h2 style={styles.welcomeText}>Welcome, {user.fullName || 'Student'}!</h2>
          <p style={styles.systemSubtitle}>Online Faculty Evaluation System</p>
        </div>

        {/* Completion Card - Show when all evaluations are actually submitted to database */}
        {!loading && subjects.length > 0 && completedCount === totalSubjects && totalSubjects > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #8b0000 0%, #6b0000 100%)',
            borderRadius: mobile ? '12px' : '16px',
            padding: mobile ? '32px 28px' : '40px 36px',
            marginBottom: mobile ? '24px' : '32px',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(139, 0, 0, 0.25)',
            border: '2px solid #5a0000'
          }}>
            {/* University Logo Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: mobile ? '16px' : '20px',
              marginBottom: mobile ? '20px' : '24px',
              flexWrap: 'wrap'
            }}>
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
                alt="CNSC Logo"
                style={{
                  width: mobile ? '60px' : '80px',
                  height: mobile ? '60px' : '80px',
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)' // White logo for dark background
                }}
              />
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
                alt="CNSC Logo 2"
                style={{
                  width: mobile ? '80px' : '100px',
                  height: mobile ? '80px' : '100px',
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)' // White logo for dark background
                }}
              />
            </div>

            {/* Main Content */}
            <div style={{
              marginBottom: mobile ? '20px' : '24px'
            }}>
              <h2 style={{
                fontSize: mobile ? '18px' : '22px',
                fontWeight: 'bold',
                margin: `0 0 ${mobile ? '8px' : '12px'} 0`,
                color: 'white',
                letterSpacing: '0.5px',
                lineHeight: '1.3'
              }}>
                CAMARINES NORTE STATE COLLEGE
              </h2>
              <p style={{
                fontSize: mobile ? '14px' : '16px',
                margin: `0 0 ${mobile ? '8px' : '12px'} 0`,
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 500
              }}>
                College of Trades and Technology
              </p>
              <p style={{
                fontSize: mobile ? '13px' : '15px',
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontStyle: 'italic'
              }}>
                Online Faculty Evaluation System
              </p>
            </div>

            {/* Divider */}
            <div style={{
              width: '100%',
              height: '1px',
              background: 'rgba(255, 255, 255, 0.3)',
              margin: mobile ? '20px 0' : '24px 0'
            }} />

            {/* Success Message */}
            <div style={{
              marginBottom: mobile ? '20px' : '24px'
            }}>
              <h3 style={{
                fontSize: mobile ? '24px' : '32px',
                fontWeight: 'bold',
                margin: `0 0 ${mobile ? '12px' : '16px'} 0`,
                color: 'white'
              }}>
                ✓ Evaluation Completed Successfully
              </h3>
              <p style={{
                fontSize: mobile ? '15px' : '17px',
                margin: `0 0 ${mobile ? '8px' : '12px'} 0`,
                color: 'rgba(255, 255, 255, 0.95)',
                lineHeight: '1.6'
              }}>
                Thank you for your valuable feedback. Your evaluations have been submitted.
              </p>
              <p style={{
                fontSize: mobile ? '14px' : '16px',
                margin: '0',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: '1.5'
              }}>
                <strong>{totalSubjects} professor{totalSubjects > 1 ? 's' : ''}</strong> evaluated and submitted
              </p>
            </div>

            {/* Completion Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: mobile ? '10px' : '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: mobile ? '25px' : '30px',
              padding: mobile ? '12px 28px' : '14px 36px',
              fontSize: mobile ? '14px' : '16px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <span style={{ fontSize: mobile ? '18px' : '22px' }}>✓</span>
              100% Complete
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: mobile ? '12px' : '16px',
              marginTop: mobile ? '24px' : '28px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={loadSummaryData}
                disabled={summaryLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: mobile ? '12px 24px' : '14px 28px',
                  backgroundColor: 'white',
                  color: '#8b0000',
                  border: 'none',
                  borderRadius: mobile ? '8px' : '10px',
                  fontSize: mobile ? '14px' : '16px',
                  fontWeight: 'bold',
                  cursor: summaryLoading ? 'wait' : 'pointer',
                  opacity: summaryLoading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <FileText size={18} />
                {summaryLoading ? 'Loading...' : 'View Summary'}
              </button>
              <button
                onClick={handleDownloadPDF}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: mobile ? '12px 24px' : '14px 28px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: mobile ? '8px' : '10px',
                  fontSize: mobile ? '14px' : '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        )}

        {/* Progress Section - Only show if there are subjects and not completed */}
        {!loading && subjects.length > 0 && !isComplete && (
          <div style={styles.progressSection}>
            <div style={styles.progressHeader}>
              <h3 style={styles.progressTitle}>Evaluation Progress</h3>
              <span style={styles.progressCount}>
                {evaluatedCount} of {totalSubjects} professors evaluated
              </span>
            </div>
            <div style={styles.progressBarContainer}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${progressPercentage}%`
                }}
              >
                {Math.round(progressPercentage)}%
              </div>
            </div>
            {!isComplete ? (
              <div style={styles.warningMessage}>
                <span style={styles.warningIcon}>⚠️</span>
                <strong>Important:</strong> You have <strong>{remainingCount} professor{remainingCount > 1 ? 's' : ''}</strong> left to evaluate.
                Your evaluations will not be recorded unless you evaluate all professors assigned to you.
                Please complete all evaluations to ensure your feedback is counted.
              </div>
            ) : (
              <div style={styles.successMessage}>
                ✓ All evaluations completed! Thank you for your feedback.
              </div>
            )}
          </div>
        )}

        {/* Enrolled Subjects Table */}
        <div style={styles.tableSection}>
          <h3 style={styles.sectionTitle}>
            {isComplete && totalSubjects > 0 ? 'Evaluation Summary' : 'Enrolled Subjects'}
          </h3>
          {loading ? (
            <div style={styles.loadingText}>Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                No Enrolled Subjects Found
              </h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
                You are not currently enrolled in any subjects for evaluation.
                <br />
                Please contact your administrator to assign subjects to you.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Subject Code</th>
                    <th style={styles.th}>Subject Title</th>
                    <th style={styles.th}>Instructor</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject: any, idx: number) => {
                    const draftKey = `evaluation_draft_${user.id}_${subject.id}`;
                    const hasDraft = localStorage.getItem(draftKey) !== null;
                    const isCompleted = subject.evaluationStatus === 'completed';

                    return (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>{subject.code}</td>
                        <td style={styles.td}>{subject.title}</td>
                        <td style={styles.td}>{subject.instructorName}</td>
                        <td style={styles.td}>
                          {isCompleted ? (
                            <span style={styles.completedStatus}>
                              ✓ Completed
                            </span>
                          ) : hasDraft ? (
                            <span style={styles.draftStatus}>
                              ✓ Draft Saved
                            </span>
                          ) : (
                            <button
                              style={!evaluationOpen ? styles.evaluateButtonDisabled : styles.evaluateButton}
                              onClick={() => handleEvaluate(subject)}
                              disabled={!evaluationOpen}
                            >
                              {evaluationOpen ? 'EVALUATE' : 'CLOSED'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Submit All Button - Show when there are drafts saved and not all completed */}
          {!loading && subjects.length > 0 && draftCount > 0 && completedCount < totalSubjects && (
            <button
              onClick={handleSubmitAll}
              disabled={!isComplete || !evaluationOpen}
              style={styles.submitAllButton}
              onMouseEnter={(e) => {
                if (isComplete && evaluationOpen) {
                  e.currentTarget.style.backgroundColor = '#218838';
                }
              }}
              onMouseLeave={(e) => {
                if (isComplete && evaluationOpen) {
                  e.currentTarget.style.backgroundColor = '#28a745';
                }
              }}
            >
              {submitLoading ? 'Submitting...' : !evaluationOpen ? 'EVALUATIONS CLOSED' : isComplete ? 'SUBMIT ALL EVALUATIONS' : `Complete All Evaluations First (${remainingCount} Remaining)`}
            </button>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      {showSummaryModal && summaryData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: mobile ? '16px' : '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: mobile ? '12px' : '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: mobile ? '16px 20px' : '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={mobile ? 20 : 24} />
                <div>
                  <h3 style={{ fontSize: mobile ? '16px' : '18px', fontWeight: 700, margin: 0 }}>Evaluation Summary</h3>
                  <p style={{ fontSize: mobile ? '12px' : '14px', margin: 0, opacity: 0.9 }}>
                    {summaryData.studentInfo?.fullName || 'Student'} - {summaryData.studentInfo?.studentId || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: mobile ? '32px' : '36px',
                  height: mobile ? '32px' : '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={mobile ? 18 : 20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: mobile ? '16px' : '24px' }}>
              {summaryData.evaluations && summaryData.evaluations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? '12px' : '16px' }}>
                  {/* Overall Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: mobile ? '10px' : '12px',
                    marginBottom: mobile ? '12px' : '16px'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                      padding: mobile ? '12px' : '16px',
                      borderRadius: '8px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: mobile ? '20px' : '28px', fontWeight: 700 }}>
                        {summaryData.evaluations.length}
                      </div>
                      <div style={{ fontSize: mobile ? '11px' : '13px', opacity: 0.9 }}>Faculty Evaluated</div>
                    </div>
                    <div style={{
                      background: '#f0f0f0',
                      padding: mobile ? '12px' : '16px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: mobile ? '20px' : '28px', fontWeight: 700, color: '#333' }}>
                        {(summaryData.evaluations.reduce((sum: number, e: any) => sum + (e.totalScore || 0), 0) / summaryData.evaluations.length / 5).toFixed(1)}
                      </div>
                      <div style={{ fontSize: mobile ? '11px' : '13px', color: '#666' }}>Avg Score (/20)</div>
                    </div>
                    <div style={{
                      background: '#f0f0f0',
                      padding: mobile ? '12px' : '16px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: mobile ? '20px' : '28px', fontWeight: 700, color: '#333' }}>
                        {(summaryData.evaluations.reduce((sum: number, e: any) => sum + (e.totalScore || 0), 0) / summaryData.evaluations.length / 5 / 20 * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: mobile ? '11px' : '13px', color: '#666' }}>Avg Percentage</div>
                    </div>
                  </div>

                  {/* Evaluation List */}
                  {summaryData.evaluations.map((evaluation: any, idx: number) => {
                    const score = (evaluation.totalScore || 0) / 5;
                    const percentage = (score / 20) * 100;
                    const getRatingLabel = (pct: number) => {
                      if (pct >= 90) return { label: 'Outstanding', color: '#166534' };
                      if (pct >= 75) return { label: 'Very Satisfactory', color: '#1e40af' };
                      if (pct >= 60) return { label: 'Satisfactory', color: '#92400e' };
                      return { label: 'Fair', color: '#991b1b' };
                    };
                    const rating = getRatingLabel(percentage);

                    return (
                      <div key={evaluation.id || idx} style={{
                        background: '#fafafa',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: mobile ? '12px' : '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: mobile ? '14px' : '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#333' }}>
                              {evaluation.facultyName}
                            </h4>
                            <p style={{ fontSize: mobile ? '12px' : '14px', margin: '0 0 4px 0', color: '#666' }}>
                              {evaluation.subjectCode} - {evaluation.subjectTitle}
                            </p>
                            <p style={{ fontSize: mobile ? '11px' : '13px', margin: 0, color: '#888' }}>
                              {evaluation.semester} | {evaluation.schoolYear}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: mobile ? '12px' : '14px',
                              fontWeight: 600,
                              backgroundColor: percentage >= 90 ? '#dcfce7' : percentage >= 75 ? '#dbeafe' : percentage >= 60 ? '#fef3c7' : '#fee2e2',
                              color: rating.color
                            }}>
                              {score.toFixed(1)}/20
                            </div>
                            <div style={{ fontSize: mobile ? '11px' : '13px', color: '#666', marginTop: '4px' }}>
                              {rating.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>No evaluations found.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: mobile ? '12px 16px' : '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9f9f9',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: mobile ? '12px' : '14px', color: '#666' }}>
                {summaryData.evaluations?.length || 0} evaluation(s) completed
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  style={{
                    padding: mobile ? '10px 20px' : '12px 24px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: mobile ? '13px' : '14px'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: mobile ? '10px 20px' : '12px 24px',
                    background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: mobile ? '13px' : '14px'
                  }}
                >
                  <Download size={16} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ==================== EVALUATION FORM PAGE ====================
function EvaluationFormPage({ setCurrentPage, selectedSubject, onEvaluationComplete }: any) {
  const [ratings, setRatings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [evaluationOpen, setEvaluationOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [hasWarning, setHasWarning] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkEvaluationStatus();
    loadAllSubjects();
  }, []);

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const checkEvaluationStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success && data.settings) {
        const isOpen = data.settings.evaluationOpen !== false;
        setEvaluationOpen(isOpen);
        if (!isOpen) {
          setError('Evaluations are currently closed. Please contact your administrator.');
        }
      }
    } catch (error) {
      console.error('Error checking evaluation status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const loadAllSubjects = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/student/subjects?studentId=${user.id}`);
      const data = await response.json();

      if (response.ok && data.subjects) {
        setAllSubjects(data.subjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  // Load draft for current subject
  const loadDraft = () => {
    if (selectedSubject) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const draftKey = `evaluation_draft_${user.id}_${selectedSubject.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setRatings(draft.ratings || {});
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  };

  // Load draft when component mounts or selectedSubject changes
  useEffect(() => {
    if (selectedSubject) {
      loadDraft();
    }
  }, [selectedSubject]);

  const handleRating = (section: string, item: number, value: number) => {
    setRatings({
      ...ratings,
      [`${section}-${item}`]: value,
    });
  };

  const handleSaveDraft = () => {
    if (!evaluationOpen) {
      setError('Evaluations are currently closed. Please contact your administrator.');
      return;
    }

    // Check if all questions are answered
    const totalQuestions = 20; // 4 sections x 5 questions each
    const answeredQuestions = Object.keys(ratings).length;

    if (answeredQuestions < totalQuestions) {
      setError(`Please answer all questions before saving. (${answeredQuestions}/${totalQuestions} answered)`);
      return;
    }

    // Save draft to localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const draftKey = `evaluation_draft_${user.id}_${selectedSubject.id}`;

    // Calculate total score
    const sections = getSections();
    let totalScore = 0;
    Object.entries(sections).forEach(([key, section]: [string, any]) => {
      section.items.forEach((item: string, idx: number) => {
        const rating = ratings[`${key}-${idx + 1}`];
        totalScore += rating;
      });
    });
    totalScore = totalScore / 5;

    // Get settings for semester and school year
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        const { currentSemester, currentSchoolYear } = data.settings || {};

        const draftData = {
          subjectId: selectedSubject.id,
          facultyId: selectedSubject.instructorId || selectedSubject.id,
          ratings,
          totalScore,
          semester: currentSemester || '1st Semester',
          schoolYear: currentSchoolYear || '2024-2025',
          savedAt: new Date().toISOString()
        };

        localStorage.setItem(draftKey, JSON.stringify(draftData));
        onEvaluationComplete();
      })
      .catch(error => {
        console.error('Error saving draft:', error);
        setError('Failed to save draft');
      });
  };

  const handleShowConfirm = () => {
    // Now just save draft directly without confirmation modal
    handleSaveDraft();
  };

  const handleSubmitEvaluation = async () => {
    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Build evaluation data
      const sections = getSections();
      const responses: any[] = [];
      
      // Calculate ratings grouped by section and total score
      const ratingsBySection: any = { A: {}, B: {}, C: {}, D: {} };
      let totalScore = 0;
      
      Object.entries(sections).forEach(([key, section]: [string, any]) => {
        section.items.forEach((item: string, idx: number) => {
          const rating = ratings[`${key}-${idx + 1}`];
          ratingsBySection[key][idx + 1] = rating;
          totalScore += rating;
        });
      });

      // Convert sum to score out of 20 (since 20 questions × 5 max = 100, divide by 5 to get score out of 20)
      totalScore = totalScore / 5;

      // Get settings for semester and school year
      const settingsResponse = await fetch('/api/admin/settings');
      const settingsData = await settingsResponse.json();
      const { currentSemester, currentSchoolYear } = settingsData.settings || {};

      const evaluationData = {
        studentId: user.id,
        subjectId: selectedSubject.id,
        facultyId: selectedSubject.instructorId || selectedSubject.id,
        ratings: ratingsBySection,
        totalScore,
        semester: currentSemester || '1st Semester',
        schoolYear: currentSchoolYear || '2024-2025'
      };

      const response = await fetch('/api/student/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit evaluation');
      }

      onEvaluationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation');
    } finally {
      setLoading(false);
    }
  };

  const getSections = () => ({
    A: {
      title: 'Commitment',
      items: [
        'Demonstrate sensitivity to students\' ability to attend and absorb content information',
        'Integrates sensitively his/her learning objectives with those of the students in a collaborative process.',
        'Makes self available to students beyond official time.',
        'Regularly comes to class on time, well- groomed and well- prepared to complete assigned responsibilities.',
        'Keeps good records of students\' performance and prompt submission of the same.',
      ],
    },
    B: {
      title: 'Knowledge of Subject',
      items: [
        'Demonstrate mastery of the subject matter. (Explains the subject matter without relying solely on the prescribed textbook.)',
        'Draws and shares information on the state of the art of theory and practice in his/her discipline.',
        'Integrates subject to practical circumstances and learning intents/ purposes of students.',
        'Explain the relevance of the present topic to the previous lessons and relates the subject matter to relevant current issues and or daily life activities.',
        'Demonstrates up to date knowledge and or awareness on current trends and issues of the subject.',
      ],
    },
    C: {
      title: 'Teaching for Independent Learning',
      items: [
        'Creates teaching strategies that allow students to practice using concept they need to understand (interactive discussion).',
        'Enhances student self- esteem and/or gives due recognition to students\' performance/ potentials.',
        'Allows students to create their own course with objectives and realistically defined student- professor rules and make them accountable for their performance',
        'Allows student to think independently and make their own decisions and holding them accountable for their performance based largely on their success in executing decisions.',
        'Encourages students to learned beyond what is required and help/ guide the students how to apply the concepts learned',
      ],
    },
    D: {
      title: 'Management of Learning',
      items: [
        'Creates opportunities for intensive and/or extensive contribution of the students on the class activities, e.g., breaks class into dyads, triads or buzz/task groups).',
        'Assumes roles of facilitator, resource person, coach, inquisitor, integrator, referee in drawing students to contribute to knowledge and understanding of the concepts at hand',
        'Designs and implements learning conditions and experience that promotes healthy exchange and/or confrontations...',
        'Structures/re-structures learning and teaching- learning context to enhance attainment of collective learning objectives.',
        'Use of instructional Materials (audio/ video materials; fieldtrips, film showing, computer aided instruction, etc.) to reinforce learning processes.',
      ],
    },
  });

  const sections = getSections();

  return (
    <div className="w-full max-w-7xl px-2 sm:px-4">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">CAMARINES NORTE STATE COLLEGE</h1>
        <p className="text-xs sm:text-base text-gray-600 mt-1">College of Trades and Technology</p>
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Online Faculty Evaluation System</p>
        {selectedSubject && (
          <p className="text-sm sm:text-base text-gray-700 mt-2">
            <strong>{selectedSubject.title}</strong> - Instructor: {selectedSubject.instructorName}
          </p>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg p-3 sm:p-6 shadow-lg">
        {error && (
          <div ref={errorRef} className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Instruction Box */}
        <div className="border-2 sm:border-4 border-gray-800 bg-pink-50 p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="font-bold text-xs sm:text-sm leading-snug">
            Instruction: Please evaluate the faculty using the scala below. Encircle your rating.
          </p>
        </div>

        {/* Scale Section */}
        <div className="border-2 sm:border-4 border-gray-800 mb-4 sm:mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-[10px] sm:text-xs">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">SCALE</th>
                <th className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">DESCRIPTIVE RATING</th>
                <th className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs hidden sm:table-cell">QUALITATIVE DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-center font-bold text-[10px] sm:text-xs">5</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">Outstanding</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-[10px] sm:text-xs hidden sm:table-cell">The performance almost always exceeds the job requirements. The Faculty is an exceptional role model</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-center font-bold text-[10px] sm:text-xs">4</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">Very Satisfactory</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-[10px] sm:text-xs hidden sm:table-cell">The performance meets and often exceeds the job requirements.</td>
              </tr>
              <tr>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-center font-bold text-[10px] sm:text-xs">3</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">Satisfactory</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-[10px] sm:text-xs hidden sm:table-cell">The performance meets job requirements.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-center font-bold text-[10px] sm:text-xs">2</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">Fair</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-[10px] sm:text-xs hidden sm:table-cell">The performance needs some development to meet job requirements.</td>
              </tr>
              <tr>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-center font-bold text-[10px] sm:text-xs">1</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 font-bold text-[10px] sm:text-xs">Poor</td>
                <td className="border-2 border-gray-800 p-1 sm:p-2 text-[10px] sm:text-xs hidden sm:table-cell">The faculty fails to meet job requirements.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Evaluation Sections */}
        {Object.entries(sections).map(([key, section]: any) => (
          <div key={key} className="border-4 border-gray-800 mb-6 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-300">
                  <th colSpan={6} className="border-2 border-gray-800 p-3 text-left font-bold">
                    {key}. {section.title}
                  </th>
                </tr>
              </thead>
              <tbody>
                  {section.items.map((item: string, idx: number) => (
                  <tr key={idx}>
                    <td colSpan={1} className="border-2 border-gray-800 p-2 font-bold">
                      {idx + 1}.
                    </td>
                    <td colSpan={1} className="border-2 border-gray-800 p-2">
                      {item}
                    </td>
                    {[5, 4, 3, 2, 1].map((scale) => (
                      <td key={scale} className="border-2 border-gray-800 p-2 text-center">
                        <button
                          onClick={() => !checkingStatus && evaluationOpen && handleRating(key, idx + 1, scale)}
                          disabled={!evaluationOpen || checkingStatus}
                          className={`w-8 h-8 rounded-full border-2 transition ${
                            !evaluationOpen || checkingStatus
                              ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                              : ratings[`${key}-${idx + 1}`] === scale
                                ? 'bg-red-800 text-white border-red-800 cursor-pointer hover:bg-red-900'
                                : 'border-gray-800 cursor-pointer hover:bg-gray-100'
                          }`}
                        >
                          {scale}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-200">
                  <td colSpan={2} className="border-2 border-gray-800 p-2 font-bold text-right">
                    Total Score
                  </td>
                  <td colSpan={4} className="border-2 border-gray-800 p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={handleShowConfirm}
            disabled={loading || !evaluationOpen || checkingStatus}
            className="px-8 py-3 bg-red-800 text-white font-bold rounded-lg hover:bg-red-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: evaluationOpen ? '#8b0000' : '#ccc' }}
          >
            {checkingStatus ? 'Checking Status...' : loading ? 'Saving...' : !evaluationOpen ? 'EVALUATIONS CLOSED' : 'SAVE DRAFT'}
          </button>
          <button
            onClick={() => setCurrentPage('evaluation')}
            className="px-8 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== CHANGE PASSWORD PAGE ====================
function ChangePasswordPage({
  setCurrentPage,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleChangePassword,
  loading,
  error,
  success
}: any) {
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-8 mb-6">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
            alt="College Logo 1"
            className="w-20 h-20 sm:w-20 sm:h-20 object-contain"
            style={{ maxWidth: '80px' }}
          />
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
            alt="College Logo 2"
            className="w-24 h-24 sm:w-24 sm:h-24 object-contain"
            style={{ maxWidth: '100px' }}
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">CAMARINES NORTE STATE COLLEGE</h1>
        <p className="text-gray-600 text-lg mt-2">College of Trades and Technology</p>
        <p className="text-gray-500 text-base mt-1">Online Faculty Evaluation System</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Change Password</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Current Password */}
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Current Password"
              className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="New Password"
              className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm New Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm New Password"
              className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full py-3 bg-red-800 text-white font-bold rounded-lg hover:bg-red-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#8b0000' }}
          >
            {loading ? 'Saving...' : 'SAVE PASSWORD'}
          </button>

          <button
            onClick={() => setCurrentPage('evaluation')}
            className="w-full py-3 text-center text-blue-600 font-semibold hover:text-blue-800 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


// ==================== REGISTER PAGE ====================
function RegisterPage({
  setCurrentPage,
  regUsername,
  setRegUsername,
  regPassword,
  setRegPassword,
  regConfirmPassword,
  setRegConfirmPassword,
  regFullName,
  setRegFullName,
  regStudentId,
  setRegStudentId,
  handleRegister,
  loading,
  error,
  success,
  showRegPassword,
  setShowRegPassword,
  showRegConfirmPassword,
  setShowRegConfirmPassword
}: any) {
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-8 mb-6">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
            alt="College Logo 1"
            className="w-20 h-20 sm:w-20 sm:h-20 object-contain"
            style={{ maxWidth: '80px' }}
          />
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
            alt="College Logo 2"
            className="w-24 h-24 sm:w-24 sm:h-24 object-contain"
            style={{ maxWidth: '100px' }}
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">CAMARINES NORTE STATE COLLEGE</h1>
        <p className="text-gray-600 text-lg mt-2">College of Trades and Technology</p>
        <p className="text-gray-500 text-base mt-1">Online Faculty Evaluation System</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username *"
            className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
            value={regUsername}
            onChange={(e) => setRegUsername(e.target.value)}
          />

          <input
            type="text"
            placeholder="Full Name *"
            className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
            value={regFullName}
            onChange={(e) => setRegFullName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Student ID *"
            className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
            style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
            value={regStudentId}
            onChange={(e) => setRegStudentId(e.target.value.toUpperCase())}
          />

          <div className="relative">
            <input
              type={showRegPassword ? 'text' : 'password'}
              placeholder="Password *"
              className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <button
              onClick={() => setShowRegPassword(!showRegPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              {showRegPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showRegConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password *"
              className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
            />
            <button
              onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              {showRegConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-red-800 text-white font-bold rounded-lg hover:bg-red-900 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#8b0000' }}
          >
            {loading ? 'Creating Account...' : 'CREATE ACCOUNT'}
          </button>

          <button
            onClick={() => setCurrentPage('role-selection')}
            className="w-full py-3 text-center text-blue-600 font-semibold hover:text-blue-800 transition"
          >
            Back to Selection
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== FORGOT PASSWORD PAGE ====================
function ForgotPasswordPage({
  setCurrentPage,
  forgotUsername,
  setForgotUsername,
  forgotEmail,
  setForgotEmail,
  handleForgotPassword,
  loading,
  error,
  success
}: any) {
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-8 mb-6">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
            alt="College Logo 1"
            className="w-20 h-20 sm:w-20 sm:h-20 object-contain"
            style={{ maxWidth: '80px' }}
          />
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
            alt="College Logo 2"
            className="w-24 h-24 sm:w-24 sm:h-24 object-contain"
            style={{ maxWidth: '100px' }}
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">CAMARINES NORTE STATE COLLEGE</h1>
        <p className="text-gray-600 text-lg mt-2">College of Trades and Technology</p>
        <p className="text-gray-500 text-base mt-1">Online Faculty Evaluation System</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <p className="text-gray-600 mb-6 text-center">
          Enter your username and email address to request a password reset.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username *"
            className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
            value={forgotUsername}
            onChange={(e) => setForgotUsername(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email Address (optional)"
            className="w-full p-4 bg-gray-200 rounded-lg text-gray-700 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-gray-400"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />

          <button
            onClick={handleForgotPassword}
            disabled={loading}
            className="w-full py-3 bg-red-800 text-white font-bold rounded-lg hover:bg-red-900 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#8b0000' }}
          >
            {loading ? 'Sending...' : 'SEND RESET REQUEST'}
          </button>

          <button
            onClick={() => setCurrentPage('login')}
            className="w-full py-3 text-center text-blue-600 font-semibold hover:text-blue-800 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ACCOUNT SETUP PAGE ====================
function AccountSetupPage({ setCurrentPage, loading, setLoading, error, setError, success, setSuccess }: any) {
  const mobile = isMobile();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [firstName, setFirstName] = useState(user.firstName || user.fullName?.split(' ')[0] || '');
  const [middleName, setMiddleName] = useState(user.middleName || '');
  const [lastName, setLastName] = useState(user.lastName || user.fullName?.split(' ').slice(-1)[0] || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSetup = async () => {
    setError('');
    setSuccess('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('First Name and Last Name are required');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/account-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete account setup');
      }

      // Update local storage with new user data
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setSuccess('Account setup completed successfully!');
      
      setTimeout(() => {
        setSuccess('');
        setCurrentPage('evaluation');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to complete account setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-8 mb-6">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo1-i1MIIodbGOV5VfsMC6rwfIhFZJ3PmC.png"
            alt="College Logo 1"
            className="w-20 h-20 object-contain"
            style={{ maxWidth: '80px' }}
          />
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png"
            alt="College Logo 2"
            className="w-24 h-24 object-contain"
            style={{ maxWidth: '100px' }}
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">CAMARINES NORTE STATE COLLEGE</h1>
        <p className="text-gray-600 text-lg mt-2">College of Trades and Technology</p>
        <p className="text-gray-500 text-base mt-1">Online Faculty Evaluation System</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div style={{
          background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <h2 className="text-xl font-bold text-white mb-1">Complete Your Account</h2>
          <p className="text-sm text-white/80">Please fill in your information and create a password</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm font-medium">
            ✓ {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Student ID - Read Only */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Student ID</label>
            <input
              type="text"
              value={user.studentId || ''}
              readOnly
              className="w-full p-3 bg-gray-100 rounded-lg text-gray-500 border border-gray-200 cursor-not-allowed font-mono"
            />
          </div>

          {/* Email - Read Only */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user.email || ''}
              readOnly
              className="w-full p-3 bg-gray-100 rounded-lg text-gray-500 border border-gray-200 cursor-not-allowed"
            />
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Name Information</label>
            
            {/* First Name */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 bg-gray-100 rounded-lg text-gray-700 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>

            {/* Middle Name */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Middle Name (optional)"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full p-3 bg-gray-100 rounded-lg text-gray-700 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>

            {/* Last Name */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-3 bg-gray-100 rounded-lg text-gray-700 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-800"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Create Your Password</label>

            {/* New Password */}
            <div className="mb-3 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create Password *"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-gray-100 rounded-lg text-gray-700 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-800 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="mb-3 relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password *"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-gray-100 rounded-lg text-gray-700 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-800 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-3 bg-red-800 text-white font-bold rounded-lg hover:bg-red-900 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            style={{ backgroundColor: '#8b0000' }}
          >
            {loading ? 'Setting Up...' : 'COMPLETE SETUP'}
          </button>
        </div>
      </div>
    </div>
  );
}
