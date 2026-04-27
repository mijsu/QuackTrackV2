'use client';

import { useState, useEffect } from 'react';
import { Home, Users, GraduationCap, Book, FileEdit, BarChart2, FileText, Settings as SettingsIcon, LogOut, ChevronRight, Menu, X, UserCheck, UserPlus } from 'lucide-react';
import ManageStudents from './ManageStudents';
import ManageFaculty from './ManageFaculty';
import ManageSubjects from './ManageSubjects';
import ManageEvaluationForm from './ManageEvaluationForm';
import ManageEnrollments from './ManageEnrollments';
import ViewResults from './ViewResults';
import GenerateReports from './GenerateReports';
import Settings from './Settings';
import ManagePreRegisteredStudents from './ManagePreRegisteredStudents';

interface AdminDashboardProps {
  handleLogoutClick: () => void;
}

type AdminPage = 'dashboard' | 'pre-registered' | 'students' | 'faculty' | 'subjects' | 'evaluation-form' | 'enrollments' | 'results' | 'reports' | 'settings';

const menuItems = [
  { id: 'dashboard' as AdminPage, label: 'Dashboard', icon: Home },
  { id: 'pre-registered' as AdminPage, label: 'Pre-Register Students', icon: UserPlus },
  { id: 'students' as AdminPage, label: 'Manage Students', icon: Users },
  { id: 'faculty' as AdminPage, label: 'Manage Faculty', icon: GraduationCap },
  { id: 'subjects' as AdminPage, label: 'Manage Subjects', icon: Book },
  { id: 'evaluation-form' as AdminPage, label: 'Manage Evaluation Form', icon: FileEdit },
  { id: 'enrollments' as AdminPage, label: 'Manage Enrollments', icon: UserCheck },
  { id: 'results' as AdminPage, label: 'View Results', icon: BarChart2 },
  { id: 'reports' as AdminPage, label: 'Generate Reports', icon: FileText },
  { id: 'settings' as AdminPage, label: 'Settings', icon: SettingsIcon },
];

