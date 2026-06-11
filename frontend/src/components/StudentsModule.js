import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronDown, Camera, User } from 'lucide-react';
import AuthService from '../services/AuthService';
import StudentProfile from './StudentProfile';
import './StudentsModule.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const EMPTY_FORM = {
  first_name: '', last_name: '', student_id: '',
  date_of_birth: '', gender: '', class_name: '', section: '',
  admission_date: '', status: 'active',
  parent_name: '', parent_phone: '', parent_email: '',
  address: '', notes: '',
};

const STATUS_COLORS = {
  active:      { bg: '#dcfce7', color: '#15803d' },
  inactive:    { bg: '#f1f5f9', color: '#64748b' },
  graduated:   { bg: '#dbeafe', color: '#1d4ed8' },
  transferred: { bg: '#fef9c3', color: '#a16207' },
};

/* ── Standalone Field — defined OUTSIDE to keep stable identity ── */
function Field({ label, name, required, type = 'text', options, value, onChange, error }) {
  return (
    <div className="sf-group">
      <label>{label}{required && <span className="sf-req"> *</span>}</label>
      {options ? (
        <select value={value} onChange={e => onChange(name, e.target.value)} className={error ? 'err' : ''}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          placeholder={label}
          onChange={e => onChange(name, e.target.value)}
          className={error ? 'err' : ''}
        />
      )}
      {error && <span className="sf-error">{error}</span>}
    </div>
  );
}

/* ── Avatar ── */
export function Avatar({ url, name, size = 36, pending = false }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
  const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#FF6B00'];
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length];
  const showImg = url && !imgFailed;
  return (
    <div className="sm-avatar-wrap-outer" style={{ width: size, height: size }}>
      {showImg
        ? <img src={url} alt={name} className="sm-avatar" style={{ width: size, height: size }} onError={() => setImgFailed(true)} />
        : <div className="sm-avatar sm-avatar-initials" style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}>{initials}</div>
      }
      {pending && <div className="sm-avatar-pending"><span className="sm-avatar-spinner" /></div>}
    </div>
  );
}

