import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus, Pencil, Trash2, KeyRound, Copy, Check,
  ChevronDown, X, Upload, Loader, ShieldCheck,
} from 'lucide-react';
import AuthService from '../services/AuthService';
import './StaffSettingsModule.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const ALL_PAGES = [
  { key: 'overview',    label: 'Dashboard' },
  { key: 'students',    label: 'Students' },
  { key: 'marks',       label: 'Marks Entry' },
  { key: 'attendance',  label: 'Attendance' },
  { key: 'reportcards', label: 'Report Cards' },
  { key: 'fees',        label: 'Fees' },
  { key: 'payments',    label: 'Payments' },
  { key: 'accounting',  label: 'Accounting' },
  { key: 'settings',    label: 'Settings' },
];

const ALL_PAGE_KEYS = ALL_PAGES.map(p => p.key);

// Default pages per role — applied automatically when role is changed
const ROLE_DEFAULT_PAGES = {
  head_teacher:  ALL_PAGE_KEYS,
  deputy_head:   ALL_PAGE_KEYS.filter(k => k !== 'accounting' && k !== 'payments'),
  dos:           ['overview', 'students', 'marks', 'attendance', 'reportcards', 'settings'],
  class_teacher: ['overview', 'students', 'marks', 'attendance', 'reportcards'],
  bursar:        ['overview', 'fees', 'payments'],
  librarian:     ['overview', 'students'],
  sports:        ['overview', 'students', 'attendance'],
  none:          ['overview', 'marks', 'attendance'],
};

const ROLES = [
  { value: 'none',           label: 'None' },
  { value: 'class_teacher',  label: 'Class Teacher' },
  { value: 'deputy_head',    label: 'Deputy Head Teacher' },
  { value: 'head_teacher',   label: 'Head Teacher' },
  { value: 'dos',            label: 'Director of Studies' },
  { value: 'bursar',         label: 'Bursar' },
  { value: 'librarian',      label: 'Librarian' },
  { value: 'sports',         label: 'Sports Master/Mistress' },
];

function Tag({ label, onRemove }) {
  return (
    <span className="sf-tag">
      {label}
      {onRemove && <button type="button" onClick={onRemove}><X size={10} /></button>}
    </span>
  );
}

function MultiInput({ placeholder, values, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="sf-multi">
      <div className="sf-tags-wrap">
        {values.map(v => <Tag key={v} label={v} onRemove={() => onChange(values.filter(x => x !== v))} />)}
      </div>
      <div className="sf-multi-row">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} className="sf-input" />
        <button type="button" className="sf-add-tag" onClick={add}>Add</button>
      </div>
    </div>
  );
}

function PagePicker({ values, onChange }) {
  return (
    <div className="sf-page-picker">
      {ALL_PAGES.map(p => (
        <label key={p.key} className={`sf-page-chip ${values.includes(p.key) ? 'on' : ''}`}>
          <input type="checkbox" checked={values.includes(p.key)}
            onChange={e => onChange(e.target.checked
              ? [...values, p.key]
              : values.filter(k => k !== p.key))} />
          {p.label}
        </label>
      ))}
    </div>
  );
}

