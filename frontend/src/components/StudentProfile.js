import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Pencil, Trash2, User, Phone, Mail, MapPin,
  GraduationCap, CalendarDays, ClipboardList, BadgeDollarSign, Hash, ShieldAlert, Plus,
  CheckCircle2, XCircle, Clock, BookOpen
} from 'lucide-react';
import AuthService from '../services/AuthService';
import './StudentProfile.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const STATUS_COLORS = {
  active:      { bg: '#dcfce7', color: '#15803d' },
  inactive:    { bg: '#f1f5f9', color: '#64748b' },
  graduated:   { bg: '#dbeafe', color: '#1d4ed8' },
  transferred: { bg: '#fef9c3', color: '#a16207' },
};

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: User },
  { key: 'marks',      label: 'Marks',      icon: ClipboardList },
  { key: 'attendance', label: 'Attendance', icon: CalendarDays },
  { key: 'fees',       label: 'Fees',       icon: BadgeDollarSign },
  { key: 'behaviour',  label: 'Behaviour',  icon: ShieldAlert },
];

const STATUS_META = {
  present: { label: 'Present', bg: '#dcfce7', color: '#15803d' },
  absent:  { label: 'Absent',  bg: '#fee2e2', color: '#dc2626' },
  late:    { label: 'Late',    bg: '#fef9c3', color: '#a16207' },
  excused: { label: 'Excused', bg: '#f3e8ff', color: '#7c3aed' },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

/* ── Shared helpers ── */
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="sp-info-row">
      <div className="sp-info-icon"><Icon size={14} strokeWidth={2} /></div>
      <div className="sp-info-content">
        <span className="sp-info-label">{label}</span>
        <span className="sp-info-value">{value}</span>
      </div>
    </div>
  );
}

function ComingSoonTab({ label }) {
  return (
    <div className="sp-coming-soon">
      <ClipboardList size={36} strokeWidth={1.2} />
      <p>{label} records will appear here.</p>
    </div>
  );
}

/* ── Overview tab ── */
function OverviewTab({ student }) {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="sp-tab-content">
      <div className="sp-section-title">Academic</div>
      <div className="sp-info-grid">
        <InfoRow icon={GraduationCap} label="Class"          value={student.class_name} />
        <InfoRow icon={Hash}          label="Section"        value={student.section} />
        <InfoRow icon={Hash}          label="Student ID"     value={student.student_id} />
        <InfoRow icon={CalendarDays}  label="Admission Date" value={fmt(student.admission_date)} />
      </div>

      <div className="sp-section-title">Personal</div>
      <div className="sp-info-grid">
        <InfoRow icon={User}         label="Gender"        value={student.gender} />
        <InfoRow icon={CalendarDays} label="Date of Birth" value={fmt(student.date_of_birth)} />
        <InfoRow icon={MapPin}       label="Address"       value={student.address} />
      </div>

      {(student.parent_name || student.parent_phone || student.parent_email) && (
        <>
          <div className="sp-section-title">Parent / Guardian</div>
          <div className="sp-info-grid">
            <InfoRow icon={User}  label="Name"  value={student.parent_name} />
            <InfoRow icon={Phone} label="Phone" value={student.parent_phone} />
            <InfoRow icon={Mail}  label="Email" value={student.parent_email} />
          </div>
        </>
      )}

      {student.notes && (
        <>
          <div className="sp-section-title">Notes</div>
          <p className="sp-notes">{student.notes}</p>
        </>
      )}
    </div>
  );
}