/* ── Main component ── */
function StudentsModule({ business, staffProfile }) {
  // Roles that see all classes
  const role = staffProfile?.additional_role || '';
  const seeAllClasses = !staffProfile || ['head_teacher', 'deputy_head', 'dos'].includes(role);
  const allowedClasses = seeAllClasses ? null : (staffProfile?.assigned_classes || []);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const fileRef = useRef();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ business_id: business.id });
      if (search)       params.append('search', search);
      if (filterClass)  params.append('class_name', filterClass);
      else if (allowedClasses?.length === 1) params.append('class_name', allowedClasses[0]);
      if (filterStatus) params.append('status', filterStatus);
      const res = await fetch(`${API_URL}/students/?${params}`, { headers: AuthService.getAuthHeaders() });
      const data = await res.json();
      let list = data.results ?? data;
      if (allowedClasses) list = list.filter(s => allowedClasses.includes(s.class_name));
      setStudents(list);
      if (viewStudent) {
        const updated = list.find(s => s.id === viewStudent.id);
        if (updated) setViewStudent(updated);
      }
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }, [business.id, search, filterClass, filterStatus, allowedClasses]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Poll every 4s while any student has a pending photo upload
  useEffect(() => {
    const hasPending = students.some(s => s.photo_upload_status === 'pending');
    if (!hasPending) return;
    const timer = setInterval(() => fetchStudents(), 4000);
    return () => clearInterval(timer);
  }, [students, fetchStudents]);

  const classes = [...new Set(students.map(s => s.class_name).filter(Boolean))]
    .filter(c => !allowedClasses || allowedClasses.includes(c))
    .sort();

  /* field change handler — stable, passed down as prop */
  const handleFieldChange = useCallback((name, value) => {
    setForm(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      first_name: student.first_name,      last_name: student.last_name,
      student_id: student.student_id || '', date_of_birth: student.date_of_birth || '',
      gender: student.gender || '',         class_name: student.class_name,
      section: student.section || '',       admission_date: student.admission_date || '',
      status: student.status,               parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '', parent_email: student.parent_email || '',
      address: student.address || '',       notes: student.notes || '',
    });
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || null);
    setErrors({});
    setShowForm(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim())  errs.last_name  = 'Required';
    if (!form.class_name.trim()) errs.class_name = 'Required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries({ ...form, business: business.id }).forEach(([k, v]) => {
        if (v !== '') fd.append(k, v);
      });
      if (photoFile) fd.append('photo', photoFile);
      if (editing && !photoFile && !photoPreview) fd.append('photo', '');

      const url    = editing ? `${API_URL}/students/${editing.id}/` : `${API_URL}/students/`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Token ${AuthService.getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowForm(false);
      fetchStudents();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`${API_URL}/students/${deleteId}/`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
    setDeleteId(null);
    fetchStudents();
  };

  return (
    <div className="sm-page">

      {/* Toolbar */}
      <div className="sm-toolbar">
        <div className="sm-toolbar-left">
          <div className="sm-search">
            <Search size={15} />
            <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="sm-select-wrap">
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} />
          </div>
          <div className="sm-select-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
            </select>
            <ChevronDown size={13} />
          </div>
        </div>
        <button className="sm-add-btn" onClick={openAdd}><Plus size={15} /> Add Student</button>
      </div>

      <p className="sm-count">{students.length} student{students.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      {loading ? (
        <div className="sm-loading">Loading...</div>
      ) : students.length === 0 ? (
        <div className="sm-empty">
          <User size={40} strokeWidth={1.2} />
          <p>No students found.{!search && !filterClass && !filterStatus && ' Add your first student.'}</p>
        </div>
      ) : (
        <div className="sm-table-wrap">
          <table className="sm-table">
            <thead>
              <tr>
                <th>Student</th><th>ID</th><th>Class</th><th>Section</th>
                <th>Gender</th><th>Parent</th><th>Phone</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="sm-row-clickable" onClick={() => setViewStudent(s)}>
                  <td>
                    <div className="sm-student-cell">
                      <Avatar url={s.photo_url} name={s.full_name} size={34} pending={s.photo_upload_status === 'pending'} />
                      <span className="sm-name">{s.full_name}</span>
                    </div>
                  </td>
                  <td>{s.student_id || '—'}</td>
                  <td>{s.class_name}</td>
                  <td>{s.section || '—'}</td>
                  <td className="sm-cap">{s.gender || '—'}</td>
                  <td>{s.parent_name || '—'}</td>
                  <td>{s.parent_phone || '—'}</td>
                  <td><span className="sm-badge" style={STATUS_COLORS[s.status]}>{s.status}</span></td>
                  <td className="sm-actions" onClick={e => e.stopPropagation()}>
                    <button className="sm-icon-btn" onClick={() => openEdit(s)} title="Edit"><Pencil size={14} /></button>
                    <button className="sm-icon-btn danger" onClick={() => setDeleteId(s.id)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="sf-overlay" onClick={() => setShowForm(false)}>
          <div className="sf-modal" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2>{editing ? 'Edit Student' : 'Add New Student'}</h2>
              <button className="sf-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* Photo */}
              <div className="sf-photo-section">
                <div className="sf-avatar-wrap">
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="sf-avatar-preview" />
                    : <div className="sf-avatar-placeholder"><User size={32} strokeWidth={1.5} /></div>
                  }
                  <button type="button" className="sf-camera-btn" onClick={() => fileRef.current.click()}>
                    <Camera size={13} />
                  </button>
                </div>
                <div className="sf-photo-actions">
                  <span className="sf-photo-label">Profile Photo</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="sf-upload-btn" onClick={() => fileRef.current.click()}>Upload Photo</button>
                    {photoPreview && <button type="button" className="sf-remove-btn" onClick={removePhoto}>Remove</button>}
                  </div>
                  <span className="sf-photo-hint">JPG, PNG or GIF · Max 5MB</span>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </div>

              <div className="sf-section">Student Information</div>
              <div className="sf-row">
                <Field label="First Name" name="first_name" required value={form.first_name} onChange={handleFieldChange} error={errors.first_name} />
                <Field label="Last Name"  name="last_name"  required value={form.last_name}  onChange={handleFieldChange} error={errors.last_name} />
              </div>
              <div className="sf-row">
                <Field label="Student ID"    name="student_id"    value={form.student_id}    onChange={handleFieldChange} error={errors.student_id} />
                <Field label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleFieldChange} error={errors.date_of_birth} />
              </div>
              <div className="sf-row">
                <Field label="Gender" name="gender" value={form.gender} onChange={handleFieldChange} error={errors.gender} options={[
                  { value: '', label: '— Select —' },
                  { value: 'male',   label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other',  label: 'Other' },
                ]} />
                <Field label="Status" name="status" value={form.status} onChange={handleFieldChange} error={errors.status} options={[
                  { value: 'active',      label: 'Active' },
                  { value: 'inactive',    label: 'Inactive' },
                  { value: 'graduated',   label: 'Graduated' },
                  { value: 'transferred', label: 'Transferred' },
                ]} />
              </div>

              <div className="sf-section">Academic</div>
              <div className="sf-row">
                <Field label="Class"   name="class_name" required value={form.class_name} onChange={handleFieldChange} error={errors.class_name} />
                <Field label="Section" name="section"             value={form.section}    onChange={handleFieldChange} error={errors.section} />
              </div>
              <Field label="Admission Date" name="admission_date" type="date" value={form.admission_date} onChange={handleFieldChange} error={errors.admission_date} />

              <div className="sf-section">Parent / Guardian</div>
              <Field label="Parent / Guardian Name" name="parent_name" value={form.parent_name} onChange={handleFieldChange} error={errors.parent_name} />
              <div className="sf-row">
                <Field label="Phone" name="parent_phone" type="tel"   value={form.parent_phone} onChange={handleFieldChange} error={errors.parent_phone} />
                <Field label="Email" name="parent_email" type="email" value={form.parent_email} onChange={handleFieldChange} error={errors.parent_email} />
              </div>

              <div className="sf-section">Other</div>
              <Field label="Address" name="address" value={form.address} onChange={handleFieldChange} error={errors.address} />
              <div className="sf-group">
                <label>Notes</label>
                <textarea value={form.notes} rows={3} placeholder="Any additional notes..." onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {errors.submit && <div className="sf-submit-error">{errors.submit}</div>}

              <div className="sf-modal-footer">
                <button type="button" className="sf-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="sf-submit-btn" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : editing ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {viewStudent && (
        <StudentProfile
          student={viewStudent}
          onClose={() => setViewStudent(null)}
          onEdit={(s) => { setViewStudent(null); openEdit(s); }}
          onDelete={(id) => { setViewStudent(null); setDeleteId(id); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="sf-overlay" onClick={() => setDeleteId(null)}>
          <div className="sf-confirm" onClick={e => e.stopPropagation()}>
            <h3>Delete Student?</h3>
            <p>This action cannot be undone.</p>
            <div className="sf-confirm-actions">
              <button className="sf-cancel-btn" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="sf-delete-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentsModule;
