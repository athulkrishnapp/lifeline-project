import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaLock, FaUserShield, FaFileMedicalAlt, FaCalendarAlt, FaUserMd, FaHospital, FaSearch } from 'react-icons/fa';

// Added Props for passing data directly when in Doctor Mode
function MyRecords({ isDoctorView = false, overrideRecords = null, patientName = '' }) {
    // States
    const [status, setStatus] = useState(isDoctorView ? 'UNLOCKED' : 'LOCKED'); 
    const [inputYOB, setInputYOB] = useState('');
    const [inputOTP, setInputOTP] = useState('');
    const [records, setRecords] = useState(overrideRecords || []);
    const [searchQuery, setSearchQuery] = useState(''); // New Search Bar State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [demoYOB, setDemoYOB] = useState(null);
    const [timer, setTimer] = useState(0);

    // 1. Timer Countdown Effect
    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // 2. Fetch Demo Hint (Skip if Doctor View)
    useEffect(() => {
        if (isDoctorView) return; // Prevent API call if Doctor is passing records down directly
        const fetchHint = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get('http://localhost:5000/api/profile', { 
                    // ✅ FIXED: Added Bearer prefix
                    headers: { Authorization: `Bearer ${token}` } 
                });
                if (res.data.yob_check) setDemoYOB(res.data.yob_check);
                else if (res.data.dob) setDemoYOB(new Date(res.data.dob).getFullYear());
            } catch (err) { console.error("Hint fetch failed"); }
        };
        fetchHint();
    }, []);

    // 3. Verify Year (Sends OTP)
    const handleVerifyYOB = async () => {
        setLoading(true); setError('');
        const token = localStorage.getItem('token');
        try {
            // ✅ FIXED: Added Bearer prefix
            await axios.post('http://localhost:5000/api/verify-dob-year', { yob: inputYOB }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus('OTP_SENT');
            setTimer(30); 
        } catch (err) {
            setError(err.response?.data?.error || "Verification Failed");
        } finally { setLoading(false); }
    };

    // 4. Verify OTP & Unlock
    const handleVerifyOTP = async () => {
        setLoading(true); setError('');
        const token = localStorage.getItem('token');
        try {
            // ✅ FIXED: Added Bearer prefix
            await axios.post('http://localhost:5000/api/verify-medical-otp', { otp: inputOTP }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus('UNLOCKED');
            fetchRecords(); 
        } catch (err) {
            setError("Invalid OTP. Access Denied.");
        } finally { setLoading(false); }
    };

    // 5. Fetch Data
    const fetchRecords = async () => {
        const token = localStorage.getItem('token');
        try {
            // ✅ FIXED: Added Bearer prefix
            const res = await axios.get('http://localhost:5000/api/my-records', { headers: { Authorization: `Bearer ${token}` } });
            setRecords(res.data);
        } catch (err) { console.error("Error loading records"); }
    };

    // --- RENDER: LOCKED STATE ---
    if (status !== 'UNLOCKED') {
        return (
            <div className="theme-bg min-vh-100 d-flex align-items-center justify-content-center p-4 transition-all">
                <div className="theme-card border-0 shadow-lg rounded-4 overflow-hidden text-center" style={{maxWidth: '450px', width:'100%'}}>
                    <div className="bg-primary p-4 text-white">
                        <div className="mb-3 bg-white bg-opacity-25 rounded-circle d-inline-flex p-3">
                            <FaUserShield size={40} />
                        </div>
                        <h4 className="fw-bold">Secured Records</h4>
                        <p className="small opacity-75 m-0">Two-step verification required</p>
                    </div>
                    
                    <div className="p-5">
                        {status === 'LOCKED' ? (
                            <div className="animate-fade-in">
                                <h6 className="fw-bold theme-text-muted mb-3">Step 1: Verify Identity</h6>
                                
                                {demoYOB && (
                                    <div className="badge bg-warning text-dark mb-4 px-3 py-2 shadow-sm animate-pulse">
                                        🔑 Demo Hint: Your Year is <strong>{demoYOB}</strong>
                                    </div>
                                )}

                                <p className="small theme-text-muted mb-3">Please enter your <strong>Year of Birth</strong> to proceed.</p>
                                <input 
                                    type="number" 
                                    className="form-control form-control-lg text-center fw-bold letter-spacing-2 mb-3 theme-input" 
                                    placeholder="YYYY"
                                    value={inputYOB}
                                    onChange={(e) => setInputYOB(e.target.value)}
                                />
                                <button onClick={handleVerifyYOB} disabled={loading || inputYOB.length !== 4} className="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                                    {loading ? 'Verifying...' : 'Verify Year'}
                                </button>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <h6 className="fw-bold theme-text-muted mb-4">Step 2: Enter OTP</h6>
                                <p className="small theme-text-muted mb-3">A code has been sent to your registered email.</p>
                                <input 
                                    type="text" 
                                    className="form-control form-control-lg text-center fw-bold letter-spacing-2 mb-3 theme-input" 
                                    placeholder="Enter 4-Digit Code"
                                    value={inputOTP}
                                    onChange={(e) => setInputOTP(e.target.value)}
                                />
                                <button onClick={handleVerifyOTP} disabled={loading} className="btn btn-success w-100 py-2 fw-bold shadow-sm">
                                    {loading ? 'Unlocking...' : 'Unlock Records'}
                                </button>
                                
                                {/* TIMER & RESEND SECTION */}
                                <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3 theme-border">
                                    <button onClick={() => setStatus('LOCKED')} className="btn btn-link theme-text-muted btn-sm p-0 text-decoration-none">← Back</button>
                                    <button 
                                        onClick={handleVerifyYOB} 
                                        disabled={timer > 0 || loading} 
                                        className={`btn btn-sm fw-bold ${timer > 0 ? 'btn-light text-muted' : 'btn-outline-primary'}`}
                                    >
                                        {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Code'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {error && <div className="alert alert-danger mt-3 small py-2">{error}</div>}
                    </div>
                </div>
                
                {/* CSS Variables for this component */}
                <style>{`
                    :root {
                        --bg-color: #f8fafc;
                        --card-bg: #ffffff;
                        --text-color: #0f172a;
                        --text-muted: #64748b;
                        --border-color: #e2e8f0;
                        --input-bg: #f1f5f9;
                    }
                    body.dark-mode {
                        --bg-color: #0f172a;
                        --card-bg: #1e293b;
                        --text-color: #f8fafc;
                        --text-muted: #94a3b8;
                        --border-color: #334155;
                        --input-bg: #334155;
                    }
                    .theme-bg { background-color: var(--bg-color); color: var(--text-color); }
                    .theme-card { background-color: var(--card-bg); color: var(--text-color); transition: background-color 0.3s, color 0.3s; }
                    .theme-text { color: var(--text-color); }
                    .theme-text-muted { color: var(--text-muted); }
                    .theme-border { border-color: var(--border-color) !important; }
                    .theme-input { background-color: var(--input-bg); color: var(--text-color); border: 1px solid transparent; }
                    .theme-input:focus { background-color: var(--input-bg); color: var(--text-color); box-shadow: 0 0 0 2px #2563eb; }
                    .letter-spacing-2 { letter-spacing: 2px; } 
                    .animate-pulse { animation: pulse 2s infinite; }
                    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
            </div>
        );
    }

    // --- 6. FILTER LOGIC ---
    const filteredRecords = records.filter(rec => {
        const query = searchQuery.toLowerCase();
        const diag = (rec.diagnosis || '').toLowerCase();
        const doc = (rec.doctor_name || '').toLowerCase();
        const hosp = (rec.hospital_name || '').toLowerCase();
        return diag.includes(query) || doc.includes(query) || hosp.includes(query);
    });

    // --- RENDER: UNLOCKED STATE ---
    return (
        <div className="theme-bg min-vh-100 p-4 transition-all">
            <div className="container" style={{maxWidth: '1000px'}}>
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div>
                        <h3 className="fw-bold theme-text m-0">
                            <FaFileMedicalAlt className="me-2 text-primary"/> 
                            Medical Records {isDoctorView && `of ${patientName}`}
                        </h3>
                        <small className="text-success fw-bold"><FaLock className="me-1"/> Secure Session Active</small>
                    </div>
                    
                    {/* NEW SEARCH BAR */}
                    <div className="position-relative" style={{maxWidth: '350px', width: '100%'}}>
                        <FaSearch className="position-absolute text-muted" style={{top: '12px', left: '15px'}} />
                        <input 
                            type="text" 
                            className="form-control rounded-pill ps-5 theme-input" 
                            placeholder="Search disease, doctor, or hospital..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="row g-4">
                    {filteredRecords.length > 0 ? filteredRecords.map((rec, i) => (
                        <div key={i} className="col-12">
                            <div className="theme-card border-0 shadow-sm rounded-4 p-4 hover-shadow transition-all">
                                <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3 theme-border">
                                    <div>
                                        <h5 className="fw-bold theme-text mb-2">{rec.diagnosis}</h5>
                                        <div className="d-flex align-items-center gap-3 theme-text-muted small flex-wrap">
                                            <span><FaUserMd className="me-1 text-primary"/> Dr. {rec.doctor_name || 'Unknown'}</span>
                                            <span><FaHospital className="me-1 text-danger"/> {rec.hospital_name || 'Lifeline Network'}</span>
                                            <span><FaCalendarAlt className="me-1 text-info"/> {new Date(rec.visit_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <span className="badge theme-btn-secondary border theme-border theme-text-muted">OP Visit</span>
                                </div>
                                {/* PRESCRIPTION */}
                                {rec.prescription && (
                                <div className="theme-bg p-3 rounded-3 border theme-border mb-3">
                                    <h6 className="fw-bold small theme-text-muted text-uppercase mb-2">
                                        Prescription
                                    </h6>
                                    <p className="mb-0 small theme-text" style={{whiteSpace: 'pre-line'}}>
                                        {rec.prescription}
                                    </p>
                                </div>
                                )}

                                {/* LAB TESTS */}
                                {rec.lab_orders && rec.lab_orders !== '' && (
                                <div className="theme-bg p-3 rounded-3 border theme-border mb-3">
                                    <h6 className="fw-bold small theme-text-muted text-uppercase mb-2">
                                        Prescribed Tests
                                    </h6>
                                    <p className="mb-0 small theme-text">
                                        {rec.lab_orders}
                                    </p>
                                </div>
                                )}

                                {/* PROCEDURES */}
                                {rec.procedures && rec.procedures !== '' && (
                                <div className="theme-bg p-3 rounded-3 border theme-border">
                                    <h6 className="fw-bold small theme-text-muted text-uppercase mb-2">
                                        Procedures / Notes
                                    </h6>
                                    <p className="mb-0 small theme-text" style={{whiteSpace: 'pre-line'}}>
                                        {rec.procedures}
                                    </p>
                                </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center p-5 theme-text-muted theme-card rounded-4 border theme-border">
                            No medical records found.
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                /* Re-declaring for the unlocked view */
                :root { --bg-color: #f8fafc; --card-bg: #ffffff; --text-color: #0f172a; --text-muted: #64748b; --border-color: #e2e8f0; --input-bg: #f1f5f9; }
                body.dark-mode { --bg-color: #0f172a; --card-bg: #1e293b; --text-color: #f8fafc; --text-muted: #94a3b8; --border-color: #334155; --input-bg: #334155; }
                .theme-bg { background-color: var(--bg-color); color: var(--text-color); }
                .theme-card { background-color: var(--card-bg); color: var(--text-color); transition: background-color 0.3s, color 0.3s; }
                .theme-text { color: var(--text-color); }
                .theme-text-muted { color: var(--text-muted); }
                .theme-border { border-color: var(--border-color) !important; }
                .theme-btn-secondary { background-color: var(--input-bg); color: var(--text-color); }
                .hover-shadow:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; transition: all 0.2s; }
            `}</style>
        </div>
    );
}

export default MyRecords;