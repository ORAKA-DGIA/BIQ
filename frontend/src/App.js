import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import BusinessSelector from './components/BusinessSelector';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AuthService from './services/AuthService';

function AppRoutes() {
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [staffProfile,    setStaffProfile]    = useState(null);
  const [page,            setPage]            = useState('landing');
  const [authChecked,     setAuthChecked]     = useState(false);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) { setAuthChecked(true); return; }

    const sp = AuthService.getStaffProfile();
    if (sp) {
      // Staff session — refresh profile from server first, then load business
      AuthService.refreshStaffProfile().then(fresh => {
        const profile = fresh || sp;
        setStaffProfile(profile);
        if (profile.business) {
          setCurrentBusiness(profile.business);
          setPage('app');
        } else {
          AuthService.logout();
          setPage('landing');
        }
        setAuthChecked(true);
      });
    } else {
      setPage('app');
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = (meta) => {
    if (meta?.isStaff) {
      // Profile already saved by saveStaffSession; refresh from server for latest data
      AuthService.refreshStaffProfile().then(fresh => {
        const sp = fresh || AuthService.getStaffProfile();
        setStaffProfile(sp);
        if (sp?.business) { setCurrentBusiness(sp.business); setPage('app'); }
      });
    } else {
      setStaffProfile(null);
      setPage('app');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentBusiness(null);
    setStaffProfile(null);
    setPage('landing');
  };

  if (!authChecked) return null;

  if (page === 'landing') {
    return (
      <LandingPage
        onSignIn={() => setPage('login')}
        onRegister={() => setPage('register')}
      />
    );
  }

  if (page === 'login') {
    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={() => setPage('register')}
      />
    );
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onRegister={() => setPage('app')}
        onSignIn={() => setPage('login')}
      />
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route
          path="/*"
          element={
            currentBusiness
              ? <Dashboard
                  business={currentBusiness}
                  staffProfile={staffProfile}
                  onBack={staffProfile ? null : () => setCurrentBusiness(null)}
                  onLogout={handleLogout}
                />
              : <BusinessSelector onSelect={setCurrentBusiness} onLogout={handleLogout} />
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </Router>
  );
}

export default App;
