import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle, Pencil, Check, Loader } from 'lucide-react';
import AuthService from '../services/AuthService';
import './SchoolSettingsModule.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/* ── Remove background from a File, returns a new File ── */
async function removeBg(file) {
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(file, {
    publicPath: `${process.env.PUBLIC_URL || ''}/`,
    output: { format: 'image/png', quality: 1 },
  });
  return new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' });
}

/* ── Inline editable field ── */
function EditableField({ label, value, hint, placeholder, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [saving,  setSaving]  = useState(false);
  const [flash,   setFlash]   = useState(false);
  const inputRef = useRef();

  // keep draft in sync if parent value changes (e.g. initial load)
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const commit = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 1800);
  };

  const onKey = (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  return (
    <div className="ss-row">
      <div className="ss-row-meta">
        <span className="ss-row-label">{label}</span>
        {hint && <span className="ss-row-hint">{hint}</span>}
      </div>

      {editing ? (
        <div className="ss-row-edit">
          <input
            ref={inputRef}
            className="ss-inline-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            placeholder={placeholder}
          />
          <button className="ss-row-confirm" onMouseDown={commit} disabled={saving} type="button">
            <Check size={14} />
          </button>
        </div>
      ) : (
        <div className="ss-row-display">
          <span className={`ss-row-value ${!value ? 'empty' : ''} ${flash ? 'flash' : ''}`}>
            {value || placeholder || '—'}
          </span>
          <button className="ss-edit-btn" onClick={startEdit} type="button">
            <Pencil size={12} /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Image upload box ── */
function ImageUploadBox({ label, value, onChange }) {
  const ref = useRef();
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file) => {
    setProcessing(true);
    try {
      const cleaned = await removeBg(file);
      onChange(cleaned);
    } catch {
      // fallback: use original if bg removal fails
      onChange(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="ss-img-box">
      <span className="ss-img-label">{label}</span>

      {processing ? (
        <div className="ss-img-processing">
          <Loader size={22} className="ss-spin" />
          <span>Removing background…</span>
        </div>
      ) : value ? (
        <div className="ss-img-preview">
          <img src={value} alt={label} />
        </div>
      ) : (
        <button className="ss-img-upload" onClick={() => ref.current.click()} type="button">
          <Upload size={20} />
          <span>Upload</span>
        </button>
      )}

      {!processing && value && (
        <button className="ss-img-replace" onClick={() => ref.current.click()} type="button">
          <Upload size={13} /> Replace
        </button>
      )}

      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

/* ── Main component ── */
export default function SchoolSettingsModule({ business, onBack, onBusinessUpdate }) {
  const [schoolLevel, setSchoolLevel] = useState(business.school_level || '');
  const [settings, setSettings] = useState(null);
  const [logoFile,   setLogoFile]   = useState(null);
  const [stampFile,  setStampFile]  = useState(null);
  const [logoUrl,    setLogoUrl]    = useState('');
  const [stampUrl,   setStampUrl]   = useState('');
  const [imgSaving,  setImgSaving]  = useState(false);
  const [imgSaved,   setImgSaved]   = useState(false);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/school-settings/${business.id}/`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setSettings({
          school_name:           data.school_name || business.name || '',
          motto:                 data.motto || '',
          location:              data.location || '',
          po_box:                data.po_box || '',
          uneb_pri_no:           data.uneb_pri_no || '',
          uneb_olevel_center_no: data.uneb_olevel_center_no || '',
          uneb_alevel_center_no: data.uneb_alevel_center_no || '',
        });
        setLogoUrl(data.logo_url  || '');
        setStampUrl(data.stamp_url || '');
      })
      .finally(() => setLoading(false));
  }, [business.id, business.name]);

  /* Save a single SchoolSettings field immediately */
  const saveField = async (key, val) => {
    const fd = new FormData();
    fd.append(key, val);
    const res = await fetch(`${API_URL}/school-settings/${business.id}/`, {
      method: 'PATCH',
      headers: AuthService.getAuthHeadersNoContent(),
      body: fd,
    });
    await res.json();
    setSettings(s => ({ ...s, [key]: val }));

    /* Propagate school_name → business.name across the whole app */
    if (key === 'school_name' && val !== business.name) {
      await fetch(`${API_URL}/businesses/${business.id}/`, {
        method: 'PATCH',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({ name: val }),
      });
      business.name = val;
      onBusinessUpdate?.({ ...business, name: val });
    }
  };

  /* Toggle school level — immediate PATCH + propagate */
  const handleLevelToggle = async (val) => {
    if (val === schoolLevel) return;
    setSchoolLevel(val);
    await fetch(`${API_URL}/businesses/${business.id}/`, {
      method: 'PATCH',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify({ school_level: val }),
    });
    business.school_level = val;
    onBusinessUpdate?.({ ...business, school_level: val });
  };

  /* Save images */
  const saveImages = async () => {
    if (!logoFile && !stampFile) return;
    setImgSaving(true);
    const fd = new FormData();
    if (logoFile)  fd.append('logo',  logoFile);
    if (stampFile) fd.append('stamp', stampFile);

    const res  = await fetch(`${API_URL}/school-settings/${business.id}/`, {
      method: 'PATCH',
      headers: AuthService.getAuthHeadersNoContent(),
      body: fd,
    });
    const data = await res.json();
    setLogoUrl(data.logo_url   || '');
    setStampUrl(data.stamp_url || '');
    setLogoFile(null); setStampFile(null);
    setImgSaving(false);
    setImgSaved(true);
    setTimeout(() => setImgSaved(false), 2000);
  };

  if (loading) return <div className="ss-loading">Loading…</div>;

  const isSecondary  = schoolLevel === 'secondary';
  const isPrimary    = schoolLevel === 'primary';
  const logoDisplay  = logoFile  ? URL.createObjectURL(logoFile)  : logoUrl;
  const stampDisplay = stampFile ? URL.createObjectURL(stampFile) : stampUrl;
  const imagesDirty  = !!(logoFile || stampFile);

  return (
    <div className="ss-page">
      <div className="ss-header">
        <button className="ss-back" onClick={onBack} type="button">← Back</button>
        <h2>School Settings</h2>
      </div>

      <div className="ss-body">

        {/* Branding */}
        <section className="ss-section">
          <div className="ss-section-title">Branding</div>
          <div className="ss-images-row">
            <ImageUploadBox
              label="School Logo / Badge"
              value={logoDisplay}
              onChange={f => setLogoFile(f)}
            />
            <ImageUploadBox
              label="School Stamp"
              value={stampDisplay}
              onChange={f => setStampFile(f)}
            />
          </div>
          {imagesDirty && (
            <div className="ss-img-actions">
              <button className="ss-save-img-btn" onClick={saveImages} disabled={imgSaving} type="button">
                {imgSaved ? <><CheckCircle size={14} /> Saved</> : imgSaving ? 'Saving…' : 'Save Images'}
              </button>
            </div>
          )}
        </section>

        {/* School Information */}
        <section className="ss-section">
          <div className="ss-section-title">School Information</div>
          <EditableField label="School Name"       value={settings.school_name} placeholder="e.g. St. Mary's College"     onSave={v => saveField('school_name', v)} />
          <EditableField label="School Motto"      value={settings.motto}       placeholder="e.g. Excellence & Integrity"  onSave={v => saveField('motto', v)} />
          <EditableField label="Location / Address" value={settings.location}   placeholder="e.g. Kampala, Uganda"         onSave={v => saveField('location', v)} />
          <EditableField label="P.O. Box"          value={settings.po_box}      placeholder="e.g. P.O. Box 1234, Kampala"  onSave={v => saveField('po_box', v)} />
        </section>

        {/* School Type */}
        <section className="ss-section">
          <div className="ss-section-title">School Type</div>
          <div className="ss-type-row">
            <span className="ss-type-label">This school is a</span>
            <div className="ss-level-picker">
              {['primary', 'secondary'].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`ss-level-btn ${schoolLevel === lvl ? 'active' : ''}`}
                  onClick={() => handleLevelToggle(lvl)}
                >
                  {lvl === 'primary' ? '🏫 Primary' : '🎓 Secondary'}
                </button>
              ))}
            </div>
            {schoolLevel && (
              <span className="ss-type-badge">
                {schoolLevel === 'primary' ? 'Primary School' : 'Secondary School'}
              </span>
            )}
          </div>
        </section>

        {/* UNEB — reacts to level toggle */}
        {isPrimary && (
          <section className="ss-section">
            <div className="ss-section-title">UNEB Details</div>
            <EditableField label="UNEB Primary Number" value={settings.uneb_pri_no} placeholder="e.g. PLE/001/2024" hint="Primary Leaving Examinations" onSave={v => saveField('uneb_pri_no', v)} />
          </section>
        )}

        {isSecondary && (
          <section className="ss-section">
            <div className="ss-section-title">UNEB Details</div>
            <EditableField label="O'Level UNEB Center No." value={settings.uneb_olevel_center_no} placeholder="e.g. U0001" hint="Uganda Certificate of Education"          onSave={v => saveField('uneb_olevel_center_no', v)} />
            <EditableField label="A'Level UNEB Center No." value={settings.uneb_alevel_center_no} placeholder="e.g. A0001" hint="Uganda Advanced Certificate of Education" onSave={v => saveField('uneb_alevel_center_no', v)} />
          </section>
        )}

        {!isPrimary && !isSecondary && (
          <section className="ss-section">
            <div className="ss-section-title">UNEB Details</div>
            <EditableField label="UNEB Primary Number"     value={settings.uneb_pri_no}           placeholder="e.g. PLE/001/2024" onSave={v => saveField('uneb_pri_no', v)} />
            <EditableField label="O'Level UNEB Center No." value={settings.uneb_olevel_center_no} placeholder="e.g. U0001"        onSave={v => saveField('uneb_olevel_center_no', v)} />
            <EditableField label="A'Level UNEB Center No." value={settings.uneb_alevel_center_no} placeholder="e.g. A0001"        onSave={v => saveField('uneb_alevel_center_no', v)} />
          </section>
        )}

      </div>
    </div>
  );
}
