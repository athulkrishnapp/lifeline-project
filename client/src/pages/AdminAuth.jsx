import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaKey, FaUserShield } from 'react-icons/fa';

function AdminAuth() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ full_name: '', email: '', password: '', secret_key: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                const res = await axios.post('http://localhost:5000/api/admin/login', { email: formData.email, password: formData.password });
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/admin-dashboard');
            } else {
                await axios.post('http://localhost:5000/api/admin/register', formData);
                alert("Admin created successfully. Please log in.");
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Authentication failed");
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#121212' }}>
            <div className="card shadow-lg p-5" style={{ width: '450px', backgroundColor: '#1e1e1e', border: '1px solid #333', zIndex: 10 }}>
                <div className="text-center mb-4">
                    <FaUserShield size={50} color="#ef4444" className="mb-3"/>
                    <h3 className="fw-bold text-uppercase" style={{ color: '#ffffff', letterSpacing: '2px', margin: 0 }}>System Override</h3>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '5px' }}>Restricted Access Personnel Only</p>
                </div>

                {error && <div className="alert alert-danger py-2 small">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="mb-3">
                            <label style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>AUTHORIZATION NAME</label>
                            <input name="full_name" className="form-control border-0 p-3" style={{ backgroundColor: '#374151', color: '#ffffff' }} onChange={handleChange} required />
                        </div>
                    )}
                    <div className="mb-3">
                        <label style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>SECURE EMAIL</label>
                        <input name="email" type="email" className="form-control border-0 p-3" style={{ backgroundColor: '#374151', color: '#ffffff' }} onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>PASSPHRASE</label>
                        <input name="password" type="password" className="form-control border-0 p-3" style={{ backgroundColor: '#374151', color: '#ffffff' }} onChange={handleChange} required />
                    </div>
                    
                    {!isLogin && (
                        <div className="mb-4">
                            <label style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}><FaKey/> MASTER OVERRIDE KEY</label>
                            <input name="secret_key" type="password" className="form-control p-3" style={{ backgroundColor: '#121212', color: '#ef4444', border: '1px solid #ef4444', letterSpacing: '2px', fontWeight: 'bold' }} onChange={handleChange} required />
                        </div>
                    )}

                    <button type="submit" className="btn w-100 fw-bold py-3 mt-3 hover-scale" style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none' }}>
                        {isLogin ? "INITIATE LOGIN" : "AUTHORIZE ADMIN"}
                    </button>
                </form>

                <div className="text-center mt-4 pt-4" style={{ borderTop: '1px solid #333' }}>
                    <span 
                        style={{ color: '#9ca3af', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }} 
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Request Admin Authorization" : "Return to Login"}
                    </span>
                </div>
            </div>

            {/* Force placeholder styles to be white */}
            <style>{`
                input::placeholder { color: #9ca3af !important; opacity: 1; }
                .hover-scale { transition: transform 0.2s; }
                .hover-scale:hover { transform: scale(1.02); }
            `}</style>
        </div>
    );
}

export default AdminAuth;