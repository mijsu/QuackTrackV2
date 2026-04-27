'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, Edit2 } from 'lucide-react';

interface EvaluationCriteria {
  section: string;
  title: string;
  items: string[];
}

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    section: 'A',
    title: 'Commitment',
    items: [
      'Demonstrate sensitivity to students\' ability to attend and absorb content information',
      'Integrates sensitively his/her learning objectives with those of the students in a collaborative process.',
      'Makes self available to students beyond official time.',
      'Regularly comes to class on time, well- groomed and well-prepared to complete assigned responsibilities.',
      'Keeps good records of students\' performance and prompt submission of the same.'
    ]
  },
  {
    section: 'B',
    title: 'Knowledge of Subject',
    items: [
      'Demonstrate mastery of the subject matter. (Explains the subject matter without relying solely on the prescribed textbook.)',
      'Draws and shares information on the state of the art of theory and practice in his/her discipline.',
      'Integrates subject to practical circumstances and learning intents/ purposes of students.',
      'Explain the relevance of the present topic to the previous lessons and relates the subject matter to relevant current issues and or daily life activities.',
      'Demonstrates up to date knowledge and or awareness on current trends and issues of the subject.'
    ]
  },
  {
    section: 'C',
    title: 'Teaching for Independent Learning',
    items: [
      'Creates teaching strategies that allow students to practice using concept they need to understand (interactive discussion).',
      'Enhances student self-esteem and/or gives due recognition to students\' performance/ potentials.',
      'Allows students to create their own course with objectives and realistically defined student-professor rules and make them accountable for their performance',
      'Allows student to think independently and make their own decisions and holding them accountable for their performance based largely on their success in executing decisions.',
      'Encourages students to learned beyond what is required and help/ guide the students how to apply the concepts learned'
    ]
  },
  {
    section: 'D',
    title: 'Management of Learning',
    items: [
      'Creates opportunities for intensive and/or extensive contribution of the students on the class activities, e.g., breaks class into dyads, triads or buzz/task groups).',
      'Assumes roles of facilitator, resource person, coach, inquisitor, integrator, referee in drawing students to contribute to knowledge and understanding of the concepts at hand',
      'Designs and implements learning conditions and experience that promotes healthy exchange and/or confrontations...',
      'Structures/re-structures learning and teaching-learning context to enhance attainment of collective learning objectives.',
      'Use of instructional Materials (audio/ video materials; fieldtrips, film showing, computer aided instruction, etc.) to reinforce learning processes.'
    ]
  }
];

