import React, { useState, useEffect, useCallback } from 'react';
import { Loader, FileText, BadgeDollarSign } from 'lucide-react';
import AuthService from '../services/AuthService';
import { Avatar } from './StudentsModule';
import FeeInvoice from './FeeInvoice';
import './InvoicesModule.css';

const API_URL      = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function fmt(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-UG');
}

export default function InvoicesModule() {
  const [term, setTerm]           = useState('1');
  const [year, setYear]           = useState(String(CURRENT_YEAR));
  const [className, setClassName] = useState('');
  const [classes, setClasses]     = useState([]);
  const [debtors, setDebtors]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [invoice, setInvoice]     = useState(null); // { studentId, structureId }

  useEffect(() => {
    fetch(`${API_URL}/students/`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => setClasses([...new Set((d.results || []).map(s => s.class_name))].sort()))
      .catch(() => {});
  }, []);

  const fetchDebtors = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ term, year });
    if (className) params.append('class_name', className);
    fetch(`${API_URL}/invoices/debtors/?${params}`, { headers: AuthService.getAuthHeaders() })
      .then(r => r.json())
      .then(d => { setDebtors(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setDebtors([]); setLoading(false); });
  }, [term, year, className]);

  useEffect(() => { fetchDebtors(); }, [fetchDebtors]);

  const totalDebt = debtors.reduce((s, d) => s + d.balance, 0);
  const currency  = debtors[0]?.currency || 'UGX';

  return (
    <div className="im-module">

      {/* Header */}
      <div className="im-header">
        <h2>Fee Invoices</h2>
        <div className="im-header-sub">{debtors.length} student{debtors.length !== 1 ? 's' : ''} with outstanding balance</div>
      </div>

      {/* Filters */}
      <div className="im-filters">
        <div className="im-fg">
          <label>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="im-fg">
          <label>Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
        <div className="im-fg">
          <label>Class</label>
          <select value={className} onChange={e => setClassName(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      {!loading && debtors.length > 0 && (
        <div className="im-summary">
          <div className="im-sum-card">
            <span className="im-sum-val">{debtors.length}</span>
            <span className="im-sum-lbl">Students with Debt</span>
          </div>
          <div className="im-sum-card">
            <span className="im-sum-val im-red">{currency} {fmt(totalDebt)}</span>
            <span className="im-sum-lbl">Total Outstanding</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="im-loading"><Loader size={20} className="im-spinner" /> Loading debtors…</div>
      ) : debtors.length === 0 ? (
        <div className="im-empty">
          <BadgeDollarSign size={40} strokeWidth={1.2} />
          <p>No outstanding balances for Term {term} {year}{className ? ` · ${className}` : ''}.</p>
        </div>
      ) : (
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr>
                <th className="im-th im-th-l">Student</th>
                <th className="im-th im-th-l">Class</th>
                <th className="im-th im-th-l">Fee</th>
                <th className="im-th im-th-r">Total Fee</th>
                <th className="im-th im-th-r">Paid</th>
                <th className="im-th im-th-r">Balance Due</th>
                <th className="im-th im-th-c">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((d, i) => (
                <tr key={i} className="im-row">
                  <td className="im-td">
                    <div className="im-student-cell">
                      <Avatar url={d.photo_url} name={d.student_name} size={30} />
                      <div>
                        <div className="im-sname">{d.student_name}</div>
                        {d.student_no && <div className="im-sno">#{d.student_no}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="im-td">{d.student_class}</td>
                  <td className="im-td">{d.fee_name}</td>
                  <td className="im-td im-td-r">{d.currency} {fmt(d.fee_amount)}</td>
                  <td className="im-td im-td-r im-green">{d.currency} {fmt(d.total_paid)}</td>
                  <td className="im-td im-td-r im-red im-bold">{d.currency} {fmt(d.balance)}</td>
                  <td className="im-td im-td-c">
                    <button
                      className="im-invoice-btn"
                      title="View / Print Invoice"
                      onClick={() => setInvoice({ studentId: d.student_id, structureId: d.fee_structure_id })}
                    >
                      <FileText size={14} />
                      {d.invoice_no ? d.invoice_no : 'Generate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice modal */}
      {invoice && (
        <FeeInvoice
          studentId={invoice.studentId}
          structureId={invoice.structureId}
          onClose={() => setInvoice(null)}
        />
      )}

    </div>
  );
}
