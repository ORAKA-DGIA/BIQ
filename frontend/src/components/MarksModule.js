import React, { useState, useEffect, useRef } from 'react';
import { Loader } from 'lucide-react';
import AuthService from '../services/AuthService';
import { Avatar } from './StudentsModule';
import './MarksModule.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const GRADE_THRESHOLDS = [
  { min: 80, grade: 'A', label: 'Exceptional',  bg: '#dcfce7', color: '#15803d' },
  { min: 70, grade: 'B', label: 'Outstanding',  bg: '#dbeafe', color: '#1d4ed8' },
  { min: 60, grade: 'C', label: 'Satisfactory', bg: '#fef9c3', color: '#a16207' },
  { min: 50, grade: 'D', label: 'Basic',        bg: '#fed7aa', color: '#c2410c' },
  { min: 0,  grade: 'E', label: 'Elementary',   bg: '#fee2e2', color: '#dc2626' },
];

function getGradeInfo(pct) {
  if (pct == null) return null;
  return GRADE_THRESHOLDS.find(t => pct >= t.min) || GRADE_THRESHOLDS[4];
}

const CBA_KEYWORDS  = ['CBA', 'CA', 'A1', 'A2', 'A3', 'BOT', 'MOT', 'MID'];
const UNEB_KEYWORDS = ['UNEB', 'EOT', 'EXAM', 'FINAL'];

function isUNEB(a) { return UNEB_KEYWORDS.some(k => a.toUpperCase().includes(k)); }
function isCBA(a)  { return CBA_KEYWORDS.some(k => a.toUpperCase().includes(k)); }

function calcFinalMark(studentMarks) {
  const cbaMarks  = studentMarks.filter(m => isCBA(m.assessment));
  const unebMarks = studentMarks.filter(m => isUNEB(m.assessment));
  if (cbaMarks.length > 0 && unebMarks.length > 0) {
    const cbaAvg  = cbaMarks.reduce((s, m) => s + parseFloat(m.score) / parseFloat(m.max_score) * 100, 0) / cbaMarks.length;
    const unebAvg = unebMarks.reduce((s, m) => s + parseFloat(m.score) / parseFloat(m.max_score) * 100, 0) / unebMarks.length;
    return { value: cbaAvg * 0.2 + unebAvg * 0.8, weighted: true };
  }
  const avg = studentMarks.reduce((s, m) => s + parseFloat(m.score) / parseFloat(m.max_score) * 100, 0) / studentMarks.length;
  return { value: avg, weighted: false };
}

/* ── Inline add input ── */
function InlineAdd({ placeholder, onAdd, onCancel }) {
  const [val, setVal] = useState('');
  const inputRef = useRef();
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  const commit = () => {
    const t = val.trim().toUpperCase();
    if (t) onAdd(t);
    else onCancel();
  };
  return (
    <div className="assessment-input-group">
      <input
        ref={inputRef}
        className="assessment-input"
        placeholder={placeholder}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button className="assessment-add-btn" onClick={commit}>Add</button>
      <button className="assessment-cancel-btn" onClick={onCancel}>✕</button>
    </div>
  );
}

/* ── Max-score header cell ── */
function MaxScoreHeader({ assessment, maxScore, onMaxScoreChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(maxScore));
  const inputRef = useRef();

  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);
  useEffect(() => { setVal(String(maxScore)); }, [maxScore]);

  const commit = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && n !== maxScore) onMaxScoreChange(assessment, n);
    else setVal(String(maxScore));
    setEditing(false);
  };

  return (
    <th className="mm-th-assessment">
      <div className="mm-th-inner">
        <span>{assessment}</span>
        {editing ? (
          <input
            ref={inputRef}
            className="mm-max-input"
            type="number" min="1"
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setVal(String(maxScore)); setEditing(false); }
            }}
          />
        ) : (
          <span className="mm-max-badge" onClick={() => setEditing(true)} title="Click to change max score">
            /{maxScore}
          </span>
        )}
      </div>
    </th>
  );
}

