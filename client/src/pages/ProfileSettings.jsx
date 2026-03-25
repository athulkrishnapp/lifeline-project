import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    FaSave, FaUserCircle, FaArrowLeft, FaCamera, FaEnvelope, 
    FaPhone, FaTrashAlt, FaCheckCircle, FaShieldAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function ProfileSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    // --- 1. GET ROLE FOR NAVIGATION FIX ---
    const role = localStorage.getItem('role'); // 'doctor', 'patient', or 'pharmacist'

    // Profile State
    const [profile, setProfile] = useState({
        full_name: "", email: "", unique_lifeline_id: "", phone: "",
        profile_image: "", health_tags: []
    });

    // Email Update State
    const [newEmail, setNewEmail] = useState("");
    const [emailOtp, setEmailOtp] = useState("");
    const [showEmailOtp, setShowEmailOtp] = useState(false);

    // Phone Update State
    const [newPhone, setNewPhone] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [showPhoneOtp, setShowPhoneOtp] = useState(false);

    // Feedback
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get('http://localhost:5000/api/profile', { headers: { Authorization: `Bearer ${token}` } });
            setProfile(res.data);
            setLoading(false);
        } catch (err) { setLoading(false); }
    };

    // --- NAVIGATION HANDLER (THE FIX) ---
    const handleBack = () => {
        if (role === 'doctor') {
            navigate('/doctor-dashboard');
        } else if (role === 'pharmacist') {
            navigate('/pharmacist-dashboard'); // Assuming you have this
        } else {
            navigate('/patient-dashboard');
        }
    };

    // --- IMAGE UPLOAD ---
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, profile_image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // --- SAVE PROFILE ---
    const handleSave = async () => {
        setMsg({ type: '', text: '' });
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/profile/update', {
                blood: profile.blood_group, 
                allergies: profile.allergies,
                emergency_contact: profile.emergency_contact,
                phone: profile.phone, 
                health_tags: profile.health_tags, 
                profile_image: profile.profile_image
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => setMsg({ type: '', text: '' }), 3000);
        } catch (err) { setMsg({ type: 'error', text: 'Failed to update.' }); }
    };

    // --- EMAIL OTP FLOW ---
    const sendEmailOtp = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/settings/email-otp', { newEmail }, { headers: { Authorization: `Bearer ${token}` } });
            setShowEmailOtp(true);
            setMsg({ type: 'success', text: 'OTP sent to new email.' });
        } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Failed' }); }
    };

    const verifyEmail = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/settings/verify-email', { otp: emailOtp }, { headers: { Authorization: `Bearer ${token}` } });
            setProfile({...profile, email: newEmail});
            setShowEmailOtp(false); setNewEmail(""); setEmailOtp("");
            setMsg({ type: 'success', text: 'Email updated!' });
        } catch (err) { setMsg({ type: 'error', text: 'Invalid OTP' }); }
    };

    // --- PHONE OTP FLOW ---
    const sendPhoneOtp = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('http://localhost:5000/api/settings/phone-otp', { newPhone }, { headers: { Authorization: `Bearer ${token}` } });
            setShowPhoneOtp(true);
            alert(`DEMO SMS: Your OTP is ${res.data.debug_otp}`);
            setMsg({ type: 'success', text: 'OTP sent to mobile.' });
        } catch (err) { setMsg({ type: 'error', text: 'Failed to send OTP' }); }
    };

    const verifyPhone = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/settings/verify-phone', { otp: phoneOtp }, { headers: { Authorization: `Bearer ${token}` } });
            setProfile({...profile, phone: newPhone});
            setShowPhoneOtp(false); setNewPhone(""); setPhoneOtp("");
            setMsg({ type: 'success', text: 'Phone updated!' });
        } catch (err) { setMsg({ type: 'error', text: 'Invalid OTP' }); }
    };

    // --- DELETE ACCOUNT ---
    const deleteAccount = async () => {
        if(!window.confirm("ARE YOU SURE? This action is irreversible.")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete('http://localhost:5000/api/settings/delete-account', { headers: { Authorization: `Bearer ${token}` } });
            localStorage.clear();
            navigate('/login');
        } catch (err) { alert("Delete failed."); }
    };

    if (loading) return <div className="theme-bg min-vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="theme-bg min-vh-100 p-4 transition-all">
            <div className="container" style={{ maxWidth: '750px' }}>
                
                {/* Header */}
                <div className="d-flex align-items-center gap-3 mb-4">
                    {/* --- UPDATED BACK BUTTON --- */}
                    <button onClick={handleBack} className="btn theme-btn-secondary rounded-circle shadow-sm">
                        <FaArrowLeft/>
                    </button>
                    <div>
                        <h4 className="fw-bold theme-text m-0">Settings</h4>
                        <small className="theme-text-muted">Manage your profile & security</small>
                    </div>
                </div>

                {/* Main Card */}
                <div className="theme-card border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="p-4 p-lg-5">
                        
                        {/* --- PUBLIC PROFILE --- */}
                        <div className="animate-fade-in mb-5">
                            <h6 className="fw-bold mb-4 text-uppercase small theme-text-muted letter-spacing-1">Public Profile</h6>
                            
                            <div className="d-flex align-items-center gap-4 mb-4">
                                <div className="position-relative">
                                    <div className="rounded-circle overflow-hidden border border-3 theme-border shadow-sm" style={{width:'90px', height:'90px'}}>
                                        {profile.profile_image ? (
                                            <img src={profile.profile_image} alt="Profile" className="w-100 h-100 object-fit-cover" />
                                        ) : (
                                            <div className="w-100 h-100 theme-bg d-flex align-items-center justify-content-center theme-text-muted">
                                                <FaUserCircle size={45}/>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => fileInputRef.current.click()}
                                        className="btn btn-primary btn-sm position-absolute bottom-0 end-0 rounded-circle shadow-sm" 
                                        style={{width:'30px', height:'30px', padding:0}}
                                        title="Change Photo"
                                    >
                                        <FaCamera size={12}/>
                                    </button>
                                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                                </div>
                                <div>
                                    <h5 className="fw-bold m-0 theme-text">{profile.full_name}</h5>
                                    <span className="badge theme-bg theme-text border theme-border mt-1 font-monospace">{profile.unique_lifeline_id}</span>
                                    <div className="mt-1 small theme-text-muted text-uppercase">{role} Account</div>
                                </div>
                                <div className="ms-auto">
                                    <button onClick={handleSave} className="btn theme-btn-secondary btn-sm rounded-pill px-4 fw-bold shadow-sm">
                                        <FaSave className="me-2"/> Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>

                        <hr className="my-5 opacity-10 theme-border"/>

                        {/* --- SECURITY & CONTACT --- */}
                        <div className="animate-fade-in">
                            <h6 className="fw-bold mb-4 text-uppercase small theme-text-muted letter-spacing-1">Security & Contact</h6>

                            {/* 1. Email Update */}
                            <div className="mb-4">
                                <div className="p-3 theme-bg rounded-3 border theme-border hover-shadow transition-all">
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="icon-box-sm bg-primary bg-opacity-10 text-primary me-3 rounded-circle" style={{width:'35px',height:'35px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            <FaEnvelope size={14}/>
                                        </div>
                                        <div className="flex-grow-1">
                                            <small className="theme-text-muted d-block" style={{fontSize:'10px'}}>EMAIL ADDRESS</small>
                                            <span className="fw-bold theme-text">{profile.email}</span>
                                        </div>
                                        {profile.email && <FaCheckCircle className="text-success" title="Verified"/>}
                                    </div>
                                    
                                    {!showEmailOtp ? (
                                        <div className="input-group input-group-sm">
                                            <input 
                                                className="form-control theme-input" 
                                                placeholder="New email address..." 
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                            />
                                            <button onClick={sendEmailOtp} disabled={!newEmail} className="btn btn-outline-primary fw-bold">Update</button>
                                        </div>
                                    ) : (
                                        <div className="input-group input-group-sm animate-slide-down">
                                            <input 
                                                className="form-control border-primary theme-input" 
                                                placeholder="Enter Email OTP" 
                                                value={emailOtp}
                                                onChange={(e) => setEmailOtp(e.target.value)}
                                            />
                                            <button onClick={verifyEmail} className="btn btn-primary fw-bold">Verify</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Phone Update */}
                            <div className="mb-5">
                                <div className="p-3 theme-bg rounded-3 border theme-border hover-shadow transition-all">
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="icon-box-sm bg-success bg-opacity-10 text-success me-3 rounded-circle" style={{width:'35px',height:'35px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            <FaPhone size={14}/>
                                        </div>
                                        <div className="flex-grow-1">
                                            <small className="theme-text-muted d-block" style={{fontSize:'10px'}}>PHONE NUMBER</small>
                                            <span className="fw-bold theme-text">{profile.phone || 'Not Set'}</span>
                                        </div>
                                    </div>
                                    
                                    {!showPhoneOtp ? (
                                        <div className="input-group input-group-sm">
                                            <input 
                                                className="form-control theme-input" 
                                                placeholder="New phone number..." 
                                                value={newPhone}
                                                onChange={(e) => setNewPhone(e.target.value)}
                                            />
                                            <button onClick={sendPhoneOtp} disabled={!newPhone} className="btn btn-outline-success fw-bold">Update</button>
                                        </div>
                                    ) : (
                                        <div className="input-group input-group-sm animate-slide-down">
                                            <input 
                                                className="form-control border-success theme-input" 
                                                placeholder="Enter SMS OTP" 
                                                value={phoneOtp}
                                                onChange={(e) => setPhoneOtp(e.target.value)}
                                            />
                                            <button onClick={verifyPhone} className="btn btn-success fw-bold">Verify</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Feedback Message */}
                            {msg.text && (
                                <div className={`alert py-2 text-center small fw-bold mb-4 ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                                    {msg.text}
                                </div>
                            )}

                            {/* Danger Zone */}
                            <div className="theme-bg p-4 rounded-4 border theme-border">
                                <h6 className="fw-bold text-danger mb-3 d-flex align-items-center gap-2">
                                    <FaShieldAlt/> Danger Zone
                                </h6>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong className="theme-text d-block" style={{fontSize:'14px'}}>Delete Account</strong>
                                        <small className="theme-text-muted" style={{fontSize:'11px'}}>
                                            Permanently delete your account and all data.
                                        </small>
                                    </div>
                                    <button 
                                        onClick={deleteAccount} 
                                        className="btn btn-white text-danger border border-danger hover-danger btn-sm rounded-pill fw-bold px-4"
                                    >
                                        <FaTrashAlt className="me-2"/> Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                /* Theme Logic */
                :root {
                    --bg-color: #f8fafc;
                    --card-bg: #ffffff;
                    --text-color: #0f172a;
                    --text-muted: #64748b;
                    --border-color: #e2e8f0;
                    --input-bg: #f1f5f9;
                    --hover-bg: #f1f5f9;
                }
                body.dark-mode {
                    --bg-color: #0f172a;
                    --card-bg: #1e293b;
                    --text-color: #f8fafc;
                    --text-muted: #94a3b8;
                    --border-color: #334155;
                    --input-bg: #334155;
                    --hover-bg: #334155;
                }
                .theme-bg { background-color: var(--bg-color); color: var(--text-color); }
                .theme-card { background-color: var(--card-bg); color: var(--text-color); transition: background-color 0.3s, color 0.3s; }
                .theme-text { color: var(--text-color); }
                .theme-text-muted { color: var(--text-muted); }
                .theme-border { border-color: var(--border-color) !important; }
                .theme-input { background-color: var(--input-bg); color: var(--text-color); border: 1px solid transparent; }
                .theme-input:focus { background-color: var(--input-bg); color: var(--text-color); box-shadow: 0 0 0 2px #2563eb; }
                .theme-btn-secondary { background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); }
                .hover-shadow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: var(--border-color) !important; }
                .transition-all { transition: all 0.2s ease; }
                .hover-danger:hover { background-color: #dc3545 !important; color: white !important; }
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-down { animation: slideDown 0.2s ease-out; }
                @keyframes slideDown { from { transform: translateY(-5px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}

export default ProfileSettings;