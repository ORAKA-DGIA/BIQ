import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Users, ClipboardList, CalendarCheck,
  FileText, Wallet, Settings, Wifi, WifiOff, LogOut,
  ChevronLeft, Menu, X, GraduationCap, BadgeDollarSign, CreditCard, MoreHorizontal,
  UserCircle, UserCog, Building2, Bell, ChevronRight,
  TrendingUp, AlertCircle, UserPlus
} from 'lucide-react';
import './Dashboard.css';
import AuthService from '../services/AuthService';
import StudentsModule from './StudentsModule';
import MarksModule from './MarksModule';
import AttendanceModule from './AttendanceModule';
import FeesModule from './FeesModule';
import SchoolSettingsModule from './SchoolSettingsModule';
import StaffSettingsModule from './StaffSettingsModule';

const SCHOOL_TYPES = ['Education & Training', 'schools'];

const SCHOOL_MODULES = [
  { key: 'overview',    label: 'Dashboard',  shortLabel: 'Home',       icon: LayoutDashboard },
  { key: 'students',    label: 'Students',   shortLabel: 'Students',   icon: Users },
  { key: 'marks',       label: 'Marks Entry',shortLabel: 'Marks',      icon: ClipboardList },
  { key: 'attendance',  label: 'Attendance', shortLabel: 'Attend',     icon: CalendarCheck },
  { key: 'reportcards', label: 'Report Cards',shortLabel: 'Reports',   icon: FileText },
  { key: 'fees',        label: 'Fees',       shortLabel: 'Fees',       icon: BadgeDollarSign },
  { key: 'payments',    label: 'Payments',   shortLabel: 'Payments',   icon: CreditCard },
  { key: 'accounting',  label: 'Accounting', shortLabel: 'Accounting', icon: Wallet },
  { key: 'settings',    label: 'Settings',   shortLabel: 'Settings',   icon: Settings },
];

const DEFAULT_MODULES = [
  { key: 'overview',   label: 'Dashboard',  shortLabel: 'Home',      icon: LayoutDashboard },
  { key: 'customers',  label: 'Customers',  shortLabel: 'Customers', icon: Users },
  { key: 'inventory',  label: 'Inventory',  shortLabel: 'Inventory', icon: ClipboardList },
  { key: 'sales',      label: 'Sales',      shortLabel: 'Sales',     icon: Wallet },
  { key: 'reports',    label: 'Reports',    shortLabel: 'Reports',   icon: FileText },
  { key: 'settings',   label: 'Settings',   shortLabel: 'Settings',  icon: Settings },
];

function isSchool(business) {
  return SCHOOL_TYPES.some(t =>
    business.category?.toLowerCase().includes(t.toLowerCase()) ||
    t.toLowerCase().includes(business.category?.toLowerCase())
  );
}

/* ── Placeholder for unbuilt modules ── */
function ComingSoon({ label }) {
  return (
    <div className="coming-soon">
      <GraduationCap size={48} strokeWidth={1.2} />
      <h2>{label}</h2>
      <p>This module is under development.</p>
    </div>
  );
}

