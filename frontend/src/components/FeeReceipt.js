import React, { useEffect, useState } from 'react';
import { X, Printer, Loader } from 'lucide-react';
import AuthService from '../services/AuthService';
import './FeeReceipt.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const METHOD_LABELS = {
  cash: 'Cash', mobile_money: 'Mobile Money',
  bank: 'Bank Transfer', cheque: 'Cheque', other: 'Other',
};

function fmt(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-UG');
}

export default function FeeReceipt({ paymentId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!paymentId) return;
    setLoading(true); setError('');
    fetch(`${API_URL}/receipt/${paymentId}/`, { headers: AuthService.getAuthHeaders() })
      .then(r => { if (!r.ok) throw new Error('Failed to load receipt'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [paymentId]);

  const isCleared = data && Number(data.balance) <= 0;
  const payDate   = data
    ? new Date(data.payment_date + 'T00:00:00')
        .toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <div className="rc-overlay no-print" onClick={onClose} />

      <div className="rc-sheet">
        {/* Top bar */}
        <div className="rc-topbar no-print">
          <span className="rc-topbar-title">Fee Receipt</span>
          <div className="rc-topbar-actions">
            {data && (
              <button className="rc-btn-print" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
            )}
            <button className="rc-btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="rc-body">
          {loading && <div className="rc-state"><Loader size={20} className="rc-spinner" /> Loading…</div>}
          {error   && <div className="rc-state rc-err">{error}</div>}

          {data && (
            <div className="rc-doc">

              {/* ── HEADER ── */}
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

              {/* ── INFO TABLES SIDE BY SIDE ── */}
              <div className="rc-grid">

                {/* Student */}
                <div>
                  <div className="rc-section-title">Student Information</div>
                  <table className="rc-info-table">
                    <tbody>
                      <tr>
                        <td className="rc-lbl">Full Name</td>
                        <td className="rc-val">{data.student_name}</td>
                      </tr>
                      {data.student_no && (
                        <tr>
                          <td className="rc-lbl">Student No.</td>
                          <td className="rc-val">#{data.student_no}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="rc-lbl">Class</td>
                        <td className="rc-val">{data.student_class}</td>
                      </tr>
                      {data.student_gender && data.student_gender !== 'None' && (
                        <tr>
                          <td className="rc-lbl">Gender</td>
                          <td className="rc-val">{data.student_gender}</td>
                        </tr>
                      )}
                      {data.parent_name && data.parent_name !== 'None' && (
                        <tr>
                          <td className="rc-lbl">Parent / Guardian</td>
                          <td className="rc-val">{data.parent_name}</td>
                        </tr>
                      )}
                      {data.parent_phone && data.parent_phone !== 'None' && (
                        <tr>
                          <td className="rc-lbl">Parent Tel.</td>
                          <td className="rc-val">{data.parent_phone}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payment details */}
                <div>
                  <div className="rc-section-title">Payment Details</div>
                  <table className="rc-info-table">
                    <tbody>
                      <tr>
                        <td className="rc-lbl">Payment Date</td>
                        <td className="rc-val">{payDate}</td>
                      </tr>
                      <tr>
                        <td className="rc-lbl">Payment Method</td>
                        <td className="rc-val">{METHOD_LABELS[data.method] || data.method}</td>
                      </tr>
                      {data.reference && data.reference !== 'carry_forward' && (
                        <tr>
                          <td className="rc-lbl">Reference</td>
                          <td className="rc-val">{data.reference}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="rc-lbl">Fee Structure</td>
                        <td className="rc-val">{data.fee_name}</td>
                      </tr>
                      <tr>
                        <td className="rc-lbl">Class / Term / Year</td>
                        <td className="rc-val">{data.fee_class} · Term {data.fee_term} · {data.fee_year}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rc-hr" />

              {/* ── FEE BREAKDOWN TABLE ── */}
              <div className="rc-section-title">Fee Breakdown</div>
              <table className="rc-fee-table">
                <thead>
                  <tr>
                    <th className="rc-th rc-th-l">Fee</th>
                    <th className="rc-th rc-th-r">Total Fee</th>
                    <th className="rc-th rc-th-r">This Payment</th>
                    <th className="rc-th rc-th-r">Total Paid</th>
                    <th className="rc-th rc-th-r">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="rc-td rc-td-name">{data.fee_name}</td>
                    <td className="rc-td rc-td-r">{data.currency} {fmt(data.fee_amount)}</td>
                    <td className="rc-td rc-td-r rc-c-indigo">{data.currency} {fmt(data.amount_paid)}</td>
                    <td className="rc-td rc-td-r rc-c-green">{data.currency} {fmt(data.total_paid)}</td>
                    <td className={`rc-td rc-td-r ${isCleared ? 'rc-c-green' : 'rc-c-red'}`}>
                      {data.currency} {fmt(data.balance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {data.note && (
                <div className="rc-note"><strong>Note:</strong> {data.note}</div>
              )}

              <div className="rc-hr" />

              {/* ── FOOTER ── */}
              <div className="rc-footer">
                <div className="rc-sig">
                  <div className="rc-sig-line" />
                  <div className="rc-sig-lbl">Authorised Signature</div>
                </div>
                <div className="rc-footer-mid">
                  <div className="rc-footer-school">{data.school_name}</div>
                  <div className="rc-footer-sub">Official Receipt · {data.receipt_no}</div>
                </div>
                <div className="rc-footer-right">
                  <div className="rc-sig-line rc-sig-line-r" />
                  <div className="rc-sig-lbl">Received By</div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
