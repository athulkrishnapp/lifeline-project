import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHeartbeat, FaPowerOff, FaUserCircle, FaMoon, FaSun, FaRobot, FaCog, FaBell } from 'react-icons/fa';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className={`navbar navbar-expand-lg sticky-top theme-navbar ${darkMode ? 'navbar-dark' : 'navbar-light'}`}>
      
      <div className="container-fluid px-4 px-lg-5">
        
        {/* === BRAND LOGO === */}
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <div className="brand-icon-box">
                <FaHeartbeat className="text-white heart-beat" size={20} />
            </div>
            <div className="d-flex flex-column justify-content-center">
                <span className="brand-text">LIFELINE</span>
                <span className="brand-tagline">HEALTH NETWORK</span>
            </div>
        </Link>

        {/* TOGGLER */}
        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
        </button>

        {/* RIGHT SIDE CONTROLS */}
        <div className="collapse navbar-collapse" id="navbarNav">
            <div className="d-flex align-items-center gap-4 ms-auto mt-3 mt-lg-0">
                
                {/* 1. PATIENT SPECIFIC LINKS (AI & NAV) */}
                {isLoggedIn && role === 'patient' && (
                    <div className="d-flex align-items-center gap-4 me-3 border-end pe-4 nav-separators">
                        <Link to="/ai-chat" className="text-decoration-none d-flex align-items-center gap-2 ai-link">
                            <div className="ai-icon-pulse"><FaRobot size={16}/></div>
                            <span className="fw-bold small">AI Assistant</span>
                        </Link>
                        <Link to="/patient-dashboard" className="text-decoration-none fw-bold small theme-link">Dashboard</Link>
                        <Link to="/my-records" className="text-decoration-none fw-bold small theme-link">Records</Link>
                    </div>
                )}

                {/* 2. GLOBAL ICONS (Theme, Notifications) */}
                <div className="d-flex align-items-center gap-2">
                    <button onClick={() => setDarkMode(!darkMode)} className="btn btn-icon rounded-circle theme-icon-btn" title="Toggle Theme">
                        {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
                    </button>
                    {isLoggedIn && (
                        <button className="btn btn-icon rounded-circle theme-icon-btn" title="Notifications">
                            <FaBell size={18} />
                            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style={{width: '10px', height: '10px'}}></span>
                        </button>
                    )}
                </div>

                {/* 3. USER PROFILE & LOGOUT */}
                {isLoggedIn ? (
                <div className="dropdown ms-2">
                    <button className="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                        <div className="avatar-circle">{role === 'patient' ? 'P' : 'D'}</div>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-3 rounded-3 p-2">
                        <li><Link className="dropdown-item small fw-bold py-2 rounded-2" to="/profile"><FaUserCircle className="me-2"/> My Profile</Link></li>
                        <li><Link className="dropdown-item small fw-bold py-2 rounded-2" to="/settings"><FaCog className="me-2"/> Settings</Link></li>
                        <li><hr className="dropdown-divider"/></li>
                        <li><button onClick={handleLogout} className="dropdown-item small fw-bold py-2 rounded-2 text-danger"><FaPowerOff className="me-2"/> Logout</button></li>
                    </ul>
                </div>
                ) : (
                <div className="d-flex gap-2">
                    <Link to="/login" className="btn btn-sm theme-btn-ghost fw-bold px-3 rounded-0">Login</Link>
                    <Link to="/register" className="btn btn-sm btn-primary fw-bold px-4 rounded-0 shadow-sm">Get Started</Link>
                </div>
                )}
            </div>
        </div>
      </div>

      <style>{`
        .theme-navbar { padding: 0.8rem 0; background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0; transition: all 0.3s ease; }
        .brand-icon-box { width: 40px; height: 40px; background: linear-gradient(135deg, #2563eb, #06b6d4); display: flex; align-items: center; justify-content: center; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .heart-beat { animation: heartbeat 2s infinite ease-in-out; }
        .brand-text { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 1.25rem; line-height: 1; letter-spacing: -0.5px; background: linear-gradient(to right, #1e293b, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .brand-tagline { font-size: 0.6rem; font-weight: 700; letter-spacing: 2px; color: #94a3b8; margin-top: 3px; }
        
        .theme-icon-btn { color: #64748b; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background-color: transparent; position: relative; }
        .theme-icon-btn:hover { background-color: #f1f5f9; color: #2563eb; }
        
        .theme-link { color: #334155; transition: color 0.2s; position: relative; }
        .theme-link:hover { color: #2563eb; }
        
        .ai-link { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); padding: 6px 12px; border-radius: 20px; transition: all 0.3s; }
        .ai-link:hover { background: rgba(139, 92, 246, 0.2); transform: translateY(-1px); }
        .ai-icon-pulse { animation: pulse-purple 2s infinite; }

        .avatar-circle { width: 38px; height: 38px; background: #0f172a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
        .dropdown-item:active { background-color: #f1f5f9; color: #000; }

        /* DARK MODE */
        body.dark-mode .theme-navbar { background-color: rgba(15, 23, 42, 0.95); border-bottom: 1px solid #334155; }
        body.dark-mode .brand-text { background: linear-gradient(to right, #fff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        body.dark-mode .theme-link { color: #cbd5e1; } body.dark-mode .theme-link:hover { color: #fff; }
        body.dark-mode .theme-icon-btn { color: #94a3b8; } body.dark-mode .theme-icon-btn:hover { background-color: #334155; color: #fbbf24; }
        body.dark-mode .nav-separators { border-color: #334155 !important; }
        body.dark-mode .avatar-circle { background: #3b82f6; }
        body.dark-mode .dropdown-menu { background-color: #1e293b; border: 1px solid #334155; }
        body.dark-mode .dropdown-item { color: #cbd5e1; } body.dark-mode .dropdown-item:hover { background-color: #334155; }

        @keyframes heartbeat { 0% { transform: scale(1); } 5% { transform: scale(1.15); } 10% { transform: scale(1); } 15% { transform: scale(1.15); } 50% { transform: scale(1); } 100% { transform: scale(1); } }
        @keyframes pulse-purple { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
      `}</style>
    </nav>
  );
}

export default Navbar;