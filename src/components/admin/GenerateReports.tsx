'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Users, TrendingUp, Filter, Eye, X, GraduationCap, User, BookOpen, ClipboardList } from 'lucide-react';

interface ReportData {
  totalEvaluations: number;
  averageScore: number;
  facultyPerformance: Array<{ name: string; id: string; average: number; evaluations: number }>;
  subjectPerformance: Array<{ code: string; title: string; average: number; evaluations: number }>;
  semesterData: Array<{ semester: string; total: number; average: number }>;
  recentEvaluations: Array<{ id: string; faculty: string; facultyId: string; subject: string; subjectTitle: string; score: number; date: any }>;
}

interface StudentEvaluation {
  evaluationId: string;
  studentId: string;
  studentName: string;
  studentSchoolId: string;
  subjectCode: string;
  subjectTitle: string;
  score: number;
  ratings?: { [key: string]: number }; // Flat format: "A-1": 5, "B-2": 4, etc.
  semester: string;
  schoolYear: string;
  submittedAt: any;
}

// Evaluation criteria sections with questions
const EVALUATION_CRITERIA: { [key: string]: { title: string; questions: string[] } } = {
  'A': {
    title: 'Commitment',
    questions: [
      "Demonstrate sensitivity to students' ability to attend and absorb content information",
      "Integrates sensitively his/her learning objectives with those of the students in a collaborative process.",
      "Makes self available to students beyond official time.",
      "Regularly comes to class on time, well-groomed and well-prepared to complete assigned responsibilities.",
      "Keeps good records of students' performance and prompt submission of the same."
    ]
  },
  'B': {
    title: 'Knowledge of Subject',
    questions: [
      "Demonstrate mastery of the subject matter. (Explains the subject matter without relying solely on the prescribed textbook.)",
      "Draws and shares information on the state of the art of theory and practice in his/her discipline.",
      "Integrates subject to practical circumstances and learning intents/purposes of students.",
      "Explain the relevance of the present topic to the previous lessons and relates the subject matter to relevant current issues and or daily life activities.",
      "Demonstrates up to date knowledge and or awareness on current trends and issues of the subject."
    ]
  },
  'C': {
    title: 'Teaching for Independent Learning',
    questions: [
      "Creates teaching strategies that allow students to practice using concept they need to understand (interactive discussion).",
      "Enhances student self-esteem and/or gives due recognition to students' performance/potentials.",
      "Allows students to create their own course with objectives and realistically defined student-professor roles and make them accountable for their performance",
      "Allows student to think independently and make their own decisions and holding them accountable for their performance based largely on their success in executing decisions.",
      "Encourages students to learned beyond what is required and help/guide the students how to apply the concepts learned"
    ]
  },
  'D': {
    title: 'Management of Learning',
    questions: [
      "Creates opportunities for intensive and/or extensive contribution of the students on the class activities, e.g., breaks class into dyads, triads or buzz/task groups).",
      "Assumes roles of facilitator, resource person, coach, inquisitor, integrator, referee in drawing students to contribute to knowledge and understanding of the concepts at hand",
      "Designs and implements learning conditions and experience that promotes healthy exchange and/or confrontations...",
      "Structures/re-structures learning and teaching-learning context to enhance attainment of collective learning objectives.",
      "Use of instructional Materials (audio/video materials; fieldtrips, film showing, computer aided instruction, etc.) to reinforce learning processes."
    ]
  }
};

// Rating descriptions
const RATING_DESCRIPTIONS: { [key: number]: string } = {
  5: 'Outstanding',
  4: 'Very Satisfactory',
  3: 'Satisfactory',
  2: 'Fair',
  1: 'Poor'
};

// Rating colors
const RATING_COLORS: { [key: number]: { bg: string; text: string; border: string } } = {
  5: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  4: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  3: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  2: { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },
  1: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
};