// ── Sign upload with bg removal ───────────────────────────────────────────────
function SignBox({ value, onChange }) {
  const ref = useRef();
  const [processing, setProcessing] = useState(false);

  const handle = async (file) => {
    setProcessing(true);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(file, {
        publicPath: `${process.env.PUBLIC_URL || ''}/`,
        output: { format: 'image/png', quality: 1 },
      });
      onChange(new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' }));
    } catch {
      onChange(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="sf-sign-box">
      {processing ? (
        <div className="sf-sign-processing"><Loader size={18} className="sf-spin" /><span>Removing bg…</span></div>
      ) : value ? (
        <div className="sf-sign-preview">
          <img src={typeof value === 'string' ? value : URL.createObjectURL(value)} alt="sign" />
          <button type="button" className="sf-sign-replace" onClick={() => ref.current.click()}>
            <Upload size={11} /> Replace
          </button>
        </div>
      ) : (
        <button type="button" className="sf-sign-upload" onClick={() => ref.current.click()}>
          <Upload size={16} /> Upload Signature
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handle(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

// ── Give Access modal ─────────────────────────────────────────────────────────
function AccessModal({ staff, domain, onClose, onDone }) {
  const [prefix, setPrefix]   = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  const submit = async () => {
    if (!prefix.trim()) { setError('Enter a username prefix.'); return; }
    if (prefix.includes('@')) { setError('Do not include @ — just the name part.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/staff/${staff.id}/give-access/`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({ email_prefix: prefix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.email_prefix?.[0] || data.error || 'Failed');
      setResult(data);
      onDone(staff.id, data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="sf-modal-backdrop" onClick={onClose}>
      <div className="sf-modal" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <ShieldCheck size={20} /> Give Access — {staff.full_name}
          <button type="button" className="sf-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {!result ? (
          <div className="sf-modal-body">
            <p className="sf-modal-hint">
              Enter the username part only (no @). The system will generate:<br />
              <strong>username@{domain}</strong>
            </p>
            <div className="sf-access-row">
              <input className={`sf-input ${error ? 'err' : ''}`} value={prefix}
                onChange={e => { setPrefix(e.target.value.replace(/\s/g, '').toLowerCase()); setError(''); }}
                placeholder="e.g. john.doe" onKeyDown={e => e.key === 'Enter' && submit()} />
              <span className="sf-domain-suffix">@{domain}</span>
            </div>
            {error && <p className="sf-modal-error">{error}</p>}
            <button className="sf-btn-primary" onClick={submit} disabled={loading}>
              {loading ? <Loader size={14} className="sf-spin" /> : <><ShieldCheck size={14} /> Generate OTP</>}
            </button>
          </div>
        ) : (
          <div className="sf-modal-body">
            <p className="sf-modal-success">✅ Access granted! Share these credentials with the teacher:</p>
            <div className="sf-cred-box">
              <div className="sf-cred-row">
                <span className="sf-cred-label">Email</span>
                <span className="sf-cred-val">{result.email}</span>
                <button type="button" className="sf-copy-btn" onClick={() => copy(result.email)}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <div className="sf-cred-row">
                <span className="sf-cred-label">OTP</span>
                <span className="sf-cred-val otp">{result.otp}</span>
                <button type="button" className="sf-copy-btn" onClick={() => copy(result.otp)}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
            <p className="sf-modal-hint">The teacher enters this email + OTP on the login page to set their password.</p>
            <button className="sf-btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Staff form (add / edit) ───────────────────────────────────────────────────
function StaffForm({ initial, business, onSave, onCancel }) {
  const [form, setForm] = useState({
    full_name:       initial?.full_name       || '',
    location:        initial?.location        || '',
    additional_role: initial?.additional_role || 'none',
    subjects:        initial?.subjects        || [],
    assigned_classes: initial?.assigned_classes || [],
    assigned_pages:  initial?.assigned_pages  || [],
  });
  const [signFile, setSignFile]   = useState(null);
  const [signUrl,  setSignUrl]    = useState(initial?.sign_url || '');
  const [saving,   setSaving]     = useState(false);
  const [errors,   setErrors]     = useState({});
  const [allClasses, setAllClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  // Auto-set pages when role changes (skip on first render to preserve existing pages)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const defaults = ROLE_DEFAULT_PAGES[form.additional_role] || ROLE_DEFAULT_PAGES.none;
    set('assigned_pages')(defaults);
  }, [form.additional_role]); // eslint-disable-line

  // Load available classes from students
  useEffect(() => {
    fetch(`${API}/students/?business_id=${business.id}`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        const cls = [...new Set((d.results || d).map(s => s.class_name).filter(Boolean))].sort();
        setAllClasses(cls);
      })
      .catch(() => {});
  }, [business.id]);

  // Load available subjects for selected classes (from marks)
  useEffect(() => {
    const cls = form.assigned_classes;
    if (!cls.length) { setAllSubjects([]); return; }
    Promise.all(
      cls.map(c =>
        fetch(`${API}/marks/subjects/?class_name=${encodeURIComponent(c)}`, { headers: AuthService.getAuthHeaders() })
          .then(r => r.json()).then(d => d.subjects || []).catch(() => [])
      )
    ).then(results => {
      const merged = [...new Set(results.flat())].sort();
      setAllSubjects(merged);
      // Drop any subjects no longer available
      set('subjects')(form.subjects.filter(s => merged.includes(s)));
    });
  }, [form.assigned_classes]); // eslint-disable-line

  const toggleClass = (cls) => {
    const next = form.assigned_classes.includes(cls)
      ? form.assigned_classes.filter(c => c !== cls)
      : [...form.assigned_classes, cls];
    set('assigned_classes')(next);
  };

  const toggleSubject = (subj) => {
    const next = form.subjects.includes(subj)
      ? form.subjects.filter(s => s !== subj)
      : [...form.subjects, subj];
    set('subjects')(next);
  };

  // Roles that see all classes/subjects — no restriction needed
  const broadRole = ['head_teacher', 'deputy_head', 'dos'].includes(form.additional_role);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required.';
    if (form.assigned_pages.length === 0) e.assigned_pages = 'Assign at least one page.';
    return e;
  };

  const submit = async () => {
    const e = validate(); if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try { await onSave(form, signFile, initial?.id); }
    finally { setSaving(false); }
  };

  return (
    <div className="sf-form-wrap">
      <div className="sf-form-grid">
        <div className="sf-field">
          <label>Full Name *</label>
          <input className={`sf-input ${errors.full_name ? 'err' : ''}`} value={form.full_name}
            onChange={e => set('full_name')(e.target.value)} placeholder="e.g. Sarah Namutebi" />
          {errors.full_name && <span className="sf-err">{errors.full_name}</span>}
        </div>

        <div className="sf-field">
          <label>Location / Residence</label>
          <input className="sf-input" value={form.location}
            onChange={e => set('location')(e.target.value)} placeholder="e.g. Kampala" />
        </div>

        <div className="sf-field">
          <label>Additional Role</label>
          <div className="sf-select-wrap">
            <select className="sf-select" value={form.additional_role}
              onChange={e => set('additional_role')(e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown size={14} className="sf-select-icon" />
          </div>
        </div>

        <div className="sf-field">
          <label>Signature / Sign</label>
          <SignBox value={signFile || signUrl} onChange={f => { setSignFile(f); setSignUrl(''); }} />
        </div>
      </div>

      {/* Assigned Classes */}
      {!broadRole && (
        <div className="sf-field full">
          <label>Assigned Classes {allClasses.length === 0 && <span className="sf-hint">(add students first)</span>}</label>
          <div className="sf-page-picker">
            {allClasses.map(c => (
              <label key={c} className={`sf-page-chip ${form.assigned_classes.includes(c) ? 'on' : ''}`}>
                <input type="checkbox" checked={form.assigned_classes.includes(c)} onChange={() => toggleClass(c)} />
                {c}
              </label>
            ))}
            {allClasses.length === 0 && <span className="sf-hint">No classes found</span>}
          </div>
        </div>
      )}
      {broadRole && (
        <div className="sf-field full">
          <p className="sf-hint">As <strong>{form.additional_role.replace(/_/g, ' ')}</strong>, this staff member sees all classes automatically.</p>
        </div>
      )}

      {/* Subjects */}
      {!broadRole && form.additional_role !== 'class_teacher' && (
        <div className="sf-field full">
          <label>
            Subjects Taught
            {form.assigned_classes.length === 0 && <span className="sf-hint"> — select classes first</span>}
          </label>
          {allSubjects.length > 0 ? (
            <div className="sf-page-picker">
              {allSubjects.map(s => (
                <label key={s} className={`sf-page-chip ${form.subjects.includes(s) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.subjects.includes(s)} onChange={() => toggleSubject(s)} />
                  {s}
                </label>
              ))}
            </div>
          ) : (
            <MultiInput placeholder="Or type subject manually…" values={form.subjects} onChange={set('subjects')} />
          )}
        </div>
      )}
      {(broadRole || form.additional_role === 'class_teacher') && (
        <div className="sf-field full">
          <p className="sf-hint">This role sees all subjects for their assigned classes.</p>
        </div>
      )}

      {/* Pages */}
      <div className="sf-field full">
        <label>Assigned Pages *</label>
        <PagePicker values={form.assigned_pages} onChange={set('assigned_pages')} />
        {errors.assigned_pages && <span className="sf-err">{errors.assigned_pages}</span>}
      </div>

      <div className="sf-form-actions">
        <button type="button" className="sf-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="sf-btn-primary" onClick={submit} disabled={saving}>
          {saving ? <Loader size={14} className="sf-spin" /> : initial ? 'Save Changes' : 'Add Staff'}
        </button>
      </div>
    </div>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────────
function StaffCard({ staff, domain, onEdit, onDelete, onGiveAccess }) {
  return (
    <div className="sf-card">
      <div className="sf-card-head">
        <div className="sf-card-avatar">{staff.full_name.charAt(0).toUpperCase()}</div>
        <div className="sf-card-info">
          <span className="sf-card-name">{staff.full_name}</span>
          <span className="sf-card-role">{ROLES.find(r => r.value === staff.additional_role)?.label || 'Teacher'}</span>
          {staff.location && <span className="sf-card-loc">📍 {staff.location}</span>}
        </div>
        <div className="sf-card-actions">
          <button type="button" title="Edit" onClick={() => onEdit(staff)}><Pencil size={14} /></button>
          <button type="button" title="Delete" className="danger" onClick={() => onDelete(staff.id)}><Trash2 size={14} /></button>
        </div>
      </div>

      {staff.subjects?.length > 0 && (
        <div className="sf-card-row">
          <span className="sf-card-section-lbl">Subjects</span>
          <div className="sf-tags-wrap">
            {staff.subjects.map(s => <Tag key={s} label={s} />)}
          </div>
        </div>
      )}

      {staff.assigned_classes?.length > 0 && (
        <div className="sf-card-row">
          <span className="sf-card-section-lbl">Classes</span>
          <div className="sf-tags-wrap">
            {staff.assigned_classes.map(c => <Tag key={c} label={c} />)}
          </div>
        </div>
      )}

      <div className="sf-card-row">
        <span className="sf-card-section-lbl">Pages</span>
        <div className="sf-tags-wrap">
          {(staff.assigned_pages || []).map(k => (
            <Tag key={k} label={ALL_PAGES.find(p => p.key === k)?.label || k} />
          ))}
        </div>
      </div>

      <div className="sf-card-footer">
        {staff.email_prefix ? (
          <div className="sf-access-granted">
            <ShieldCheck size={13} /> {staff.email_prefix}@{domain}
            {!staff.otp_used && <span className="sf-otp-badge">OTP Pending</span>}
          </div>
        ) : (
          <span className="sf-no-access">No access yet</span>
        )}
        <button type="button" className="sf-btn-access" onClick={() => onGiveAccess(staff)}>
          <KeyRound size={13} /> {staff.email_prefix ? 'Re-send OTP' : 'Give Access'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StaffSettingsModule({ business, onBack }) {
  const [staffList, setStaffList] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [mode,      setMode]      = useState('list'); // 'list' | 'add' | 'edit'
  const [editing,   setEditing]   = useState(null);
  const [accessFor, setAccessFor] = useState(null);
  const [domain,    setDomain]    = useState('school.com');

  useEffect(() => {
    if (business.uid) {
      setDomain(`${String(business.uid).replace(/-/g, '').slice(0, 10).toLowerCase()}.biq`);
    }

    fetch(`${API}/staff/?business_id=${business.id}`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(data => setStaffList(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoading(false));
  }, [business]);

  const handleSave = async (form, signFile, id) => {
    const url    = id ? `${API}/staff/${id}/` : `${API}/staff/`;
    const method = id ? 'PATCH' : 'POST';

    const body = {
      full_name:        form.full_name,
      location:         form.location,
      additional_role:  form.additional_role,
      subjects:         form.subjects,
      assigned_classes: form.assigned_classes,
      assigned_pages:   form.assigned_pages,
    };
    if (!id) body.business_id = business.id;

    const res  = await fetch(url, {
      method,
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    // Step 2 — upload sign separately via PATCH with FormData if a new file chosen
    let final = data;
    if (signFile) {
      const fd = new FormData();
      fd.append('sign', signFile);
      const r2 = await fetch(`${API}/staff/${data.id}/`, {
        method: 'PATCH',
        headers: AuthService.getAuthHeadersNoContent(),
        body: fd,
      });
      final = await r2.json();
    }

    setStaffList(prev => id
      ? prev.map(s => s.id === id ? final : s)
      : [final, ...prev]
    );
    setMode('list');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    await fetch(`${API}/staff/${id}/`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
    setStaffList(prev => prev.filter(s => s.id !== id));
  };

  const handleAccessDone = (staffId, result) => {
    setStaffList(prev => prev.map(s =>
      s.id === staffId ? { ...s, email_prefix: result.email.split('@')[0], otp_used: false } : s
    ));
  };

  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="sf-page">
        <div className="sf-header">
          <button className="sf-back" onClick={() => setMode('list')}>← Back</button>
          <h2>{mode === 'edit' ? 'Edit Staff' : 'Add Staff Member'}</h2>
        </div>
        <StaffForm
          initial={editing}
          business={business}
          onSave={handleSave}
          onCancel={() => setMode('list')}
        />
      </div>
    );
  }

  return (
    <div className="sf-page">
      <div className="sf-header">
        <button className="sf-back" onClick={onBack}>← Back</button>
        <h2>Staff Settings</h2>
        <button className="sf-btn-primary" onClick={() => { setEditing(null); setMode('add'); }}>
          <UserPlus size={15} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="sf-loading"><Loader size={22} className="sf-spin" /> Loading…</div>
      ) : staffList.length === 0 ? (
        <div className="sf-empty">
          <UserPlus size={40} strokeWidth={1.2} />
          <p>No staff added yet. Click <strong>Add Staff</strong> to get started.</p>
        </div>
      ) : (
        <div className="sf-grid">
          {staffList.map(s => (
            <StaffCard
              key={s.id}
              staff={s}
              domain={domain}
              onEdit={s => { setEditing(s); setMode('edit'); }}
              onDelete={handleDelete}
              onGiveAccess={s => setAccessFor(s)}
            />
          ))}
        </div>
      )}

      {accessFor && (
        <AccessModal
          staff={accessFor}
          domain={domain}
          onClose={() => setAccessFor(null)}
          onDone={handleAccessDone}
        />
      )}
    </div>
  );
}
