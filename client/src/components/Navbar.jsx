import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
    FaHeartbeat, FaPowerOff, FaUserCircle, FaMoon, FaSun, FaRobot, 
    FaBell, FaArrowLeft, FaBars, FaExclamationTriangle, FaTimes, 
    FaHistory, FaShieldAlt, FaSortAmountDown, FaSortAmountUp, FaSearch 
} from 'react-icons/fa';
import Notification from './Notification';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  // --- STATES ---
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [showMenu, setShowMenu] = useState(false); 
  const [showNotif, setShowNotif] = useState(false); 
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileImage, setProfileImage] = useState(null); 
  
  // Report Modal States
 // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ doctor_name: '', hospital_name: '', department: '', reason: '', details: '' });


  
  // Access Log Modal States
  const [showLogModal, setShowLogModal] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logSort, setLogSort] = useState('desc');
  const [logsLoading, setLogsLoading] = useState(false);
  
  const menuRef = useRef(null);

  // Determine Home Link dynamically based on Role
  let homeLink = '/';
  if (isLoggedIn) {
      if (role === 'patient') homeLink = '/patient-dashboard';
      else if (role === 'doctor') homeLink = '/doctor-dashboard';
      else if (role === 'pharmacist') homeLink = '/pharmacist-dashboard';
      else if (role === 'admin') homeLink = '/admin-dashboard';
  }

  // Toggle Theme
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Close menus outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Initial Data
  useEffect(() => {
    const initData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const notifRes = await axios.get('http://localhost:5000/api/notifications', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(notifRes.data.filter(n => n.is_read === 0).length);

            if (role === 'patient') {
                const profileRes = await axios.get('http://localhost:5000/api/profile', { 
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfileImage(profileRes.data.profile_image);
            }
        } catch (err) { console.error("Navbar data fetch error", err); }
    };
    if (isLoggedIn) initData();
  }, [isLoggedIn, role]);

  const handleLogout = () => {
    localStorage.clear();
    navigate(role === 'admin' ? '/system-override' : '/login');
  };

  const submitReport = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
        await axios.post('http://localhost:5000/api/patient/report', reportForm, {
            headers: { Authorization: `Bearer ${token}` }
        });
        alert("Report submitted successfully. Admin has been notified.");
        setShowReportModal(false);
        setReportForm({ doctor_name: '', hospital_name: '', department: '', reason: '', details: '' }); // Clear it
    } catch (err) {
        alert("Failed to submit report.");
    }
  };

  const fetchAccessLogs = async () => {
      setLogsLoading(true);
      const token = localStorage.getItem('token');
      try {
          const res = await axios.get('http://localhost:5000/api/patient/access-logs', {
              headers: { Authorization: `Bearer ${token}` }
          });
          setAccessLogs(res.data);
      } catch (err) {
          console.error("Failed to fetch logs");
      } finally {
          setLogsLoading(false);
      }
  };

  const avatarLetter = role === 'admin' ? 'A' : (role === 'pharmacist' ? 'PH' : (role === 'patient' ? 'P' : 'D'));

  // Filter and Sort Logs
  const processedLogs = accessLogs
    .filter(log => 
        log.actor_name.toLowerCase().includes(logSearch.toLowerCase()) || 
        (log.hospital && log.hospital.toLowerCase().includes(logSearch.toLowerCase())) ||
        new Date(log.timestamp).toLocaleDateString().includes(logSearch)
    )
    .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return logSort === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <>
    <nav className={`navbar navbar-expand-lg sticky-top theme-navbar ${darkMode ? 'navbar-dark' : 'navbar-light'}`}>
      <div className="container-fluid px-4 px-lg-5">
        
        <div className="d-flex align-items-center gap-3">
            {location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/patient-dashboard' && location.pathname !== '/system-override' && (
                <button onClick={() => navigate(-1)} className="btn btn-icon theme-icon-btn rounded-circle border" title="Go Back">
                    <FaArrowLeft size={16} />
                </button>
            )}

            <Link className="navbar-brand d-flex align-items-center gap-2" to={homeLink}>
                <div className={`brand-icon-box ${role === 'admin' ? 'bg-danger-gradient' : ''}`}>
                    <FaHeartbeat className="text-white heart-beat" size={20} />
                </div>
                <div className="d-flex flex-column justify-content-center">
                    <span className="brand-text">LIFELINE</span>
                    <span className="brand-tagline">{role === 'admin' ? 'SYSTEM CORE' : 'HEALTH NETWORK'}</span>
                </div>
            </Link>
        </div>

        <div className="d-flex align-items-center gap-3 ms-auto" ref={menuRef}>
            
            {isLoggedIn && role === 'patient' && (
                <Link to="/ai-chat" className="text-decoration-none d-none d-md-flex align-items-center gap-2 ai-link me-2">
                    <div className="ai-icon-pulse"><FaRobot size={16}/></div>
                    <span className="fw-bold small">AI Assistant</span>
                </Link>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className="btn btn-icon rounded-circle theme-icon-btn">
                {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>

            {isLoggedIn && (
                <div className="position-relative">
                    <button 
                        className={`btn btn-icon rounded-circle theme-icon-btn ${showNotif ? 'active-btn' : ''}`} 
                        onClick={() => { setShowNotif(!showNotif); setShowMenu(false); }}
                    >
                        <FaBell size={18} />
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style={{fontSize: '9px', padding: '3px 5px'}}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {showNotif && <Notification onClose={() => setShowNotif(false)} onUpdate={() => {}} />}
                </div>
            )}

            {isLoggedIn ? (
            <div className="position-relative">
                <button 
                    className="btn btn-light border theme-btn-ghost rounded-pill px-2 py-1 pe-3 d-flex align-items-center gap-2 shadow-sm"
                    onClick={() => { setShowMenu(!showMenu); setShowNotif(false); }}
                >
                    {profileImage ? (
                        <img src={profileImage} alt="Profile" className="rounded-circle border border-2 border-white shadow-sm" style={{width:'32px', height:'32px', objectFit:'cover'}}/>
                    ) : (
                        <div className={`avatar-circle small-av ${role === 'admin' ? 'bg-danger' : ''}`}>{avatarLetter}</div>
                    )}
                    <FaBars size={14} className="text-secondary opacity-75"/>
                </button>

                {/* DROPDOWN */}
                {showMenu && (
                    <div className="dropdown-menu-custom position-absolute end-0 mt-3 shadow-lg rounded-4 overflow-hidden animate-fade-in">
                        <div className="p-3 border-bottom bg-light">
                            <p className="m-0 small fw-bold text-muted text-uppercase letter-spacing-1">Account</p>
                        </div>
                        
                        {role !== 'admin' && (
                            <div className="p-2 border-bottom">
                                <Link to="/settings" className="dropdown-item-custom d-flex align-items-center gap-3 p-3 rounded-3 text-decoration-none theme-text" onClick={() => setShowMenu(false)}>
                                    <div className="icon-box-sm bg-primary bg-opacity-10 text-primary"><FaUserCircle/></div>
                                    <div>
                                        <h6 className="m-0 fw-bold" style={{fontSize:'14px'}}>Profile / Settings</h6>
                                        <small className="text-muted" style={{fontSize:'11px'}}>Manage account</small>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {role === 'patient' && (
                            <div className="p-2 d-flex flex-column gap-1">
                                {/* ACCESS LOGS BUTTON */}
                                <button 
                                    onClick={() => { setShowLogModal(true); setShowMenu(false); fetchAccessLogs(); }} 
                                    className="dropdown-item-custom w-100 d-flex align-items-center gap-3 p-2 rounded-3 theme-text border-0 bg-transparent"
                                >
                                    <div className="icon-box-sm bg-info bg-opacity-10 text-info" style={{width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><FaShieldAlt/></div>
                                    <div className="text-start">
                                        <h6 className="m-0 fw-bold" style={{fontSize:'14px'}}>Access Logs</h6>
                                        <small className="text-muted" style={{fontSize:'11px'}}>View record footprint</small>
                                    </div>
                                </button>

                                {/* REPORT ISSUE BUTTON */}
                                <button 
                                    onClick={() => { setShowReportModal(true); setShowMenu(false); }} 
                                    className="dropdown-item-custom w-100 d-flex align-items-center gap-3 p-2 rounded-3 text-danger border-0 bg-transparent"
                                >
                                    <div className="icon-box-sm bg-danger bg-opacity-10 text-danger" style={{width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><FaExclamationTriangle/></div>
                                    <div className="text-start">
                                        <h6 className="m-0 fw-bold" style={{fontSize:'14px'}}>Report Issue</h6>
                                        <small className="text-muted" style={{fontSize:'11px'}}>Report a doctor/clinic</small>
                                    </div>
                                </button>
                            </div>
                        )}
                        
                        <div className="p-2 border-top bg-light">
                            <button onClick={handleLogout} className="dropdown-item-custom w-100 d-flex align-items-center gap-2 p-2 rounded-3 text-danger border-0 bg-transparent fw-bold small">
                                <FaPowerOff/> Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
            ) : (
            <div className="d-flex gap-2">
                {location.pathname !== '/system-override' && (
                    <>
                        <Link to="/login" className="btn btn-sm theme-btn-ghost fw-bold px-3 rounded-pill border">Login</Link>
                        <Link to="/register" className="btn btn-sm btn-primary fw-bold px-4 rounded-pill shadow-sm">Sign Up</Link>
                    </>
                )}
            </div>
            )}
        </div>
      </div>

      <style>{`
        .theme-navbar { padding: 0.8rem 0; background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0; transition: all 0.3s ease; }
        .brand-icon-box { width: 40px; height: 40px; background: linear-gradient(135deg, #2563eb, #06b6d4); display: flex; align-items: center; justify-content: center; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .bg-danger-gradient { background: linear-gradient(135deg, #ef4444, #b91c1c) !important; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;}
        .heart-beat { animation: heartbeat 2s infinite ease-in-out; }
        .brand-text { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 1.25rem; line-height: 1; letter-spacing: -0.5px; background: linear-gradient(to right, #1e293b, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .brand-tagline { font-size: 0.6rem; font-weight: 700; letter-spacing: 2px; color: #94a3b8; margin-top: 3px; }
        
        .theme-icon-btn { color: #64748b; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background-color: transparent; position: relative; }
        .theme-icon-btn:hover, .active-btn { background-color: #f1f5f9; color: #2563eb; }
        
        .dropdown-menu-custom { width: 260px; background: white; border: 1px solid #e2e8f0; z-index: 1000; }
        .dropdown-item-custom { transition: all 0.2s; cursor: pointer; }
        .dropdown-item-custom:hover { background-color: #f8fafc; transform: translateX(5px); }
        .icon-box-sm { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }

        .avatar-circle.small-av { width: 32px; height: 32px; background: #0f172a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .ai-link { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); padding: 6px 12px; border-radius: 20px; transition: all 0.3s; }
        .ai-link:hover { background: rgba(139, 92, 246, 0.2); transform: translateY(-1px); }
        .ai-icon-pulse { animation: pulse-purple 2s infinite; }

        /* DARK MODE */
        body.dark-mode .theme-navbar { background-color: rgba(15, 23, 42, 0.95); border-bottom: 1px solid #334155; }
        body.dark-mode .dropdown-menu-custom { background-color: #1e293b; border-color: #334155; }
        body.dark-mode .theme-text { color: #fff; }
        body.dark-mode .dropdown-item-custom:hover { background-color: #334155; }
        body.dark-mode .brand-text { background: linear-gradient(to right, #fff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        body.dark-mode .theme-icon-btn { color: #94a3b8; } body.dark-mode .theme-icon-btn:hover { background-color: #334155; color: #fbbf24; }

        @keyframes heartbeat { 0% { transform: scale(1); } 5% { transform: scale(1.15); } 10% { transform: scale(1); } 15% { transform: scale(1.15); } 50% { transform: scale(1); } 100% { transform: scale(1); } }
        @keyframes pulse-purple { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
      `}</style>
    </nav>

    {/* REPORT MODAL POPUP */}
    {showReportModal && (
        <div className="d-flex align-items-center justify-content-center" style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:9999, backgroundColor:'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)'}}>
            <div className="bg-white p-4 rounded-4 shadow-lg animate-fade-in border theme-border" style={{width: '500px', maxWidth: '90%'}}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold m-0 text-danger d-flex align-items-center gap-2"><FaExclamationTriangle/> Report an Issue</h5>
                    <button onClick={() => setShowReportModal(false)} className="btn btn-sm btn-light rounded-circle"><FaTimes/></button>
                </div>
                <p className="small text-muted mb-4">Your report will be sent directly to the System Administrator for review and disciplinary action.</p>
                <form onSubmit={submitReport}>
                    <div className="mb-3">
                        <label className="small fw-bold text-muted mb-1">Doctor / Staff Name</label>
                        <input className="form-control bg-light" required value={reportForm.doctor_name} onChange={e=>setReportForm({...reportForm, doctor_name: e.target.value})} placeholder="e.g. Dr. Rahul Sharma" />
                    </div>
                    
                    {/* NEW: Hospital & Department Row */}
                    <div className="row g-2 mb-3">
                        <div className="col-md-6">
                            <label className="small fw-bold text-muted mb-1">Hospital / Clinic</label>
                            <input className="form-control bg-light" required value={reportForm.hospital_name} onChange={e=>setReportForm({...reportForm, hospital_name: e.target.value})} placeholder="e.g. Apollo Hospital" />
                        </div>
                        <div className="col-md-6">
                            <label className="small fw-bold text-muted mb-1">Department</label>
                            <input className="form-control bg-light" required value={reportForm.department} onChange={e=>setReportForm({...reportForm, department: e.target.value})} placeholder="e.g. Cardiology" />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="small fw-bold text-muted mb-1">Reason for Report</label>
                        <select className="form-select bg-light" required value={reportForm.reason} onChange={e=>setReportForm({...reportForm, reason: e.target.value})}>
                            <option value="">Select Reason...</option>
                            <option value="Unprofessional Behavior">Unprofessional Behavior</option>
                            <option value="Incorrect Diagnosis / Prescription">Incorrect Diagnosis / Prescription</option>
                            <option value="Overcharging / Fraud">Overcharging / Fraud</option>
                            <option value="Violation of Privacy">Violation of Privacy</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="small fw-bold text-muted mb-1">Additional Details</label>
                        <textarea className="form-control bg-light" rows="3" required value={reportForm.details} onChange={e=>setReportForm({...reportForm, details: e.target.value})} placeholder="Please describe exactly what happened..." />
                    </div>
                    <button type="submit" className="btn btn-danger w-100 fw-bold py-2 shadow-sm rounded-3">Submit Official Report</button>
                </form>
            </div>
        </div>
    )}

    {/* SECURITY ACCESS LOG MODAL */}
    {showLogModal && (
        <div className="d-flex align-items-center justify-content-center" style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:9999, backgroundColor:'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)'}}>
            <div className="bg-white p-4 rounded-4 shadow-lg animate-fade-in border theme-border d-flex flex-column" style={{width: '750px', maxWidth: '95%', maxHeight: '85vh'}}>
                
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 className="fw-bold m-0 text-dark d-flex align-items-center gap-2"><FaShieldAlt className="text-info"/> Security Access Logs</h4>
                        <small className="text-muted">Track who viewed your medical records and when.</small>
                    </div>
                    <button onClick={() => setShowLogModal(false)} className="btn btn-sm btn-light rounded-circle border"><FaTimes/></button>
                </div>

                {/* Controls */}
                <div className="d-flex gap-2 mb-3 pb-3 border-bottom theme-border">
                    <div className="input-group input-group-sm flex-grow-1">
                        <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted"/></span>
                        <input 
                            type="text" 
                            className="form-control bg-light border-start-0" 
                            placeholder="Search by Name, Date, or Hospital..." 
                            value={logSearch} 
                            onChange={(e) => setLogSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setLogSort(logSort === 'desc' ? 'asc' : 'desc')} 
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 text-nowrap"
                    >
                        {logSort === 'desc' ? <><FaSortAmountDown/> Newest</> : <><FaSortAmountUp/> Oldest</>}
                    </button>
                </div>

                {/* Log Table */}
                <div className="flex-grow-1 overflow-auto pe-1" style={{minHeight: '250px'}}>
                    {logsLoading ? (
                        <div className="text-center p-5 text-muted">Loading logs...</div>
                    ) : processedLogs.length === 0 ? (
                        <div className="text-center p-5 text-muted">No access logs match your search.</div>
                    ) : (
                        <table className="table table-hover align-middle small">
                            <thead className="bg-light sticky-top">
                                <tr className="text-muted text-uppercase" style={{fontSize: '11px'}}>
                                    <th className="py-2 ps-3 border-0">Date & Time</th>
                                    <th className="py-2 border-0">Accessed By</th>
                                    <th className="py-2 border-0">Access Type</th>
                                    <th className="py-2 pe-3 text-end border-0">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="ps-3 text-muted">
                                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">{log.actor_name}</div>
                                            {log.hospital ? <div className="text-muted" style={{fontSize: '10px'}}>{log.hospital}</div> : null}
                                        </td>
                                        <td>
                                            {log.action_type === 'patient_access' && <span className="badge bg-info bg-opacity-10 text-info border border-info">Self Access</span>}
                                            {log.action_type === 'doctor_normal' && <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">Doctor OTP</span>}
                                            {log.action_type === 'doctor_override' && <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">Emergency Override</span>}
                                        </td>
                                        <td className="pe-3 text-end font-monospace text-muted" style={{fontSize: '11px'}}>
                                            {log.ip_address}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )}
    </>
  );
}

export default Navbar;