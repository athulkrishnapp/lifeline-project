import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import { Link, useNavigate } from 'react-router-dom';
import { 
    FaRobot, FaCalendarCheck, FaPills, FaFileMedicalAlt, 
    FaMicroscope, FaHome, FaSyringe, FaAllergies, FaTint, FaDownload, 
    FaEdit, FaTimes, FaUserCircle, FaArrowRight,
    FaMagic, FaPlus, FaTrash, FaEye, FaBars, FaUsers, FaPhone, FaCog, FaExchangeAlt, FaShieldAlt, FaCheckCircle
} from 'react-icons/fa';
import axios from 'axios';
import * as htmlToImage from 'html-to-image';

function PatientDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false); 
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const [formData, setFormData] = useState({
        blood_group: '',
        allergies: [],
        emergency_contact: '',
        phone: '',
        health_tags: [] 
    });
    
    
    // AI & Suggestions
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [labOptions, setLabOptions] = useState([]);
    const [selectedLab, setSelectedLab] = useState('');
    const [allergyInput, setAllergyInput] = useState('');
    const commonAllergies = ["Penicillin", "Peanuts", "Dust", "Pollen", "Latex", "Seafood"];

    const [saveLoading, setSaveLoading] = useState(false);
    const cardRef = useRef(null);

    // Dependent & Sub-Account States
    const [dependents, setDependents] = useState([]);
    const [showManageFamily, setShowManageFamily] = useState(false);
    const [showAddDependent, setShowAddDependent] = useState(false);
    const [depForm, setDepForm] = useState({ full_name: '', dob: '', blood_group: 'O+' });
    
    // Account Switching States
    const [switchingTo, setSwitchingTo] = useState(null);
    const [switchOtpSent, setSwitchOtpSent] = useState(false);
    const [switchOtp, setSwitchOtp] = useState('');
    const [isSubAccount, setIsSubAccount] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        
        const activeDepStr = localStorage.getItem('active_dependent');

        try {
            // ✅ FIXED: Added Bearer prefix
            const res = await axios.get('http://localhost:5000/api/profile', { headers: { Authorization: `Bearer ${token}` } });
            
            try {
                const depRes = await axios.get('http://localhost:5000/api/dependents', { headers: { Authorization: `Bearer ${token}` } });
                setDependents(depRes.data);
            } catch(e) { console.error("Error fetching dependents"); }

            if (activeDepStr) {
                setIsSubAccount(true);
                const activeDep = JSON.parse(activeDepStr);
                
                setUser({
                    full_name: activeDep.full_name,
                    unique_lifeline_id: activeDep.unique_lifeline_id,
                    blood_group: activeDep.blood_group,
                    emergency_contact: `Guardian: ${res.data.phone || 'Primary Account'}`
                });
                
                setFormData({
                    blood_group: activeDep.blood_group || 'O+',
                    allergies: [], 
                    emergency_contact: `Guardian: ${res.data.phone || 'Primary Account'}`,
                    phone: '',
                    health_tags: []
                });
            } else {
                setUser(res.data);
                let tags = [];
                try { tags = typeof res.data.health_tags === 'string' ? JSON.parse(res.data.health_tags) : (res.data.health_tags || []); } catch(e) { tags = []; }
                const allergyArray = res.data.allergies ? res.data.allergies.split(',').map(s => s.trim()).filter(Boolean) : [];

                setFormData({
                    blood_group: res.data.blood_group || '',
                    allergies: allergyArray,
                    emergency_contact: res.data.emergency_contact || '',
                    phone: res.data.phone || '',
                    health_tags: tags
                });
            }
            setLoading(false);
        } catch (err) { setLoading(false); }
    };

    const runAIScan = async () => {
        setAiLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get('http://localhost:5000/api/ai/analyze-health', { headers: { Authorization: `Bearer ${token}` } });
            setAiSuggestions(res.data.suggested_conditions || []);
            setLabOptions(res.data.recent_labs || []);
        } catch (err) { alert("AI Scan Failed"); }
        finally { setAiLoading(false); }
    };

    const addCondition = (condition) => {
        if (formData.health_tags.find(t => t.label === condition)) return;
        setFormData(prev => ({ ...prev, health_tags: [...prev.health_tags, { label: condition, value: 'Verified' }] }));
    };
    const addLabToID = () => {
        if (!selectedLab) return;
        const [test, result] = selectedLab.split(':');
        setFormData(prev => ({ ...prev, health_tags: [...prev.health_tags, { label: test.trim(), value: result.trim() }] }));
        setSelectedLab('');
    };
    const removeTag = (index) => setFormData(prev => ({ ...prev, health_tags: prev.health_tags.filter((_, i) => i !== index) }));
    const addAllergy = (val) => {
        if (!val || formData.allergies.includes(val)) return;
        setFormData(prev => ({ ...prev, allergies: [...prev.allergies, val] }));
        setAllergyInput('');
    };
    const removeAllergy = (index) => setFormData(prev => ({ ...prev, allergies: prev.allergies.filter((_, i) => i !== index) }));

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaveLoading(true);
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/profile/update', {
                blood: formData.blood_group, allergies: formData.allergies.join(', '), 
                emergency_contact: formData.emergency_contact, phone: formData.phone, health_tags: formData.health_tags
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setUser(prev => ({ ...prev, ...formData, allergies: formData.allergies.join(', '), health_tags: formData.health_tags }));
            setShowEditModal(false);
        } catch (err) { alert("Failed to update."); } 
        finally { setSaveLoading(false); }
    };

    const downloadCard = () => {
        if (cardRef.current === null) return;
        htmlToImage.toPng(cardRef.current)
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `Lifeline-ID-${user.unique_lifeline_id}.png`;
                link.href = dataUrl;
                link.click();
            }).catch((err) => console.error('Error generating ID:', err));
    };

    const handleAddDependent = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/dependents', depForm, { headers: { Authorization: `Bearer ${token}` } });
            alert("Family Member Added Successfully!");
            setShowAddDependent(false);
            window.location.reload(); 
        } catch(e) { alert("Failed to add member"); }
    };

    const handleRemoveDependent = async (id) => {
        if(!window.confirm("Are you sure you want to remove this family member?")) return;
        setDependents(dependents.filter(d => d.unique_lifeline_id !== id));
    };

    const initiateAccountSwitch = (dep) => {
        setSwitchingTo(dep);
        setSwitchOtpSent(false);
        setSwitchOtp('');
        setShowMobileMenu(false);
    };

    const requestSwitchOTP = () => {
        alert(`Demo: An OTP has been sent to the primary account email. \n\nFor this demo, enter: 1234`);
        setSwitchOtpSent(true);
    };

    const verifySwitchOTP = () => {
        if (switchOtp === '1234') { 
            alert(`Authentication Successful! Switching dashboard to ${switchingTo.full_name}...`);
            localStorage.setItem('active_dependent', JSON.stringify(switchingTo));
            window.location.reload(); 
        } else {
            alert("Invalid OTP code. Access Denied.");
        }
    };

    const returnToPrimaryAccount = () => {
        localStorage.removeItem('active_dependent');
        window.location.reload();
    };

    if (loading) return <div className="theme-bg min-vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border text-primary"></div></div>;
    if (!user) return <div className="text-center p-5 theme-text">Please login again.</div>;

    const navLinks = [
        { name: 'Dashboard', icon: <FaHome size={18}/>, link: '/patient-dashboard', active: true },
        { name: 'Book Appointment', icon: <FaCalendarCheck size={18}/>, link: '/book-appointment' },
        { name: 'Medical Records', icon: <FaFileMedicalAlt size={18}/>, link: '/my-records' },
        { name: 'Prescriptions', icon: <FaPills size={18}/>, link: '/prescriptions' },
        { name: 'Lab Reports', icon: <FaMicroscope size={18}/>, link: '/lab-reports' },
    ];

    const primaryQrData = `--- ${isSubAccount ? 'DEPENDENT' : 'LIFELINE'} HEALTH ID ---\nName: ${user.full_name}\nID: ${user.unique_lifeline_id}\nBlood Group: ${user.blood_group || 'Not Set'}`;

    const renderFamilyNavigation = () => (
        <div className="mt-4 pt-4 border-top theme-border px-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <small className="fw-bold theme-text-muted letter-spacing-1" style={{fontSize: '11px'}}><FaUsers className="me-1"/> FAMILY PROFILES</small>
                {!isSubAccount && (
                    <button onClick={() => {setShowMobileMenu(false); setShowManageFamily(true);}} className="btn btn-sm btn-light text-primary rounded p-1 d-flex align-items-center gap-1 shadow-sm" style={{fontSize: '10px', fontWeight: 'bold'}}>
                        <FaCog /> Manage
                    </button>
                )}
            </div>
            
            {isSubAccount ? (
                <button onClick={returnToPrimaryAccount} className="btn btn-warning w-100 btn-sm fw-bold rounded-3 shadow-sm text-dark d-flex align-items-center justify-content-center gap-2">
                    <FaExchangeAlt /> Return to Primary
                </button>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {dependents.map((dep, i) => (
                        <div key={i} onClick={() => initiateAccountSwitch(dep)} className="theme-card border theme-border rounded-3 p-2 d-flex align-items-center gap-3 cursor-pointer hover-shadow transition-all">
                            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle flex-shrink-0">
                                <FaUserCircle size={18}/>
                            </div>
                            <div className="overflow-hidden">
                                <h6 className="fw-bold m-0 theme-text text-truncate" style={{fontSize: '13px'}}>{dep.full_name}</h6>
                                <small className="text-primary d-block fw-bold" style={{fontSize: '10px'}}>Switch Account <FaArrowRight size={8}/></small>
                            </div>
                        </div>
                    ))}
                    {dependents.length === 0 && <small className="theme-text-muted fst-italic" style={{fontSize: '11px'}}>No family members linked.</small>}
                </div>
            )}
        </div>
    );

    return (
        <div className="theme-bg min-vh-100 transition-all">
            <div className="container-fluid">
                <div className="row">
                    
                    {/* LEFT SIDEBAR (Desktop) */}
                    <div className="col-lg-3 col-md-4 d-none d-md-block theme-sidebar p-0 border-end theme-border">
                        <div className="sticky-top overflow-auto custom-scrollbar" style={{ top: '0px', height: '100vh', paddingTop: '80px', paddingBottom: '20px' }}>
                            <div className="p-3">
                                <small className="fw-bold theme-text-muted px-3 mb-2 d-block letter-spacing-1" style={{fontSize: '11px'}}>MENU</small>
                                <div className="d-flex flex-column gap-1">
                                    {navLinks.map((item, index) => (
                                        <Link key={index} to={item.link} className={`nav-item-link d-flex align-items-center gap-3 px-3 py-3 rounded-3 text-decoration-none ${item.active ? 'active' : ''}`}>
                                            <div className="icon-box text-secondary">{item.icon}</div>
                                            <span className="fw-bold small">{item.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            {renderFamilyNavigation()}
                        </div>
                    </div>

                    {/* RIGHT CONTENT */}
                    <div className="col-lg-9 col-md-8 col-12 p-0">
                        <div className="p-4 p-lg-5">
                            
                            {isSubAccount && (
                                <div className="alert alert-warning border-warning shadow-sm d-flex align-items-center gap-2 mb-4 rounded-4 fw-bold text-dark">
                                    <FaShieldAlt size={20} className="text-danger"/>
                                    You are currently viewing a dependent's medical profile.
                                </div>
                            )}

                            {/* HEADER */}
                            <div className="d-flex justify-content-between align-items-end mb-5">
                                <div>
                                    <h2 className="fw-bold theme-text m-0">{isSubAccount ? "Dependent Dashboard" : "My Dashboard"}</h2>
                                    <p className="theme-text-muted m-0 small">Viewing records for {user.full_name}</p>
                                </div>
                                {!isSubAccount && (
                                    <button onClick={() => setShowEditModal(true)} className="btn btn-primary btn-sm fw-bold shadow-sm px-3 rounded-pill">
                                        <FaEdit className="me-2"/> Customize ID
                                    </button>
                                )}
                            </div>

                            <div className="row g-4 mb-4">
                                
                                {/* LEFT COLUMN: ID CARD */}
                                <div className="col-lg-5">
                                    <div className="theme-card border-0 shadow-lg rounded-4 overflow-hidden h-100 d-flex flex-column">
                                        <div className="p-4 d-flex flex-column align-items-center justify-content-center text-center bg-white position-relative flex-grow-1" ref={cardRef}>
                                            <FaTint className="position-absolute top-0 end-0 m-3 text-primary opacity-25" size={24} />
                                            <h6 className="fw-bold text-primary letter-spacing-2 mb-4" style={{fontSize: '11px'}}>
                                                {isSubAccount ? 'DEPENDENT HEALTH ID' : 'LIFELINE HEALTH ID'}
                                            </h6>
                                            <div className="mb-4">
                                                <QRCodeSVG value={primaryQrData} size={160} level="H" />
                                            </div>
                                            <h4 className="fw-bold m-0 text-dark">{user.full_name}</h4>
                                            <div className="d-flex gap-2 mt-2">
                                                <span className="badge bg-light text-dark border px-3 py-2 rounded-pill font-monospace" style={{fontSize:'12px'}}>
                                                    {user.unique_lifeline_id}
                                                </span>
                                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2 rounded-pill fw-bold" style={{fontSize:'12px'}}>
                                                    {user.blood_group || '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="theme-card-footer border-top theme-border p-3 mt-auto">
                                            <button onClick={downloadCard} className="btn btn-outline-primary w-100 rounded-pill fw-bold py-2 mb-2 d-flex align-items-center justify-content-center gap-2">
                                                <FaDownload/> Download ID Card
                                            </button>
                                            <button onClick={() => setShowPreviewModal(true)} className="btn theme-btn-secondary w-100 rounded-pill fw-bold py-2 d-flex align-items-center justify-content-center gap-2">
                                                <FaEye/> Preview Card Data
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: AI & STATS */}
                                <div className="col-lg-7 d-flex flex-column gap-4">
                                    
                                    {/* --- EXCITING AI HEALTH MONITOR CARD --- */}
                                    <div className="theme-card ai-interactive-card border-0 shadow-sm rounded-4 flex-grow-1 position-relative overflow-hidden d-flex flex-column">
                                        
                                        {/* Animated Holographic Glow Background */}
                                        <div className="ai-glow-bg position-absolute w-100 h-100 top-0 start-0 pointer-events-none"></div>
                                        
                                        <div className="card-body p-4 d-flex flex-column justify-content-center position-relative z-1 h-100">
                                            
                                            {/* Header */}
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="ai-icon-container bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: '45px', height: '45px'}}>
                                                        <FaRobot size={22} className="ai-robot-icon" />
                                                    </div>
                                                    <div>
                                                        <h6 className="fw-bold m-0 theme-text">Lifeline AI Engine</h6>
                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                            <span className="live-dot"></span>
                                                            <small className="theme-text-muted fw-bold letter-spacing-1" style={{fontSize: '10px'}}>MONITORING ACTIVE</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <FaMagic size={20} className="text-primary opacity-50 ai-floating-icon d-none d-sm-block" />
                                            </div>
                                            
                                            {/* Accent Message Box */}
                                            <div className="theme-bg p-3 rounded-4 border theme-border mb-4 ai-message-box shadow-sm">
                                                <p className="theme-text m-0 small" style={{lineHeight: '1.6'}}>
                                                    <strong className="text-primary d-block mb-1"><FaCheckCircle className="me-1"/> Status: Optimal</strong> 
                                                    All vitals are within normal parameters. I have securely synced <strong>{isSubAccount ? `${user.full_name}'s` : 'your'}</strong> recent lab reports and prescription history for analysis.
                                                </p>
                                            </div>
                                            
                                            {/* Interactive Gradient Button */}
                                            <Link to="/ai-chat" className="btn ai-action-btn w-100 rounded-pill fw-bold py-2 shadow-sm d-flex align-items-center justify-content-center gap-2 mt-auto">
                                                Start Secure Consultation <FaArrowRight className="ai-btn-arrow"/>
                                            </Link>
                                            
                                        </div>
                                    </div>
                                    {/* --- END AI CARD --- */}

                                    <div className="row g-3">
                                        <div className="col-4">
                                            <div className="theme-card border-0 shadow-sm p-3 rounded-4 h-100 text-center hover-shadow">
                                                <div className="icon-box bg-danger bg-opacity-10 text-danger rounded-circle p-2 mx-auto mb-2" style={{width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center'}}><FaTint size={16}/></div>
                                                <small className="theme-text-muted fw-bold d-block" style={{fontSize:'9px'}}>BP</small>
                                                <h6 className="fw-bold m-0 theme-text">120/80</h6>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="theme-card border-0 shadow-sm p-3 rounded-4 h-100 text-center hover-shadow">
                                                <div className="icon-box bg-success bg-opacity-10 text-success rounded-circle p-2 mx-auto mb-2" style={{width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center'}}><FaSyringe size={16}/></div>
                                                <small className="theme-text-muted fw-bold d-block" style={{fontSize:'9px'}}>VACCINE</small>
                                                <h6 className="fw-bold m-0 theme-text">OK</h6>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="theme-card border-0 shadow-sm p-3 rounded-4 h-100 text-center hover-shadow">
                                                <div className="icon-box bg-warning bg-opacity-10 text-warning rounded-circle p-2 mx-auto mb-2" style={{width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center'}}><FaAllergies size={16}/></div>
                                                <small className="theme-text-muted fw-bold d-block" style={{fontSize:'9px'}}>ALLERGY</small>
                                                <h6 className="fw-bold m-0 theme-text">{formData.allergies.length}</h6>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MOBILE FAB & MENU --- */}
            <div className="d-md-none position-fixed bottom-0 start-0 m-4 z-3">
                <button onClick={() => setShowMobileMenu(true)} className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center pulse-animation" style={{width: '55px', height: '55px'}}>
                    <FaBars size={22} color="white"/>
                </button>
            </div>

            {showMobileMenu && (
                <div className="position-fixed top-0 start-0 w-100 h-100 theme-bg z-4 d-flex flex-column animate-pop-in" style={{zIndex: 2000}}>
                    <div className="p-4 border-bottom theme-border d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold m-0 theme-text">Menu</h5>
                        <button onClick={() => setShowMobileMenu(false)} className="btn theme-btn-secondary rounded-circle shadow-sm"><FaTimes/></button>
                    </div>
                    <div className="p-4 d-flex flex-column gap-3 overflow-auto custom-scrollbar">
                        {navLinks.map((item, index) => (
                            <Link key={index} to={item.link} className="d-flex align-items-center gap-3 p-3 rounded-4 theme-card text-decoration-none theme-text shadow-sm" onClick={() => setShowMobileMenu(false)}>
                                <div className="icon-box text-primary fs-4">{item.icon}</div>
                                <span className="fw-bold fs-5">{item.name}</span>
                                <FaArrowRight className="ms-auto theme-text-muted opacity-50"/>
                            </Link>
                        ))}
                        <div className="mt-2">{renderFamilyNavigation()}</div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* MODAL 1: SWITCH ACCOUNT OTP VALIDATION     */}
            {/* ========================================== */}
            {switchingTo && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
                    <div className="theme-card p-4 rounded-4 shadow-lg text-center position-relative animate-pop-in" style={{maxWidth: '400px', width: '90%'}}>
                        <button onClick={() => setSwitchingTo(null)} className="btn btn-sm theme-btn-secondary position-absolute top-0 end-0 m-3 rounded-circle"><FaTimes/></button>
                        
                        <div className="bg-primary bg-opacity-10 text-primary mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3" style={{width:'60px', height:'60px'}}>
                            <FaExchangeAlt size={24}/>
                        </div>
                        
                        <h5 className="fw-bold theme-text mb-2">Switch Account</h5>
                        <p className="theme-text-muted small mb-4">
                            You are requesting access to <strong>{switchingTo.full_name}'s</strong> medical records. 
                            For security, we must verify your identity.
                        </p>

                        {!switchOtpSent ? (
                            <button onClick={requestSwitchOTP} className="btn btn-primary w-100 py-2 fw-bold rounded-pill shadow-sm">
                                Send OTP to My Email
                            </button>
                        ) : (
                            <div className="animate-slide-up text-start">
                                <label className="small fw-bold theme-text-muted mb-1 d-block text-center">Enter 4-Digit Security Code</label>
                                <input 
                                    type="text" 
                                    className="form-control form-control-lg text-center fw-bold letter-spacing-2 mb-3 theme-input mx-auto" 
                                    style={{maxWidth: '200px'}}
                                    placeholder="••••" 
                                    maxLength="4"
                                    value={switchOtp} 
                                    onChange={(e) => setSwitchOtp(e.target.value)}
                                />
                                <button onClick={verifySwitchOTP} className="btn btn-dark w-100 py-2 fw-bold rounded-pill shadow-sm">
                                    Verify & Switch
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* MODAL 2: MANAGE FAMILY DASHBOARD           */}
            {/* ========================================== */}
            {showManageFamily && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
                    <div className="theme-card p-4 rounded-4 shadow-lg w-100 animate-pop-in d-flex flex-column" style={{maxWidth: '500px', maxHeight: '80vh'}}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h5 className="fw-bold m-0 theme-text"><FaUsers className="me-2 text-primary"/> Manage Family</h5>
                                <small className="theme-text-muted">Add or remove dependent profiles.</small>
                            </div>
                            <button onClick={() => setShowManageFamily(false)} className="btn theme-btn-secondary rounded-circle shadow-sm"><FaTimes/></button>
                        </div>
                        
                        <div className="flex-grow-1 overflow-auto pe-2 custom-scrollbar mb-4">
                            {dependents.length === 0 ? (
                                <div className="text-center p-4 theme-bg rounded-3 border theme-border theme-text-muted small">
                                    No family members added yet.
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {dependents.map((dep, i) => (
                                        <div key={i} className="theme-bg p-3 rounded-3 border theme-border d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width:'40px', height:'40px'}}>
                                                    {dep.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h6 className="fw-bold m-0 theme-text">{dep.full_name}</h6>
                                                    <small className="theme-text-muted font-monospace">{dep.unique_lifeline_id}</small>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveDependent(dep.unique_lifeline_id)} className="btn btn-outline-danger btn-sm p-2 rounded-circle" title="Remove Profile">
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-top theme-border pt-3">
                            <button onClick={() => {setShowManageFamily(false); setShowAddDependent(true);}} className="btn btn-primary w-100 fw-bold rounded-pill py-2 shadow-sm d-flex align-items-center justify-content-center gap-2">
                                <FaPlus /> Add New Family Member
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ADD DEPENDENT MODAL --- */}
            {showAddDependent && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
                    <div className="theme-card p-4 rounded-4 shadow-lg w-100 animate-pop-in" style={{maxWidth: '400px'}}>
                        <div className="d-flex justify-content-between mb-3">
                            <h5 className="fw-bold m-0 theme-text">Add Dependent</h5>
                            <button onClick={() => setShowAddDependent(false)} className="btn btn-sm theme-btn-secondary rounded-circle"><FaTimes/></button>
                        </div>
                        <form onSubmit={handleAddDependent}>
                            <div className="mb-3">
                                <label className="small fw-bold theme-text-muted mb-1">Full Name</label>
                                <input className="form-control theme-input" required onChange={e=>setDepForm({...depForm, full_name: e.target.value})} />
                            </div>
                            <div className="row mb-4">
                                <div className="col-7">
                                    <label className="small fw-bold theme-text-muted mb-1">D.O.B</label>
                                    <input type="date" className="form-control theme-input" required onChange={e=>setDepForm({...depForm, dob: e.target.value})} />
                                </div>
                                <div className="col-5">
                                    <label className="small fw-bold theme-text-muted mb-1">Blood</label>
                                    <select className="form-select theme-input" onChange={e=>setDepForm({...depForm, blood_group: e.target.value})}>
                                        <option value="O+">O+</option><option value="A+">A+</option><option value="B+">B+</option><option value="AB+">AB+</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-100 fw-bold rounded-pill">Link Profile</button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL (NEW PROFESSIONAL DESIGN) --- */}
            {showPreviewModal && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
                    <div className="theme-card shadow-lg w-100 animate-pop-in overflow-hidden" style={{maxWidth: '500px', borderRadius: '16px'}}>
                        <div className="bg-primary p-4 text-white d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="fw-bold m-0 d-flex align-items-center gap-2"><FaFileMedicalAlt /> Medical Summary</h5>
                                <small className="opacity-75 font-monospace">{user.unique_lifeline_id}</small>
                            </div>
                            <button onClick={() => setShowPreviewModal(false)} className="btn btn-sm btn-light bg-opacity-25 text-white border-0 rounded-circle"><FaTimes/></button>
                        </div>
                        <div className="p-4 theme-bg">
                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <small className="theme-text-muted fw-bold d-block mb-1" style={{fontSize: '11px'}}>PATIENT NAME</small>
                                    <div className="fw-bold theme-text fs-6">{user.full_name}</div>
                                </div>
                                <div className="col-6">
                                    <small className="theme-text-muted fw-bold d-block mb-1" style={{fontSize: '11px'}}>BLOOD GROUP</small>
                                    <div className="fw-bold text-danger fs-6">{formData.blood_group || 'Not Set'}</div>
                                </div>
                                <div className="col-12 border-top pt-3 mt-3 theme-border">
                                    <small className="theme-text-muted fw-bold d-block mb-1" style={{fontSize: '11px'}}>EMERGENCY CONTACT</small>
                                    <div className="fw-bold theme-text fs-6 d-flex align-items-center">
                                        <FaPhone className="me-2 text-success" size={14}/>
                                        {formData.emergency_contact || 'None Provided'}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <small className="theme-text-muted fw-bold d-block mb-2 text-uppercase" style={{fontSize: '11px'}}><FaAllergies className="me-1"/> Known Allergies</small>
                                {formData.allergies.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                        {formData.allergies.map((alg, i) => (<span key={i} className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1">{alg}</span>))}
                                    </div>
                                ) : <span className="theme-text-muted small fst-italic">No known allergies on record.</span>}
                            </div>
                            <div>
                                <small className="theme-text-muted fw-bold d-block mb-2 text-uppercase" style={{fontSize: '11px'}}><FaMicroscope className="me-1"/> Medical Conditions / Tags</small>
                                {formData.health_tags.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                        {formData.health_tags.map((t, i) => (<span key={i} className="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1">{t.label}: <span className="opacity-75">{t.value}</span></span>))}
                                    </div>
                                ) : <span className="theme-text-muted small fst-italic">No active conditions listed.</span>}
                            </div>
                        </div>
                        <div className="bg-light p-3 text-center border-top theme-border">
                            <small className="theme-text-muted fw-bold" style={{fontSize: '10px', letterSpacing: '1px'}}>CONFIDENTIAL LIFELINE RECORD</small>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EDIT MODAL --- */}
            {showEditModal && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
                    <div className="theme-card rounded-4 shadow-lg w-100 animate-pop-in d-flex flex-column" style={{maxWidth: '550px', maxHeight: '85vh'}}>
                        <div className="p-4 border-bottom theme-border d-flex justify-content-between align-items-center">
                            <div><h5 className="fw-bold m-0 theme-text">Smart ID Customizer</h5><small className="theme-text-muted">AI-verified details.</small></div>
                            <button onClick={() => setShowEditModal(false)} className="btn theme-btn-secondary border rounded-circle shadow-sm"><FaTimes/></button>
                        </div>
                        <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
                            <form id="profile-form" onSubmit={handleUpdateProfile}>
                                <div className="row g-3 mb-4">
                                    <div className="col-6">
                                        <label className="small fw-bold theme-text-muted mb-1">Blood Group</label>
                                        <select className="form-select theme-input border-0" value={formData.blood_group} onChange={(e) => setFormData({...formData, blood_group: e.target.value})}>
                                            <option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="small fw-bold theme-text-muted mb-1">Emergency Contact</label>
                                        <input className="form-control theme-input border-0" value={formData.emergency_contact} onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}/>
                                    </div>
                                </div>
                                <div className="bg-primary bg-opacity-5 p-3 rounded-3 border border-primary border-opacity-10 mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold text-primary m-0"><FaMagic className="me-2"/> AI Health Scan</h6>
                                        <button type="button" onClick={runAIScan} className="btn btn-sm btn-primary rounded-pill px-3" disabled={aiLoading}>{aiLoading ? 'Scanning...' : 'Auto-Detect'}</button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                        {aiSuggestions.map((sug, i) => (
                                            <button key={i} type="button" onClick={() => addCondition(sug)} className="btn btn-sm btn-white border shadow-sm text-success"><FaPlus size={10} className="me-1"/> {sug}</button>
                                        ))}
                                    </div>
                                </div>
                                <h6 className="fw-bold theme-text small text-uppercase letter-spacing-1 mb-2">Card Data</h6>
                                <div className="mb-4 d-flex flex-wrap gap-2">
                                    {formData.health_tags.map((tag, i) => (
                                        <div key={i} className="badge theme-bg theme-text border p-2 d-flex align-items-center gap-2">
                                            <span>{tag.label}: {tag.value}</span>
                                            <FaTimes className="cursor-pointer text-danger" onClick={() => removeTag(i)}/>
                                        </div>
                                    ))}
                                </div>
                                <div className="input-group mb-4">
                                    <select className="form-select theme-input border-0" value={selectedLab} onChange={(e) => setSelectedLab(e.target.value)}>
                                        <option value="">Select Lab Result...</option>
                                        {labOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                    </select>
                                    <button type="button" onClick={addLabToID} className="btn btn-dark" disabled={!selectedLab}>Add</button>
                                </div>
                                <h6 className="fw-bold theme-text small text-uppercase letter-spacing-1 mb-2">Allergies</h6>
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                    {formData.allergies.map((alg, i) => (
                                        <span key={i} className="badge bg-danger bg-opacity-10 text-danger border border-danger p-2">{alg} <FaTimes className="ms-1 cursor-pointer" onClick={() => removeAllergy(i)}/></span>
                                    ))}
                                </div>
                                <div className="d-flex gap-2">
                                    <select className="form-select theme-input form-select-sm" onChange={(e) => addAllergy(e.target.value)} value="">
                                        <option value="">Common...</option>{commonAllergies.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <input className="form-control theme-input form-select-sm" placeholder="Custom..." value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy(allergyInput))}/>
                                    <button type="button" onClick={() => addAllergy(allergyInput)} className="btn btn-sm btn-secondary"><FaPlus/></button>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-top theme-border theme-card-footer text-end">
                            <button form="profile-form" type="submit" disabled={saveLoading} className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm">{saveLoading ? 'Saving...' : 'Save & Update'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- GLOBAL STYLES --- */}
            <style>{`
                :root { --bg-color: #f8fafc; --card-bg: #ffffff; --text-color: #0f172a; --text-muted: #64748b; --border-color: #e2e8f0; --input-bg: #f1f5f9; --sidebar-bg: #ffffff; }
                body.dark-mode { --bg-color: #0f172a; --card-bg: #1e293b; --text-color: #f8fafc; --text-muted: #94a3b8; --border-color: #334155; --input-bg: #334155; --sidebar-bg: #1e293b; }
                .theme-bg { background-color: var(--bg-color); color: var(--text-color); }
                .theme-card { background-color: var(--card-bg); color: var(--text-color); transition: background-color 0.3s, color 0.3s; }
                .theme-sidebar { background-color: var(--sidebar-bg); transition: background-color 0.3s; }
                .theme-text { color: var(--text-color); }
                .theme-text-muted { color: var(--text-muted); }
                .theme-border { border-color: var(--border-color) !important; }
                .theme-input { background-color: var(--input-bg); color: var(--text-color); border-color: transparent; }
                .theme-input:focus { background-color: var(--input-bg); color: var(--text-color); box-shadow: 0 0 0 2px #2563eb; }
                .theme-btn-secondary { background-color: var(--input-bg); color: var(--text-muted); border: 1px solid var(--border-color); }
                .theme-card-footer { background-color: var(--card-bg); }
                .modal-backdrop-custom { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px); z-index: 1050; padding: 20px; }
                .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .animate-slide-up { animation: slideUp 0.3s ease-out; }
                @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: var(--bg-color); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .hover-shadow { transition: all 0.2s ease; }
                .hover-shadow:hover { background-color: var(--input-bg); transform: translateY(-2px); }
                .nav-item-link { color: var(--text-muted); transition: all 0.2s; border: 1px solid transparent; }
                .nav-item-link:hover { background-color: var(--bg-color); color: var(--text-color); }
                .nav-item-link.active { background-color: #eff6ff; color: #2563eb; border-color: #dbeafe; }
                .nav-item-link.active .icon-box { color: #2563eb !important; }
                body.dark-mode .nav-item-link.active { background-color: #2563eb; color: white; border-color: #2563eb; }
                body.dark-mode .nav-item-link.active .icon-box { color: white !important; }

                /* NEW AI MONITOR CARD STYLES */
                .ai-interactive-card {
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    border: 1px solid transparent !important;
                }
                .ai-interactive-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 15px 30px rgba(59, 130, 246, 0.15) !important;
                    border-color: rgba(59, 130, 246, 0.3) !important;
                }
                
                .ai-glow-bg {
                    background: radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                                radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.08) 0%, transparent 50%);
                    transition: opacity 0.3s;
                    opacity: 0.5;
                }
                .ai-interactive-card:hover .ai-glow-bg {
                    opacity: 1;
                }

                body.dark-mode .ai-glow-bg {
                    background: radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                                radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.15) 0%, transparent 50%);
                }

                .ai-robot-icon {
                    transition: transform 0.5s ease;
                }
                .ai-interactive-card:hover .ai-robot-icon {
                    transform: scale(1.1) rotate(5deg);
                }

                .ai-floating-icon {
                    animation: float-slow 3s ease-in-out infinite;
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                .ai-message-box {
                    position: relative;
                    transition: border-color 0.3s;
                }
                .ai-message-box::before {
                    content: '';
                    position: absolute;
                    left: -1px; top: 10%; height: 80%; width: 3px;
                    background: linear-gradient(to bottom, #3b82f6, #a855f7);
                    border-radius: 4px;
                }
                
                .ai-action-btn {
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    background-size: 200% auto;
                    transition: all 0.4s;
                }
                .ai-action-btn:hover {
                    background-position: right center;
                    color: white;
                    transform: scale(1.02);
                    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
                }
                .ai-btn-arrow {
                    transition: transform 0.3s;
                }
                .ai-action-btn:hover .ai-btn-arrow {
                    transform: translateX(4px);
                }

                .live-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #22c55e;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #22c55e;
                    animation: pulse-green 1.5s infinite;
                }
                @keyframes pulse-green {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                }
            `}</style>
        </div>
    );
}

export default PatientDashboard;