export default function AdminDashboard({ handleLogoutClick }: AdminDashboardProps) {
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    evaluationOpen: true,
    completedEvaluations: 0,
    pendingEvaluations: 0
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDashboardStats();
    checkMobile();
    window.addEventListener('resize', checkMobile);
    // Remove any default body margin/padding
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const checkMobile = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  };

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();
      console.log('[AdminDashboard] Dashboard API response:', data);
      if (data.success && data.stats) {
        console.log('[AdminDashboard] Setting stats:', data.stats);
        setStats(data.stats);
      } else {
        console.error('[AdminDashboard] API returned error:', data.error);
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvaluation = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationOpen: !stats.evaluationOpen,
          currentSemester: '1st Semester',
          currentSchoolYear: '2024-2025'
        })
      });
      const data = await response.json();
      if (data.success) {
        setStats({ ...stats, evaluationOpen: !stats.evaluationOpen });
      }
    } catch (error) {
      console.error('Error toggling evaluation:', error);
    }
  };

  const renderContent = () => {
    if (currentPage === 'dashboard') {
      return (
        <>
          <StatsRow stats={stats} loading={loading} toggleEvaluation={toggleEvaluation} isMobile={isMobile} />
          <SystemOverview stats={stats} toggleEvaluation={toggleEvaluation} isMobile={isMobile} />
        </>
      );
    }
    if (currentPage === 'pre-registered') return <ManagePreRegisteredStudents />;
    if (currentPage === 'students') return <ManageStudents />;
    if (currentPage === 'faculty') return <ManageFaculty />;
    if (currentPage === 'subjects') return <ManageSubjects />;
    if (currentPage === 'evaluation-form') return <ManageEvaluationForm />;
    if (currentPage === 'enrollments') return <ManageEnrollments />;
    if (currentPage === 'results') return <ViewResults />;
    if (currentPage === 'reports') return <GenerateReports />;
    if (currentPage === 'settings') return <Settings />;
    return null;
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: '#e8e8e8', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, paddingTop: isMobile ? '60px' : '75px' }}>
      <Header user={user} handleLogoutClick={handleLogoutClick} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} />
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 75px)' }}>
        <Sidebar menuItems={menuItems} currentPage={currentPage} setCurrentPage={setCurrentPage} setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen} isMobile={isMobile} />
        <main style={{ 
          flex: 1, 
          background: '#e4e0e0', 
          overflowY: 'auto', 
          width: '100%',
          marginLeft: sidebarOpen ? '220px' : '0',
          transition: 'margin-left 0.3s ease-in-out'
        }}>
          <div style={{ 
            padding: isMobile ? '12px' : '24px', 
            maxWidth: '1400px', 
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

function Header({ user, handleLogoutClick, sidebarOpen, setSidebarOpen, isMobile }: any) {
  return (
    <header style={{ 
      background: 'linear-gradient(135deg, #6b1520 0%, #8b1a2b 40%, #5a1018 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: isMobile ? '10px 12px' : '18px 24px', 
      color: '#fff', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', 
      minHeight: isMobile ? '60px' : '75px', 
      flexShrink: 0, 
      boxSizing: 'border-box', 
      position: 'fixed', 
      top: 0, 
      left: 0,
      right: 0,
      zIndex: 100,
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px', flex: 1, minWidth: 0 }}>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer', 
            padding: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: '4px', 
            flexShrink: 0 
          }}
        >
          {sidebarOpen ? <X size={isMobile ? 20 : 30} /> : <Menu size={isMobile ? 20 : 30} />}
        </button>
        <div style={{
          width: isMobile ? '40px' : '52px',
          height: isMobile ? '40px' : '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: 'white',
          borderRadius: '8px'
        }}>
          <img 
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo2-tmKK03pBJ0V9PisYDROyz5LuHSc3rO.png" 
            alt="CNSC" 
            style={{ width: isMobile ? '36px' : '48px', height: isMobile ? '36px' : '48px', objectFit: 'contain' }} 
          />
        </div>
        <div>
          <h1 style={{ 
            fontSize: isMobile ? '12px' : '20px', 
            fontWeight: 700, 
            letterSpacing: '0.2px', 
            margin: 0, 
            lineHeight: '1.2', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            CAMARINES NORTE STATE COLLEGE
          </h1>
          <p style={{ 
            fontSize: isMobile ? '10px' : '15px', 
            fontWeight: 400, 
            opacity: 0.9, 
            margin: '3px 0 0 0' 
          }}>
            Online Faculty Evaluation System
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button 
          onClick={handleLogoutClick} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '6px' : '8px', 
            background: 'transparent', 
            color: '#fff', 
            border: '2px solid #fff', 
            padding: isMobile ? '8px 16px' : '11px 22px', 
            fontSize: isMobile ? '12px' : '16px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            borderRadius: '6px', 
            whiteSpace: 'nowrap' 
          }}
        >
          <LogOut size={isMobile ? 16 : 22} /> 
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

function Sidebar({ menuItems, currentPage, setCurrentPage, setSidebarOpen, sidebarOpen, isMobile }: any) {
  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 90,
          }}
        />
      )}
      <nav style={{ 
        width: '220px', 
        background: '#f0eded', 
        borderRight: '1px solid #d5d0d0', 
        paddingTop: '6px', 
        height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 75px)', 
        overflowY: 'auto', 
        overflowX: 'hidden',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: isMobile ? '60px' : '75px',
        zIndex: 90,
        transform: !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
        boxShadow: !sidebarOpen ? 'none' : (isMobile ? '2px 0 8px rgba(0,0,0,0.2)' : 'none')
      }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {menuItems.map((item) => (
            <li key={item.id} style={{ borderBottom: '1px solid #ddd', background: currentPage === item.id ? '#e2d6d6' : 'transparent' }}>
              <button 
                onClick={() => {
                  setCurrentPage(item.id);
                  if (isMobile) setSidebarOpen(false);
                }} 
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? '10px' : '16px', 
                  padding: isMobile ? '14px 16px' : '18px 22px', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#7a1525', 
                  fontSize: isMobile ? '14px' : '16px', 
                  fontWeight: currentPage === item.id ? 600 : 500, 
                  textAlign: 'left' 
                }}
              >
                <item.icon size={isMobile ? 18 : 24} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                {currentPage === item.id && <ChevronRight size={isMobile ? 16 : 20} style={{ marginLeft: 'auto' }} />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function StatsRow({ stats, loading, toggleEvaluation, isMobile }: any) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
      gap: isMobile ? '12px' : '20px', 
      marginBottom: isMobile ? '20px' : '24px' 
    }}>
      <StatCard title="Total Students" value={loading ? '...' : stats.totalStudents.toLocaleString()} icon={<Users size={24} />} isMobile={isMobile} />
      <StatCard title="Total Faculty" value={loading ? '...' : stats.totalFaculty} icon={<GraduationCap size={24} />} isMobile={isMobile} />
      <StatCard title="Evaluation Status" value={loading ? '...' : (stats.evaluationOpen ? 'Open' : 'Closed')} icon={<BarChart2 size={24} />} showToggle={!loading} onToggle={toggleEvaluation} isMobile={isMobile} />
      <StatCard title="Completed Evaluations" value={loading ? '...' : stats.completedEvaluations.toLocaleString()} icon={<FileText size={24} />} isMobile={isMobile} />
    </div>
  );
}

