import React, { useState } from 'react';
import { Briefcase, CheckCircle } from 'lucide-react';
import './RegisterPage.css';
import AuthService from '../services/AuthService';

const BUSINESS_TYPES = [
  'Retail Store',
  'Restaurant / Food & Beverage',
  'Salon & Beauty',
  'Pharmacy',
  'Wholesale & Distribution',
  'Agriculture & Farming',
  'Construction & Real Estate',
  'Transport & Logistics',
  'Education & Training',
  'Healthcare & Clinic',
  'Technology & IT Services',
  'Manufacturing',
  'Other',
];

const INITIAL = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  businessType: '',
  schoolLevel: '',
  password: '',
  confirmPassword: '',
};

function RegisterPage({ onRegister, onSignIn }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (form.phone && !/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number.';
    if (!form.businessName.trim()) e.businessName = 'Business name is required.';
    if (!form.businessType) e.businessType = 'Please select a business type.';
    if (form.businessType === 'Education & Training' && !form.schoolLevel)
      e.schoolLevel = 'Please select a school level.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(err => ({ ...err, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setLoading(true);
    try {
      await AuthService.register({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        businessName: form.businessName,
        businessType: form.businessType,
        schoolLevel: form.schoolLevel,
      });
      onRegister(form);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-left">
        <div className="register-brand">
          <Briefcase size={30} strokeWidth={2.2} className="register-logo" />
          <span className="register-brand-name">BusinessIQ</span>
        </div>
        <h2>Start managing your business smarter today.</h2>
        <ul className="register-perks">
          <li><CheckCircle size={16} strokeWidth={2.5} /> Track sales, expenses & profits</li>
          <li><CheckCircle size={16} strokeWidth={2.5} /> Manage multiple businesses</li>
          <li><CheckCircle size={16} strokeWidth={2.5} /> Works offline, always available</li>
          <li><CheckCircle size={16} strokeWidth={2.5} /> Free to get started</li>
        </ul>
      </div>

      <div className="register-right">
        <div className="register-card">
          <h1>Create your account</h1>
          <p className="register-sub">Fill in the details below to get started.</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Personal Info */}
            <div className="form-section-label">Personal Information</div>

            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email Address <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number <span className="optional">(Optional)</span></label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 8900"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>
            </div>

            {/* Business Info */}
            <div className="form-section-label" style={{ marginTop: '20px' }}>Business Information</div>

            <div className="form-row">
              <div className="form-group">
                <label>Business Name <span className="required">*</span></label>
                <input
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="My Awesome Store"
                  className={errors.businessName ? 'error' : ''}
                />
                {errors.businessName && <span className="form-error">{errors.businessName}</span>}
              </div>

              <div className="form-group">
                <label>Business Type <span className="required">*</span></label>
                <select
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  className={errors.businessType ? 'error' : ''}
                >
                  <option value="">-- Select type --</option>
                  {BUSINESS_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.businessType && <span className="form-error">{errors.businessType}</span>}
              </div>
            </div>

            {form.businessType === 'Education & Training' && (
              <div className="form-group">
                <label>School Level <span className="required">*</span></label>
                <div className="school-level-picker">
                  {['primary', 'secondary'].map(level => (
                    <label
                      key={level}
                      className={`school-level-option ${form.schoolLevel === level ? 'selected' : ''} ${errors.schoolLevel ? 'error-border' : ''}`}
                    >
                      <input
                        type="radio"
                        name="schoolLevel"
                        value={level}
                        checked={form.schoolLevel === level}
                        onChange={handleChange}
                      />
                      <span>{level.charAt(0).toUpperCase() + level.slice(1)} School</span>
                    </label>
                  ))}
                </div>
                {errors.schoolLevel && <span className="form-error">{errors.schoolLevel}</span>}
              </div>
            )}

            {/* Password */}
            <div className="form-section-label" style={{ marginTop: '20px' }}>Security</div>

            <div className="form-row">
              <div className="form-group">
                <label>Password <span className="required">*</span></label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label>Confirm Password <span className="required">*</span></label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <p className="register-signin">
            Already have an account?{' '}
            <button className="link-btn" onClick={onSignIn}>Sign In</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
