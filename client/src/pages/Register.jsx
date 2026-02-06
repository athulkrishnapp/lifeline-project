import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaCheckCircle, FaSpinner, FaShieldAlt, FaInfoCircle, FaClock, FaRedo } from 'react-icons/fa';

function Register() {
  const navigate = useNavigate();

  // --- DEMO DATA ---
  const [demoIdentity] = useState(() => {
    const options = [
        { uid: "123456789012", dob: "2002-05-15" },
        { uid: "987654321098", dob: "1999-08-20" },
        { uid: "111122223333", dob: "1995-01-10" }
    ];
    return options[Math.floor(Math.random() * options.length)];
  });

  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({ 
    aadhaar: '', dob: '', 
    full_name: '', email: '', phone: '', 
    password: '', confirm_password: '', 
    license_id: '', workplace: '' 
  });
  
  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]); // 4 Digits
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedID, setGeneratedID] = useState(null);

  // Refs for OTP inputs to manage focus
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
        interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
        setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // --- OTP INPUT HANDLERS ---
  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = element.value;
    setOtpValues(newOtp);

    // Auto-focus next input
    if (element.value && index < 3) {
        inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Auto-focus previous input on Backspace
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
        inputRefs[index - 1].current.focus();
    }
  };

  // --- ACTIONS ---

  const handleSendOTP = async () => {
    if (formData.aadhaar.length !== 12) return setError("Enter valid 12-digit Aadhaar");
    setLoading(true); setError('');
    try {
        await axios.post('http://localhost:5000/api/send-otp', { aadhaar: formData.aadhaar, dob: formData.dob });
        setOtpSent(true);
        setTimer(30);
        setCanResend(false);
        setOtpValues(["", "", "", ""]);
    } catch (err) { setError(err.response?.data?.error || "Check Aadhaar/DOB"); } 
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const fullOtp = otpValues.join("");
    if (fullOtp.length !== 4) return setError("Enter complete 4-digit code");
    
    setLoading(true);
    try {
        const res = await axios.post('http://localhost:5000/api/verify-otp', { aadhaar: formData.aadhaar, otp: fullOtp });
        setFormData(prev => ({ ...prev, full_name: res.data.data.full_name, phone: res.data.data.phone, email: res.data.data.email }));
        setIsVerified(true);
    } catch (err) { setError("Invalid OTP"); } 
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError('');
    if (role !== 'patient' && formData.password !== formData.confirm_password) return setError("Passwords do not match");
    setLoading(true);
    try {
        const res = await axios.post('http://localhost:5000/api/register', { ...formData, role });
        setGeneratedID(res.data.unique_id);
    } catch (err) { setError(err.response?.data?.error || "Registration Failed"); } 
    finally { setLoading(false); }
  };

  if (generatedID) {
    return (
        <div className="page-background min-vh-100 d-flex justify-content-center align-items-center">
            <div className="register-card p-5 text-center shadow-lg" style={{ width: '500px', borderTop: '4px solid #10b981' }}>
                <FaCheckCircle size={60} className="text-success mb-4" />
                <h3 className="fw-bold theme-text mb-2">Account Created</h3>
                <div className="id-box border p-4 mb-4">
                    <small className="fw-bold theme-text-muted">UNIQUE LIFELINE ID</small>
                    <div className="fs-3 fw-bold theme-text mt-1">{generatedID}</div>
                </div>
                <button onClick={() => navigate('/login')} className="btn btn-dark w-100 py-3 fw-bold rounded-0">LOGIN NOW</button>
            </div>
        </div>
    );
  }

  return (
    <div className="page-background min-vh-100 d-flex align-items-center justify-content-center py-5 transition-bg">
      <div className="container">
        <div className="row justify-content-center">
            <div className="col-lg-6 col-md-9">
                
                <div className="text-center mb-5">
                    <div className="d-flex justify-content-center align-items-center gap-2 mb-3 opacity-75">
                        <FaShieldAlt className="theme-icon"/> <span className="small fw-bold theme-text-muted" style={{letterSpacing: '3px'}}>SECURE GATEWAY</span>
                    </div>
                    {/* Header Text Removed as requested earlier? Added back for context, remove if strict "nothing there" still applies */}
                    <h2 className="fw-bold theme-text display-6">Create Account</h2>
                </div>

                <div className="register-card p-5 shadow-2xl rounded-0">
                    <div className="d-flex border-bottom mb-4 role-tabs">
                        {['patient', 'doctor', 'pharmacist'].map(r => (
                            <button key={r} onClick={() => { setRole(r); setFormData({ ...formData, full_name: '', email: '' }); setIsVerified(false); setError(''); }}
                                className={`flex-fill btn rounded-0 py-3 fw-bold text-uppercase transition-colors ${role === r ? 'active-tab' : 'inactive-tab'}`}
                                style={{fontSize: '11px', letterSpacing: '1px'}}>
                                {r}
                            </button>
                        ))}
                    </div>

                    {error && <div className="alert alert-danger rounded-0 small mb-4">{error}</div>}

                    <form onSubmit={handleRegister}>
                        
                        {/* PATIENT FLOW */}
                        {role === 'patient' && (
                            <>
                                {!isVerified ? (
                                    <div className="fade-in">
                                        <div className="row">
                                            <div className="col-12 mb-3">
                                                <label className="small fw-bold theme-text-muted mb-1">AADHAAR NUMBER</label>
                                                <input name="aadhaar" className="form-control rounded-0 p-3 custom-input" placeholder="12-Digit UID" onChange={handleChange} maxLength="12"/>
                                            </div>
                                            <div className="col-12 mb-2">
                                                <label className="small fw-bold theme-text-muted mb-1">DATE OF BIRTH</label>
                                                <input name="dob" type="date" className="form-control rounded-0 p-3 custom-input" onChange={handleChange}/>
                                            </div>
                                        </div>

                                        {/* Demo Hint */}
                                        <div className="mb-4 text-start">
                                            <small className="theme-text-muted" style={{fontSize: '11px', opacity: 0.7}}>
                                                Demo: <span className="fw-bold">{demoIdentity.uid}</span> &bull; <span className="fw-bold">{demoIdentity.dob}</span>
                                            </small>
                                        </div>

                                        {!otpSent ? (
                                            <button type="button" onClick={handleSendOTP} disabled={loading} className="btn btn-primary w-100 py-3 fw-bold rounded-0">
                                                {loading ? <FaSpinner className="fa-spin"/> : "VERIFY IDENTITY"}
                                            </button>
                                        ) : (
                                            <div className="otp-container fade-in">
                                                <label className="small fw-bold theme-text mb-3 d-block">ENTER 4-DIGIT CODE</label>
                                                
                                                {/* 4-Digit Input + Timer */}
                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                    <div className="d-flex gap-2">
                                                        {otpValues.map((digit, index) => (
                                                            <input
                                                                key={index}
                                                                ref={inputRefs[index]}
                                                                type="text"
                                                                maxLength="1"
                                                                className="form-control rounded-0 text-center fw-bold fs-4 otp-box-input"
                                                                style={{ width: '50px', height: '50px' }}
                                                                value={digit}
                                                                onChange={(e) => handleOtpChange(e.target, index)}
                                                                onKeyDown={(e) => handleKeyDown(e, index)}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Timer Section */}
                                                    <div className="text-end" style={{minWidth: '80px'}}>
                                                        {canResend ? (
                                                            <button type="button" onClick={handleSendOTP} className="btn btn-link p-0 text-decoration-none small fw-bold text-primary d-flex align-items-center gap-1">
                                                                <FaRedo size={12}/> Resend
                                                            </button>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-1 text-muted small">
                                                                <FaClock size={12}/> <span>00:{timer < 10 ? `0${timer}` : timer}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <button type="button" onClick={handleVerifyOTP} className="btn btn-dark fw-bold rounded-0 w-100 py-3">
                                                    CONFIRM & VERIFY
                                                </button>
                                                <small className="text-muted d-block mt-3 text-center" style={{fontSize:'11px'}}>Demo OTP: 1234</small>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="fade-in">
                                        <div className="alert alert-success rounded-0 small d-flex align-items-center gap-2 mb-3 bg-success bg-opacity-10 text-success border-0"><FaCheckCircle /> Verified: <strong>{formData.full_name}</strong></div>
                                        <div className="mb-3"><input className="form-control rounded-0 custom-input" value={formData.phone} disabled/></div>
                                        <div className="mb-3"><input className="form-control rounded-0 custom-input" value={formData.email} disabled/></div>
                                        
                                        {/* REMOVED THE TEXT "No password required..." HERE */}
                                        
                                        <button type="submit" disabled={loading} className="btn btn-dark w-100 py-3 fw-bold rounded-0 mt-2">CREATE ACCOUNT</button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* PROFESSIONAL FLOW */}
                        {role !== 'patient' && (
                            <div className="fade-in">
                                <div className="mb-3"><input name="full_name" className="form-control rounded-0 p-3 custom-input" placeholder="Full Name" onChange={handleChange} required/></div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6"><input name="email" className="form-control rounded-0 p-3 custom-input" placeholder="Email" onChange={handleChange} required/></div>
                                    <div className="col-6"><input name="phone" className="form-control rounded-0 p-3 custom-input" placeholder="Phone" onChange={handleChange} required/></div>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6"><input name="password" type="password" className="form-control rounded-0 p-3 custom-input" placeholder="Password" onChange={handleChange} required/></div>
                                    <div className="col-6"><input name="confirm_password" type="password" className="form-control rounded-0 p-3 custom-input" placeholder="Confirm" onChange={handleChange} required/></div>
                                </div>
                                
                                <div className="p-3 bg-light border mb-4 prof-box">
                                    <div className="row g-2">
                                        <div className="col-6"><input name="license_id" className="form-control rounded-0 otp-input" placeholder="License ID" onChange={handleChange} required/></div>
                                        <div className="col-6"><input name="workplace" className="form-control rounded-0 otp-input" placeholder="Workplace" onChange={handleChange} required/></div>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="btn btn-dark w-100 py-3 fw-bold rounded-0">REGISTER</button>
                            </div>
                        )}
                    </form>
                    <div className="text-center mt-4 pt-3 border-top border-secondary-subtle"><Link to="/login" className="small text-decoration-none theme-text-muted fw-bold">ALREADY REGISTERED? LOGIN</Link></div>
                </div>
            </div>
        </div>
      </div>
      
      {/* CSS STYLES */}
      <style>{`
        /* GLOBAL TRANSITIONS */
        body, .page-background, .register-card, .custom-input, .theme-text, .theme-text-muted { transition: background-color 0.5s ease, color 0.3s ease, border-color 0.3s ease; }
        .page-background { background-color: #eff6ff; } .register-card { background-color: #ffffff; }
        .theme-text { color: #0f172a; } .theme-text-muted { color: #64748b; } .theme-icon { color: #0f172a; }
        .custom-input { background-color: #f1f5f9; color: #334155; } .custom-input:focus { background-color: #ffffff; box-shadow: 0 0 0 2px #3b82f6; }
        .active-tab { color: #2563eb; border-bottom: 3px solid #2563eb; } .inactive-tab { color: #94a3b8; }
        .prof-box, .id-box { background-color: #f8fafc; border-color: #e2e8f0; }
        .user-select-all { user-select: all; }
        
        /* OTP BOX STYLES */
        .otp-box-input { border: 1px solid #e2e8f0; background-color: #f8fafc; color: #334155; }
        .otp-box-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); background-color: #fff; }

        /* DARK MODE */
        body.dark-mode .page-background { background-color: #0f172a !important; }
        body.dark-mode .register-card { background-color: #1e293b; border: 1px solid #334155; }
        body.dark-mode .theme-text { color: #f8fafc; } body.dark-mode .theme-text-muted { color: #cbd5e1; } body.dark-mode .theme-icon { color: #f8fafc; }
        body.dark-mode .custom-input { background-color: #334155; color: #f8fafc; border: 1px solid #475569; }
        body.dark-mode .custom-input:focus { background-color: #1e293b; border-color: #60a5fa; }
        body.dark-mode .otp-box-input { background-color: #334155; color: white; border: 1px solid #475569; }
        body.dark-mode .otp-box-input:focus { border-color: #60a5fa; background-color: #1e293b; }
        body.dark-mode .active-tab { color: #60a5fa; border-bottom: 3px solid #60a5fa; } body.dark-mode .inactive-tab { color: #64748b; }
        body.dark-mode .prof-box, body.dark-mode .id-box { background-color: #0f172a; border-color: #334155; }
        body.dark-mode .border-secondary-subtle { border-color: #334155 !important; }
        
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); } .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default Register;