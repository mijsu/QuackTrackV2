'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, TrendingUp, User, Calendar, Award } from 'lucide-react';

interface Evaluation {
  id: string;
  studentId: string;
  studentName?: string;
  subjectId: string;
  subjectCode?: string;
  subjectTitle?: string;
  facultyId: string;
  facultyName?: string;
  ratings: any;
  totalScore: number;
  semester: string;
  schoolYear: string;
  submittedAt: Date;
}

export default function ViewResults() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      // Since we don't have a dedicated evaluations API for listing, we'll need to create one
      // For now, let's create a simple implementation
      const response = await fetch('/api/admin/evaluations/list');
      if (!response.ok) {
        // If the API doesn't exist, show empty state
        setEvaluations([]);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setEvaluations(data.evaluations);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
      // Set empty array if API doesn't exist yet
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const faculties = [...new Set(evaluations.map(e => e.facultyName).filter(Boolean))];
  const subjects = [...new Set(evaluations.map(e => `${e.subjectCode} - ${e.subjectTitle}`).filter(Boolean))];
  const semesters = [...new Set(evaluations.map(e => `${e.semester} ${e.schoolYear}`).filter(Boolean))];

  const filteredEvaluations = evaluations.filter(e => {
    const matchesSearch = 
      e.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.facultyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.subjectTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFaculty = !filterFaculty || e.facultyName === filterFaculty;
    const matchesSubject = !filterSubject || `${e.subjectCode} - ${e.subjectTitle}` === filterSubject;
    const matchesSemester = !filterSemester || `${e.semester} ${e.schoolYear}` === filterSemester;

    return matchesSearch && matchesFaculty && matchesSubject && matchesSemester;
  });

  const getRatingColor = (score: number) => {
    if (score >= 90) return '#22c55e'; // green
    if (score >= 75) return '#3b82f6'; // blue
    if (score >= 60) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getRatingLabel = (score: number) => {
    if (score >= 90) return 'Outstanding';
    if (score >= 75) return 'Very Satisfactory';
    if (score >= 60) return 'Satisfactory';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const handleViewDetails = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setShowDetails(true);
  };

  const calculateAverageScores = () => {
    if (evaluations.length === 0) return null;

    const facultyScores: any = {};
    evaluations.forEach(e => {
      if (e.facultyName) {
        if (!facultyScores[e.facultyName]) {
          facultyScores[e.facultyName] = { total: 0, count: 0 };
        }
        // Divide by 5 to convert to score out of 20
        facultyScores[e.facultyName].total += e.totalScore / 5;
        facultyScores[e.facultyName].count += 1;
      }
    });

    const averages = Object.entries(facultyScores).map(([name, data]: [string, any]) => ({
      name,
      average: (data.total / data.count).toFixed(1),
      count: data.count
    }));

    return averages.sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
  };

  const averages = calculateAverageScores();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>View Evaluation Results</h2>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
          padding: '20px',
          borderRadius: '8px',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={32} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{evaluations.length}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Evaluations</div>
            </div>
          </div>
        </div>
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={32} style={{ color: '#8b1a2b' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#333' }}>
                {evaluations.length > 0 ? (evaluations.reduce((sum, e) => sum + (e.totalScore / 5), 0) / evaluations.length).toFixed(1) : 0}%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Average Score</div>
            </div>
          </div>
        </div>
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={32} style={{ color: '#8b1a2b' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#333' }}>{averages?.length || 0}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Faculty Evaluated</div>
            </div>
          </div>
        </div>
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={32} style={{ color: '#8b1a2b' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#333' }}>
                {new Set(evaluations.map(e => e.semester)).size}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Semesters</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
            Search
          </label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} size={18} />
            <input
              type="text"
              placeholder="Search by student, faculty, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
        <div style={{ minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
            Faculty
          </label>
          <select
            value={filterFaculty}
            onChange={(e) => setFilterFaculty(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">All Faculty</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div style={{ minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
            Subject
          </label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#333' }}>
            Semester
          </label>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">All Semesters</option>
            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Faculty Average Rankings */}
      {averages && averages.length > 0 && (
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>
            Faculty Performance Rankings
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {averages.slice(0, 5).map((avg, idx) => (
              <div
                key={avg.name}
                style={{
                  flex: '1',
                  minWidth: '180px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: idx === 0 ? '#fef3c7' : '#f9f9f9',
                  border: idx === 0 ? '2px solid #f59e0b' : '1px solid #e0e0e0'
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>#{idx + 1}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>{avg.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: getRatingColor(parseFloat(avg.average) / 20 * 100) }}>
                    {avg.average}/20
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{avg.count} evals</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>Faculty</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>Subject</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>Semester</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>Score</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>Rating</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, color: '#333', fontSize: '13px', borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>Loading...</td>
                </tr>
              ) : filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    {evaluations.length === 0
                      ? 'No evaluation results yet. Students need to submit evaluations first.'
                      : 'No results match your search criteria.'}
                  </td>
                </tr>
              ) : filteredEvaluations.map((evaluation) => {
                // Convert stored score to display score (divide by 5 to get score out of 20)
                const displayScore = evaluation.totalScore / 5;
                const percentage = (displayScore / 20) * 100;
                return (
                  <tr key={evaluation.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '14px 12px', color: '#333', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {evaluation.facultyName || 'Unknown'}
                    </td>
                    <td style={{ padding: '14px 12px', color: '#333', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {evaluation.subjectCode || ''} - {evaluation.subjectTitle || 'Unknown'}
                    </td>
                    <td style={{ padding: '14px 12px', color: '#666', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {evaluation.semester} {evaluation.schoolYear}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: '#333', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {displayScore.toFixed(1)}/20
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: `${getRatingColor(percentage)}20`,
                        color: getRatingColor(percentage),
                        whiteSpace: 'nowrap'
                      }}>
                        {getRatingLabel(percentage)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleViewDetails(evaluation)}
                        style={{
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedEvaluation && (
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>Evaluation Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
              <div style={{ marginBottom: '8px' }}><strong>Faculty:</strong> {selectedEvaluation.facultyName}</div>
              <div style={{ marginBottom: '8px' }}><strong>Subject:</strong> {selectedEvaluation.subjectCode} - {selectedEvaluation.subjectTitle}</div>
              <div style={{ marginBottom: '8px' }}><strong>Semester:</strong> {selectedEvaluation.semester} {selectedEvaluation.schoolYear}</div>
              <div><strong>Total Score:</strong> {(selectedEvaluation.totalScore / 5).toFixed(1)}/20 ({(((selectedEvaluation.totalScore / 5) / 20) * 100).toFixed(0)}%)</div>
            </div>

            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>Section Scores</h4>
            {(() => {
              const ratings = selectedEvaluation.ratings || {};

              // Check if ratings are in flat format ("A-1": 5) or section format (A: {1: 5})
              const isFlatFormat = Object.keys(ratings).some(key => typeof key === 'string' && key.includes('-'));

              if (isFlatFormat) {
                // Convert flat format to section format for display
                const sectionScores: { [key: string]: { total: number; count: number } } = {};

                Object.entries(ratings).forEach(([key, value]) => {
                  if (typeof key === 'string' && key.includes('-')) {
                    const [section] = key.split('-');
                    if (!sectionScores[section]) {
                      sectionScores[section] = { total: 0, count: 0 };
                    }
                    sectionScores[section].total += typeof value === 'number' ? value : 0;
                    sectionScores[section].count += 1;
                  }
                });

                const sectionLabels: { [key: string]: string } = {
                  'A': 'Commitment',
                  'B': 'Knowledge of Subject',
                  'C': 'Teaching for Independent Learning',
                  'D': 'Management of Learning'
                };

                return Object.entries(sectionScores).map(([section, data]) => {
                  const sectionTotal = data.total;
                  const sectionMax = data.count * 5;
                  return (
                    <div key={section} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 500 }}>Section {section} - {sectionLabels[section] || ''}</span>
                        <span style={{ fontWeight: 600 }}>{sectionTotal}/{sectionMax}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(sectionTotal / sectionMax) * 100}%`,
                          height: '100%',
                          background: getRatingColor((sectionTotal / sectionMax) * 100),
                          borderRadius: '4px',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  );
                });
              } else {
                // Section format (A: {1: 5, 2: 4, ...})
                return Object.entries(ratings).map(([section, items]: [string, any]) => {
                  if (typeof items === 'object' && items !== null) {
                    const sectionTotal = Object.values(items).reduce((a: number, b: number) => a + (typeof b === 'number' ? b : 0), 0);
                    const sectionMax = Object.keys(items).length * 5;
                    const sectionLabels: { [key: string]: string } = {
                      'A': 'Commitment',
                      'B': 'Knowledge of Subject',
                      'C': 'Teaching for Independent Learning',
                      'D': 'Management of Learning'
                    };
                    return (
                      <div key={section} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 500 }}>Section {section} - {sectionLabels[section] || ''}</span>
                          <span style={{ fontWeight: 600 }}>{sectionTotal}/{sectionMax}</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(sectionTotal / sectionMax) * 100}%`,
                            height: '100%',
                            background: getRatingColor((sectionTotal / sectionMax) * 100),
                            borderRadius: '4px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    );
                  }
                  return null;
                });
              }
            })()}

            <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '20px', marginBottom: '12px', color: '#333' }}>Individual Ratings</h4>
            {(() => {
              const ratings = selectedEvaluation.ratings || {};
              const isFlatFormat = Object.keys(ratings).some(key => typeof key === 'string' && key.includes('-'));

              const questions: { [key: string]: string[] } = {
                'A': [
                  'Demonstrates sensitivity to students\' ability to attend and absorb content information',
                  'Integrates sensitively his/her learning objectives with those of the students',
                  'Makes self available to students beyond official time',
                  'Regularly comes to class on time, well-groomed and well-prepared',
                  'Keeps good records of students\' performance and prompt submission'
                ],
                'B': [
                  'Demonstrates mastery of the subject matter',
                  'Draws and shares information on the state of the art of theory and practice',
                  'Integrates subject to practical circumstances and learning intents',
                  'Explains relevance of present topic to previous lessons',
                  'Demonstrates up-to-date knowledge on current trends and issues'
                ],
                'C': [
                  'Creates teaching strategies for interactive discussion',
                  'Enhances student self-esteem and gives due recognition',
                  'Allows students to create their own course with defined roles',
                  'Allows students to think independently and make decisions',
                  'Encourages students to learn beyond what is required'
                ],
                'D': [
                  'Creates opportunities for intensive/extensive student contribution',
                  'Assumes roles of facilitator, resource person, coach',
                  'Designs learning conditions for healthy exchange',
                  'Structures/re-structures learning context',
                  'Uses instructional materials to reinforce learning'
                ]
              };

              const getRatingDescription = (rating: number): string => {
                switch (rating) {
                  case 5: return 'Outstanding';
                  case 4: return 'Very Satisfactory';
                  case 3: return 'Satisfactory';
                  case 2: return 'Fair';
                  case 1: return 'Poor';
                  default: return 'N/A';
                }
              };

              if (isFlatFormat) {
                // Flat format - display all ratings
                return Object.entries(ratings)
                  .filter(([key]) => typeof key === 'string' && key.includes('-'))
                  .sort(([a], [b]) => {
                    const [secA, numA] = a.split('-');
                    const [secB, numB] = b.split('-');
                    if (secA !== secB) return secA.localeCompare(secB);
                    return parseInt(numA) - parseInt(numB);
                  })
                  .map(([key, value]) => {
                    const [section, num] = key.split('-');
                    const question = questions[section]?.[parseInt(num) - 1] || 'Question';
                    const ratingValue = typeof value === 'number' ? value : 0;
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500, marginRight: '8px' }}>{key}.</span>
                          <span style={{ color: '#666', fontSize: '13px' }}>{question}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: getRatingColor(ratingValue / 5 * 100) }}>{ratingValue}</span>
                          <span style={{ fontSize: '12px', color: '#888' }}>({getRatingDescription(ratingValue)})</span>
                        </div>
                      </div>
                    );
                  });
              } else {
                // Section format
                return Object.entries(ratings).map(([section, items]: [string, any]) => {
                  if (typeof items === 'object' && items !== null) {
                    return Object.entries(items)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([num, value]) => {
                        const question = questions[section]?.[parseInt(num) - 1] || 'Question';
                        const ratingValue = typeof value === 'number' ? value : 0;
                        return (
                          <div key={`${section}-${num}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 500, marginRight: '8px' }}>{section}.{num}</span>
                              <span style={{ color: '#666', fontSize: '13px' }}>{question}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, color: getRatingColor(ratingValue / 5 * 100) }}>{ratingValue}</span>
                              <span style={{ fontSize: '12px', color: '#888' }}>({getRatingDescription(ratingValue)})</span>
                            </div>
                          </div>
                        );
                      });
                  }
                  return null;
                });
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
