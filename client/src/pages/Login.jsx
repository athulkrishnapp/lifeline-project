import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaShieldAlt, FaSpinner, FaGoogle, FaArrowLeft } from 'react-icons/fa';

// Firebase Imports
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase'; 

function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient'); 
  const [step, setStep] = useState(1); 
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loginSuccess = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.user.role);
    navigate(data.user.role === 'doctor' ? '/doctor-dashboard' : (data.user.role === 'patient' ? '/patient-dashboard' : '/pharmacist-dashboard'));
  };

  // UPDATED: Real Google Sign-In using Firebase
  const handleGoogleLogin = async () => {
    try {
        setLoading(true); 
        setError('');
        
        // 1. Trigger the real Firebase Google Sign-In popup
        const result = await signInWithPopup(auth, provider);
        const googleEmail = result.user.email; // Extract the verified email from Google

        // 2. Send the verified email to your Node.js backend
        const res = await axios.post('http://localhost:5000/api/google-login', { email: googleEmail });
        loginSuccess(res.data);

    } catch (err) {
        // Handle backend account not found
        if (err.response && (err.response.status === 403 || err.response.status === 404)) {
            alert("Account not found! Redirecting to Registration...");
            navigate('/register');
        } 
        // Handle user closing the Google popup manually
        else if (err.code === 'auth/popup-closed-by-user') {
            setError("Google sign-in was cancelled.");
        } 
        // Catch-all error
        else {
            console.error("Google Auth Error:", err);
            setError("Google Login Failed.");
        }
    } finally { 
        setLoading(false); 
    }
  };

  const handleSendLoginOTP = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await axios.post('http://localhost:5000/api/login-send-otp', { identifier }); setStep(2); } 
    catch (err) { setError(err.response?.data?.error || "User not found"); } finally { setLoading(false); }
  };

  const handleVerifyLoginOTP = async (e) => {
    e.preventDefault(); setLoading(true);
    try { const res = await axios.post('http://localhost:5000/api/login-verify-otp', { identifier, otp }); loginSuccess(res.data); } 
    catch (err) { setError("Invalid OTP"); } finally { setLoading(false); }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const res = await axios.post('http://localhost:5000/api/login-password', { identifier, password }); loginSuccess(res.data); } 
    catch (err) { setError("Invalid Credentials"); } finally { setLoading(false); }
  };

  const handleForgotInit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const res = await axios.post('http://localhost:5000/api/forgot-password-init', { identifier }); setEmailHint(res.data.email_hint); setForgotStep(2); } 
    catch (err) { setError(err.response?.data?.error || "Account not found"); } finally { setLoading(false); }
  };

  const handleForgotComplete = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await axios.post('http://localhost:5000/api/forgot-password-complete', { identifier, otp, newPassword }); alert("Password Reset Successfully!"); setIsForgot(false); setForgotStep(1); setPassword(''); } 
    catch (err) { setError("Invalid OTP"); } finally { setLoading(false); }
  };

  return (
    <div className="page-background min-vh-100 d-flex flex-column">
      
      {/* MAIN CONTENT */}
      <div className="flex-grow-1 d-flex align-items-center justify-content-center py-5">
        <div className="container">
            <div className="row justify-content-center">
                <div className="col-lg-5 col-md-8">
                    
                    {/* HEADER */}
                    <div className="text-center mb-4">
                        <div className="d-flex justify-content-center align-items-center gap-2 mb-3 opacity-75">
                            <FaShieldAlt className="theme-icon"/> <span className="small fw-bold theme-text-muted" style={{letterSpacing: '3px'}}>SECURE ACCESS</span>
                        </div>
                    </div>

                    <div className="register-card p-5 shadow-2xl rounded-0">
                        {!isForgot && (
                            <div className="d-flex border-bottom mb-4 role-tabs">
                                <button onClick={() => { setRole('patient'); setStep(1); setError(''); }} className={`flex-fill btn rounded-0 py-3 fw-bold text-uppercase transition-colors ${role === 'patient' ? 'active-tab' : 'inactive-tab'}`} style={{fontSize: '11px', letterSpacing: '1px'}}>PATIENT</button>
                                <button onClick={() => { setRole('professional'); setError(''); }} className={`flex-fill btn rounded-0 py-3 fw-bold text-uppercase transition-colors ${role === 'professional' ? 'active-tab' : 'inactive-tab'}`} style={{fontSize: '11px', letterSpacing: '1px'}}>DOCTOR/PHARMA</button>
                            </div>
                        )}

                        {error && <div className="alert alert-danger rounded-0 small mb-4 border-0 bg-danger bg-opacity-10 text-danger">{error}</div>}

                        {isForgot ? (
                            <>
                                {forgotStep === 1 ? (
                                    <form onSubmit={handleForgotInit} className="fade-in">
                                        <div className="mb-4">
                                            <label className="small fw-bold theme-text-muted mb-1">ENTER EMAIL or LICENSE ID</label>
                                            <input className="form-control rounded-0 p-3 custom-input" placeholder="Identifier" onChange={(e) => setIdentifier(e.target.value)} required/>
                                        </div>
                                        <button disabled={loading} className="btn btn-dark w-100 py-3 fw-bold rounded-0 text-uppercase">{loading ? <FaSpinner className="fa-spin"/> : "SEND RESET CODE"}</button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleForgotComplete} className="fade-in">
                                        <div className="alert alert-info rounded-0 small border-0 bg-info bg-opacity-10 text-info mb-4">Code sent to: {emailHint}</div>
                                        <div className="mb-3">
                                            <label className="small fw-bold theme-text-muted mb-1">RESET CODE</label>
                                            <input className="form-control rounded-0 p-3 custom-input" placeholder="6-Digit OTP" onChange={(e) => setOtp(e.target.value)} required/>
                                        </div>
                                        <div className="mb-4">
                                            <label className="small fw-bold theme-text-muted mb-1">NEW PASSWORD</label>
                                            <input type="password" className="form-control rounded-0 p-3 custom-input" placeholder="New Password" onChange={(e) => setNewPassword(e.target.value)} required/>
                                        </div>
                                        <button disabled={loading} className="btn btn-dark w-100 py-3 fw-bold rounded-0 text-uppercase">UPDATE PASSWORD</button>
                                    </form>
                                )}
                                <button onClick={() => { setIsForgot(false); setForgotStep(1); }} className="btn btn-link w-100 mt-3 text-decoration-none theme-text-muted small"><FaArrowLeft className="me-1"/> Back to Login</button>
                            </>
                        ) : (
                            <>
                                {role === 'patient' && (
                                    <>
                                        {step === 1 ? (
                                            <div className="fade-in">
                                                <form onSubmit={handleSendLoginOTP}>
                                                    <div className="mb-4">
                                                        <label className="small fw-bold theme-text-muted mb-1">EMAIL or HEALTH ID</label>
                                                        <input className="form-control rounded-0 p-3 custom-input" placeholder="Enter Registered Email" onChange={(e) => setIdentifier(e.target.value)} required/>
                                                    </div>
                                                    <button disabled={loading} className="btn btn-primary w-100 py-3 fw-bold rounded-0 text-uppercase" style={{letterSpacing: '1px'}}>
                                                        {loading ? <FaSpinner className="fa-spin"/> : "SEND LOGIN CODE"}
                                                    </button>
                                                </form>
                                                <div className="text-center my-3 position-relative">
                                                    <hr className="border-secondary-subtle" />
                                                    <span className="position-absolute top-50 start-50 translate-middle px-2 theme-bg-text small theme-text-muted">OR</span>
                                                </div>
                                                <button onClick={handleGoogleLogin} className="btn btn-outline-dark w-100 py-3 fw-bold rounded-0 d-flex align-items-center justify-content-center gap-2 google-btn">
                                                    <FaGoogle /> SIGN IN WITH GOOGLE
                                                </button>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleVerifyLoginOTP} className="fade-in">
                                                <div className="alert alert-info rounded-0 small border-0 bg-info bg-opacity-10 text-info mb-4">We sent a code to your email.</div>
                                                <div className="mb-4">
                                                    <label className="small fw-bold theme-text-muted mb-1">ENTER OTP CODE</label>
                                                    <input className="form-control rounded-0 p-3 custom-input text-center fs-4" placeholder="• • • • • •" onChange={(e) => setOtp(e.target.value)} required maxLength="6"/>
                                                </div>
                                                <button disabled={loading} className="btn btn-dark w-100 py-3 fw-bold rounded-0 text-uppercase">VERIFY & ENTER</button>
                                                <button type="button" onClick={() => setStep(1)} className="btn btn-link w-100 mt-2 small theme-text-muted text-decoration-none">Use different email</button>
                                            </form>
                                        )}
                                    </>
                                )}

                                {role === 'professional' && (
                                    <form onSubmit={handlePasswordLogin} className="fade-in">
                                        <div className="mb-3">
                                            <label className="small fw-bold theme-text-muted mb-1">EMAIL / LICENSE ID</label>
                                            <input className="form-control rounded-0 p-3 custom-input" placeholder="ID or Work Email" onChange={(e) => setIdentifier(e.target.value)} required/>
                                        </div>
                                        <div className="mb-2">
                                            <label className="small fw-bold theme-text-muted mb-1">PASSWORD</label>
                                            <input type="password" className="form-control rounded-0 p-3 custom-input" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} required/>
                                        </div>
                                        <div className="text-end mb-4">
                                            <button type="button" onClick={() => setIsForgot(true)} className="btn btn-link p-0 small text-decoration-none theme-text-muted">Forgot Password?</button>
                                        </div>
                                        <button disabled={loading} className="btn btn-dark w-100 py-3 fw-bold rounded-0 text-uppercase" style={{letterSpacing: '1px'}}>SECURE LOGIN</button>
                                    </form>
                                )}

                                <div className="text-center mt-4 pt-3 border-top border-secondary-subtle">
                                    <Link to="/register" className="small text-decoration-none theme-text-muted fw-bold">NO ACCOUNT? REGISTER HERE</Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="pt-5 pb-4 theme-footer-bg border-top theme-border">
          <div className="container">
              <div className="border-top theme-border pt-4 d-flex justify-content-between align-items-center flex-column flex-md-row">
                  <small className="theme-text-muted mb-2 mb-md-0">
                      &copy; 2026 Lifeline Project. <strong>Athulkrishna P P</strong>. All Rights Reserved.
                  </small>
                  <div className="d-flex gap-4 small theme-text-muted">
                      <Link to="/" className="text-decoration-none theme-text-muted">Home</Link>
                      <span>Privacy Policy</span>
                      <span>Terms</span>
                  </div>
              </div>
          </div>
      </footer>

      <style>{`
        body, .page-background, .register-card, .custom-input, .theme-text, .theme-text-muted { transition: background-color 0.5s ease, color 0.3s ease, border-color 0.3s ease; }
        .page-background { background-color: #f8fafc; background-image: radial-gradient(at 0% 0%, hsla(253,16%,7%,0) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,0) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,0) 0, transparent 50%); }
        .register-card { background-color: #ffffff; }
        .theme-text { color: #0f172a; } .theme-text-muted { color: #64748b; } .theme-icon { color: #0f172a; }
        .custom-input { background-color: #f1f5f9; color: #334155; border: 1px solid transparent; } .custom-input:focus { background-color: #ffffff; box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }
        .active-tab { color: #2563eb; border-bottom: 3px solid #2563eb; } .inactive-tab { color: #94a3b8; }
        .theme-bg-text { background-color: #ffffff; } .google-btn { border-color: #e2e8f0; color: #334155; } .google-btn:hover { background-color: #f8fafc; }
        .theme-footer-bg { background-color: #ffffff; } .theme-border { border-color: #e2e8f0 !important; }

        body.dark-mode .page-background { background-color: #0f172a !important; background-image: none; }
        body.dark-mode .register-card { background-color: #1e293b; border: 1px solid #334155; }
        body.dark-mode .theme-text { color: #f8fafc; } body.dark-mode .theme-text-muted { color: #cbd5e1; } body.dark-mode .theme-icon { color: #f8fafc; }
        body.dark-mode .custom-input { background-color: #334155; color: #f8fafc; border: 1px solid #475569; } body.dark-mode .custom-input:focus { background-color: #1e293b; border-color: #60a5fa; }
        body.dark-mode .active-tab { color: #60a5fa; border-bottom: 3px solid #60a5fa; } body.dark-mode .inactive-tab { color: #64748b; }
        body.dark-mode .border-secondary-subtle { border-color: #334155 !important; }
        body.dark-mode .theme-bg-text { background-color: #1e293b; }
        body.dark-mode .google-btn { border-color: #475569; color: #f8fafc; } body.dark-mode .google-btn:hover { background-color: #334155; }
        body.dark-mode .theme-footer-bg { background-color: #1e293b; } body.dark-mode .theme-border { border-color: #334155 !important; }

        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); } .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default Login;