/* ── Score cell ── */
function ScoreCell({ mark, student, subject, assessment, term, year, maxScore, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(mark ? String(mark.score) : '');
  const inputRef = useRef();

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  useEffect(() => { if (!editing) setVal(mark ? String(mark.score) : ''); }, [mark, editing]);

  const commit = async () => {
    const trimmed = val.trim();
    const score   = parseFloat(trimmed);

    if (trimmed === '' && mark) {
      await fetch(`${API_URL}/marks/${mark.id}/`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
      setEditing(false); onSaved(); return;
    }
    if (trimmed === '') { setEditing(false); return; }
    if (isNaN(score) || score < 0 || score > maxScore) {
      setVal(mark ? String(mark.score) : '');
      setEditing(false); return;
    }

    const payload = { student: student.id, subject, assessment, term, year, score, max_score: maxScore };
    try {
      if (mark) {
        await fetch(`${API_URL}/marks/${mark.id}/`, {
          method: 'PUT',
          headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_URL}/marks/`, {
          method: 'POST',
          headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (e) { console.error(e); }
    setEditing(false); onSaved();
  };

  const effectiveMax = mark ? parseFloat(mark.max_score) : maxScore;
  const pct          = mark ? Math.round(parseFloat(mark.score) / effectiveMax * 100) : null;
  const gradeInfo    = getGradeInfo(pct);

  if (editing) {
    return (
      <td className="mm-cell mm-cell-editing">
        <input
          ref={inputRef}
          className="mm-cell-input"
          type="number" min="0" max={maxScore}
          value={val}
          onChange={e => {
            const v = e.target.value;
            if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= maxScore)) setVal(v);
          }}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setVal(mark ? String(mark.score) : ''); setEditing(false); }
          }}
        />
      </td>
    );
  }

  return (
    <td className="mm-cell mm-cell-score" onClick={() => { setVal(mark ? String(mark.score) : ''); setEditing(true); }}>
      {mark ? (
        <span className="mm-score-badge" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>
          {mark.score}/{effectiveMax}&nbsp;<strong>{gradeInfo.grade}</strong>
        </span>
      ) : <span className="mm-cell-empty">·</span>}
    </td>
  );
}

/* ── Main component ── */
function MarksModule({ business, staffProfile }) {
  const role = staffProfile?.additional_role || '';
  const seeAllClasses  = !staffProfile || ['head_teacher', 'deputy_head', 'dos'].includes(role);
  const seeAllSubjects = !staffProfile || ['head_teacher', 'deputy_head', 'dos', 'class_teacher'].includes(role);
  const allowedClasses  = seeAllClasses  ? null : (staffProfile?.assigned_classes || []);
  const allowedSubjects = seeAllSubjects ? null : (staffProfile?.subjects || []);
  const [term, setTerm]               = useState('1');
  const [year, setYear]               = useState(String(CURRENT_YEAR));
  const [className, setClassName]     = useState('');
  const [section, setSection]         = useState('');
  const [subject, setSubject]         = useState('');
  const [classes, setClasses]         = useState([]);
  const [sections, setSections]       = useState([]);
  const [subjects, setSubjects]       = useState([]);      // local list, editable
  const [assessmentTypes, setAssessmentTypes] = useState([]); // local list, editable
  const [maxScores, setMaxScores]     = useState({});
  const [students, setStudents]       = useState([]);
  const [marks, setMarks]             = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [addingSubject, setAddingSubject]       = useState(false);
  const [addingAssessment, setAddingAssessment] = useState(false);

  const marksUrl = (subj = subject) =>
    `${API_URL}/marks/?subject=${subj}&class_name=${className}&section=${section}&term=${term}&year=${year}`;

  const refetchMarks = () =>
    fetch(marksUrl(), { headers: AuthService.getAuthHeaders() })
      .then(r => r.json()).then(d => setMarks(d.results || []));

  // Fetch classes from students
  useEffect(() => {
    fetch(`${API_URL}/students/`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        let list = [...new Set((data.results || []).map(s => s.class_name))].sort();
        if (allowedClasses) list = list.filter(c => allowedClasses.includes(c));
        setClasses(list);
        if (list.length && !className) setClassName(list[0]);
      })
      .catch(console.error);
  }, []); // eslint-disable-line

  // When class/term/year changes: fetch students + existing subjects from marks
  useEffect(() => {
    if (!className || !term || !year) return;
    setLoading(true);

    Promise.all([
      // students for this class/section
      fetch(`${API_URL}/students/?class_name=${className}&section=${section}`, { headers: AuthService.getAuthHeaders() }).then(r => r.json()),
      // existing subjects saved for this class/term/year
      fetch(`${API_URL}/marks/subjects/?class_name=${className}&term=${term}&year=${year}`, { headers: AuthService.getAuthHeaders() }).then(r => r.json()),
    ]).then(([sData, subjData]) => {
      const studentList    = sData.results || [];
      const existingSubjects = subjData.subjects || [];
      setStudents(studentList);
      setSections([...new Set(studentList.filter(s => s.class_name === className).map(s => s.section))].sort());

      setSubjects(prev => {
        let merged = [...new Set([...existingSubjects, ...prev])].sort();
        if (allowedSubjects) merged = merged.filter(s => allowedSubjects.includes(s));
        return merged;
      });

      setSubject(prev => {
        let merged = [...new Set([...existingSubjects])].sort();
        if (allowedSubjects) merged = merged.filter(s => allowedSubjects.includes(s));
        if (!prev || !merged.includes(prev)) return merged[0] || prev || '';
        return prev;
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [className, section, term, year]); // eslint-disable-line

  // When subject changes: fetch existing assessment types + marks
  useEffect(() => {
    if (!subject || !className || !term || !year) {
      setMarks([]); setAssessmentTypes([]); setSelectedAssessments([]);
      return;
    }
    Promise.all([
      fetch(`${API_URL}/marks/assessment_types/?subject=${subject}&class_name=${className}&term=${term}&year=${year}`, { headers: AuthService.getAuthHeaders() }).then(r => r.json()),
      fetch(marksUrl(subject), { headers: AuthService.getAuthHeaders() }).then(r => r.json()),
    ]).then(([aData, mData]) => {
      const existingTypes = aData.assessment_types || [];
      const markList      = mData.results || [];
      setMarks(markList);

      // Merge API types with any locally-added ones
      setAssessmentTypes(prev => {
        const merged = [...new Set([...existingTypes, ...prev])].sort();
        setSelectedAssessments(merged);
        return merged;
      });

      // Derive max_scores from saved marks
      const derived = {};
      markList.forEach(m => { derived[m.assessment] = parseFloat(m.max_score); });
      setMaxScores(prev => ({ ...prev, ...derived }));
    }).catch(console.error);
  }, [subject, className, term, year]); // eslint-disable-line

  const getMarkForStudent = (student, assessment) =>
    marks.find(m => m.student === student.id && m.assessment === assessment && m.subject === subject);

  const calculateFinal = (student) => {
    const sm = marks.filter(m => m.student === student.id && m.subject === subject && selectedAssessments.includes(m.assessment));
    return sm.length ? calcFinalMark(sm) : null;
  };

  const toggleAssessment = (a) =>
    setSelectedAssessments(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleAddSubject = (name) => {
    const upper = name.toUpperCase();
    setSubjects(prev => prev.includes(upper) ? prev : [...prev, upper].sort());
    setSubject(upper);
    setAssessmentTypes([]);
    setSelectedAssessments([]);
    setMarks([]);
    setAddingSubject(false);
  };

  const handleAddAssessment = (name) => {
    if (!assessmentTypes.includes(name)) {
      setAssessmentTypes(prev => [...prev, name].sort());
      setSelectedAssessments(prev => [...prev, name]);
      setMaxScores(prev => ({ ...prev, [name]: 100 }));
    }
    setAddingAssessment(false);
  };

  const handleMaxScoreChange = async (assessment, newMax) => {
    setMaxScores(prev => ({ ...prev, [assessment]: newMax }));
    const affected = marks.filter(m => m.assessment === assessment && m.subject === subject);
    await Promise.all(affected.map(m =>
      fetch(`${API_URL}/marks/${m.id}/`, {
        method: 'PATCH',
        headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_score: newMax }),
      })
    ));
    refetchMarks();
  };

  const readyToShow = className && term && year;

  return (
    <div className="marks-module">
      <div className="marks-header"><h2>Marks Entry</h2></div>

      {/* Filters */}
      <div className="marks-filters">
        <div className="filter-group">
          <label>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Class</label>
          <select value={className} onChange={e => { setClassName(e.target.value); setSubject(''); }}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {className && (
          <div className="filter-group">
            <label>Section</label>
            <select value={section} onChange={e => setSection(e.target.value)}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Subject selector + add subject — always visible when class is chosen */}
        {readyToShow && (
          <div className="filter-group">
            <label>Subject</label>
            <div className="mm-subject-row">
              {subjects.length > 0 && (
                <select value={subject} onChange={e => setSubject(e.target.value)}>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {addingSubject ? (
                <InlineAdd
                  placeholder="e.g. MATH, ENG"
                  onAdd={handleAddSubject}
                  onCancel={() => setAddingSubject(false)}
                />
              ) : (
                <button className="add-assessment-btn" onClick={() => setAddingSubject(true)}>+ Add Subject</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assessment toggles + Add Column — always visible when subject is chosen */}
      {readyToShow && subject && (
        <div className="assessment-toggles">
          <label>Include in Final Mark:</label>
          <div className="toggles-group">
            {assessmentTypes.map(a => (
              <label key={a} className="checkbox-label">
                <input type="checkbox" checked={selectedAssessments.includes(a)} onChange={() => toggleAssessment(a)} />
                {a}
              </label>
            ))}
            {addingAssessment ? (
              <InlineAdd
                placeholder="e.g. A1, EOT, BOT"
                onAdd={handleAddAssessment}
                onCancel={() => setAddingAssessment(false)}
              />
            ) : (
              <button className="add-assessment-btn" onClick={() => setAddingAssessment(true)}>+ Add Column</button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {!readyToShow ? (
        <div className="mm-empty">Select a year, term and class to begin.</div>
      ) : !subject ? (
        <div className="mm-empty">Add or select a subject above to enter marks.</div>
      ) : loading ? (
        <div className="mm-loading"><Loader size={24} className="spinner" /> Loading...</div>
      ) : (
        <div className="mm-table-container">
          <table className="mm-table">
            <thead>
              <tr>
                <th className="mm-th-num">#</th>
                <th className="mm-th-student">Student</th>
                {assessmentTypes.map(a => (
                  <MaxScoreHeader
                    key={a}
                    assessment={a}
                    maxScore={maxScores[a] ?? 100}
                    onMaxScoreChange={handleMaxScoreChange}
                  />
                ))}
                {assessmentTypes.length > 0 && <th className="mm-th-average">Final Mark</th>}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={assessmentTypes.length + 3} className="mm-empty">No students in this class.</td></tr>
              ) : students.map((student, idx) => {
                const final      = calculateFinal(student);
                const finalGrade = final ? getGradeInfo(Math.round(final.value)) : null;
                return (
                  <tr key={student.id}>
                    <td className="mm-cell mm-cell-num">{idx + 1}</td>
                    <td className="mm-cell mm-cell-student">
                      <div className="mm-student-cell">
                        <Avatar url={student.photo_url} name={student.full_name} size={30} pending={student.photo_upload_status === 'pending'} />
                        <span>{student.first_name} {student.last_name}</span>
                      </div>
                    </td>
                    {assessmentTypes.map(a => (
                      <ScoreCell
                        key={`${student.id}-${a}`}
                        mark={getMarkForStudent(student, a)}
                        student={student}
                        subject={subject}
                        assessment={a}
                        term={term}
                        year={parseInt(year, 10)}
                        maxScore={maxScores[a] ?? 100}
                        onSaved={refetchMarks}
                      />
                    ))}
                    {assessmentTypes.length > 0 && (
                      <td className="mm-cell mm-cell-average">
                        {final ? (
                          <span className="mm-score-badge" style={{ background: finalGrade.bg, color: finalGrade.color }}>
                            {final.value.toFixed(1)}%&nbsp;<strong>{finalGrade.grade}</strong>
                            {final.weighted && <span className="mm-weighted-tag">20/80</span>}
                          </span>
                        ) : <span className="mm-cell-empty">·</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MarksModule;