/* ── Overview ── */
function OverviewModule({ business }) {
  const user = AuthService.getUser();
  const school = isSchool(business);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!school) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/dashboard/stats/?business_id=${business.id}`,
        { headers: AuthService.getAuthHeaders() }
      );
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [school, business.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!school) {
    const bizStats = [
      { label: 'Customers', value: '0', icon: Users },
      { label: 'Revenue', value: '$0', icon: Wallet },
      { label: 'Orders Today', value: '0', icon: TrendingUp },
      { label: 'Inventory Items', value: '0', icon: ClipboardList },
    ];
    return (
      <div className="overview">
        <div className="overview-welcome">
          <h2>Welcome back, {user?.first_name || 'there'} 👋</h2>
          <p>{business.name} — {business.category}</p>
        </div>
        <div className="stats-grid">
          {bizStats.map(s => (
            <div key={s.label} className="stat-card">
              <s.icon size={20} strokeWidth={1.5} className="stat-icon" />
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fmt = (n) => n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(Math.round(n));

  const currency = stats?.currency || 'UGX';

  const schoolStats = [
    {
      label: 'Total Students',
      value: loading ? '…' : (stats?.total_students ?? '0'),
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Classes',
      value: loading ? '…' : (stats?.total_classes ?? '0'),
      icon: GraduationCap,
      color: 'purple',
    },
    {
      label: 'Attendance Today',
      value: loading ? '…' : (stats?.attendance_taken ? `${stats.attendance_today ?? 0}%` : 'Not taken'),
      icon: CalendarCheck,
      color: stats?.attendance_today >= 80 ? 'green' : stats?.attendance_today != null ? 'orange' : 'gray',
    },
    {
      label: `Fee Collection ${new Date().getFullYear()}`,
      value: loading ? '…' : `${currency} ${fmt(stats?.fee_collected ?? 0)}`,
      sub: loading || !stats?.fee_expected ? null : `of ${currency} ${fmt(stats.fee_expected)} expected`,
      icon: BadgeDollarSign,
      color: 'green',
    },
    {
      label: 'Outstanding Fees',
      value: loading ? '…' : `${currency} ${fmt(stats?.fee_outstanding ?? 0)}`,
      icon: AlertCircle,
      color: stats?.fee_outstanding > 0 ? 'red' : 'green',
    },
  ];

  return (
    <div className="overview">
      <div className="overview-welcome">
        <h2>Welcome back, {user?.first_name || 'there'} 👋</h2>
        <p>{business.name} — {business.category}</p>
      </div>

      {error && <div className="overview-error"><AlertCircle size={14} /> {error}</div>}

      <div className="stats-grid">
        {schoolStats.map(s => (
          <div key={s.label} className={`stat-card stat-card--${s.color}`}>
            <div className="stat-card-icon"><s.icon size={20} strokeWidth={1.5} /></div>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
            {s.sub && <span className="stat-sub">{s.sub}</span>}
          </div>
        ))}
      </div>

      {/* Recent enrolments */}
      {!loading && stats?.recent_students?.length > 0 && (
        <div className="overview-recent">
          <div className="overview-recent-header">
            <UserPlus size={16} strokeWidth={1.8} />
            <span>Recent Enrolments</span>
          </div>
          <div className="overview-recent-list">
            {stats.recent_students.map(s => (
              <div key={s.id} className="overview-recent-item">
                <div className="overview-recent-avatar">
                  {s.first_name[0]}{s.last_name[0]}
                </div>
                <div className="overview-recent-info">
                  <span className="overview-recent-name">{s.first_name} {s.last_name}</span>
                  <span className="overview-recent-meta">{s.class_name} · {s.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Report Cards ── */
function ReportCardsModule() {
  return (
    <div className="module-page">
      <div className="module-page-header">
        <h2>Report Cards</h2>
        <button className="btn-primary">Generate</button>
      </div>
      <div className="empty-state">
        <FileText size={40} strokeWidth={1.2} />
        <p>No report cards generated yet.</p>
      </div>
    </div>
  );
}

/* ── Payments ── */
function PaymentsModule() {
  return (
    <div className="module-page">
      <div className="module-page-header">
        <h2>Payments</h2>
        <button className="btn-primary">+ Record Payment</button>
      </div>
      <div className="fees-summary">
        <div className="stat-card"><span className="stat-value">0</span><span className="stat-label">Payments This Month</span></div>
        <div className="stat-card"><span className="stat-value">$0</span><span className="stat-label">Amount This Month</span></div>
        <div className="stat-card"><span className="stat-value">0</span><span className="stat-label">Pending</span></div>
      </div>
      <div className="empty-state" style={{ marginTop: 24 }}>
        <CreditCard size={40} strokeWidth={1.2} />
        <p>No payments recorded yet.</p>
      </div>
    </div>
  );
}

/* ── Accounting ── */
function AccountingModule() {
  return (
    <div className="module-page">
      <div className="module-page-header">
        <h2>Accounting</h2>
        <button className="btn-primary">+ New Transaction</button>
      </div>
      <div className="empty-state">
        <Wallet size={40} strokeWidth={1.2} />
        <p>No transactions recorded yet.</p>
      </div>
    </div>
  );
}

/* ── Settings ── */
const SETTINGS_CARDS = [
  { key: 'account',      label: 'Account Settings',  desc: 'Manage your profile, password & login preferences', icon: UserCircle },
  { key: 'staff',        label: 'Staff Settings',     desc: 'Manage staff roles, permissions and access levels',  icon: UserCog },
  { key: 'school',        label: 'School Settings',    desc: 'School name, logo, motto, stamp, UNEB numbers & location', icon: Building2 },
  { key: 'notifications',label: 'Notifications',      desc: 'Configure alerts, reminders and notification rules',  icon: Bell },
];

function SettingsModule({ business, onBusinessUpdate }) {
  const [openCard, setOpenCard] = useState(null);

  if (openCard === 'staff') {
    return <StaffSettingsModule business={business} onBack={() => setOpenCard(null)} />;
  }

  if (openCard === 'school') {
    return <SchoolSettingsModule business={business} onBack={() => setOpenCard(null)} onBusinessUpdate={onBusinessUpdate} />;
  }

  if (openCard) {
    const card = SETTINGS_CARDS.find(c => c.key === openCard);
    return (
      <div className="module-page">
        <div className="module-page-header">
          <button className="settings-back-btn" onClick={() => setOpenCard(null)}>
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back
          </button>
          <h2>{card.label}</h2>
          <span />
        </div>
        <div className="settings-empty-panel">
          <card.icon size={44} strokeWidth={1.2} />
          <p>{card.label} content coming soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="module-page-header">
        <h2>Settings</h2>
      </div>
      <div className="settings-cards-grid">
        {SETTINGS_CARDS.map(({ key, label, desc, icon: Icon }) => (
          <button key={key} className="settings-nav-card" onClick={() => setOpenCard(key)}>
            <div className="settings-nav-icon"><Icon size={26} strokeWidth={1.5} /></div>
            <div className="settings-nav-body">
              <span className="settings-nav-title">{label}</span>
              <span className="settings-nav-desc">{desc}</span>
            </div>
            <ChevronRight size={18} className="settings-nav-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
function Dashboard({ business, onBack, onLogout, staffProfile }) {
  const [isOnline, setIsOnline]        = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen]  = useState(true);
  const [moreOpen, setMoreOpen]        = useState(false);
  const [businessData, setBusinessData] = useState(business);

  // Always ensure assigned_pages is a real array (guard against stringified JSON)
  const allModules = isSchool(business) ? SCHOOL_MODULES : DEFAULT_MODULES;
  const assignedPages = React.useMemo(() => {
    const raw = staffProfile?.assigned_pages;
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  }, [staffProfile]);

  const role = staffProfile?.additional_role || '';

  // Role-based page overrides
  const effectivePages = React.useMemo(() => {
    if (!staffProfile) return null; // owner sees all
    if (role === 'head_teacher') return allModules.map(m => m.key); // all pages
    if (role === 'deputy_head') {
      // All except accounting and payments
      const blocked = new Set(['accounting', 'payments']);
      return (assignedPages?.length ? assignedPages : allModules.map(m => m.key))
        .filter(k => !blocked.has(k));
    }
    return assignedPages?.length ? assignedPages : null;
  }, [staffProfile, role, assignedPages, allModules]);

  // For staff: only show assigned pages; for admin: show all
  const modules = effectivePages?.length
    ? allModules.filter(m => effectivePages.includes(m.key))
    : allModules;

  // Staff lands on their first assigned page; admin lands on overview
  const defaultPage = effectivePages?.[0] || 'overview';
  const [active, setActive] = useState(defaultPage);

  const drawerRef = useRef();

  const handleBusinessUpdate = (updated) => {
    setBusinessData(prev => ({ ...prev, ...updated }));
    Object.assign(business, updated);
  };

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  // Close More drawer when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Bottom nav: first 4 modules as primary, rest go into More
  const PRIMARY_COUNT = 4;
  const primaryModules = modules.slice(0, PRIMARY_COUNT);
  const moreModules    = modules.slice(PRIMARY_COUNT);
  const isMoreActive   = moreModules.some(m => m.key === active);

  const navigate = (key) => {
    setActive(key);
    setMoreOpen(false);
  };

  const renderContent = () => {
    switch (active) {
      case 'overview':    return <OverviewModule business={businessData} />;
      case 'students':    return <StudentsModule business={businessData} staffProfile={staffProfile} />;
      case 'marks':       return <MarksModule business={businessData} staffProfile={staffProfile} />;
      case 'attendance':  return <AttendanceModule business={businessData} staffProfile={staffProfile} />;
      case 'reportcards': return <ReportCardsModule />;
      case 'fees':        return <FeesModule business={businessData} staffProfile={staffProfile} />;
      case 'payments':    return <PaymentsModule />;
      case 'accounting':  return <AccountingModule />;
      case 'settings':    return <SettingsModule business={businessData} onBusinessUpdate={handleBusinessUpdate} />;
      default:            return <ComingSoon label={modules.find(m => m.key === active)?.label} />;
    }
  };

  return (
    <div className="db-layout">

      {/* ── Desktop sidebar ── */}
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="db-sidebar-header">
          {sidebarOpen && <span className="db-sidebar-title">{businessData.name}</span>}
          <button className="db-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="db-nav">
          {modules.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`db-nav-item ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="db-sidebar-footer">
          {!staffProfile && (
            <button className="db-nav-item" onClick={onBack} title={!sidebarOpen ? 'Switch Business' : undefined}>
              <ChevronLeft size={18} strokeWidth={1.8} />
              {sidebarOpen && <span>Switch Business</span>}
            </button>
          )}
          <button className="db-nav-item danger" onClick={onLogout} title={!sidebarOpen ? 'Logout' : undefined}>
            <LogOut size={18} strokeWidth={1.8} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="db-main">
        {/* Topbar */}
        <header className="db-topbar">
          <div className="db-topbar-left">
            <h2>{modules.find(m => m.key === active)?.label}</h2>
          </div>
          <div className="db-topbar-right">
            {staffProfile && (
              <div className="db-staff-badge">
                <span className="db-staff-name">{staffProfile.full_name}</span>
                {staffProfile.additional_role && staffProfile.additional_role !== 'none' && staffProfile.additional_role !== 'None' && (
                  <span className="db-staff-role">{staffProfile.additional_role.replace(/_/g, ' ')}</span>
                )}
              </div>
            )}
            <div className={`db-status ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <><Wifi size={13} /> Online</> : <><WifiOff size={13} /> Offline</>}
            </div>
          </div>
        </header>

        <main className="db-content">
          {renderContent()}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="db-bottom-nav">
        {primaryModules.map(({ key, label, shortLabel, icon: Icon }) => (
          <button
            key={key}
            className={`db-bn-item ${active === key ? 'active' : ''}`}
            onClick={() => navigate(key)}
          >
            <Icon size={22} strokeWidth={1.8} />
            <span>{shortLabel || label}</span>
          </button>
        ))}

        {/* More button */}
        <button
          className={`db-bn-item ${isMoreActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(o => !o)}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span>More</span>
        </button>
      </nav>

      {/* ── More drawer (mobile) ── */}
      {moreOpen && (
        <div className="db-more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="db-more-drawer" ref={drawerRef} onClick={e => e.stopPropagation()}>
            <div className="db-more-handle" />
            <div className="db-more-title">{businessData.name}</div>
            <div className="db-more-grid">
              {moreModules.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`db-more-item ${active === key ? 'active' : ''}`}
                  onClick={() => navigate(key)}
                >
                  <div className="db-more-icon">
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="db-more-footer">
              {!staffProfile && (
                <button className="db-more-action" onClick={() => { setMoreOpen(false); onBack(); }}>
                  <ChevronLeft size={16} /> Switch Business
                </button>
              )}
              <button className="db-more-action danger" onClick={() => { setMoreOpen(false); onLogout(); }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