function StatCard({ title, value, icon, showToggle, onToggle, isMobile }: any) {
  return (
    <div style={{ 
      background: 'linear-gradient(145deg, #8b1a2b 0%, #6b1520 50%, #5a1018 100%)', 
      borderRadius: isMobile ? '8px' : '12px', 
      padding: isMobile ? '14px' : '28px', 
      color: '#fff', 
      boxShadow: '0 3px 10px rgba(0,0,0,0.2)', 
      minHeight: isMobile ? '100px' : '160px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between' 
    }}>
      <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: 600, paddingBottom: isMobile ? '10px' : '12px', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 700 }}>{value}</div>
        <div style={{ 
          width: isMobile ? '40px' : '60px', 
          height: isMobile ? '40px' : '60px', 
          borderRadius: '50%', 
          background: 'rgba(255,255,255,0.25)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <span style={{ display: 'flex' }}>{icon}</span>
        </div>
      </div>
      {showToggle && (
        <button
          onClick={onToggle}
          style={{
            position: 'absolute',
            bottom: isMobile ? '10px' : '14px',
            right: isMobile ? '10px' : '14px',
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: isMobile ? '11px' : '13px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Toggle
        </button>
      )}
    </div>
  );
}

function SystemOverview({ stats, toggleEvaluation, isMobile }: any) {
  return (
    <div style={{ 
      background: '#f5f2f2', 
      borderRadius: isMobile ? '8px' : '12px', 
      padding: isMobile ? '16px' : '28px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
    }}>
      <h2 style={{ 
        fontSize: isMobile ? '18px' : '22px', 
        fontWeight: 700, 
        color: '#333', 
        marginBottom: isMobile ? '18px' : '24px', 
        paddingBottom: isMobile ? '10px' : '12px', 
        borderBottom: '1px solid #d5d0d0' 
      }}>
        System Overview
      </h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: isMobile ? '16px' : '24px' 
      }}>
        <OverviewCard title="Evaluation Status" content={
          <div>
            <p style={{ fontSize: isMobile ? '15px' : '17px', marginBottom: '16px', color: '#444', lineHeight: '1.5' }}>
              Current Status: <strong style={{ color: '#7a1525', fontWeight: 700 }}>{stats.evaluationOpen ? 'Open' : 'Closed'}</strong>
            </p>
            <button onClick={toggleEvaluation} style={{ 
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)', 
              color: '#fff', 
              border: 'none', 
              padding: isMobile ? '12px' : '16px 36px', 
              fontSize: isMobile ? '15px' : '17px', 
              fontWeight: 600, 
              cursor: 'pointer', 
              borderRadius: isMobile ? '6px' : '8px', 
              marginTop: isMobile ? '8px' : '12px', 
              width: '100%' 
            }}>
              {stats.evaluationOpen ? 'Close Evaluations' : 'Open Evaluations'}
            </button>
          </div>
        } isMobile={isMobile} />
        <OverviewCard title="Evaluation Summary" content={
          <div>
            <p style={{ 
              fontSize: isMobile ? '15px' : '17px', 
              marginBottom: isMobile ? '14px' : '16px', 
              color: '#444', 
              paddingBottom: isMobile ? '14px' : '16px', 
              borderBottom: '1px solid #e0dada',
              lineHeight: '1.5'
            }}>
              Pending Evaluations: <strong style={{ color: '#7a1525', fontWeight: 700 }}>{stats.pendingEvaluations ? stats.pendingEvaluations.toLocaleString() : '0'}</strong>
            </p>
            <p style={{ fontSize: isMobile ? '15px' : '17px', marginBottom: isMobile ? '14px' : '16px', color: '#444', lineHeight: '1.5' }}>
              Completed Evaluations: <strong style={{ color: '#7a1525', fontWeight: 700 }}>{stats.completedEvaluations ? stats.completedEvaluations.toLocaleString() : '0'}</strong>
            </p>
          </div>
        } isMobile={isMobile} />
      </div>
    </div>
  );
}

function OverviewCard({ title, content, isMobile }: any) {
  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: isMobile ? '8px' : '10px', 
      overflow: 'hidden', 
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)' 
    }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)', 
        color: '#fff', 
        padding: isMobile ? '14px 18px' : '18px 28px', 
        fontSize: isMobile ? '16px' : '19px', 
        fontWeight: 600, 
        borderBottom: '2px solid #d4a843' 
      }}>
        {title}
      </div>
      <div style={{ padding: isMobile ? '18px' : '28px' }}>{content}</div>
    </div>
  );
}
