import React, { useEffect, useState } from 'react';
import { X, Printer, Loader } from 'lucide-react';
import AuthService from '../services/AuthService';
import './FeeInvoice.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function fmt(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-UG');
}

export default function FeeInvoice({ studentId, structureId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!studentId || !structureId) return;
    setLoading(true); setError('');
    fetch(`${API_URL}/invoices/${studentId}/${structureId}/`, {
      headers: AuthService.getAuthHeaders(),
    })
      .then(r => { if (!r.ok) throw new Error('Failed to load invoice'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [studentId, structureId]);

  return (
    <>
      <div className="iv-overlay no-print" onClick={onClose} />
      <div className="iv-sheet">

        {/* Top bar */}
        <div className="iv-topbar no-print">
          <span className="iv-topbar-title">Fee Invoice</span>
          <div className="iv-topbar-actions">
            {data && (
              <button className="iv-btn-print" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
            )}
            <button className="iv-btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="iv-body">
          {loading && <div className="iv-state"><Loader size={20} className="iv-spinner" /> Loading…</div>}
          {error   && <div className="iv-state iv-err">{error}</div>}

          {data && (
            <div className="iv-doc">

              {/* ── HEADER ── */}
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

              {/* ── INFO GRID ── */}
              <div className="iv-grid">
                <div>
                  <div className="iv-section-title">Billed To</div>
                  <table className="iv-info-table">
                    <tbody>
                      <tr><td className="iv-lbl">Full Name</td><td className="iv-val">{data.student_name}</td></tr>
                      {data.student_no && (
                        <tr><td className="iv-lbl">Student No.</td><td className="iv-val">#{data.student_no}</td></tr>
                      )}
                      <tr><td className="iv-lbl">Class</td><td className="iv-val">{data.student_class}</td></tr>
                      {data.student_gender && data.student_gender !== 'None' && (
                        <tr><td className="iv-lbl">Gender</td><td className="iv-val">{data.student_gender}</td></tr>
                      )}
                      {data.parent_name && data.parent_name !== 'None' && (
                        <tr><td className="iv-lbl">Parent / Guardian</td><td className="iv-val">{data.parent_name}</td></tr>
                      )}
                      {data.parent_phone && data.parent_phone !== 'None' && (
                        <tr><td className="iv-lbl">Parent Tel.</td><td className="iv-val">{data.parent_phone}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="iv-section-title">Fee Details</div>
                  <table className="iv-info-table">
                    <tbody>
                      <tr><td className="iv-lbl">Fee Structure</td><td className="iv-val">{data.fee_name}</td></tr>
                      <tr><td className="iv-lbl">Class / Term / Year</td><td className="iv-val">{data.fee_class} · Term {data.fee_term} · {data.fee_year}</td></tr>
                      <tr><td className="iv-lbl">Total Fee</td><td className="iv-val">{data.currency} {fmt(data.fee_amount)}</td></tr>
                      <tr><td className="iv-lbl">Amount Paid</td><td className="iv-val iv-green">{data.currency} {fmt(data.total_paid)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="iv-hr" />

              {/* ── INVOICE TABLE ── */}
              <div className="iv-section-title">Invoice Breakdown</div>
              <table className="iv-fee-table">
                <thead>
                  <tr>
                    <th className="iv-th iv-th-l">Description</th>
                    <th className="iv-th iv-th-r">Total Fee</th>
                    <th className="iv-th iv-th-r">Amount Paid</th>
                    <th className="iv-th iv-th-r">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="iv-td iv-td-name">{data.fee_name}</td>
                    <td className="iv-td iv-td-r">{data.currency} {fmt(data.fee_amount)}</td>
                    <td className="iv-td iv-td-r iv-green">{data.currency} {fmt(data.total_paid)}</td>
                    <td className="iv-td iv-td-r iv-red">{data.currency} {fmt(data.balance)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="iv-tfoot">
                    <td className="iv-td iv-tfoot-lbl" colSpan={3}>Total Amount Due</td>
                    <td className="iv-td iv-td-r iv-red iv-bold">{data.currency} {fmt(data.balance)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* ── AMOUNT DUE BOX ── */}
              <div className="iv-due-box">
                <div>
                  <div className="iv-due-label">Total Outstanding</div>
                  <div className="iv-due-val">{data.currency} {fmt(data.balance)}</div>
                </div>
                <div className="iv-due-msg">
                  Please settle this balance promptly to avoid disruption to your child's education.
                </div>
              </div>

              {data.note && (
                <div className="iv-note"><strong>Note:</strong> {data.note}</div>
              )}

              <div className="iv-hr" />

              {/* ── FOOTER ── */}
              <div className="iv-footer">
                <div className="iv-sig">
                  <div className="iv-sig-line" />
                  <div className="iv-sig-lbl">Authorised Signature</div>
                </div>
                <div className="iv-footer-mid">
                  <div className="iv-footer-school">{data.school_name}</div>
                  <div className="iv-footer-sub">Official Fee Invoice · {data.invoice_no}</div>
                </div>
                <div className="iv-footer-right">
                  <div className="iv-sig-line iv-sig-line-r" />
                  <div className="iv-sig-lbl">Received By</div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