export default function GenerateReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  
  // First modal state - Students who evaluated the faculty
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFacultyForDetail, setSelectedFacultyForDetail] = useState<{ id: string; name: string } | null>(null);
  const [detailStudents, setDetailStudents] = useState<StudentEvaluation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Second modal state - Detailed evaluation breakdown
  const [showEvaluationDetail, setShowEvaluationDetail] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<StudentEvaluation | null>(null);

  useEffect(() => {
    loadReportData();
  }, [selectedSemester, selectedFaculty]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFaculty) params.append('facultyId', selectedFaculty);
      if (selectedSemester) params.append('semester', selectedSemester);

      const url = `/api/admin/reports${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.reportData) {
        setReportData(data.reportData);
      } else {
        console.error('Failed to load report data:', data.error);
        setReportData({
          totalEvaluations: 0,
          averageScore: 0,
          facultyPerformance: [],
          subjectPerformance: [],
          semesterData: [],
          recentEvaluations: []
        });
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      setReportData({
        totalEvaluations: 0,
        averageScore: 0,
        facultyPerformance: [],
        subjectPerformance: [],
        semesterData: [],
        recentEvaluations: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (facultyId: string, facultyName: string) => {
    setSelectedFacultyForDetail({ id: facultyId, name: facultyName });
    setShowDetailModal(true);
    setDetailLoading(true);
    
    try {
      const response = await fetch(`/api/admin/faculty-evaluations?facultyId=${facultyId}`);
      const data = await response.json();
      
      if (data.success) {
        setDetailStudents(data.students);
      } else {
        console.error('Failed to load faculty evaluations:', data.error);
        setDetailStudents([]);
      }
    } catch (error) {
      console.error('Error loading faculty evaluations:', error);
      setDetailStudents([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewEvaluationDetail = (student: StudentEvaluation) => {
    setSelectedEvaluation(student);
    setShowEvaluationDetail(true);
  };

  const handleGeneratePDF = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFaculty) params.append('facultyId', selectedFaculty);
      if (selectedSemester) params.append('semester', selectedSemester);

      const url = `/api/admin/reports/pdf${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'evaluation_report.pdf';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('[Generate Reports] PDF downloaded successfully');
    } catch (error: any) {
      console.error('[Generate Reports] PDF generation error:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  const handleGenerateExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFaculty) params.append('facultyId', selectedFaculty);
      if (selectedSemester) params.append('semester', selectedSemester);

      const url = `/api/admin/reports/excel${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Excel');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'evaluation_report.xlsx';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('[Generate Reports] Excel downloaded successfully');
    } catch (error: any) {
      console.error('[Generate Reports] Excel generation error:', error);
      alert('Failed to generate Excel: ' + error.message);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: '#dcfce7', text: '#166534' };
    if (score >= 75) return { bg: '#dbeafe', text: '#1e40af' };
    if (score >= 60) return { bg: '#fef3c7', text: '#92400e' };
    return { bg: '#fee2e2', text: '#991b1b' };
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate section scores from flat ratings format
  const calculateSectionScores = (ratings: { [key: string]: number } | undefined) => {
    if (!ratings) return {};
    
    const sectionScores: { [key: string]: { total: number; count: number; average: number } } = {};
    
    Object.keys(EVALUATION_CRITERIA).forEach(sectionKey => {
      let total = 0;
      let count = 0;
      
      for (let i = 1; i <= 5; i++) {
        const ratingKey = `${sectionKey}-${i}`;
        if (ratings[ratingKey] !== undefined) {
          total += ratings[ratingKey];
          count++;
        }
      }
      
      sectionScores[sectionKey] = {
        total,
        count,
        average: count > 0 ? total / count : 0
      };
    });
    
    return sectionScores;
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading report data...</div>;
  }

  if (!reportData) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No report data available</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Generate Reports</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGeneratePDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <FileText size={16} /> Export PDF
          </button>
          <button
            onClick={handleGenerateExcel}
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
              fontSize: '14px'
            }}
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div style={{
        background: '#fff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedReport('overview')}
            style={{
              padding: '10px 20px',
              background: selectedReport === 'overview' ? 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)' : '#f0f0f0',
              color: selectedReport === 'overview' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedReport('faculty')}
            style={{
              padding: '10px 20px',
              background: selectedReport === 'faculty' ? 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)' : '#f0f0f0',
              color: selectedReport === 'faculty' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Faculty Performance
          </button>
          <button
            onClick={() => setSelectedReport('subject')}
            style={{
              padding: '10px 20px',
              background: selectedReport === 'subject' ? 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)' : '#f0f0f0',
              color: selectedReport === 'subject' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Subject Analysis
          </button>
          <button
            onClick={() => setSelectedReport('semester')}
            style={{
              padding: '10px 20px',
              background: selectedReport === 'semester' ? 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)' : '#f0f0f0',
              color: selectedReport === 'semester' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Semester Comparison
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} style={{ color: '#666' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>Filters:</span>
        </div>
        <div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            <option value="">All Semesters</option>
            {reportData.semesterData.map(s => (
              <option key={s.semester} value={s.semester}>{s.semester}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            <option value="">All Faculty</option>
            {reportData.facultyPerformance.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Content */}
      {selectedReport === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              padding: '24px',
              borderRadius: '8px',
              color: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <FileText size={32} />
                <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Evaluations</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700 }}>{reportData.totalEvaluations}</div>
            </div>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <TrendingUp size={32} style={{ color: '#8b1a2b' }} />
                <span style={{ fontSize: '14px', color: '#666' }}>Average Score</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#333' }}>{reportData.averageScore.toFixed(2)}%</div>
            </div>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Users size={32} style={{ color: '#8b1a2b' }} />
                <span style={{ fontSize: '14px', color: '#666' }}>Faculty Evaluated</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#333' }}>{reportData.facultyPerformance.length}</div>
            </div>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Calendar size={32} style={{ color: '#8b1a2b' }} />
                <span style={{ fontSize: '14px', color: '#666' }}>Semesters Covered</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#333' }}>{reportData.semesterData.length}</div>
            </div>
          </div>

          {/* Recent Evaluations Table */}
          {reportData.recentEvaluations.length > 0 && (
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>Recent Evaluations</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Faculty</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Subject</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Score</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.recentEvaluations.map((evaluation) => {
                    const displayScore = evaluation.score / 5;
                    const percentage = (displayScore / 20) * 100;
                    const colors = getScoreColor(percentage);
                    return (
                      <tr key={evaluation.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', color: '#333', fontSize: '14px', fontWeight: 500 }}>{evaluation.faculty}</td>
                        <td style={{ padding: '12px', color: '#333', fontSize: '14px' }}>
                          <div>{evaluation.subject}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{evaluation.subjectTitle}</div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: 600 }}>
                          {displayScore.toFixed(2)}/20
                        </td>
                        <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>{formatDate(evaluation.date)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleViewDetail(evaluation.facultyId, evaluation.faculty)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            <Eye size={14} /> View Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedReport === 'faculty' && (
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>
            Faculty Performance Report
          </h3>
          {reportData.facultyPerformance.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No faculty performance data available. Please submit some evaluations first.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Faculty Name</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Average Score</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Evaluations</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Rating</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reportData.facultyPerformance.map((faculty) => {
                  const colors = getScoreColor(faculty.average);
                  return (
                    <tr key={faculty.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', color: '#333', fontSize: '14px', fontWeight: 500 }}>{faculty.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: 600 }}>
                        {faculty.average}/100
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '14px' }}>{faculty.evaluations}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: colors.bg,
                          color: colors.text
                        }}>
                          {faculty.average >= 90 ? 'Outstanding' : faculty.average >= 75 ? 'Very Satisfactory' : faculty.average >= 60 ? 'Satisfactory' : 'Fair'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleViewDetail(faculty.id, faculty.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          <Eye size={14} /> View Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedReport === 'subject' && (
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>
            Subject Performance Report
          </h3>
          {reportData.subjectPerformance.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No subject performance data available. Please submit some evaluations first.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Subject Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Subject Title</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Average Score</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Evaluations</th>
                </tr>
              </thead>
              <tbody>
                {reportData.subjectPerformance.map((subject, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', color: '#333', fontSize: '14px', fontWeight: 600 }}>{subject.code}</td>
                    <td style={{ padding: '12px', color: '#333', fontSize: '14px' }}>{subject.title}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: 600 }}>
                      {subject.average}/100
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '14px' }}>{subject.evaluations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedReport === 'semester' && (
        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>
            Semester Comparison Report
          </h3>
          {reportData.semesterData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No semester data available. Please submit some evaluations first.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Semester</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Total Evaluations</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Average Score</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '14px', borderBottom: '2px solid #e0e0e0' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sortedSemesters = [...reportData.semesterData].sort((a, b) => b.semester.localeCompare(a.semester));
                  return sortedSemesters.map((sem, idx) => {
                    const trend = idx < sortedSemesters.length - 1 && sortedSemesters[idx + 1]
                      ? (sem.average - sortedSemesters[idx + 1].average).toFixed(2)
                      : 'N/A';
                    const isPositive = parseFloat(trend) > 0;
                    return (
                      <tr key={sem.semester} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', color: '#333', fontSize: '14px', fontWeight: 500 }}>{sem.semester}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: 600 }}>{sem.total}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: 600 }}>{sem.average.toFixed(2)}%</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            color: isPositive ? '#22c55e' : parseFloat(trend) < 0 ? '#ef4444' : '#666',
                            fontWeight: 600,
                            fontSize: '14px'
                          }}>
                            {trend !== 'N/A' && (isPositive ? '+' : '')}{trend}%
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* First Modal - Students who evaluated the faculty */}
      {showDetailModal && (
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
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              color: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <GraduationCap size={24} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Students Who Evaluated</h3>
                  <p style={{ fontSize: '14px', margin: 0, opacity: 0.9 }}>{selectedFacultyForDetail?.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEvaluation(null);
                  setShowEvaluationDetail(false);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {detailLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Loading students...
                </div>
              ) : detailStudents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No students found who evaluated this faculty.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Student Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Student ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Subject</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Score</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailStudents.map((student, idx) => {
                      const displayScore = student.score / 5;
                      const percentage = (displayScore / 20) * 100;
                      const colors = getScoreColor(percentage);
                      return (
                        <tr key={student.evaluationId || idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px', color: '#333', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600
                              }}>
                                {student.studentName?.charAt(0) || '?'}
                              </div>
                              <span>{student.studentName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: '#666', fontFamily: 'monospace', fontSize: '13px' }}>
                            {student.studentSchoolId}
                          </td>
                          <td style={{ padding: '12px', color: '#333', fontSize: '13px' }}>
                            <div style={{ fontWeight: 500 }}>{student.subjectCode}</div>
                            <div style={{ fontSize: '11px', color: '#999' }}>{student.subjectTitle}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: colors.bg,
                              color: colors.text
                            }}>
                              {displayScore.toFixed(2)}/20
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>
                            {formatDate(student.submittedAt)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleViewEvaluationDetail(student)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500
                              }}
                            >
                              <Eye size={14} /> View Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9f9f9'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Total: <strong>{detailStudents.length}</strong> evaluation(s)
              </span>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEvaluation(null);
                  setShowEvaluationDetail(false);
                }}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Modal - Detailed Evaluation Breakdown */}
      {showEvaluationDetail && selectedEvaluation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 80px rgba(0,0,0,0.4)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
              color: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ClipboardList size={24} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Detailed Evaluation Breakdown</h3>
                  <p style={{ fontSize: '14px', margin: 0, opacity: 0.9 }}>
                    {selectedEvaluation.studentName} - {selectedEvaluation.subjectCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEvaluationDetail(false);
                  setSelectedEvaluation(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Student Info Card */}
              <div style={{
                background: '#f9f9f9',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={20} style={{ color: '#8b1a2b' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Student Name</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>{selectedEvaluation.studentName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={20} style={{ color: '#8b1a2b' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Student ID</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', fontFamily: 'monospace' }}>{selectedEvaluation.studentSchoolId}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen size={20} style={{ color: '#8b1a2b' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Subject</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>{selectedEvaluation.subjectCode} - {selectedEvaluation.subjectTitle}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={20} style={{ color: '#8b1a2b' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Date Submitted</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>{formatDate(selectedEvaluation.submittedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Total Score Card */}
              {(() => {
                const displayScore = selectedEvaluation.score / 5;
                const percentage = (displayScore / 20) * 100;
                const colors = getScoreColor(percentage);
                const sectionScores = calculateSectionScores(selectedEvaluation.ratings);
                
                return (
                  <>
                    <div style={{
                      background: colors.bg,
                      border: `2px solid ${colors.text}`,
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>Total Score</div>
                      <div style={{ fontSize: '36px', fontWeight: 700, color: colors.text }}>
                        {displayScore.toFixed(2)}/20
                      </div>
                      <div style={{ fontSize: '16px', color: colors.text, fontWeight: 600, marginTop: '4px' }}>
                        {percentage.toFixed(0)}% - {percentage >= 90 ? 'Outstanding' : percentage >= 75 ? 'Very Satisfactory' : percentage >= 60 ? 'Satisfactory' : percentage >= 50 ? 'Fair' : 'Poor'}
                      </div>
                    </div>

                    {/* Section Scores Summary */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '24px'
                    }}>
                      {Object.entries(EVALUATION_CRITERIA).map(([sectionKey, sectionData]) => {
                        const sectionInfo = sectionScores[sectionKey];
                        const sectionPercentage = sectionInfo.count > 0 ? (sectionInfo.total / (sectionInfo.count * 5)) * 100 : 0;
                        const sectionColors = getScoreColor(sectionPercentage);
                        
                        return (
                          <div key={sectionKey} style={{
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '16px'
                          }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                              Section {sectionKey}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
                              {sectionData.title}
                            </div>
                            <div style={{
                              fontSize: '24px',
                              fontWeight: 700,
                              color: sectionColors.text
                            }}>
                              {sectionInfo.total}/{sectionInfo.count * 5}
                            </div>
                            <div style={{ marginTop: '8px' }}>
                              <div style={{
                                height: '6px',
                                background: '#e0e0e0',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${sectionPercentage}%`,
                                  height: '100%',
                                  background: sectionColors.bg,
                                  borderRadius: '3px'
                                }} />
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                Avg: {sectionInfo.average.toFixed(1)}/5
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Questions by Section */}
                    {Object.entries(EVALUATION_CRITERIA).map(([sectionKey, sectionData]) => (
                      <div key={sectionKey} style={{ marginBottom: '24px' }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                          color: '#fff',
                          padding: '12px 16px',
                          borderRadius: '8px 8px 0 0',
                          fontWeight: 600,
                          fontSize: '15px'
                        }}>
                          Section {sectionKey}: {sectionData.title}
                        </div>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          fontSize: '13px',
                          border: '1px solid #e0e0e0',
                          borderTop: 'none'
                        }}>
                          <thead>
                            <tr style={{ background: '#f9f9f9' }}>
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#333', width: '60px', borderBottom: '1px solid #e0e0e0' }}>#</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#333', borderBottom: '1px solid #e0e0e0' }}>Criteria</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#333', width: '80px', borderBottom: '1px solid #e0e0e0' }}>Rating</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#333', width: '130px', borderBottom: '1px solid #e0e0e0' }}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionData.questions.map((question, idx) => {
                              const ratingKey = `${sectionKey}-${idx + 1}`;
                              const rating = selectedEvaluation.ratings?.[ratingKey] || 0;
                              const ratingColors = RATING_COLORS[rating] || { bg: '#f5f5f5', text: '#666', border: '#ddd' };
                              const ratingDesc = RATING_DESCRIPTIONS[rating] || 'N/A';
                              
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#8b1a2b' }}>
                                    {idx + 1}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#333', lineHeight: '1.4' }}>
                                    {question}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      background: ratingColors.bg,
                                      color: ratingColors.text,
                                      fontWeight: 700,
                                      fontSize: '16px',
                                      border: `2px solid ${ratingColors.border}`
                                    }}>
                                      {rating}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      background: ratingColors.bg,
                                      color: ratingColors.text
                                    }}>
                                      {ratingDesc}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              background: '#f9f9f9'
            }}>
              <button
                onClick={() => {
                  setShowEvaluationDetail(false);
                  setSelectedEvaluation(null);
                }}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
