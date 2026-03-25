import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
    FaUsers, FaStethoscope, FaPills, FaServer, FaDatabase, 
    FaChartLine, FaCog, FaTrash, FaSearch, FaExclamationTriangle, FaChartPie, FaPowerOff, FaCheckCircle 
} from 'react-icons/fa';

function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    
    // States
    const [stats, setStats] = useState({ metrics: {}, recent_users: [] });
    const [allUsers, setAllUsers] = useState([]);
    const [trends, setTrends] = useState([]);
    const [userReports, setUserReports] = useState([]); // NEW: Store incoming reports
    const [searchQuery, setSearchQuery] = useState('');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [navigate]);

    const fetchDashboardData = async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/system-override'); return; }

        try {
            const statRes = await axios.get('http://localhost:5000/api/admin/dashboard-stats', { headers: { Authorization: `Bearer ${token}` } });
            setStats(statRes.data);
            
            const userRes = await axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
            setAllUsers(userRes.data);

            const trendsRes = await axios.get('http://localhost:5000/api/admin/health-trends', { headers: { Authorization: `Bearer ${token}` } });
            setTrends(trendsRes.data);

            const maintRes = await axios.get('http://localhost:5000/api/admin/maintenance', { headers: { Authorization: `Bearer ${token}` } });
            setMaintenanceMode(maintRes.data.status);

            // NEW: Fetch all patient reports
            const reportsRes = await axios.get('http://localhost:5000/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } });
            setUserReports(reportsRes.data);

            setLoading(false);
        } catch (err) {
            alert("Unauthorized Access or Session Expired");
            localStorage.clear();
            navigate('/system-override');
        }
    };

    // NEW: Resolve Report
    const handleResolveReport = async (id) => {
        if(!window.confirm("Mark this report as resolved? The patient will be notified of the outcome.")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.put(`http://localhost:5000/api/admin/reports/${id}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setUserReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
            alert("Report successfully marked as resolved.");
        } catch (err) { 
            alert("Failed to resolve report."); 
        }
    };

    const handleDeleteUser = async (id, name) => {
        if(!window.confirm(`⚠️ CRITICAL WARNING: Are you sure you want to permanently delete user ${name}? This action cannot be undone.`)) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setAllUsers(allUsers.filter(u => u.id !== id));
            alert("User permanently deleted.");
            fetchDashboardData(); 
        } catch (err) { alert("Failed to delete user."); }
    };

    const toggleMaintenance = async () => {
        const token = localStorage.getItem('token');
        const newStatus = !maintenanceMode;
        try {
            await axios.post('http://localhost:5000/api/admin/maintenance', { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
            setMaintenanceMode(newStatus);
            alert(`System Maintenance Mode is now ${newStatus ? 'ON' : 'OFF'}`);
        } catch (err) { alert("Failed to update system status."); }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/system-override');
    };

    const filteredUsers = allUsers.filter(u => 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.unique_lifeline_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="min-vh-100 theme-bg d-flex justify-content-center align-items-center theme-text">Initializing Root System...</div>;

    return (
        <div className="doc-theme-bg container-fluid p-0 d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            
            {/* SIDEBAR */}
            <div className="doc-sidebar d-flex flex-column border-end shadow-sm flex-shrink-0 theme-card" style={{ width: '280px', zIndex: 10 }}>
                <div className="p-4 border-bottom theme-border">
                    <div className="d-flex align-items-center gap-2 text-danger mb-1">
                        <FaServer size={22}/>
                        <h5 className="m-0 fw-bold letter-spacing-1">ROOT ACCESS</h5>
                    </div>
                    <small className="theme-text-muted">System Administrator</small>
                </div>
                
                <div className="flex-grow-1 p-3 d-flex flex-column gap-2 overflow-auto">
                    <button onClick={() => setActiveTab('overview')} className={`btn text-start p-3 fw-bold rounded-3 ${activeTab === 'overview' ? 'btn-danger text-white' : 'btn-light text-muted theme-btn-ghost'}`}>
                        <FaChartLine className="me-3"/> Dashboard Overview
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className={`btn text-start p-3 fw-bold rounded-3 ${activeTab === 'analytics' ? 'btn-danger text-white' : 'btn-light text-muted theme-btn-ghost'}`}>
                        <FaChartPie className="me-3"/> Health Analytics
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`btn text-start p-3 fw-bold rounded-3 ${activeTab === 'users' ? 'btn-danger text-white' : 'btn-light text-muted theme-btn-ghost'}`}>
                        <FaUsers className="me-3"/> User Management
                    </button>

                    {/* NEW REPORTS TAB */}
                    <button onClick={() => setActiveTab('reports')} className={`btn text-start p-3 fw-bold rounded-3 d-flex justify-content-between align-items-center ${activeTab === 'reports' ? 'btn-danger text-white' : 'btn-light text-muted theme-btn-ghost'}`}>
                        <div><FaExclamationTriangle className="me-3"/> User Reports</div>
                        {userReports.filter(r => r.status === 'pending').length > 0 && (
                            <span className={`badge rounded-pill ${activeTab === 'reports' ? 'bg-white text-danger' : 'bg-danger text-white'}`}>
                                {userReports.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setActiveTab('settings')} className={`btn text-start p-3 fw-bold rounded-3 ${activeTab === 'settings' ? 'btn-danger text-white' : 'btn-light text-muted theme-btn-ghost'}`}>
                        <FaCog className="me-3"/> System Settings
                    </button>
                </div>

                <div className="p-3 border-top theme-border">
                    <button onClick={handleLogout} className="btn btn-outline-danger w-100 fw-bold py-2 d-flex align-items-center justify-content-center gap-2">
                        <FaPowerOff/> Terminate Session
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-grow-1 overflow-auto p-4 p-lg-5 theme-bg">
                
                {/* === OVERVIEW TAB === */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in">
                        <h3 className="fw-bold theme-text mb-4">System Overview</h3>
                        
                        <div className="row g-4 mb-5">
                            <div className="col-md-3">
                                <div className="theme-card border theme-border shadow-sm p-4 rounded-4">
                                    <div className="text-muted small fw-bold mb-2"><FaUsers size={16} className="me-2 text-primary"/> PATIENTS</div>
                                    <h2 className="m-0 fw-bold theme-text">{stats.metrics.total_patients}</h2>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="theme-card border theme-border shadow-sm p-4 rounded-4">
                                    <div className="text-muted small fw-bold mb-2"><FaStethoscope size={16} className="me-2 text-info"/> DOCTORS</div>
                                    <h2 className="m-0 fw-bold theme-text">{stats.metrics.total_doctors}</h2>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="theme-card border theme-border shadow-sm p-4 rounded-4">
                                    <div className="text-muted small fw-bold mb-2"><FaPills size={16} className="me-2 text-success"/> PHARMACIES</div>
                                    <h2 className="m-0 fw-bold theme-text">{stats.metrics.total_pharmacists}</h2>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="theme-card border theme-border shadow-sm p-4 rounded-4">
                                    <div className="text-muted small fw-bold mb-2"><FaDatabase size={16} className="me-2 text-warning"/> RECORDS</div>
                                    <h2 className="m-0 fw-bold theme-text">{stats.metrics.total_records}</h2>
                                </div>
                            </div>
                        </div>

                        <h5 className="fw-bold theme-text mb-3">Live Registration Feed</h5>
                        <div className="theme-card border theme-border shadow-sm rounded-4 overflow-hidden">
                            <table className="table table-hover m-0 align-middle theme-table">
                                <thead className="bg-light">
                                    <tr className="text-muted small text-uppercase">
                                        <th className="ps-4 py-3">Lifeline ID</th>
                                        <th className="py-3">Full Name</th>
                                        <th className="py-3">Role</th>
                                        <th className="pe-4 py-3 text-end">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recent_users.map((u, i) => (
                                        <tr key={i}>
                                            <td className="ps-4 fw-bold text-primary">{u.unique_lifeline_id}</td>
                                            <td className="theme-text fw-bold">{u.full_name}</td>
                                            <td>
                                                <span className={`badge ${u.role === 'doctor' ? 'bg-info' : u.role === 'pharmacist' ? 'bg-success' : u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="pe-4 text-end text-muted small">{new Date(u.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* === ANALYTICS TAB === */}
                {activeTab === 'analytics' && (
                    <div className="animate-fade-in">
                        <h3 className="fw-bold theme-text mb-4">Epidemiology Analytics</h3>
                        <div className="theme-card p-4 rounded-4 shadow-sm border theme-border">
                            <h6 className="fw-bold text-muted mb-4">Top Diagnosed Conditions Network-Wide</h6>
                            <div style={{width: '100%', height: '400px'}}>
                                <ResponsiveContainer>
                                    <BarChart data={trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis dataKey="name" stroke="#8884d8" tick={{fill: '#8884d8'}} />
                                        <YAxis stroke="#8884d8" tick={{fill: '#8884d8'}} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', borderRadius: '10px', color: '#fff', border: 'none'}}/>
                                        <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* === USER MANAGEMENT TAB === */}
                {activeTab === 'users' && (
                    <div className="animate-fade-in h-100 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="fw-bold theme-text m-0">User Directory</h3>
                            <div className="input-group" style={{width: '300px'}}>
                                <span className="input-group-text bg-white border-end-0 theme-border"><FaSearch className="text-muted"/></span>
                                <input type="text" className="form-control border-start-0 theme-border theme-input" placeholder="Search ID, Name, Role..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
                            </div>
                        </div>

                        <div className="theme-card border theme-border shadow-sm rounded-4 flex-grow-1 overflow-auto">
                            <table className="table table-hover m-0 align-middle theme-table">
                                <thead className="bg-light sticky-top">
                                    <tr className="text-muted small text-uppercase">
                                        <th className="ps-4 py-3">Lifeline ID</th>
                                        <th className="py-3">Full Name</th>
                                        <th className="py-3">Email</th>
                                        <th className="py-3">Role</th>
                                        <th className="pe-4 py-3 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => (
                                        <tr key={u.id}>
                                            <td className="ps-4 fw-bold font-monospace theme-text-muted">{u.unique_lifeline_id}</td>
                                            <td className="theme-text fw-bold">{u.full_name}</td>
                                            <td className="text-muted small">{u.email}</td>
                                            <td>
                                                <span className={`badge bg-opacity-10 border ${u.role === 'doctor' ? 'bg-info text-info border-info' : u.role === 'pharmacist' ? 'bg-success text-success border-success' : u.role === 'admin' ? 'bg-danger text-danger border-danger' : 'bg-secondary text-secondary border-secondary'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="pe-4 text-end">
                                                {u.role !== 'admin' && (
                                                    <button onClick={() => handleDeleteUser(u.id, u.full_name)} className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold">
                                                        <FaTrash className="me-1"/> Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && <tr><td colSpan="5" className="text-center p-4 text-muted">No users found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* === REPORTS TAB (NEW) === */}
                {activeTab === 'reports' && (
                    <div className="animate-fade-in h-100 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="fw-bold theme-text m-0">Patient Dispute Reports</h3>
                        </div>

                        <div className="theme-card border theme-border shadow-sm rounded-4 flex-grow-1 overflow-auto">
                            <table className="table table-hover m-0 align-middle theme-table">
                                <thead className="bg-light sticky-top">
                                    <tr className="text-muted small text-uppercase">
                                        <th className="ps-4 py-3">Date</th>
                                        <th className="py-3">Filing Patient</th>
                                        <th className="py-3">Reported Doctor</th>
                                        <th className="py-3">Reason & Description</th>
                                        <th className="pe-4 py-3 text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userReports.map(r => (
                                        <tr key={r.id}>
                                            <td className="ps-4 text-muted small">{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="fw-bold theme-text">
                                                {r.patient_name}<br/>
                                                <small className="text-muted font-monospace">{r.unique_lifeline_id}</small>
                                            </td>
                                            <td>
                                                <div className="text-danger fw-bold">{r.doctor_name}</div>
                                                <small className="text-muted">{r.hospital_name} • {r.department}</small>
                                            </td>
                                            <td>
                                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger mb-1">{r.reason}</span>
                                                <p className="small text-muted m-0" style={{maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={r.details}>{r.details}</p>
                                            </td>
                                            <td className="pe-4 text-end">
                                                {r.status === 'pending' ? (
                                                    <button onClick={() => handleResolveReport(r.id)} className="btn btn-sm btn-success rounded-pill px-3 fw-bold shadow-sm">
                                                        <FaCheckCircle className="me-1"/> Resolve
                                                    </button>
                                                ) : (
                                                    <span className="badge bg-success text-white"><FaCheckCircle className="me-1"/> Resolved</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {userReports.length === 0 && <tr><td colSpan="5" className="text-center p-5 text-muted">No reports filed currently.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* === SYSTEM SETTINGS TAB === */}
                {activeTab === 'settings' && (
                    <div className="animate-fade-in">
                        <h3 className="fw-bold theme-text mb-4">System Settings</h3>
                        
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="theme-card border theme-border shadow-sm p-4 rounded-4 h-100">
                                    <div className="d-flex align-items-center gap-3 mb-3">
                                        <div className={`p-3 rounded-circle ${maintenanceMode ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                                            <FaExclamationTriangle size={24}/>
                                        </div>
                                        <div>
                                            <h5 className="fw-bold m-0 theme-text">Maintenance Mode</h5>
                                            <small className="text-muted">Block non-admin logins</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-4">When enabled, patients, doctors, and pharmacists will be temporarily locked out of the system. Use this only during database migrations or critical updates.</p>
                                    <button onClick={toggleMaintenance} className={`btn w-100 fw-bold py-2 mt-auto ${maintenanceMode ? 'btn-danger' : 'btn-outline-danger'}`}>
                                        {maintenanceMode ? 'DISABLE MAINTENANCE MODE' : 'ENABLE MAINTENANCE MODE'}
                                    </button>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="theme-card border theme-border shadow-sm p-4 rounded-4 h-100">
                                    <div className="d-flex align-items-center gap-3 mb-3">
                                        <div className="p-3 rounded-circle bg-secondary text-white"><FaDatabase size={24}/></div>
                                        <div>
                                            <h5 className="fw-bold m-0 theme-text">Database Backup</h5>
                                            <small className="text-muted">Export SQL Snapshot</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-4">Generate a full downloadable snapshot of the `lifeline_db` SQL database. Highly recommended before performing maintenance.</p>
                                    <button onClick={() => alert("Simulated: DB Snapshot downloaded successfully.")} className="btn btn-dark w-100 fw-bold py-2 mt-auto">
                                        INITIATE BACKUP
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                /* LIGHT MODE */
                :root { --bg-color: #f8fafc; --card-bg: #ffffff; --text-color: #0f172a; --text-muted: #64748b; --border-color: #e2e8f0; --input-bg: #f1f5f9; }
                
                /* DARK MODE */
                body.dark-mode { --bg-color: #0f172a; --card-bg: #1e293b; --text-color: #f8fafc; --text-muted: #94a3b8; --border-color: #334155; --input-bg: #334155; }
                
                .theme-bg { background-color: var(--bg-color); }
                .theme-card { background-color: var(--card-bg); }
                .theme-text { color: var(--text-color); }
                .theme-text-muted { color: var(--text-muted); }
                .theme-border { border-color: var(--border-color) !important; }
                .theme-input { background-color: var(--input-bg); color: var(--text-color); }
                
                .doc-theme-bg { background-color: var(--bg-color); }
                .theme-btn-ghost { transition: all 0.2s; }
                .theme-btn-ghost:hover { background-color: rgba(239, 68, 68, 0.1); color: #ef4444 !important; }
                
                body.dark-mode .bg-light { background-color: #1e293b !important; color: #f8fafc !important;}
                .theme-table th, .theme-table td { background-color: transparent !important; color: var(--text-color); border-color: var(--border-color); }
                body.dark-mode .theme-table th, body.dark-mode .theme-table td { background-color: transparent !important; color: #f8fafc; border-color: #334155; }
            `}</style>
        </div>
    );
}

export default AdminDashboard;