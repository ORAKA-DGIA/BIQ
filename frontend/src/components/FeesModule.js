import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Pencil, Trash2, ChevronDown, ChevronRight,
  Loader, BadgeDollarSign, History, ArrowRightCircle,
  Printer, FileText, Search, Users, Receipt
} from 'lucide-react';
import AuthService from '../services/AuthService';
import { Avatar } from './StudentsModule';
import FeeReceipt from './FeeReceipt';
import FeeInvoice from './FeeInvoice';
import './FeeInvoice.css';
import './FeeReceipt.css';
import './FeesModule.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const METHOD_LABELS = {
  cash: 'Cash', mobile_money: 'Mobile Money',
  bank: 'Bank Transfer', cheque: 'Cheque', other: 'Other',
};

function fmt(n, compact = false) {
  if (n == null) return '0';
  const num = Number(n);
  if (compact) {
    if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(num) >= 1_000)     return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  }
  return num.toLocaleString('en-UG');
}

function useMobile(bp = 640) {
  const [m, setM] = React.useState(() => window.innerWidth < bp);
  React.useEffect(() => {
    const fn = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [bp]);
  return m;
}

function statusStyle(s) {
  if (s === 'paid')    return { bg: '#dcfce7', color: '#15803d', label: 'Paid' };
  if (s === 'partial') return { bg: '#fef9c3', color: '#a16207', label: 'Partial' };
  return { bg: '#fee2e2', color: '#dc2626', label: 'Pending' };
}

/* ── Add/Edit Fee Structure Modal ── */
function StructureModal({ structure, onSave, onClose }) {
  const [form, setForm] = useState(structure ? {
    ...structure, year: String(structure.year), amount: String(structure.amount),
  } : {
    name: '', class_name: '', term: '1', year: String(CURRENT_YEAR),
    amount: '', currency: 'UGX', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount) { setError('Name and amount are required.'); return; }
    setSaving(true); setError('');
    try {
      const url    = structure ? `${API_URL}/fee-structures/${structure.id}/` : `${API_URL}/fee-structures/`;
      const method = structure ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), year: parseInt(form.year) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(JSON.stringify(d)); }
      onSave();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="fm-modal" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <h3>{structure ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
          <button className="fm-close-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="fm-modal-body">
          <div className="fm-field">
            <label>Fee Name *</label>
            <input placeholder="e.g. Tuition Fee, Uniform, Development Fee" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="fm-row">
            <div className="fm-field">
              <label>Class (blank = all classes)</label>
              <input placeholder="e.g. S.4" value={form.class_name} onChange={e => set('class_name', e.target.value)} />
            </div>
            <div className="fm-field">
              <label>Year</label>
              <select value={form.year} onChange={e => set('year', e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="fm-field">
              <label>Term</label>
              <select value={form.term} onChange={e => set('term', e.target.value)}>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            </div>
          </div>
          <div className="fm-row">
            <div className="fm-field">
              <label>Amount *</label>
              <input type="number" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div className="fm-field">
              <label>Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="UGX">UGX</option>
                <option value="USD">USD</option>
                <option value="KES">KES</option>
              </select>
            </div>
          </div>
          <div className="fm-field">
            <label>Description</label>
            <textarea rows={2} placeholder="Optional" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          {error && <p className="fm-error">{error}</p>}
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="fm-btn-save" onClick={handleSave} disabled={saving}>
            {saving && <Loader size={13} className="spinner" />} {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Record Payment Modal ── */
function PaymentModal({ student, structure, onSave, onClose }) {
  const [form, setForm] = useState({
    amount_paid: '', payment_date: new Date().toISOString().split('T')[0],
    method: 'cash', reference: '', note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.amount_paid || parseFloat(form.amount_paid) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/fee-payments/`, {
        method: 'POST',
        headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: student.student_id,
          fee_structure: structure.id,
          amount_paid: parseFloat(form.amount_paid),
          payment_date: form.payment_date,
          method: form.method,
          reference: form.reference,
          note: form.note,
        }),
      });
      if (!res.ok) throw new Error('Failed to record payment');
      onSave();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const balance = Math.max(0, student.balance ?? (structure.amount - (student.fees?.[structure.id]?.amount_paid || 0)));

  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="fm-modal" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <h3>Record Payment</h3>
          <button className="fm-close-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="fm-modal-body">
          <div className="fm-payment-student">
            <Avatar url={student.photo_url} name={student.student_name} size={38} />
            <div>
              <div className="fm-ps-name">{student.student_name}</div>
              <div className="fm-ps-meta">{structure.name} · Balance: <strong>{structure.currency} {fmt(balance)}</strong></div>
            </div>
          </div>
          <div className="fm-row">
            <div className="fm-field">
              <label>Amount Paid *</label>
              <input type="number" min="0" placeholder="0" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} />
            </div>
            <div className="fm-field">
              <label>Date</label>
              <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
            </div>
          </div>
          <div className="fm-row">
            <div className="fm-field">
              <label>Method</label>
              <select value={form.method} onChange={e => set('method', e.target.value)}>
                {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="fm-field">
              <label>Reference / Receipt No.</label>
              <input placeholder="Optional" value={form.reference} onChange={e => set('reference', e.target.value)} />
            </div>
          </div>
          <div className="fm-field">
            <label>Note</label>
            <textarea rows={2} placeholder="Optional" value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
          {error && <p className="fm-error">{error}</p>}
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="fm-btn-save" onClick={handleSave} disabled={saving}>
            {saving && <Loader size={13} className="spinner" />} {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Carry Forward Modal ── */
function CarryForwardModal({ source, structures, onDone, onClose }) {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const targets = structures.filter(s => s.id !== source.id);

  const handleCarry = async () => {
    if (!targetId) { setError('Select a target structure.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_URL}/fee-structures/${source.id}/carry_forward/`, {
        method: 'POST',
        headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_structure_id: parseInt(targetId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.message);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="fm-modal" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <h3>Carry Forward Balances</h3>
          <button className="fm-close-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="fm-modal-body">
          <p className="fm-cf-desc">
            Copy unpaid balances from <strong>{source.name}</strong> (T{source.term} {source.year}) into another fee structure.
          </p>
          <div className="fm-field">
            <label>Target Fee Structure</label>
            <select value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="">— Select —</option>
              {targets.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.class_name || 'All'} T{s.term} {s.year}</option>
              ))}
            </select>
          </div>
          {result && <p className="fm-cf-result">✓ {result}</p>}
          {error  && <p className="fm-error">{error}</p>}
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn-cancel" onClick={onClose}>{result ? 'Done' : 'Close'}</button>
          {!result && (
            <button className="fm-btn-save" onClick={handleCarry} disabled={loading}>
              {loading && <Loader size={13} className="spinner" />} {loading ? 'Processing…' : 'Carry Forward'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const METHOD_LABELS_MAP = {
  cash: 'Cash', mobile_money: 'Mobile Money',
  bank: 'Bank Transfer', cheque: 'Cheque', other: 'Other',
};

function InvoiceDoc({ data }) {
  if (!data) return null;
  return (
    <div className="iv-doc bulk-page">
      <div className="iv-header">
        <div className="iv-letterhead">
          <div className="iv-school-name">{data.school_name}</div>
          {data.school_logo && <img src={data.school_logo} alt="" className="iv-logo" />}
          {data.school_motto && <div className="iv-school-motto">"{data.school_motto}"</div>}
          <div className="iv-school-contacts">
            {data.school_address && <span>{data.school_address}</span>}
            {data.school_phone   && <span>Tel: {data.school_phone}</span>}
            {data.school_email   && <span>{data.school_email}</span>}
          </div>
        </div>
        <div className="iv-header-right">
          <div className="iv-doc-label">Fee Invoice</div>
          <div className="iv-invoice-no">{data.invoice_no}</div>
          <div className="iv-issued">Date: {data.issued_at}</div>
          {data.due_date && <div className="iv-due">Due: {data.due_date}</div>}
          <span className="iv-pill">PAYMENT DUE</span>
        </div>
      </div>
      <div className="iv-hr" />
      <div className="iv-grid">
        <div>
          <div className="iv-section-title">Billed To</div>
          <table className="iv-info-table"><tbody>
            <tr><td className="iv-lbl">Full Name</td><td className="iv-val">{data.student_name}</td></tr>
            {data.student_no && <tr><td className="iv-lbl">Student No.</td><td className="iv-val">#{data.student_no}</td></tr>}
            <tr><td className="iv-lbl">Class</td><td className="iv-val">{data.student_class}</td></tr>
            {data.parent_name && data.parent_name !== 'None' && <tr><td className="iv-lbl">Parent</td><td className="iv-val">{data.parent_name}</td></tr>}
            {data.parent_phone && data.parent_phone !== 'None' && <tr><td className="iv-lbl">Parent Tel.</td><td className="iv-val">{data.parent_phone}</td></tr>}
          </tbody></table>
        </div>
        <div>
          <div className="iv-section-title">Fee Details</div>
          <table className="iv-info-table"><tbody>
            <tr><td className="iv-lbl">Fee</td><td className="iv-val">{data.fee_name}</td></tr>
            <tr><td className="iv-lbl">Term / Year</td><td className="iv-val">Term {data.fee_term} · {data.fee_year}</td></tr>
            <tr><td className="iv-lbl">Total Fee</td><td className="iv-val">{data.currency} {fmt(data.fee_amount)}</td></tr>
            <tr><td className="iv-lbl">Amount Paid</td><td className="iv-val iv-green">{data.currency} {fmt(data.total_paid)}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="iv-hr" />
      <div className="iv-section-title">Invoice Breakdown</div>
      <table className="iv-fee-table">
        <thead><tr>
          <th className="iv-th iv-th-l">Description</th>
          <th className="iv-th iv-th-r">Total Fee</th>
          <th className="iv-th iv-th-r">Amount Paid</th>
          <th className="iv-th iv-th-r">Amount Due</th>
        </tr></thead>
        <tbody><tr>
          <td className="iv-td iv-td-name">{data.fee_name}</td>
          <td className="iv-td iv-td-r">{data.currency} {fmt(data.fee_amount)}</td>
          <td className="iv-td iv-td-r iv-green">{data.currency} {fmt(data.total_paid)}</td>
          <td className="iv-td iv-td-r iv-red">{data.currency} {fmt(data.balance)}</td>
        </tr></tbody>
        <tfoot><tr className="iv-tfoot">
          <td className="iv-td iv-tfoot-lbl" colSpan={3}>Total Amount Due</td>
          <td className="iv-td iv-td-r iv-red iv-bold">{data.currency} {fmt(data.balance)}</td>
        </tr></tfoot>
      </table>
      <div className="iv-due-box">
        <div>
          <div className="iv-due-label">Total Outstanding</div>
          <div className="iv-due-val">{data.currency} {fmt(data.balance)}</div>
        </div>
        <div className="iv-due-msg">Please settle this balance promptly to avoid disruption to your child's education.</div>
      </div>
      <div className="iv-hr" />
      <div className="iv-footer">
        <div className="iv-sig"><div className="iv-sig-line" /><div className="iv-sig-lbl">Authorised Signature</div></div>
        <div className="iv-footer-mid">
          <div className="iv-footer-school">{data.school_name}</div>
          <div className="iv-footer-sub">Official Fee Invoice · {data.invoice_no}</div>
        </div>
        <div className="iv-footer-right"><div className="iv-sig-line iv-sig-line-r" /><div className="iv-sig-lbl">Received By</div></div>
      </div>
    </div>
  );
}

function ReceiptDoc({ data }) {
  if (!data) return null;
  const isCleared = Number(data.balance) <= 0;
  const payDate = new Date(data.payment_date + 'T00:00:00')
    .toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="rc-doc bulk-page">
      <div className="rc-header">
        <div className="rc-letterhead">
          <div className="rc-school-name">{data.school_name}</div>
          {data.school_logo && <img src={data.school_logo} alt="" className="rc-logo" />}
          {data.school_motto && <div className="rc-school-motto">"{data.school_motto}"</div>}
          <div className="rc-school-contacts">
            {data.school_address && <span>{data.school_address}</span>}
            {data.school_phone   && <span>Tel: {data.school_phone}</span>}
            {data.school_email   && <span>{data.school_email}</span>}
          </div>
        </div>
        <div className="rc-header-right">
          <div className="rc-doc-label">Fee Payment Receipt</div>
          <div className="rc-receipt-no">{data.receipt_no}</div>
          <div className="rc-issued">Date: {data.issued_at}</div>
          <span className={`rc-pill ${isCleared ? 'rc-pill-paid' : 'rc-pill-partial'}`}>
            {isCleared ? 'FULLY PAID' : 'PARTIAL PAYMENT'}
          </span>
        </div>
      </div>
      <div className="rc-hr" />
      <div className="rc-grid">
        <div>
          <div className="rc-section-title">Student Information</div>
          <table className="rc-info-table"><tbody>
            <tr><td className="rc-lbl">Full Name</td><td className="rc-val">{data.student_name}</td></tr>
            {data.student_no && <tr><td className="rc-lbl">Student No.</td><td className="rc-val">#{data.student_no}</td></tr>}
            <tr><td className="rc-lbl">Class</td><td className="rc-val">{data.student_class}</td></tr>
            {data.parent_name && data.parent_name !== 'None' && <tr><td className="rc-lbl">Parent</td><td className="rc-val">{data.parent_name}</td></tr>}
          </tbody></table>
        </div>
        <div>
          <div className="rc-section-title">Payment Details</div>
          <table className="rc-info-table"><tbody>
            <tr><td className="rc-lbl">Payment Date</td><td className="rc-val">{payDate}</td></tr>
            <tr><td className="rc-lbl">Method</td><td className="rc-val">{METHOD_LABELS_MAP[data.method] || data.method}</td></tr>
            {data.reference && data.reference !== 'carry_forward' && <tr><td className="rc-lbl">Reference</td><td className="rc-val">{data.reference}</td></tr>}
            <tr><td className="rc-lbl">Fee</td><td className="rc-val">{data.fee_name}</td></tr>
            <tr><td className="rc-lbl">Term / Year</td><td className="rc-val">Term {data.fee_term} · {data.fee_year}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="rc-hr" />
      <div className="rc-section-title">Fee Breakdown</div>
      <table className="rc-fee-table">
        <thead><tr>
          <th className="rc-th rc-th-l">Fee</th>
          <th className="rc-th rc-th-r">Total Fee</th>
          <th className="rc-th rc-th-r">This Payment</th>
          <th className="rc-th rc-th-r">Total Paid</th>
          <th className="rc-th rc-th-r">Balance Due</th>
        </tr></thead>
        <tbody><tr>
          <td className="rc-td rc-td-name">{data.fee_name}</td>
          <td className="rc-td rc-td-r">{data.currency} {fmt(data.fee_amount)}</td>
          <td className="rc-td rc-td-r rc-c-indigo">{data.currency} {fmt(data.amount_paid)}</td>
          <td className="rc-td rc-td-r rc-c-green">{data.currency} {fmt(data.total_paid)}</td>
          <td className={`rc-td rc-td-r ${isCleared ? 'rc-c-green' : 'rc-c-red'}`}>{data.currency} {fmt(data.balance)}</td>
        </tr></tbody>
      </table>
      <div className="rc-hr" />
      <div className="rc-footer">
        <div className="rc-sig"><div className="rc-sig-line" /><div className="rc-sig-lbl">Authorised Signature</div></div>
        <div className="rc-footer-mid">
          <div className="rc-footer-school">{data.school_name}</div>
          <div className="rc-footer-sub">Official Receipt · {data.receipt_no}</div>
        </div>
        <div className="rc-footer-right"><div className="rc-sig-line rc-sig-line-r" /><div className="rc-sig-lbl">Received By</div></div>
      </div>
    </div>
  );
}

/* ── Bulk Invoice Modal ── */
function BulkInvoiceModal({ classes, term, year, onClose }) {
  const [filters, setFilters] = useState({ class_name: '', min_balance: '', max_balance: '' });
  const [rows, setRows]       = useState([]);
  const [invoiceDocs, setInvoiceDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const generate = async () => {
    setLoading(true); setInvoiceDocs([]); setFetched(false);
    const p = new URLSearchParams({ term, year });
    if (filters.class_name)  p.append('class_name', filters.class_name);
    if (filters.min_balance) p.append('min_balance', filters.min_balance);
    if (filters.max_balance) p.append('max_balance', filters.max_balance);
    try {
      const res  = await fetch(`${API_URL}/invoices/bulk/?${p}`, { headers: AuthService.getAuthHeaders() });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setFetched(true);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };

  const fetchDocs = async () => {
    setFetching(true);
    const docs = await Promise.all(
      rows.map(r =>
        fetch(`${API_URL}/invoices/${r.student_id}/${r.fee_structure_id}/`, { headers: AuthService.getAuthHeaders() })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );
    setInvoiceDocs(docs.filter(Boolean));
    setFetching(false);
  };

  const printAll = async () => {
    if (invoiceDocs.length === 0) await fetchDocs();
    setTimeout(() => window.print(), 300);
  };

  // auto-fetch docs when rows arrive
  useEffect(() => { if (rows.length > 0) fetchDocs(); }, [rows]); // eslint-disable-line

  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="fm-modal fm-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <h3>Bulk Invoice Generator — T{term} {year}</h3>
          <button className="fm-close-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="fm-modal-body">
          <div className="fm-bulk-filters">
            <div className="fm-field">
              <label>Class</label>
              <select value={filters.class_name} onChange={e => set('class_name', e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fm-field">
              <label>Min Balance</label>
              <input type="number" min="0" placeholder="0" value={filters.min_balance} onChange={e => set('min_balance', e.target.value)} />
            </div>
            <div className="fm-field">
              <label>Max Balance</label>
              <input type="number" min="0" placeholder="Any" value={filters.max_balance} onChange={e => set('max_balance', e.target.value)} />
            </div>
            <button className="fm-btn-save fm-bulk-go" onClick={generate} disabled={loading}>
              {loading ? <Loader size={13} className="spinner" /> : <Search size={13} />} Generate
            </button>
          </div>

          {fetched && rows.length === 0 && <div className="fm-empty-students">No students match these criteria.</div>}

          {rows.length > 0 && (
            <div className="fm-bulk-summary">
              <span><strong>{rows.length}</strong> invoices</span>
              <span>Total Due: <strong>{rows[0]?.currency} {fmt(rows.reduce((s, r) => s + r.balance, 0))}</strong></span>
              {fetching && <span><Loader size={12} className="spinner" /> Preparing documents…</span>}
              {!fetching && invoiceDocs.length > 0 && (
                <button className="fm-btn-print-all no-print" onClick={printAll}>
                  <Printer size={13} /> Print All ({invoiceDocs.length})
                </button>
              )}
            </div>
          )}

          {/* Hidden printable invoice documents */}
          {invoiceDocs.length > 0 && (
            <div className="fm-bulk-docs">
              {invoiceDocs.map((d, i) => <InvoiceDoc key={i} data={d} />)}
            </div>
          )}
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn-cancel" onClick={onClose}>Close</button>
          {invoiceDocs.length > 0 && (
            <button className="fm-btn-save" onClick={printAll} disabled={fetching}>
              <Printer size={13} /> Print All ({invoiceDocs.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Bulk Receipt Modal ── */
function BulkReceiptModal({ classes, term, year, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({ date_from: today, date_to: today, class_name: '', term: '', year: '' });
  const [receiptDocs, setReceiptDocs] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [fetched, setFetched]   = useState(false);
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const generate = async () => {
    setLoading(true); setReceiptDocs([]); setFetched(false);
    const p = new URLSearchParams();
    if (filters.date_from)  p.append('date_from', filters.date_from);
    if (filters.date_to)    p.append('date_to', filters.date_to);
    if (filters.class_name) p.append('class_name', filters.class_name);
    if (filters.term)       p.append('term', filters.term);
    if (filters.year)       p.append('year', filters.year);
    try {
      const res  = await fetch(`${API_URL}/receipts/bulk/?${p}`, { headers: AuthService.getAuthHeaders() });
      const data = await res.json();
      setReceiptDocs(Array.isArray(data) ? data : []);
      setFetched(true);
    } catch { setReceiptDocs([]); }
    finally { setLoading(false); }
  };

  const printAll = () => window.print();

  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="fm-modal fm-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <h3>Bulk Receipt Printer</h3>
          <button className="fm-close-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="fm-modal-body">
          <div className="fm-bulk-filters">
            <div className="fm-field">
              <label>Date From</label>
              <input type="date" value={filters.date_from} onChange={e => set('date_from', e.target.value)} />
            </div>
            <div className="fm-field">
              <label>Date To</label>
              <input type="date" value={filters.date_to} onChange={e => set('date_to', e.target.value)} />
            </div>
            <div className="fm-field">
              <label>Class</label>
              <select value={filters.class_name} onChange={e => set('class_name', e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fm-field">
              <label>Term</label>
              <select value={filters.term} onChange={e => set('term', e.target.value)}>
                <option value="">All</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            </div>
            <button className="fm-btn-save fm-bulk-go" onClick={generate} disabled={loading}>
              {loading ? <Loader size={13} className="spinner" /> : <Search size={13} />} Find
            </button>
          </div>

          {fetched && receiptDocs.length === 0 && <div className="fm-empty-students">No payments found for this period.</div>}

          {receiptDocs.length > 0 && (
            <div className="fm-bulk-summary">
              <span><strong>{receiptDocs.length}</strong> receipts</span>
              <span>Total Collected: <strong>{receiptDocs[0]?.currency} {fmt(receiptDocs.reduce((s, r) => s + (r.amount_paid || 0), 0))}</strong></span>
              <button className="fm-btn-print-all no-print" onClick={printAll}>
                <Printer size={13} /> Print All ({receiptDocs.length})
              </button>
            </div>
          )}

          {/* Hidden printable receipt documents */}
          {receiptDocs.length > 0 && (
            <div className="fm-bulk-docs">
              {receiptDocs.map((d, i) => <ReceiptDoc key={i} data={d} />)}
            </div>
          )}
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn-cancel" onClick={onClose}>Close</button>
          {receiptDocs.length > 0 && (
            <button className="fm-btn-save" onClick={printAll}>
              <Printer size={13} /> Print All ({receiptDocs.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Student row in grouped class table ── */
function StudentRow({ student, structures, currency, onPay, onInvoice, onReceipt, onRefresh, hideTotals }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const st = statusStyle(student.overall_status);
  const hasPayments = structures.some(fs => (student.fees[fs.id]?.payments || []).length > 0);

  const deletePayment = async (id) => {
    setDeleting(id);
    await fetch(`${API_URL}/fee-payments/${id}/`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
    setDeleting(null);
    onRefresh();
  };

  return (
    <>
      <tr className={`fm-srow ${expanded ? 'expanded' : ''}`}>
        <td className="fm-cell fm-cell-student">
          <div className="fm-student-cell">
            <Avatar url={student.photo_url} name={student.student_name} size={30} />
            <div>
              <span className="fm-sname">{student.student_name}</span>
              {student.student_no && <span className="fm-sid">#{student.student_no}</span>}
            </div>
          </div>
        </td>
        {structures.map(fs => {
          const fee = student.fees[fs.id];
          if (!fee) return <td key={fs.id} className="fm-cell fm-cell-amt" style={{ color: '#cbd5e1' }}>—</td>;
          const fst = statusStyle(fee.status);
          return (
            <td key={fs.id} className="fm-cell fm-cell-amt">
              <div className="fm-fee-cell">
                <span style={{ fontWeight: 700, color: fee.balance > 0 ? '#dc2626' : '#15803d', fontSize: 13 }}>
                  {fmt(fee.balance)}
                </span>
                <span className="fm-status-badge" style={{ background: fst.bg, color: fst.color, fontSize: 9, padding: '1px 5px' }}>{fst.label}</span>
              </div>
            </td>
          );
        })}
        <td className="fm-cell fm-cell-amt" style={{ fontWeight: 800, color: student.total_balance > 0 ? '#dc2626' : '#15803d' }}>
          {hideTotals ? '—' : `${currency} ${fmt(student.total_balance)}`}
        </td>
        <td className="fm-cell">
          <span className="fm-status-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </td>
      </tr>
      {/* Actions sub-row */}
      <tr className="fm-srow-actions-row">
        <td colSpan={structures.length + 3} className="fm-cell fm-cell-btns">
          <div className="fm-row-actions">
            {structures.map(fs => {
              const fee = student.fees[fs.id];
              if (!fee || fee.balance <= 0) return null;
              return (
                <button key={fs.id} className="fm-pay-btn" onClick={() => onPay(student, fs)}>
                  + Pay {fs.name}
                </button>
              );
            })}
            <button className="fm-action-btn fm-receipt-inline" onClick={() => onInvoice(student, structures[0])}>
              <FileText size={12} /> Print Invoice
            </button>
            {hasPayments && (
              <button
                className="fm-action-btn fm-invoice-inline"
                onClick={() => {
                  const allPayments = structures.flatMap(fs => student.fees[fs.id]?.payments || []);
                  const latest = allPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];
                  if (latest) onReceipt(latest);
                }}
              >
                <Printer size={12} /> Print Receipt
              </button>
            )}
            {hasPayments && (
              <button className="fm-expand-btn" onClick={() => setExpanded(e => !e)}>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
        </td>
      </tr>
      {/* Payment history rows */}
      {expanded && structures.flatMap(fs =>
        (student.fees[fs.id]?.payments || [])
          .filter(p => p.reference !== 'carry_forward')
          .map(p => (
            <tr key={p.id} className="fm-payment-row">
              <td colSpan={2} className="fm-cell fm-pcell-date">
                {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                &nbsp;·&nbsp;<span className="fm-method">{METHOD_LABELS[p.method] || p.method}</span>
                {p.reference && <span className="fm-ref"> #{p.reference}</span>}
                <span className="fm-fee-tag">{fs.name}</span>
              </td>
              <td colSpan={structures.length} className="fm-cell fm-cell-amt" style={{ color: '#15803d', fontWeight: 700 }}>
                {currency} {fmt(p.amount_paid)}
              </td>
              <td colSpan={2} className="fm-cell fm-cell-actions" style={{ textAlign: 'right' }}>
                <button className="fm-receipt-btn" title="Print receipt" onClick={() => onReceipt(p)}>
                  <Printer size={12} />
                </button>
                <button className="fm-del-btn" onClick={() => deletePayment(p.id)} disabled={deleting === p.id}>
                  {deleting === p.id ? <Loader size={12} className="spinner" /> : <Trash2 size={13} />}
                </button>
              </td>
            </tr>
          ))
      )}
    </>
  );
}

/* ── Grouped Class Card ── */
function ClassCard({ classKey, allStructures, onEditStructure, onDeleteStructure, onCarryForward,
                     onPay, onReceipt, onInvoice, mobile, hideTotals }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData]         = useState(null); // { structures, students }
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');

  // classKey = { class_name, term, year } — all structures for this group
  const structures = allStructures.filter(s =>
    s.term === classKey.term && String(s.year) === String(classKey.year) &&
    (s.class_name === classKey.class_name || s.class_name === '')
  );

  // Summary across structures
  const currency     = structures[0]?.currency || 'UGX';
  const totalExpected = structures.reduce((s, fs) => s + (fs.total_expected || 0), 0);
  const totalPaid     = structures.reduce((s, fs) => s + (fs.total_paid || 0), 0);
  const outstanding   = structures.reduce((s, fs) => s + (fs.outstanding || 0), 0);
  const paidPct       = totalExpected > 0 ? Math.min(100, Math.round((totalPaid / totalExpected) * 100)) : 0;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ term: classKey.term, year: classKey.year });
      if (classKey.class_name) p.append('class_name', classKey.class_name);
      const res  = await fetch(`${API_URL}/fee-structures/class_student_status/?${p}`, { headers: AuthService.getAuthHeaders() });
      const d    = await res.json();
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [classKey.class_name, classKey.term, classKey.year]);

  const toggle = () => { if (!expanded) fetchStudents(); setExpanded(e => !e); };

  const feeStructures = data?.structures || [];
  const students      = data?.students   || [];

  const q        = search.trim().toLowerCase();
  const filtered = q ? students.filter(s =>
    s.student_name?.toLowerCase().includes(q) || s.student_no?.toLowerCase().includes(q)
  ) : students;

  return (
    <div className="fm-card">
      <div className="fm-card-header" onClick={toggle}>
        <div className="fm-card-left">
          <div className="fm-card-icon"><BadgeDollarSign size={18} /></div>
          <div>
            <div className="fm-card-name">
              {classKey.class_name || 'All Classes'} — Term {classKey.term} · {classKey.year}
            </div>
            <div className="fm-card-meta">
              {structures.map(s => s.name).join(' · ')}
            </div>
          </div>
        </div>
        <div className="fm-card-right">
          <div className="fm-card-amount">{hideTotals ? '' : `${currency} ${fmt(totalExpected, mobile)}`}</div>
          <div className="fm-card-actions" onClick={e => e.stopPropagation()}>
            {structures.map(s => (
              <React.Fragment key={s.id}>
                <button className="fm-icon-btn" title={`Carry forward: ${s.name}`} onClick={() => onCarryForward(s)}>
                  <ArrowRightCircle size={13} />
                </button>
                <button className="fm-icon-btn" title={`Edit: ${s.name}`} onClick={() => onEditStructure(s)}>
                  <Pencil size={13} />
                </button>
                <button className="fm-icon-btn danger" title={`Delete: ${s.name}`} onClick={() => onDeleteStructure(s.id)}>
                  <Trash2 size={13} />
                </button>
              </React.Fragment>
            ))}
          </div>
          <button className="fm-expand-icon">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="fm-card-stats">
        {structures.map(s => (
          <div key={s.id} className="fm-stat">
            <span className="fm-stat-label">{s.name}</span>
            <span className="fm-stat-val">{hideTotals ? '—' : `${currency} ${fmt(s.amount, mobile)}`}</span>
          </div>
        ))}
        {!hideTotals && (
          <>
            <div className="fm-stat">
              <span className="fm-stat-label">Collected</span>
              <span className="fm-stat-val" style={{ color: '#15803d' }}>{currency} {fmt(totalPaid, mobile)}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat-label">Outstanding</span>
              <span className="fm-stat-val" style={{ color: '#dc2626' }}>{currency} {fmt(outstanding, mobile)}</span>
            </div>
            <div className="fm-progress-wrap">
              <div className="fm-progress-bar">
                <div className="fm-progress-fill" style={{ width: `${paidPct}%` }} />
              </div>
              <span className="fm-progress-pct">{paidPct}%</span>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="fm-student-table-wrap">
          {loading ? (
            <div className="fm-loading"><Loader size={18} className="spinner" /> Loading students…</div>
          ) : !data ? (
            <div className="fm-empty-students">Failed to load students.</div>
          ) : students.length === 0 ? (
            <div className="fm-empty-students">No active students found.</div>
          ) : (
            <>
              <div className="fm-search-bar">
                <Search size={14} className="fm-search-icon" />
                <input
                  className="fm-search-input"
                  placeholder="Search student name or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && <button className="fm-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
                <span className="fm-search-count">{filtered.length} of {students.length}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th className="fm-th-student">Student</th>
                      {feeStructures.map(fs => (
                        <th key={fs.id} className="fm-th-amt" style={{ minWidth: 110 }}>
                          {fs.name}<br /><span style={{ fontWeight: 500, opacity: 0.7 }}>{currency} {fmt(fs.amount)}</span>
                        </th>
                      ))}
                      <th className="fm-th-amt">Total Balance</th>
                      <th className="fm-th-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={feeStructures.length + 3} className="fm-no-results">No students match "{search}"</td></tr>
                    ) : filtered.map(student => (
                      <StudentRow
                        key={student.student_id}
                        student={student}
                        structures={feeStructures}
                        currency={currency}
                        onPay={onPay}
                        onInvoice={onInvoice}
                        onReceipt={onReceipt}
                        onRefresh={fetchStudents}
                        hideTotals={hideTotals}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Balance History View ── */
function BalanceHistoryView({ className, year }) {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!className) return;
    setLoading(true);
    const params = new URLSearchParams({ class_name: className });
    if (year) params.append('year', year);
    fetch(`${API_URL}/fee-structures/student_balances/?${params}`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [className, year]);

  if (!className) return <div className="fm-empty"><BadgeDollarSign size={36} strokeWidth={1.2} /><p>Select a class to view balance history.</p></div>;
  if (loading)    return <div className="fm-loading"><Loader size={20} className="spinner" /> Loading…</div>;
  if (!rows.length) return <div className="fm-empty"><BadgeDollarSign size={36} strokeWidth={1.2} /><p>No fee records found.</p></div>;

  const termKeys = [];
  const seen = new Set();
  rows.forEach(r => r.terms.forEach(t => {
    const key = `${t.year}-T${t.term}-${t.structure_name}`;
    if (!seen.has(key)) { seen.add(key); termKeys.push({ key, label: `${t.structure_name} T${t.term} ${t.year}`, ...t }); }
  }));

  return (
    <div className="fm-balance-wrap">
      <div className="fm-bal-table-scroll">
        <table className="fm-table fm-bal-table">
          <thead>
            <tr>
              <th className="fm-th-student">Student</th>
              {termKeys.map(tk => (
                <th key={tk.key} className="fm-th-amt" style={{ minWidth: 110, fontSize: 10 }}>{tk.label}</th>
              ))}
              <th className="fm-th-amt fm-th-total">Total Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.student_id} className={row.total_balance > 0 ? 'fm-bal-row-debt' : 'fm-bal-row-clear'}>
                <td className="fm-cell fm-cell-student">
                  <div className="fm-student-cell">
                    <Avatar url={row.photo_url} name={row.student_name} size={28} />
                    <div>
                      <span className="fm-sname">{row.student_name}</span>
                      {row.student_no && <span className="fm-sid">#{row.student_no}</span>}
                    </div>
                  </div>
                </td>
                {termKeys.map(tk => {
                  const t = row.terms.find(x => `${x.year}-T${x.term}-${x.structure_name}` === tk.key);
                  if (!t) return <td key={tk.key} className="fm-cell fm-cell-amt" style={{ color: '#cbd5e1' }}>—</td>;
                  const st = statusStyle(t.status);
                  return (
                    <td key={tk.key} className="fm-cell fm-cell-amt">
                      <div className="fm-bal-cell">
                        <span style={{ color: t.term_balance > 0 ? '#dc2626' : '#15803d', fontWeight: 700, fontSize: 12 }}>{fmt(t.term_balance)}</span>
                        <span className="fm-status-badge" style={{ background: st.bg, color: st.color, fontSize: 9, padding: '1px 6px' }}>{st.label}</span>
                      </div>
                    </td>
                  );
                })}
                <td className="fm-cell fm-cell-amt">
                  <span className="fm-total-balance" style={{ color: row.total_balance > 0 ? '#dc2626' : '#15803d' }}>{fmt(row.total_balance)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main FeesModule ── */
function FeesModule({ business, staffProfile }) {
  const role = staffProfile?.additional_role || '';
  const seeAllClasses = !staffProfile || ['head_teacher', 'deputy_head', 'dos'].includes(role);
  const allowedClasses = seeAllClasses ? null : (staffProfile?.assigned_classes || []);
  const hideSummaryTotals = role === 'deputy_head';
  const mobile = useMobile();
  const [view, setView]           = useState('structures');
  const [term, setTerm]           = useState('1');
  const [year, setYear]           = useState(String(CURRENT_YEAR));
  const [className, setClassName] = useState('');
  const [classes, setClasses]     = useState([]);
  const [structures, setStructures] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [modalStruct, setModalStruct] = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const [cfSource, setCfSource]   = useState(null);
  const [payTarget, setPayTarget] = useState(null);   // { student, structure }
  const [receiptId, setReceiptId] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null); // { studentId, structureId }
  const [bulkInvoice, setBulkInvoice] = useState(false);
  const [bulkReceipt, setBulkReceipt] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/students/`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        let list = [...new Set((d.results || []).map(s => s.class_name))].sort();
        if (allowedClasses) list = list.filter(c => allowedClasses.includes(c));
        setClasses(list);
      })
      .catch(console.error);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ term, year });
      if (className) params.append('class_name', className);
      const [sRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/fee-structures/?${params}`, { headers: AuthService.getAuthHeaders() }),
        fetch(`${API_URL}/fee-structures/summary/?${params}`, { headers: AuthService.getAuthHeaders() }),
      ]);
      const sData   = await sRes.json();
      const sumData = await sumRes.json();
      setStructures(sData.results || sData);
      setSummary(sumData);
    } catch { setStructures([]); }
    finally { setLoading(false); }
  }, [term, year, className]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group structures into class cards: same class_name + term + year = one card
  const classCards = React.useMemo(() => {
    const map = {};
    structures.forEach(s => {
      const key = `${s.class_name || ''}__${s.term}__${s.year}`;
      if (!map[key]) map[key] = { class_name: s.class_name || '', term: s.term, year: s.year };
    });
    return Object.values(map);
  }, [structures]);

  const handleDelete = async () => {
    await fetch(`${API_URL}/fee-structures/${deleteId}/`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
    setDeleteId(null);
    fetchAll();
  };

  return (
    <div className="fm-module">
      {/* Header */}
      <div className="fm-header">
        <h2>Fees</h2>
        <div className="fm-header-right">
          <button className={`fm-view-btn ${view === 'structures' ? 'active' : ''}`} onClick={() => setView('structures')}>
            <BadgeDollarSign size={14} /> Structures
          </button>
          <button className={`fm-view-btn ${view === 'balances' ? 'active' : ''}`} onClick={() => setView('balances')}>
            <History size={14} /> Balances
          </button>
          <button className="fm-view-btn" onClick={() => setBulkInvoice(true)} title="Bulk Invoice">
            <FileText size={14} /> Invoices
          </button>
          <button className="fm-view-btn" onClick={() => setBulkReceipt(true)} title="Bulk Receipts">
            <Receipt size={14} /> Receipts
          </button>
          {view === 'structures' && (
            <button className="fm-add-btn" onClick={() => setModalStruct('new')}>
              <Plus size={14} /> Add Structure
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="fm-filters">
        <div className="fm-fg">
          <label>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {view === 'structures' && (
          <div className="fm-fg">
            <label>Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)}>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
        )}
        <div className="fm-fg">
          <label>Class</label>
          <select value={className} onChange={e => setClassName(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      {view === 'structures' && summary && !hideSummaryTotals && (
        <div className="fm-summary-row">
          <div className="fm-sum-card">
            <span className="fm-sum-val">{structures.length}</span>
            <span className="fm-sum-label">Fee Structures</span>
          </div>
          <div className="fm-sum-card">
            <span className="fm-sum-val">{summary.currency || 'UGX'} {fmt(summary.total_expected, mobile)}</span>
            <span className="fm-sum-label">Total Expected</span>
          </div>
          <div className="fm-sum-card">
            <span className="fm-sum-val" style={{ color: '#15803d' }}>UGX {fmt(summary.total_paid, mobile)}</span>
            <span className="fm-sum-label">Total Collected</span>
          </div>
          <div className="fm-sum-card">
            <span className="fm-sum-val" style={{ color: '#dc2626' }}>UGX {fmt(summary.total_outstanding, mobile)}</span>
            <span className="fm-sum-label">Outstanding</span>
          </div>
          <div className="fm-sum-card">
            <span className="fm-sum-val">{summary.total_students_paid}</span>
            <span className="fm-sum-label">Students Paid</span>
          </div>
        </div>
      )}

      {/* Structures view — grouped class cards */}
      {view === 'structures' && (
        loading ? (
          <div className="fm-loading"><Loader size={22} className="spinner" /> Loading…</div>
        ) : classCards.length === 0 ? (
          <div className="fm-empty">
            <BadgeDollarSign size={40} strokeWidth={1.2} />
            <p>No fee structures for Term {term} {year}{className ? ` · ${className}` : ''}.</p>
          </div>
        ) : (
          <div className="fm-cards">
            {classCards.map(ck => (
              <ClassCard
                key={`${ck.class_name}__${ck.term}__${ck.year}`}
                classKey={ck}
                allStructures={structures}
                onEditStructure={setModalStruct}
                onDeleteStructure={setDeleteId}
                onCarryForward={setCfSource}
                onPay={(student, fs) => setPayTarget({ student, structure: fs })}
                onReceipt={(payment) => setReceiptId(payment.id)}
                onInvoice={(student, fs) => setInvoiceTarget({ studentId: student.student_id, structureId: fs.id })}
                mobile={mobile}
                hideTotals={hideSummaryTotals}
              />
            ))}
          </div>
        )
      )}

      {/* Balances view */}
      {view === 'balances' && <BalanceHistoryView className={className} year={year} />}

      {/* Modals */}
      {receiptId     && <FeeReceipt paymentId={receiptId} onClose={() => setReceiptId(null)} />}
      {invoiceTarget && <FeeInvoice studentId={invoiceTarget.studentId} structureId={invoiceTarget.structureId} onClose={() => setInvoiceTarget(null)} />}
      {bulkInvoice   && <BulkInvoiceModal classes={classes} term={term} year={year} onClose={() => setBulkInvoice(false)} />}
      {bulkReceipt   && <BulkReceiptModal classes={classes} term={term} year={year} onClose={() => setBulkReceipt(false)} />}

      {payTarget && (
        <PaymentModal
          student={payTarget.student}
          structure={payTarget.structure}
          onSave={() => { setPayTarget(null); fetchAll(); }}
          onClose={() => setPayTarget(null)}
        />
      )}

      {cfSource && (
        <CarryForwardModal
          source={cfSource}
          structures={structures}
          onDone={() => { setCfSource(null); fetchAll(); }}
          onClose={() => setCfSource(null)}
        />
      )}

      {modalStruct && (
        <StructureModal
          structure={modalStruct === 'new' ? null : modalStruct}
          onSave={() => { setModalStruct(null); fetchAll(); }}
          onClose={() => setModalStruct(null)}
        />
      )}

      {deleteId && (
        <div className="fm-overlay" onClick={() => setDeleteId(null)}>
          <div className="fm-confirm" onClick={e => e.stopPropagation()}>
            <h3>Delete Fee Structure?</h3>
            <p>All payment records for this structure will also be deleted.</p>
            <div className="fm-confirm-actions">
              <button className="fm-btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="fm-btn-delete" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeesModule;
