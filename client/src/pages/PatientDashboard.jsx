import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaUserCircle, FaNotesMedical, FaRobot, FaCalendarCheck, FaCog, 
  FaArrowRight, FaPills, FaFileMedicalAlt, FaMicroscope, FaHome, 
  FaSignOutAlt, FaSyringe, FaAllergies, FaTint 
} from 'react-icons/fa';
import axios from 'axios';

function PatientDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        try {
            const res = await axios.get('http://localhost:5000/api/profile', { headers: { Authorization: token } });
            setUser(res.data); setLoading(false);
        } catch (err) { setLoading(false); }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary"></div></div>;
  if (!user) return <div className="text-center p-5">Please login again.</div>;

  // --- FEATURE LINKS DATA ---
  const navLinks = [
    { name: 'Dashboard Home', icon: <FaHome size={18}/>, link: '/patient-dashboard', active: true },
    { name: 'Book Appointment', icon: <FaCalendarCheck size={18}/>, link: '/book-appointment' },
    { name: 'Medical Records', icon: <FaFileMedicalAlt size={18}/>, link: '/my-records' },
    { name: 'Prescriptions', icon: <FaPills size={18}/>, link: '/prescriptions' },
    { name: 'Lab Reports', icon: <FaMicroscope size={18}/>, link: '/lab-reports' },
    { name: 'AI Health Assistant', icon: <FaRobot size={18}/>, link: '/ai-chat', special: true },
    { name: 'Profile Settings', icon: <FaCog size={18}/>, link: '/profile' },
  ];

  return (
    <div className="page-background transition-bg" style={{ minHeight: '100vh' }}>
      
      <div className="container-fluid">
        <div className="row">
            
            {/* ==================== LEFT SIDEBAR ==================== */}
            <div className="col-lg-3 col-md-4 d-none d-md-block sidebar-container p-0 border-end theme-border">
                <div className="sticky-top" style={{ top: '80px', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
                    
                    {/* 1. DIGITAL ID SECTION (QR) */}
                    <div className="p-4 border-bottom theme-border">
                        <div className="qr-card-gradient p-4 rounded-4 text-center text-white shadow-lg mb-3 position-relative overflow-hidden">
                            <div className="position-relative z-1">
                                <h6 className="fw-bold letter-spacing-2 mb-3 opacity-75" style={{fontSize: '10px'}}>UNIVERSAL HEALTH ID</h6>
                                <div className="bg-white p-2 rounded-3 d-inline-block shadow-sm mb-3">
                                    <QRCodeSVG value={user.unique_lifeline_id} size={110} />
                                </div>
                                <div className="fs-6 fw-bold text-shadow letter-spacing-1">{user.unique_lifeline_id}</div>
                            </div>
                            {/* Abstract BG */}
                            <div className="position-absolute top-0 start-0 w-100 h-100 bg-pattern-white opacity-10"></div>
                        </div>
                        
                        <div className="text-center">
                            <h5 className="fw-bold theme-text mb-1">{user.full_name}</h5>
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-3">
                                {user.blood_group || 'O+'} Blood
                            </span>
                        </div>
                    </div>

                    {/* 2. FEATURE NAVIGATION */}
                    <div className="p-3">
                        <small className="fw-bold theme-text-muted px-3 mb-2 d-block letter-spacing-1" style={{fontSize: '11px'}}>MENU</small>
                        <div className="d-flex flex-column gap-1">
                            {navLinks.map((item, index) => (
                                <Link 
                                    key={index} 
                                    to={item.link} 
                                    className={`nav-item-link d-flex align-items-center gap-3 px-3 py-3 rounded-3 text-decoration-none ${item.active ? 'active' : ''} ${item.special ? 'ai-special' : ''}`}
                                >
                                    <div className={`icon-box ${item.special ? 'text-white' : ''}`}>{item.icon}</div>
                                    <span className="fw-bold small">{item.name}</span>
                                    {item.special && <span className="ms-auto badge bg-white text-primary fw-bold" style={{fontSize: '9px'}}>NEW</span>}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div className="p-4 mt-auto">
                        <button onClick={handleLogout} className="btn btn-outline-danger w-100 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2">
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>

                </div>
            </div>

            {/* ==================== RIGHT MAIN CONTENT ==================== */}
            <div className="col-lg-9 col-md-8 p-0">
                <div className="p-4 p-lg-5">
                    
                    {/* Header Mobile Only (Sidebar hidden on mobile) */}
                    <div className="d-block d-md-none mb-4">
                        <h1 className="fw-bold theme-text">Dashboard</h1>
                        <p className="theme-text-muted">Welcome, {user.full_name}</p>
                    </div>

                    {/* 1. AI INSIGHT BANNER */}
                    <div className="ai-insight-card p-4 rounded-4 mb-5 position-relative overflow-hidden text-white shadow-lg animate-slide-up">
                        <div className="position-relative z-1 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <div className="badge bg-white bg-opacity-20 backdrop-blur border border-white border-opacity-25 rounded-pill px-3"><FaRobot className="me-2"/> AI Analysis</div>
                                    <small className="opacity-75">Updated 2m ago</small>
                                </div>
                                <h4 className="fw-bold mb-2">Health Status: Stable</h4>
                                <p className="opacity-90 m-0" style={{maxWidth: '600px'}}>
                                    "Your recent vitals are within normal range. Remember to stay hydrated given your history of kidney stones. Your prescription for <strong>Amoxicillin</strong> ends tomorrow."
                                </p>
                            </div>
                            <Link to="/ai-chat" className="btn btn-white text-primary fw-bold px-4 py-2 rounded-pill shadow-sm white-button">
                                Ask AI Assistant <FaArrowRight className="ms-2"/>
                            </Link>
                        </div>
                    </div>

                    {/* 2. VITALS & QUICK STATS ROW */}
                    <div className="row g-3 mb-5">
                        <div className="col-md-4">
                            <div className="stat-card p-4 rounded-4 border theme-border h-100 d-flex align-items-center gap-3">
                                <div className="icon-circle bg-danger bg-opacity-10 text-danger"><FaTint size={24}/></div>
                                <div>
                                    <small className="theme-text-muted fw-bold">BLOOD PRESSURE</small>
                                    <h4 className="fw-bold theme-text m-0">120/80</h4>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="stat-card p-4 rounded-4 border theme-border h-100 d-flex align-items-center gap-3">
                                <div className="icon-circle bg-success bg-opacity-10 text-success"><FaSyringe size={24}/></div>
                                <div>
                                    <small className="theme-text-muted fw-bold">VACCINES</small>
                                    <h4 className="fw-bold theme-text m-0">Up to Date</h4>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="stat-card p-4 rounded-4 border theme-border h-100 d-flex align-items-center gap-3">
                                <div className="icon-circle bg-warning bg-opacity-10 text-warning"><FaAllergies size={24}/></div>
                                <div>
                                    <small className="theme-text-muted fw-bold">ALLERGIES</small>
                                    <h4 className="fw-bold theme-text m-0">{user.allergies ? 'Active' : 'None'}</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. RECENT ACTIVITY (Placeholder) */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <h5 className="fw-bold theme-text m-0">Recent Timeline</h5>
                        <Link to="/my-records" className="small fw-bold text-primary text-decoration-none">View All</Link>
                    </div>
                    
                    <div className="timeline-container">
                        {[1, 2].map((_, i) => (
                            <div key={i} className="timeline-item p-4 rounded-4 border theme-border mb-3 bg-white theme-bg-card d-flex align-items-start gap-3">
                                <div className="date-box text-center rounded-3 bg-light theme-bg-dark p-2" style={{minWidth: '60px'}}>
                                    <div className="fw-bold theme-text">FEB</div>
                                    <div className="fs-5 fw-bold text-primary">{10 - i}</div>
                                </div>
                                <div>
                                    <h6 className="fw-bold theme-text mb-1">General Checkup - City Hospital</h6>
                                    <p className="theme-text-muted small mb-2">Dr. Sarah Smith • Cardiology</p>
                                    <span className="badge bg-light text-dark border">Routine Checkup</span>
                                </div>
                                <div className="ms-auto d-none d-sm-block">
                                    <button className="btn btn-sm btn-outline-primary rounded-pill px-3">View Report</button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

        </div>
      </div>

      <style>{`
        /* LAYOUT & THEME */
        .page-background { background-color: #f8fafc; }
        .theme-text { color: #0f172a; } .theme-text-muted { color: #64748b; }
        .theme-border { border-color: #e2e8f0 !important; }
        .theme-bg-card { background-color: #ffffff; }
        
        /* SIDEBAR STYLES */
        .sidebar-container { background-color: #ffffff; min-height: 100vh; }
        
        .nav-item-link { color: #64748b; transition: all 0.2s; border: 1px solid transparent; }
        .nav-item-link:hover { background-color: #f1f5f9; color: #0f172a; }
        .nav-item-link.active { background-color: #eff6ff; color: #2563eb; border-color: #dbeafe; }
        
        /* Special AI Button Style */
        .ai-special { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); }
        .ai-special:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4); }
        
        /* QR CARD */
        .qr-card-gradient { background: linear-gradient(135deg, #0f172a, #334155); }
        .bg-pattern-white { background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 10px 10px; }
        
        /* AI INSIGHT CARD */
        .ai-insight-card { background: linear-gradient(120deg, #2563eb, #06b6d4); }
        .white-button { background-color: #fff; color: #2563eb; transition: transform 0.2s; }
        .white-button:hover { transform: translateY(-2px); background-color: #f8fafc; }

        /* STATS */
        .stat-card { background-color: #fff; transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-3px); border-color: #cbd5e1 !important; }
        .icon-circle { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        /* DARK MODE */
        body.dark-mode .page-background { background-color: #0f172a !important; }
        body.dark-mode .sidebar-container { background-color: #1e293b; border-right: 1px solid #334155 !important; }
        body.dark-mode .theme-text { color: #fff; } body.dark-mode .theme-text-muted { color: #94a3b8; }
        body.dark-mode .theme-border { border-color: #334155 !important; }
        body.dark-mode .theme-bg-card { background-color: #1e293b; }
        body.dark-mode .theme-bg-dark { background-color: #0f172a !important; }
        
        body.dark-mode .nav-item-link { color: #cbd5e1; }
        body.dark-mode .nav-item-link:hover { background-color: #334155; color: #fff; }
        body.dark-mode .nav-item-link.active { background-color: #1e40af; color: #fff; border-color: #1e3a8a; }
        
        body.dark-mode .stat-card { background-color: #1e293b; border-color: #334155 !important; }

        .letter-spacing-1 { letter-spacing: 1px; } .letter-spacing-2 { letter-spacing: 2px; }
        .text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}

export default PatientDashboard;