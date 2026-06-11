import React from 'react';
import { BarChart2, Store, Package, WifiOff, ShieldCheck, Zap, Briefcase, ArrowRight } from 'lucide-react';
import './LandingPage.css';

const features = [
  { icon: BarChart2, title: 'Business Analytics', desc: 'Track sales, expenses, and profits in real-time with intuitive dashboards.' },
  { icon: Store, title: 'Multi-Business Support', desc: 'Manage multiple businesses from a single account with ease.' },
  { icon: Package, title: 'Inventory Management', desc: 'Monitor stock levels, set alerts, and never run out of key products.' },
  { icon: WifiOff, title: 'Works Offline', desc: 'All your data is available even without an internet connection.' },
  { icon: ShieldCheck, title: 'Secure & Private', desc: 'Your business data is stored securely and never shared with third parties.' },
  { icon: Zap, title: 'Fast & Simple', desc: 'Designed for speed. Get insights in seconds, not hours.' },
];

function LandingPage({ onSignIn, onRegister }) {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <Briefcase size={26} strokeWidth={2.2} /> BusinessIQ
        </div>
        <div className="landing-nav-actions">
          <button className="btn btn-outline" onClick={onSignIn}>Sign In</button>
          <button className="btn btn-primary" onClick={onRegister}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-content">
          <h1>Run your business <span className="highlight">smarter</span></h1>
          <p>BusinessIQ gives you the tools to track, manage, and grow your business — all in one place, even offline.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onRegister}>Start for Free</button>
            <button className="btn btn-ghost btn-lg" onClick={onSignIn}>Sign In</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="stat-row">
              <div className="stat"><span className="stat-value">$24,500</span><span className="stat-label">Revenue</span></div>
              <div className="stat"><span className="stat-value">$8,200</span><span className="stat-label">Expenses</span></div>
              <div className="stat profit"><span className="stat-value">$16,300</span><span className="stat-label">Profit</span></div>
            </div>
            <div className="bar-chart">
              {[60, 80, 45, 90, 70, 85, 100].map((h, i) => (
                <div key={i} className="bar" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <h2>Everything you need to manage your business</h2>
        <p className="section-sub">Simple tools, powerful results.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <f.icon size={32} strokeWidth={1.8} className="feature-icon" />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create an account</h3>
            <p>Register in seconds. No credit card required.</p>
          </div>
          <div className="step-arrow"><ArrowRight size={28} strokeWidth={2.5} /></div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Add your business</h3>
            <p>Set up one or more businesses and configure your preferences.</p>
          </div>
          <div className="step-arrow"><ArrowRight size={28} strokeWidth={2.5} /></div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Track & grow</h3>
            <p>Log sales, expenses, and inventory. Watch your profits grow.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>Ready to take control of your business?</h2>
        <p>Join thousands of business owners using BusinessIQ today.</p>
        <button className="btn btn-primary btn-lg" onClick={onRegister}>Get Started Free</button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} BusinessIQ. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default LandingPage;
