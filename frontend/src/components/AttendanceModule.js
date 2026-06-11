import React, { useState, useEffect, useCallback } from 'react';
import { Loader, Save, ChevronLeft, ChevronRight, BarChart2, ClipboardList } from 'lucide-react';
import AuthService from '../services/AuthService';
import { Avatar } from './StudentsModule';
import './AttendanceModule.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', short: 'P', bg: '#dcfce7', color: '#15803d' },
  { value: 'absent',  label: 'Absent',  short: 'A', bg: '#fee2e2', color: '#dc2626' },
  { value: 'late',    label: 'Late',    short: 'L', bg: '#fef9c3', color: '#a16207' },
  { value: 'excused', label: 'Excused', short: 'E', bg: '#f3e8ff', color: '#7c3aed' },
];

function statusStyle(value) {
  return STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function fmt(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Status toggle button ── */
function StatusToggle({ value, onChange }) {
  const opts = STATUS_OPTIONS;
  const current = opts.findIndex(s => s.value === value);
  const cycle = () => onChange(opts[(current + 1) % opts.length].value);
  const s = statusStyle(value);
  return (
    <button
      className="at-status-btn"
      style={{ background: s.bg, color: s.color, borderColor: s.color }}
      onClick={cycle}
      title={`Click to change — currently ${s.label}`}
    >
      {s.short} <span className="at-status-label">{s.label}</span>
    </button>
  );
}

/* ── Main component ── */
function AttendanceModule({ business, staffProfile }) {
  const role = staffProfile?.additional_role || '';
  const seeAllClasses = !staffProfile || ['head_teacher', 'deputy_head', 'dos'].includes(role);
  const allowedClasses = seeAllClasses ? null : (staffProfile?.assigned_classes || []);
  const [view, setView]           = useState('register'); // 'register' | 'summary'
  const [year, setYear]           = useState(String(CURRENT_YEAR));
  const [term, setTerm]           = useState('1');
  const [className, setClassName] = useState('');
  const [section, setSection]     = useState('');
  const [date, setDate]           = useState(toDateStr(new Date()));

  const [classes, setClasses]     = useState([]);
  const [sections, setSections]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [records, setRecords]     = useState({}); // { studentId: { status, note } }
  const [savedRecords, setSavedRecords] = useState({}); // what's on server
  const [summary, setSummary]     = useState([]);

  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const isDirty = JSON.stringify(records) !== JSON.stringify(savedRecords);

  // Fetch classes
  useEffect(() => {
    fetch(`${API_URL}/students/`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        let list = [...new Set((d.results || []).map(s => s.class_name))].sort();
        if (allowedClasses) list = list.filter(c => allowedClasses.includes(c));
        setClasses(list);
        if (list.length && !className) setClassName(list[0]);
      }).catch(console.error);
  }, []); // eslint-disable-line

  // Fetch students when class/section changes
  useEffect(() => {
    if (!className) return;
    fetch(`${API_URL}/students/?class_name=${className}&section=${section}`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        const list = d.results || [];
        setStudents(list);
        setSections([...new Set(list.map(s => s.section).filter(Boolean))].sort());
      }).catch(console.error);
  }, [className, section]);

  // Fetch existing attendance for this date/class
  const fetchAttendance = useCallback(() => {
    if (!className || !date) return;
    setLoading(true);
    fetch(`${API_URL}/attendance/?class_name=${className}&section=${section}&date=${date}`, {
      headers: AuthService.getAuthHeaders(),
    })
      .then(r => r.json())
      .then(d => {
        const existing = {};
        (d.results || []).forEach(rec => {
          existing[rec.student] = { status: rec.status, note: rec.note || '' };
        });
        setRecords(existing);
        setSavedRecords(existing);
      }).catch(console.error)
      .finally(() => setLoading(false));
  }, [className, section, date]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Fetch summary when switching to summary view
  useEffect(() => {
    if (view !== 'summary' || !className) return;
    fetch(`${API_URL}/attendance/summary/?class_name=${className}&term=${term}&year=${year}`, {
      headers: AuthService.getAuthHeaders(),
    })
      .then(r => r.json())
      .then(d => setSummary(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, [view, className, term, year]);

  const getRecord = (studentId) =>
    records[studentId] || { status: 'present', note: '' };

  const setStatus = (studentId, status) =>
    setRecords(prev => ({ ...prev, [studentId]: { ...getRecord(studentId), status } }));

  const setNote = (studentId, note) =>
    setRecords(prev => ({ ...prev, [studentId]: { ...getRecord(studentId), note } }));

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s.id] = { status, note: getRecord(s.id).note }; });
    setRecords(next);
  };

  const shiftDate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(toDateStr(d));
  };

  const handleSave = async () => {
    if (!students.length) return;
    setSaving(true);
    setSaved(false);
    const payload = {
      records: students.map(s => ({
        student: s.id,
        date,
        term,
        year: parseInt(year, 10),
        ...getRecord(s.id),
      })),
    };
    try {
      await fetch(`${API_URL}/attendance/bulk_save/`, {
        method: 'POST',
        headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSavedRecords({ ...records });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // Count for current date display
  const counts = students.reduce((acc, s) => {
    const st = getRecord(s.id).status;
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  // Summary joined with student info
  const summaryWithNames = summary.map(row => {
    const student = students.find(s => s.id === row.student);
    return { ...row, student };
  }).filter(r => r.student);

  return (
    <div className="at-module">

      {/* Header */}
      <div className="at-header">
        <div className="at-header-left">
          <h2>Attendance</h2>
          {students.length > 0 && (
            <div className="at-count-pills">
              {STATUS_OPTIONS.map(s => (
                <span key={s.value} className="at-count-pill" style={{ background: s.bg, color: s.color }}>
                  {s.short} {counts[s.value] || 0}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="at-header-right">
          <button
            className={`at-view-btn ${view === 'register' ? 'active' : ''}`}
            onClick={() => setView('register')}
          >
            <ClipboardList size={15} /> Register
          </button>
          <button
            className={`at-view-btn ${view === 'summary' ? 'active' : ''}`}
            onClick={() => setView('summary')}
          >
            <BarChart2 size={15} /> Summary
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="at-filters">
        <div className="at-filter-group">
          <label>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="at-filter-group">
          <label>Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
        <div className="at-filter-group">
          <label>Class</label>
          <select value={className} onChange={e => setClassName(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {sections.length > 0 && (
          <div className="at-filter-group">
            <label>Section</label>
            <select value={section} onChange={e => setSection(e.target.value)}>
              <option value="">All</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Date navigator — only in register view */}
        {view === 'register' && (
          <div className="at-date-nav">
            <button className="at-nav-btn" onClick={() => shiftDate(-1)}><ChevronLeft size={16} /></button>
            <input
              type="date"
              className="at-date-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <button className="at-nav-btn" onClick={() => shiftDate(1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* ── Register View ── */}
      {view === 'register' && (
        <>
          {!className ? (
            <div className="at-empty">Select a class to take attendance.</div>
          ) : loading ? (
            <div className="at-loading"><Loader size={22} className="spinner" /> Loading...</div>
          ) : (
            <>
              {/* Quick mark all */}
              {students.length > 0 && (
                <div className="at-quick-bar">
                  <span className="at-quick-label">Mark all:</span>
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      className="at-quick-btn"
                      style={{ background: s.bg, color: s.color, borderColor: s.color }}
                      onClick={() => markAll(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                  <span className="at-date-label">{fmt(date)}</span>
                </div>
              )}

              <div className="at-table-container">
                <table className="at-table">
                  <thead>
                    <tr>
                      <th className="at-th-num">#</th>
                      <th className="at-th-student">Student</th>
                      <th className="at-th-status">Status</th>
                      <th className="at-th-note">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan={4} className="at-empty">No students in this class.</td></tr>
                    ) : students.map((student, idx) => {
                      const rec = getRecord(student.id);
                      const s   = statusStyle(rec.status);
                      return (
                        <tr key={student.id} style={{ background: s.bg + '55' }}>
                          <td className="at-cell at-cell-num">{idx + 1}</td>
                          <td className="at-cell at-cell-student">
                            <div className="at-student-cell">
                              <Avatar url={student.photo_url} name={student.full_name} size={32} pending={student.photo_upload_status === 'pending'} />
                              <div>
                                <span className="at-name">{student.first_name} {student.last_name}</span>
                                {student.student_id && <span className="at-sid">#{student.student_id}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="at-cell at-cell-status">
                            <StatusToggle value={rec.status} onChange={val => setStatus(student.id, val)} />
                          </td>
                          <td className="at-cell at-cell-note">
                            <input
                              className="at-note-input"
                              placeholder="Optional note…"
                              value={rec.note}
                              onChange={e => setNote(student.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {students.length > 0 && (
                <div className="at-save-bar">
                  {isDirty && <span className="at-unsaved">Unsaved changes</span>}
                  {saved   && <span className="at-saved-msg">✓ Saved</span>}
                  <button className="at-save-btn" onClick={handleSave} disabled={saving || !isDirty}>
                    {saving ? <Loader size={15} className="spinner" /> : <Save size={15} />}
                    {saving ? 'Saving…' : 'Save Attendance'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Summary View ── */}
      {view === 'summary' && (
        <>
          {!className ? (
            <div className="at-empty">Select a class to view summary.</div>
          ) : (
            <div className="at-table-container">
              <table className="at-table">
                <thead>
                  <tr>
                    <th className="at-th-num">#</th>
                    <th className="at-th-student">Student</th>
                    <th className="at-th-count">Total Days</th>
                    {STATUS_OPTIONS.map(s => (
                      <th key={s.value} className="at-th-count" style={{ color: s.color }}>{s.label}</th>
                    ))}
                    <th className="at-th-count">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryWithNames.length === 0 ? (
                    <tr><td colSpan={7} className="at-empty">No attendance records for this term/year.</td></tr>
                  ) : summaryWithNames.map((row, idx) => {
                    const pct = row.total > 0 ? Math.round((row.present + row.late) / row.total * 100) : 0;
                    const pctStyle = pct >= 75 ? { color: '#15803d' } : pct >= 50 ? { color: '#a16207' } : { color: '#dc2626' };
                    return (
                      <tr key={row.student.id}>
                        <td className="at-cell at-cell-num">{idx + 1}</td>
                        <td className="at-cell at-cell-student">
                          <div className="at-student-cell">
                            <Avatar url={row.student.photo_url} name={row.student.full_name} size={30} />
                            <span className="at-name">{row.student.first_name} {row.student.last_name}</span>
                          </div>
                        </td>
                        <td className="at-cell at-cell-count">{row.total}</td>
                        <td className="at-cell at-cell-count" style={{ color: '#15803d', fontWeight: 700 }}>{row.present}</td>
                        <td className="at-cell at-cell-count" style={{ color: '#dc2626', fontWeight: 700 }}>{row.absent}</td>
                        <td className="at-cell at-cell-count" style={{ color: '#a16207', fontWeight: 700 }}>{row.late}</td>
                        <td className="at-cell at-cell-count" style={{ color: '#7c3aed', fontWeight: 700 }}>{row.excused}</td>
                        <td className="at-cell at-cell-count">
                          <span className="at-pct-badge" style={pctStyle}>{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AttendanceModule;
