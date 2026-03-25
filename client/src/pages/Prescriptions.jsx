import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
    FaPills, FaSearch, FaUserMd, FaCalendarAlt, FaCalendarTimes,
    FaQrcode, FaTimes, FaPrescription, FaCheckCircle, FaExclamationCircle,
    FaChevronDown, FaChevronUp, FaHospital
} from 'react-icons/fa';

function Prescriptions() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [expandedId, setExpandedId] = useState(null); 
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [filterDate, setFilterDate] = useState('');

    const [showQR, setShowQR] = useState(null); 
    const [showCompare, setShowCompare] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [drugResults, setDrugResults] = useState([]);
    const [searchingDrug, setSearchingDrug] = useState(false);

    // 1. Fetch Data
    useEffect(() => {
        const fetchPrescriptions = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get('http://localhost:5000/api/my-prescriptions', {
                    // ✅ FIXED: Added Bearer prefix
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPrescriptions(res.data);
                setFilteredData(res.data);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchPrescriptions();
    }, []);

    // 2. Filter Logic
    useEffect(() => {
        if (!filterDate) {
            setFilteredData(prescriptions);
        } else {
            const selected = new Date(filterDate).toDateString();
            setFilteredData(prescriptions.filter(p => new Date(p.visit_date).toDateString() === selected));
        }
    }, [filterDate, prescriptions]);

    const isExpired = (expiryDateString) => {
        if(!expiryDateString) return false;
        const today = new Date();
        const expiry = new Date(expiryDateString);
        today.setHours(0,0,0,0);
        return today > expiry;
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // 3. Search & Compare
    const handleSearch = async (term) => {
        if (!term) return;
        setSearchingDrug(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/drugs?search=${term}`);
            setDrugResults(res.data);
        } catch(e) { console.error(e); }
        finally { setSearchingDrug(false); }
    };

    const openCompare = (e, prescription) => {
        e.stopPropagation();
        setShowCompare(prescription);
        setDrugResults([]);
        const suggestion = prescription.prescription.split('\n')[0].split(' ')[0] || prescription.diagnosis;
        setSearchTerm(suggestion);
        if(suggestion) handleSearch(suggestion);
    };

    const openQR = (e, p) => {
        e.stopPropagation();
        setShowQR(p);
    }

    return (
        <div className="theme-bg min-vh-100 p-4 transition-all">
            <div className="container" style={{maxWidth: '1000px'}}>
                
                {/* HEADER & FILTER */}
                <div className="d-flex justify-content-between align-items-center mb-4 sticky-top theme-bg pt-2" style={{zIndex:10}}>
                    <div>
                        <h4 className="fw-bold theme-text m-0">Prescriptions</h4>
                        <small className="theme-text-muted">History Timeline</small>
                    </div>
                    <div className="d-flex gap-2">
                        {filterDate && (
                            <button onClick={() => setFilterDate('')} className="btn btn-sm btn-outline-danger rounded-pill">
                                Clear Filter <FaTimes className="ms-1"/>
                            </button>
                        )}
                        <button 
                            onClick={() => setShowDateFilter(!showDateFilter)} 
                            className={`btn btn-sm rounded-pill border px-3 fw-bold ${showDateFilter ? 'btn-primary' : 'theme-btn-secondary'}`}
                        >
                            <FaCalendarAlt className="me-2"/> {filterDate ? new Date(filterDate).toLocaleDateString() : 'Filter Date'}
                        </button>
                    </div>
                </div>

                {/* DATE PICKER */}
                {showDateFilter && (
                    <div className="mb-4 text-end animate-slide-down">
                        <input 
                            type="date" 
                            className="form-control theme-input d-inline-block w-auto shadow-sm border-0" 
                            onChange={(e) => setFilterDate(e.target.value)}
                            value={filterDate}
                        />
                    </div>
                )}

                {/* COMPACT LIST VIEW */}
                {loading ? <div className="text-center p-5 theme-text">Loading...</div> : 
                 filteredData.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                        {filteredData.map((p) => {
                            const expired = isExpired(p.expiry_date);
                            const isExpanded = expandedId === p.id;
                            
                            return (
                                <div key={p.id} className={`theme-card border-0 shadow-sm rounded-3 overflow-hidden transition-all ${isExpanded ? 'ring-2' : ''}`}>
                                    {/* COMPACT ROW */}
                                    <div 
                                        className="p-3 d-flex align-items-center cursor-pointer theme-hover"
                                        onClick={() => toggleExpand(p.id)}
                                    >
                                        {/* Date Badge */}
                                        <div className="text-center me-4 ps-2 border-end theme-border pe-4" style={{minWidth: '100px'}}>
                                            <small className="d-block theme-text-muted text-uppercase fw-bold" style={{fontSize:'10px'}}>
                                                {new Date(p.visit_date).toLocaleString('default', { month: 'short' })}
                                            </small>
                                            <span className="fs-4 fw-bold theme-text lh-1">
                                                {new Date(p.visit_date).getDate()}
                                            </span>
                                            {/* ⭐ ADDED: Exact time of prescription */}
                                            <small className="d-block theme-text-muted" style={{fontSize:'10px'}}>
                                                {new Date(p.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </small>
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <h6 className="fw-bold m-0 theme-text">{p.diagnosis}</h6>
                                                {expired ? 
                                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2" style={{fontSize:'9px'}}>EXPIRED</span> :
                                                    <span className="badge bg-success bg-opacity-10 text-success border border-success px-2" style={{fontSize:'9px'}}>ACTIVE</span>
                                                }
                                            </div>
                                            <div className="d-flex gap-3 align-items-center flex-wrap">
                                                {/* ⭐ ADDED: Prescription ID Badge */}
                                                <small className="theme-text-muted font-monospace bg-light px-2 rounded border" style={{fontSize:'11px'}}>Rx: #{p.id}</small>
                                                
                                                <small className="theme-text-muted d-flex align-items-center"><FaUserMd className="me-1 text-primary"/> {p.doctor_name || 'Unknown'}</small>
                                                <small className="theme-text-muted d-flex align-items-center"><FaHospital className="me-1 text-danger"/> {p.hospital_name || 'Lifeline Network'}</small>
                                            </div>
                                        </div>

                                        {/* Quick Icons */}
                                        {!isExpanded && (
                                            <div className="d-none d-md-flex gap-3 theme-text-muted me-3">
                                                <FaPrescription/>
                                                <FaChevronDown/>
                                            </div>
                                        )}
                                    </div>

                                    {/* EXPANDED DETAILS */}
                                    {isExpanded && (
                                        <div className="theme-bg p-3 border-top theme-border animate-slide-down">
                                            <div className="row">
                                                <div className="col-md-8">
                                                    <h6 className="small fw-bold theme-text-muted text-uppercase mb-2">Prescribed Medication</h6>
                                                    <div className="p-3 theme-card rounded-3 border theme-border">
                                                        <p className="mb-0 small fw-bold font-monospace theme-text" style={{whiteSpace: 'pre-line'}}>
                                                            {p.prescription}
                                                        </p>
                                                    </div>
                                                    {p.expiry_date && (
                                                        <small className={`d-block mt-2 ${expired ? 'text-danger' : 'text-success'}`}>
                                                            <FaCalendarTimes className="me-1"/> 
                                                            Valid Until: {new Date(p.expiry_date).toLocaleDateString()}
                                                        </small>
                                                    )}
                                                </div>
                                                <div className="col-md-4 mt-3 mt-md-0 d-flex flex-column gap-2 justify-content-center">
                                                    <button 
                                                        disabled={expired}
                                                        onClick={(e) => openQR(e, p)} 
                                                        className="btn btn-dark w-100 btn-sm rounded-pill fw-bold"
                                                    >
                                                        <FaQrcode className="me-2"/> Pharmacist QR
                                                    </button>
                                                    <button 
                                                        disabled={expired}
                                                        onClick={(e) => openCompare(e, p)} 
                                                        className="btn btn-outline-primary w-100 btn-sm rounded-pill fw-bold"
                                                    >
                                                        <FaPills className="me-2"/> Find Substitutes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center p-5 theme-text-muted">No records found for this date.</div>
                )}
            </div>

            {/* MODALS */}
            {showQR && (
                <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
                    <div className="theme-card p-5 rounded-4 shadow-lg text-center position-relative" style={{maxWidth: '400px'}}>
                        <button onClick={() => setShowQR(null)} className="btn btn-sm theme-btn-secondary position-absolute top-0 end-0 m-3 rounded-circle"><FaTimes/></button>
                        <h5 className="fw-bold mb-4 theme-text">Pharmacist Scan</h5>
                        <div className="bg-white p-3 rounded-3 d-inline-block">
                            <QRCodeSVG value={JSON.stringify({ rx_id: showQR.id })} size={180} level="H" />
                        </div>
                        <div className="mt-3 small text-success fw-bold"><FaCheckCircle className="me-1"/> Authenticated</div>
                    </div>
                </div>
            )}

            {showCompare && (
                <div className="modal-backdrop-custom d-flex justify-content-end">
                    <div className="theme-card h-100 shadow-lg p-4 d-flex flex-column animate-slide-in" style={{width: '400px'}}>
                        <div className="d-flex justify-content-between mb-3 theme-text">
                            <h6 className="fw-bold m-0">Drug Substitutes</h6>
                            <button onClick={() => setShowCompare(null)} className="btn btn-sm theme-btn-secondary rounded-circle"><FaTimes/></button>
                        </div>
                        <div className="input-group mb-3">
                            <input className="form-control theme-input" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                            <button className="btn btn-primary" onClick={()=>handleSearch(searchTerm)}><FaSearch/></button>
                        </div>
                        <div className="overflow-auto theme-text">
                            {drugResults.map((d,i) => (
                                <div key={i} className="border p-2 mb-2 rounded theme-bg theme-border">
                                    <div className="d-flex justify-content-between">
                                        <strong>{d.brand_name}</strong>
                                        <span className="text-success">₹{d.price_inr}</span>
                                    </div>
                                    <small className="theme-text-muted">{d.generic_name}</small>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                .theme-hover:hover { background-color: var(--hover-bg); }
                
                .ring-2 { box-shadow: 0 0 0 2px #3b82f6 !important; }
                .animate-slide-down { animation: slideDown 0.2s ease-out; }
                .animate-slide-in { animation: slideIn 0.3s ease-out; }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .modal-backdrop-custom { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1050; }
            `}</style>
        </div>
    );
}

export default Prescriptions;