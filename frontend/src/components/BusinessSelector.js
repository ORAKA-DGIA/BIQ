import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, LogOut, Store, UtensilsCrossed, Scissors, Pill, Truck, Leaf, HardHat, GraduationCap, HeartPulse, Cpu, Factory, LayoutGrid } from 'lucide-react';
import './BusinessSelector.css';
import AuthService from '../services/AuthService';

const CATEGORY_META = {
  'Retail Store':                { icon: Store,           color: '#3b82f6' },
  'Restaurant / Food & Beverage':{ icon: UtensilsCrossed, color: '#f59e0b' },
  'Salon & Beauty':              { icon: Scissors,        color: '#ec4899' },
  'Pharmacy':                    { icon: Pill,            color: '#10b981' },
  'Wholesale & Distribution':    { icon: Truck,           color: '#6366f1' },
  'Agriculture & Farming':       { icon: Leaf,            color: '#22c55e' },
  'Construction & Real Estate':  { icon: HardHat,         color: '#f97316' },
  'Transport & Logistics':       { icon: Truck,           color: '#8b5cf6' },
  'Education & Training':        { icon: GraduationCap,   color: '#0ea5e9' },
  'Healthcare & Clinic':         { icon: HeartPulse,      color: '#ef4444' },
  'Technology & IT Services':    { icon: Cpu,             color: '#06b6d4' },
  'Manufacturing':               { icon: Factory,         color: '#78716c' },
  'Other':                       { icon: LayoutGrid,      color: '#6b7280' },
};

const BUSINESS_TYPES = Object.keys(CATEGORY_META);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function BusinessSelector({ onSelect, onLogout }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Retail Store', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const user = AuthService.getUser();

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/businesses/`, { headers: AuthService.getAuthHeaders() });
      const data = await res.json();
      setBusinesses(data.results ?? data);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/businesses/`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create business');
      await fetchBusinesses();
      setShowForm(false);
      setForm({ name: '', category: 'Retail Store', description: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMeta = (category) => CATEGORY_META[category] || CATEGORY_META['Other'];

  return (
    <div className="bs-page">
      {/* Navbar */}
      <header className="bs-nav">
        <div className="bs-nav-brand">
          <Briefcase size={22} strokeWidth={2.2} />
          <span>BusinessIQ</span>
        </div>
        <div className="bs-nav-right">
          {user && <span className="bs-nav-user">Hi, {user.first_name || user.username}</span>}
          <button className="bs-logout-btn" onClick={onLogout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      <main className="bs-main">
        {/* Page title row */}
        <div className="bs-title-row">
          <div>
            <h1>My Businesses</h1>
            <p>{businesses.length} business{businesses.length !== 1 ? 'es' : ''} registered</p>
          </div>
          <button className="bs-add-btn" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Business
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="bs-loading">Loading...</div>
        ) : businesses.length === 0 ? (
          <div className="bs-empty">
            <Briefcase size={48} strokeWidth={1.2} />
            <h2>No businesses yet</h2>
            <p>Create your first business to get started.</p>
            <button className="bs-add-btn" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Business
            </button>
          </div>
        ) : (
          <div className="bs-grid">
            {businesses.map(biz => {
              const meta = getMeta(biz.category);
              const Icon = meta.icon;
              return (
                <div key={biz.id} className="bs-card" onClick={() => onSelect(biz)}>
                  <div className="bs-card-icon" style={{ background: meta.color + '18', color: meta.color }}>
                    <Icon size={28} strokeWidth={1.8} />
                  </div>
                  <div className="bs-card-body">
                    <h3>{biz.name}</h3>
                    <span className="bs-card-category" style={{ background: meta.color + '18', color: meta.color }}>
                      {biz.category}
                    </span>
                    {biz.description && <p>{biz.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showForm && (
        <div className="bs-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="bs-modal" onClick={e => e.stopPropagation()}>
            <h2>Add New Business</h2>
            <form onSubmit={handleCreate}>
              <div className="bs-form-group">
                <label>Business Name <span className="req">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sunrise Pharmacy"
                  required
                />
              </div>
              <div className="bs-form-group">
                <label>Category <span className="req">*</span></label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="bs-form-group">
                <label>Description <span className="opt">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
              {error && <div className="bs-error">{error}</div>}
              <div className="bs-modal-actions">
                <button type="button" className="bs-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="bs-submit-btn" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessSelector;