/* ── Attendance tab ── */
function AttendanceTab({ student }) {
  const [term, setTerm]       = useState('1');
  const [year, setYear]       = useState(String(CURRENT_YEAR));
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/attendance/?student_id=${student.id}&term=${term}&year=${year}`, { headers: AuthService.getAuthHeaders() }),
        fetch(`${API_URL}/attendance/summary/?student_id=${student.id}&term=${term}&year=${year}`, { headers: AuthService.getAuthHeaders() }),
      ]);
      const recData = await recRes.json();
      const sumData = await sumRes.json();
      setRecords(recData.results || []);
      const row = Array.isArray(sumData) ? sumData.find(r => r.student === student.id) : null;
      setSummary(row || null);
    } catch { setRecords([]); setSummary(null); }
    finally { setLoading(false); }
  }, [student.id, term, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pct = summary && summary.total > 0
    ? Math.round((summary.present + summary.late) / summary.total * 100)
    : null;

  const pctColor = pct === null ? '#94a3b8' : pct >= 75 ? '#15803d' : pct >= 50 ? '#a16207' : '#dc2626';
  const pctBg    = pct === null ? '#f1f5f9' : pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fee2e2';

  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-UG', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <div className="sp-tab-content">
      {/* Filters */}
      <div className="sp-att-filters">
        <select className="sp-marks-select" value={year} onChange={e => setYear(e.target.value)}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="sp-marks-select" value={term} onChange={e => setTerm(e.target.value)}>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="sp-att-summary">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <div key={key} className="sp-att-card" style={{ background: meta.bg, borderColor: meta.color + '55' }}>
              <span className="sp-att-card-count" style={{ color: meta.color }}>{summary[key] ?? 0}</span>
              <span className="sp-att-card-label" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          ))}
          {pct !== null && (
            <div className="sp-att-card" style={{ background: pctBg, borderColor: pctColor + '55' }}>
              <span className="sp-att-card-count" style={{ color: pctColor }}>{pct}%</span>
              <span className="sp-att-card-label" style={{ color: pctColor }}>Attendance</span>
            </div>
          )}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="sp-coming-soon"><p>Loading…</p></div>
      ) : records.length === 0 ? (
        <div className="sp-coming-soon" style={{ padding: '32px 0' }}>
          <CalendarDays size={30} strokeWidth={1.2} />
          <p>No attendance records for this term / year.</p>
        </div>
      ) : (
        <table className="sp-marks-table">
          <thead>
            <tr><th>Date</th><th>Status</th><th>Note</th></tr>
          </thead>
          <tbody>
            {records.map(r => {
              const meta = STATUS_META[r.status] || STATUS_META.present;
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: '#1A365D' }}>{fmt(r.date)}</td>
                  <td>
                    <span className="sp-pct-badge" style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>{r.note || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Marks tab ── */
const GRADE_META = [
  { min: 80, grade: 'A', bg: '#dcfce7', color: '#15803d' },
  { min: 70, grade: 'B', bg: '#dbeafe', color: '#1d4ed8' },
  { min: 60, grade: 'C', bg: '#fef9c3', color: '#a16207' },
  { min: 50, grade: 'D', bg: '#fed7aa', color: '#c2410c' },
  { min: 0,  grade: 'E', bg: '#fee2e2', color: '#dc2626' },
];

function getGradeMeta(pct) {
  return GRADE_META.find(g => pct >= g.min) || GRADE_META[4];
}

function MarksTab({ student }) {
  const [marks, setMarks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR));
  const [filterTerm, setFilterTerm] = useState('');
  const [deleteId, setDeleteId]     = useState(null);

  const fetchMarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ student_id: student.id });
      if (filterYear) params.append('year', filterYear);
      if (filterTerm) params.append('term', filterTerm);
      const res  = await fetch(`${API_URL}/marks/?${params}`, { headers: AuthService.getAuthHeaders() });
      const data = await res.json();
      setMarks(data.results ?? data);
    } catch { setMarks([]); }
    finally { setLoading(false); }
  }, [student.id, filterYear, filterTerm]);

  useEffect(() => { fetchMarks(); }, [fetchMarks]);

  const handleDelete = async () => {
    await fetch(`${API_URL}/marks/${deleteId}/`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
    setDeleteId(null);
    fetchMarks();
  };

  // Group: { [subject]: { [assessment]: mark } }
  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject]) acc[m.subject] = {};
    acc[m.subject][m.assessment] = m;
    return acc;
  }, {});

  // All unique assessments across all subjects (columns)
  const allAssessments = [...new Set(marks.map(m => m.assessment))].sort();
  const subjects = Object.keys(grouped).sort();

  if (loading) return <div className="sp-coming-soon"><p>Loading…</p></div>;

  return (
    <div className="sp-tab-content">
      {/* Filters */}
      <div className="sp-marks-toolbar">
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="sp-marks-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="sp-marks-select" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
            <option value="">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
      </div>

      {marks.length === 0 ? (
        <div className="sp-coming-soon" style={{ padding: '32px 0' }}>
          <ClipboardList size={30} strokeWidth={1.2} />
          <p>No marks recorded{filterTerm ? ` for Term ${filterTerm}` : ''}{filterYear ? ` in ${filterYear}` : ''}.</p>
        </div>
      ) : (
        <div className="sp-marks-grid">
          {/* Header row */}
          <div className="sp-marks-grid-header">
            <div className="sp-mg-subject">Subject</div>
            {allAssessments.map(a => (
              <div key={a} className="sp-mg-col">{a}</div>
            ))}
            <div className="sp-mg-col sp-mg-final">Final %</div>
          </div>

          {/* Subject rows */}
          {subjects.map(subj => {
            const subjMarks = Object.values(grouped[subj]);
            // Final mark: percentage average across all assessments
            const finalPct = subjMarks.length
              ? Math.round(subjMarks.reduce((s, m) => s + parseFloat(m.score) / parseFloat(m.max_score) * 100, 0) / subjMarks.length)
              : null;
            const finalMeta = finalPct !== null ? getGradeMeta(finalPct) : null;

            return (
              <div key={subj} className="sp-marks-grid-row">
                <div className="sp-mg-subject">
                  <span className="sp-mg-subj-name">{subj}</span>
                </div>
                {allAssessments.map(a => {
                  const m = grouped[subj][a];
                  if (!m) return <div key={a} className="sp-mg-col sp-mg-empty">—</div>;
                  const pct  = Math.round(parseFloat(m.score) / parseFloat(m.max_score) * 100);
                  const meta = getGradeMeta(pct);
                  return (
                    <div key={a} className="sp-mg-col">
                      <div className="sp-mg-cell" style={{ background: meta.bg }}>
                        <span className="sp-mg-score" style={{ color: meta.color }}>
                          {m.score}<span className="sp-mg-max">/{m.max_score}</span>
                        </span>
                        <span className="sp-mg-grade" style={{ background: meta.color, color: '#fff' }}>
                          {meta.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="sp-mg-col sp-mg-final">
                  {finalMeta ? (
                    <div className="sp-mg-final-cell" style={{ background: finalMeta.bg, color: finalMeta.color }}>
                      <span className="sp-mg-final-pct">{finalPct}%</span>
                      <span className="sp-mg-final-grade">{finalMeta.grade}</span>
                    </div>
                  ) : <span className="sp-mg-empty">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteId && (
        <div className="sp-mark-delete-overlay" onClick={() => setDeleteId(null)}>
          <div className="sp-mark-delete-confirm" onClick={e => e.stopPropagation()}>
            <p>Delete this mark?</p>
            <div className="sp-mark-form-actions">
              <button className="sp-mark-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="sp-mark-delete-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main StudentProfile ── */
function StudentProfile({ student, onClose, onEdit, onDelete }) {
  const [tab, setTab]           = useState('overview');
  const [imgFailed, setImgFailed] = useState(false);
  const [attSummary, setAttSummary] = useState(null);
  const statusStyle = STATUS_COLORS[student.status] || STATUS_COLORS.active;

  // Fetch yearly attendance summary for the hero strip
  useEffect(() => {
    fetch(`${API_URL}/attendance/summary/?student_id=${student.id}&year=${CURRENT_YEAR}`, {
      headers: AuthService.getAuthHeaders(),
    })
      .then(r => r.json())
      .then(d => {
        const rows = Array.isArray(d) ? d.filter(r => r.student === student.id) : [];
        if (!rows.length) return;
        const agg = rows.reduce((acc, r) => ({
          total:   acc.total   + (r.total   || 0),
          present: acc.present + (r.present || 0),
          absent:  acc.absent  + (r.absent  || 0),
          late:    acc.late    + (r.late    || 0),
          excused: acc.excused + (r.excused || 0),
        }), { total: 0, present: 0, absent: 0, late: 0, excused: 0 });
        setAttSummary(agg);
      }).catch(() => {});
  }, [student.id]);

  const attPct = attSummary && attSummary.total > 0
    ? Math.round((attSummary.present + attSummary.late) / attSummary.total * 100)
    : null;

  const renderTab = () => {
    switch (tab) {
      case 'overview':   return <OverviewTab student={student} />;
      case 'marks':      return <MarksTab student={student} />;
      case 'attendance': return <AttendanceTab student={student} />;
      case 'fees':       return <ComingSoonTab label="Fees" />;
      case 'behaviour':  return <ComingSoonTab label="Behaviour" />;
      default:           return null;
    }
  };

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={e => e.stopPropagation()}>

        {/* Hero */}
        <div className="sp-hero">
          <button className="sp-close" onClick={onClose}><X size={18} /></button>

          <div className="sp-hero-avatar">
            {student.photo_url && !imgFailed
              ? <img src={student.photo_url} alt={student.full_name} className="sp-avatar-img" onError={() => setImgFailed(true)} />
              : (
                <div className="sp-avatar-initials">
                  {student.full_name ? student.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                </div>
              )
            }
          </div>

          <h2 className="sp-hero-name">{student.full_name || 'Student'}</h2>
          <div className="sp-hero-meta">
            <span className="sp-hero-class">{student.class_name}{student.section ? ` · ${student.section}` : ''}</span>
            <span className="sp-status-badge" style={statusStyle}>{student.status}</span>
          </div>

          <div className="sp-hero-actions">
            <button className="sp-action-btn edit" onClick={() => { onClose(); onEdit(student); }}>
              <Pencil size={13} /> Edit
            </button>
            <button className="sp-action-btn delete" onClick={() => { onClose(); onDelete(student.id); }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>

          {/* Attendance quick stats strip */}
          {attSummary && (
            <div className="sp-hero-att-strip">
              <div className="sp-hero-att-item present">
                <CheckCircle2 size={12} />
                <span>{attSummary.present} Present</span>
              </div>
              <div className="sp-hero-att-item absent">
                <XCircle size={12} />
                <span>{attSummary.absent} Absent</span>
              </div>
              <div className="sp-hero-att-item late">
                <Clock size={12} />
                <span>{attSummary.late} Late</span>
              </div>
              {attPct !== null && (
                <div className={`sp-hero-att-item pct ${attPct >= 75 ? 'good' : attPct >= 50 ? 'warn' : 'bad'}`}>
                  <BookOpen size={12} />
                  <span>{attPct}% this year</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="sp-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`sp-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="sp-body">
          {renderTab()}
        </div>

      </div>
    </div>
  );
}

export default StudentProfile;
