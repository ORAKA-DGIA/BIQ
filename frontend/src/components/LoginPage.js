import React, { useState } from 'react';
import { Briefcase, KeyRound, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';
import AuthService from '../services/AuthService';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ── Normal admin login ────────────────────────────────────────────────────────
function NormalLogin({ onLogin, onSwitchOTP }) {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const change = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(err => ({ ...err, [name]: undefined, submit: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim())  errs.email    = 'Email is required.';
    if (!form.password)      errs.password = 'Password is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await AuthService.login(form.email, form.password);
      onLogin();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" name="email" value={form.email} onChange={change}
          placeholder="jane@example.com" className={errors.email ? 'error' : ''} />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label>Password</label>
        <div className="input-pw-wrap">
          <input type={showPwd ? 'text' : 'password'} name="password" value={form.password}
            onChange={change} placeholder="Your password"
            className={errors.password ? 'error' : ''} />
          <button type="button" className="pw-toggle" onClick={() => setShowPwd(v => !v)}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="form-error">{errors.password}</span>}
      </div>

      {errors.submit && <div className="submit-error">{errors.submit}</div>}

      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Sign In'}
      </button>

      <button type="button" className="otp-switch-btn" onClick={onSwitchOTP}>
        <KeyRound size={14} /> Sign in with OTP (Staff)
      </button>
    </form>
  );
}

// ── Staff OTP login — step 1: verify email + OTP ──────────────────────────────
function OTPVerify({ onVerified, onSwitchNormal }) {
  const [form,    setForm]    = useState({ email: '', otp: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const change = e => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'otp') v = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setForm(f => ({ ...f, [name]: v }));
    setErrors(err => ({ ...err, [name]: undefined, submit: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim())      errs.email = 'Enter your staff email.';
    if (form.otp.length !== 8)   errs.otp   = 'OTP must be exactly 8 characters.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/staff/auth/otp-verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or OTP.');
      onVerified({ ...data, email: form.email, otp: form.otp });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <p className="otp-sub">Enter your staff email and the 8-character OTP given by your administrator.</p>

      <div className="form-group">
        <label>Staff Email</label>
        <input type="email" name="email" value={form.email} onChange={change}
          placeholder="john.doe@avemaria.com" className={errors.email ? 'error' : ''} />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label>OTP Code <span className="otp-len">(8 characters)</span></label>
        <input type="text" name="otp" value={form.otp} onChange={change}
          placeholder="e.g. AB3X9Y2Z" className={`otp-input ${errors.otp ? 'error' : ''}`}
          autoComplete="one-time-code" />
        {errors.otp && <span className="form-error">{errors.otp}</span>}
      </div>

      {errors.submit && <div className="submit-error">{errors.submit}</div>}

      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Verify OTP'}
      </button>

      <button type="button" className="otp-switch-btn" onClick={onSwitchNormal}>
        ← Back to normal login
      </button>
    </form>
  );
}

// ── Staff OTP login — step 2: set password ────────────────────────────────────
function SetPassword({ verified, onLogin }) {
  const [form,    setForm]    = useState({ password: '', confirm: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const change = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(err => ({ ...err, [name]: undefined, submit: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.password.length < 6)          errs.password = 'At least 6 characters.';
    if (form.password !== form.confirm)     errs.confirm  = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/staff/auth/set-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verified.email, otp: verified.otp, password: form.password, confirm: form.confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.confirm?.[0] || 'Failed.');
      AuthService.saveStaffSession(data);
      onLogin({ isStaff: true });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div>
      {/* Staff profile preview */}
      <div className="otp-profile-box">
        <div className="otp-profile-avatar">{verified.full_name?.charAt(0)?.toUpperCase()}</div>
        <div>
          <div className="otp-profile-name">{verified.full_name}</div>
          {verified.additional_role && verified.additional_role !== 'none' && (
            <div className="otp-profile-role">{verified.additional_role.replace(/_/g, ' ')}</div>
          )}
          <div className="otp-profile-pages">
            Pages: {(verified.assigned_pages || []).join(', ') || '—'}
          </div>
          {verified.subjects?.length > 0 && (
            <div className="otp-profile-pages">Subjects: {verified.subjects.join(', ')}</div>
          )}
        </div>
      </div>

      <p className="otp-sub">Set a new password to complete your account setup.</p>

      <form onSubmit={submit} noValidate>
        <div className="form-group">
          <label>New Password</label>
          <div className="input-pw-wrap">
            <input type={showPwd ? 'text' : 'password'} name="password" value={form.password}
              onChange={change} placeholder="At least 6 characters"
              className={errors.password ? 'error' : ''} />
            <button type="button" className="pw-toggle" onClick={() => setShowPwd(v => !v)}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input type={showPwd ? 'text' : 'password'} name="confirm" value={form.confirm}
            onChange={change} placeholder="Repeat password"
            className={errors.confirm ? 'error' : ''} />
          {errors.confirm && <span className="form-error">{errors.confirm}</span>}
        </div>

        {errors.submit && <div className="submit-error">{errors.submit}</div>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Set Password & Login'}
        </button>
      </form>
    </div>
  );
}

// ── Root LoginPage ────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin, onRegister }) {
  // mode: 'normal' | 'otp-verify' | 'otp-set-password'
  const [mode,     setMode]     = useState('normal');
  const [verified, setVerified] = useState(null);

  const title = {
    'normal':           'Welcome back',
    'otp-verify':       'Staff OTP Login',
    'otp-set-password': 'Set Your Password',
  }[mode];

  const sub = {
    'normal':           'Sign in to your account to continue.',
    'otp-verify':       'First-time login with your OTP.',
    'otp-set-password': `Welcome, ${verified?.full_name || 'Staff Member'}!`,
  }[mode];

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <Briefcase size={28} strokeWidth={2.2} />
          <span>BusinessIQ</span>
        </div>
        <h1>{title}</h1>
        <p className="login-sub">{sub}</p>

        {mode === 'normal' && (
          <NormalLogin onLogin={onLogin} onSwitchOTP={() => setMode('otp-verify')} />
        )}
        {mode === 'otp-verify' && (
          <OTPVerify
            onVerified={data => { setVerified(data); setMode('otp-set-password'); }}
            onSwitchNormal={() => setMode('normal')}
          />
        )}
        {mode === 'otp-set-password' && verified && (
          <SetPassword verified={verified} onLogin={onLogin} />
        )}

        {mode === 'normal' && (
          <p className="login-register">
            Don't have an account?{' '}
            <button className="link-btn" onClick={onRegister}>Get Started</button>
          </p>
        )}
      </div>
    </div>
  );
}