export default function ManageEvaluationForm() {
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>(DEFAULT_CRITERIA);
  const [previewMode, setPreviewMode] = useState(false);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ sectionIndex: number; itemIndex: number } | null>(null);
  const [tempText, setTempText] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    // Load saved criteria from localStorage
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = localStorage.getItem('evaluationCriteria');
    if (saved) {
      try {
        setCriteria(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved criteria:', e);
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleSave = () => {
    localStorage.setItem('evaluationCriteria', JSON.stringify(criteria));
    setSavedMessage('Evaluation form saved successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleEditSectionTitle = (index: number) => {
    setEditingSection(index);
    setTempText(criteria[index].title);
  };

  const handleSaveSectionTitle = (index: number) => {
    const newCriteria = [...criteria];
    newCriteria[index].title = tempText;
    setCriteria(newCriteria);
    setEditingSection(null);
    setTempText('');
  };

  const handleEditItem = (sectionIndex: number, itemIndex: number) => {
    setEditingItem({ sectionIndex, itemIndex });
    setTempText(criteria[sectionIndex].items[itemIndex]);
  };

  const handleSaveItem = () => {
    if (editingItem) {
      const newCriteria = [...criteria];
      newCriteria[editingItem.sectionIndex].items[editingItem.itemIndex] = tempText;
      setCriteria(newCriteria);
      setEditingItem(null);
      setTempText('');
    }
  };

  const handleAddItem = (sectionIndex: number) => {
    const newCriteria = [...criteria];
    newCriteria[sectionIndex].items.push('New question...');
    setCriteria(newCriteria);
  };

  const handleDeleteItem = (sectionIndex: number, itemIndex: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const newCriteria = [...criteria];
      newCriteria[sectionIndex].items.splice(itemIndex, 1);
      setCriteria(newCriteria);
    }
  };

  if (previewMode) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Preview Evaluation Form</h2>
          <button
            onClick={() => setPreviewMode(false)}
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
            <Edit2 size={16} /> Edit Form
          </button>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          {/* Scale Table */}
          <div style={{ border: '2px solid #333', marginBottom: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ border: '2px solid #333', padding: '10px', fontWeight: 700, color: '#333' }}>SCALE</th>
                  <th style={{ border: '2px solid #333', padding: '10px', fontWeight: 700, color: '#333' }}>DESCRIPTIVE RATING</th>
                  <th style={{ border: '2px solid #333', padding: '10px', fontWeight: 700, color: '#333' }}>QUALITATIVE DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '2px solid #333', padding: '10px', textAlign: 'center', fontWeight: 700 }}>5</td>
                  <td style={{ border: '2px solid #333', padding: '10px', fontWeight: 700 }}>Outstanding</td>
                  <td style={{ border: '2px solid #333', padding: '10px' }}>The performance almost always exceeds the job requirements. The Faculty is an exceptional role model</td>
                </tr>
                <tr style={{ background: '#f9f9f9' }}>
                  <td style={{ border: '2px solid #333', padding: '10px', textAlign: 'center', fontWeight: 700 }}>4</td>
                  <td style={{ border: '2px solid #333', padding: '10px', fontWeight: 700 }}>Very Satisfactory</td>
                  <td style={{ border: '2px solid #333', padding: '10px' }}>The performance meets and often exceeds the job requirements.</td>
                </tr>
                <tr>
                  <td style={{ border: '2px solid #333', padding: '10px', textAlign: 'center', fontWeight: 700 }}>3</td>
                  <td style={{ border: '2px solid #333', padding: '10px', fontWeight: 700 }}>Satisfactory</td>
                  <td style={{ border: '2px solid #333', padding: '10px' }}>The performance meets job requirements.</td>
                </tr>
                <tr style={{ background: '#f9f9f9' }}>
                  <td style={{ border: '2px solid #333', padding: '10px', textAlign: 'center', fontWeight: 700 }}>2</td>
                  <td style={{ border: '2px solid #333', padding: '10px', fontWeight: 700 }}>Fair</td>
                  <td style={{ border: '2px solid #333', padding: '10px' }}>The performance needs some development to meet job requirements.</td>
                </tr>
                <tr>
                  <td style={{ border: '2px solid #333', padding: '10px', textAlign: 'center', fontWeight: 700 }}>1</td>
                  <td style={{ border: '2px solid #333', padding: '10px', fontWeight: 700 }}>Poor</td>
                  <td style={{ border: '2px solid #333', padding: '10px' }}>The faculty fails to meet job requirements.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Evaluation Sections */}
          {criteria.map((section, sIdx) => (
            <div key={section.section} style={{ border: '2px solid #333', marginBottom: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#e0e0e0' }}>
                    <th colSpan={6} style={{ border: '2px solid #333', padding: '12px', textAlign: 'left', fontWeight: 700, color: '#333' }}>
                      {section.section}. {section.title}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, iIdx) => (
                    <tr key={iIdx}>
                      <td style={{ border: '2px solid #333', padding: '10px', fontWeight: 700 }}>{iIdx + 1}.</td>
                      <td colSpan={5} style={{ border: '2px solid #333', padding: '10px' }}>{item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Manage Evaluation Form</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setPreviewMode(true)}
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
            <Eye size={16} /> Preview
          </button>
          <button
            onClick={handleSave}
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
            <Save size={16} /> Save Form
          </button>
        </div>
      </div>

      {savedMessage && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: '#dcfce7',
          border: '1px solid #22c55e',
          borderRadius: '6px',
          color: '#166534',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          {savedMessage}
        </div>
      )}

      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
      }}>
        {criteria.map((section, sIdx) => (
          <div key={section.section} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#8b1a2b' }}>{section.section}.</span>
              {editingSection === sIdx ? (
                <input
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  onBlur={() => handleSaveSectionTitle(sIdx)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveSectionTitle(sIdx)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #8b1a2b',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#333',
                    flex: 1
                  }}
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => handleEditSectionTitle(sIdx)}
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#333',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {section.title}
                </span>
              )}
            </div>

            {section.items.map((item, iIdx) => (
              <div key={iIdx} style={{ marginBottom: '12px', display: 'flex', gap: '10px' }}>
                <span style={{ fontWeight: 600, color: '#666', minWidth: '30px', paddingTop: '8px' }}>{iIdx + 1}.</span>
                {editingItem?.sectionIndex === sIdx && editingItem?.itemIndex === iIdx ? (
                  <input
                    type="text"
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    onBlur={handleSaveItem}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveItem()}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '2px solid #8b1a2b',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => handleEditItem(sIdx, iIdx)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8b1a2b'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  >
                    {item}
                  </div>
                )}
                <button
                  onClick={() => handleDeleteItem(sIdx, iIdx)}
                  style={{
                    padding: '8px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Delete question"
                >
                  Delete
                </button>
              </div>
            ))}

            <button
              onClick={() => handleAddItem(sIdx)}
              style={{
                padding: '8px 16px',
                background: '#f0f0f0',
                color: '#333',
                border: '2px dashed #999',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                marginTop: '8px'
              }}
            >
              + Add Question
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
