import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import { 
    FaMicroscope, FaFileDownload, FaCalendarAlt, FaUserMd, 
    FaFlask, FaCheckCircle, FaExclamationTriangle, FaNotesMedical, FaHospital,
    FaChevronDown, FaChevronUp, FaTimes, FaQrcode
} from 'react-icons/fa';

function LabReports() {
    const [reports, setReports] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState({ name: 'Patient', id: '' });
    
    // UI States
    const [expandedId, setExpandedId] = useState(null);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [filterDate, setFilterDate] = useState('');
    const [qrModal, setQrModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                const reportsRes = await axios.get('http://localhost:5000/api/my-lab-reports', {
                    // ✅ FIXED: Added Bearer prefix
                    headers: { Authorization: `Bearer ${token}` }
                });
                const sorted = reportsRes.data.sort((a,b) => new Date(b.visit_date) - new Date(a.visit_date));
                setReports(sorted);
                setFilteredData(sorted);

                const profileRes = await axios.get('http://localhost:5000/api/profile', {
                    // ✅ FIXED: Added Bearer prefix
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserProfile({
                    name: profileRes.data.full_name,
                    id: profileRes.data.unique_lifeline_id
                });

            } catch (err) {
                console.error("Error loading data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!filterDate) {
            setFilteredData(reports);
        } else {
            const selected = new Date(filterDate).toDateString();
            setFilteredData(reports.filter(r => new Date(r.visit_date).toDateString() === selected));
        }
    }, [filterDate, reports]);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const generatePDF = (report) => {
        const doc = new jsPDF();
        let results = [];
        try {
            results = typeof report.lab_results === 'string' ? JSON.parse(report.lab_results) : report.lab_results;
        } catch(e) { results = []; }

        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, 210, 40, 'F'); 

        doc.setFillColor(255, 255, 255);
        doc.circle(25, 20, 12, 'F');
        doc.setTextColor(6, 182, 212);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("L+", 21, 22);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("LIFELINE DIAGNOSTICS", 45, 18);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("ISO 9001:2015 Certified Laboratory", 45, 25);
        
        doc.setFontSize(9);
        doc.text(`Report ID: #${report.id}`, 160, 18);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, 24);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("PATIENT DETAILS", 15, 55);
        doc.setDrawColor(200);
        doc.line(15, 57, 50, 57);

        doc.setFont("helvetica", "normal");
        doc.text(`Name: ${userProfile.name}`, 15, 65);
        doc.text(`Patient ID: ${userProfile.id}`, 15, 72);
        
        doc.setFont("helvetica", "bold");
        doc.text("REFERRAL DETAILS", 110, 55);
        doc.line(110, 57, 150, 57);

        doc.setFont("helvetica", "normal");
        doc.text(`Ref. By: Dr. ${report.doctor_name}`, 110, 65);
        doc.text(`Sample Date: ${new Date(report.visit_date).toLocaleDateString()}`, 110, 72);

        let y = 95;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(6, 182, 212);
        doc.text(`${report.diagnosis.toUpperCase()}`, 15, y);
        y += 8;

        doc.setFillColor(240, 245, 255);
        doc.rect(15, y-6, 180, 10, 'F');
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text("TEST DESCRIPTION", 20, y);
        doc.text("RESULT", 90, y);
        doc.text("REF. RANGE", 130, y);
        doc.text("STATUS", 175, y);
        y += 12;

        doc.setFontSize(10);
        results.forEach((item) => {
            const isAbnormal = String(item.status).toLowerCase() !== 'normal';
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0);
            doc.text(item.test, 20, y);
            
            doc.setFont("helvetica", "bold");
            doc.text(item.result, 90, y);
            
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(item.range, 130, y);
            
            if(isAbnormal) {
                doc.setTextColor(220, 38, 38);
                doc.text("ABNORMAL", 175, y);
            } else {
                doc.setTextColor(22, 163, 74);
                doc.text("NORMAL", 175, y);
            }
            y += 10;
            doc.setDrawColor(245);
            doc.line(15, y-6, 195, y-6);
        });

        const sealY = 240;
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1);
        doc.circle(160, sealY, 18);
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(8);
        doc.text("VERIFIED", 160, sealY + 2, { align: "center" });

        let bx = 20;
        doc.setFillColor(0);
        for (let i = 0; i < 40; i++) {
            const w = Math.random() > 0.5 ? 1.5 : 0.5;
            doc.rect(bx, 250, w, 15, 'F');
            bx += w + 1;
        }
        
        doc.save(`Lab_Report_${report.id}.pdf`);
    };

    const getStatusBadge = (val) => {
        const s = String(val).toLowerCase();
        if(s.includes('high') || s.includes('low') || s.includes('abnormal')) 
            return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1"><FaExclamationTriangle className="me-1"/> Abnormal</span>;
        return <span className="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1"><FaCheckCircle className="me-1"/> Normal</span>;
    };

    return (
        <div className="page-background min-vh-100 p-4">
            <div className="container" style={{maxWidth: '1000px'}}>
                
                {/* HEADER & FILTER */}
                <div className="d-flex justify-content-between align-items-center mb-4 sticky-top bg-transparent pt-2">
                    <div>
                        <h4 className="fw-bold theme-text m-0">Lab Records</h4>
                        <small className="text-muted">Pending Tests & Diagnostic History</small>
                    </div>
                    <div className="d-flex gap-2">
                        {filterDate && (
                            <button onClick={() => setFilterDate('')} className="btn btn-sm btn-light text-danger border rounded-pill">
                                Clear Filter <FaTimes className="ms-1"/>
                            </button>
                        )}
                        <button 
                            onClick={() => setShowDateFilter(!showDateFilter)} 
                            className={`btn btn-sm rounded-pill border px-3 fw-bold ${showDateFilter ? 'btn-primary' : 'btn-white bg-white'}`}
                        >
                            <FaCalendarAlt className="me-2"/> {filterDate ? new Date(filterDate).toLocaleDateString() : 'Filter Date'}
                        </button>
                    </div>
                </div>

                {showDateFilter && (
                    <div className="mb-4 text-end animate-slide-down">
                        <input 
                            type="date" 
                            className="form-control d-inline-block w-auto shadow-sm border-0" 
                            onChange={(e) => setFilterDate(e.target.value)}
                            value={filterDate}
                        />
                    </div>
                )}

                {/* TIMELINE LIST */}
                {loading ? (
                    <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>
                ) : filteredData.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                        {filteredData.map((report) => {
                            // Check if this is a pending test or a completed report
                            const isPending = report.lab_orders && !report.lab_results;
                            const isExpanded = expandedId === report.id;
                            
                            let results = [];
                            try { if(!isPending) results = typeof report.lab_results === 'string' ? JSON.parse(report.lab_results) : report.lab_results; } catch(e) {}
                            const hasIssue = results.some(r => String(r.status).toLowerCase() !== 'normal');

                            return (
                                <div key={report.id} className={`card border-0 shadow-sm rounded-3 overflow-hidden transition-all ${isExpanded ? 'ring-2' : ''} ${isPending ? 'border-start border-4 border-warning' : ''}`}>
                                    
                                    {/* COMPACT ROW */}
                                    <div 
                                        className="card-body p-3 d-flex align-items-center cursor-pointer hover-bg-light"
                                        onClick={() => toggleExpand(report.id)}
                                    >
                                        <div className="text-center me-4 ps-2 border-end pe-4" style={{minWidth: '90px'}}>
                                            <small className="d-block text-muted text-uppercase fw-bold" style={{fontSize:'10px'}}>
                                                {new Date(report.visit_date).toLocaleString('default', { month: 'short' })}
                                            </small>
                                            <span className="fs-4 fw-bold theme-text lh-1">
                                                {new Date(report.visit_date).getDate()}
                                            </span>
                                            <small className="d-block text-muted" style={{fontSize:'10px'}}>
                                                {new Date(report.visit_date).getFullYear()}
                                            </small>
                                        </div>

                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <h6 className="fw-bold m-0 text-dark">
                                                    {isPending ? "Pending Lab Orders" : `${report.diagnosis} Panel`}
                                                </h6>
                                                
                                                {isPending ? (
                                                    <span className="badge bg-warning text-dark px-2" style={{fontSize:'9px'}}>PENDING VISIT</span>
                                                ) : hasIssue ? (
                                                    <span className="badge bg-warning bg-opacity-10 text-dark border border-warning px-2" style={{fontSize:'9px'}}><FaExclamationTriangle className="me-1"/> ATTENTION</span>
                                                ) : (
                                                    <span className="badge bg-success bg-opacity-10 text-success border border-success px-2" style={{fontSize:'9px'}}>NORMAL</span>
                                                )}
                                            </div>
                                            <small className="text-muted">
                                                <FaHospital className="me-1"/> {report.hospital_name || 'Pathology Lab'}  • <FaUserMd className="ms-2 me-1"/> Ordered By: Dr. {report.doctor_name}
                                            </small>
                                        </div>

                                        <div className="text-muted d-none d-md-block me-3">
                                            {isExpanded ? <FaChevronUp/> : <FaChevronDown/>}
                                        </div>
                                    </div>

                                    {/* EXPANDED DETAILS */}
                                    {isExpanded && (
                                        <div className="bg-white border-top animate-slide-down">
                                            
                                            {isPending ? (
                                                <div className="p-4 text-center bg-light">
                                                    <h6 className="fw-bold text-primary mb-3">Tests Ordered: {report.lab_orders}</h6>
                                                    <p className="text-muted small">Please visit the Pathology lab and show your QR token to fulfill these tests.</p>
                                                    <button onClick={() => setQrModal(true)} className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm">
                                                        <FaQrcode className="me-2"/> Show Lab QR Token
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="table-responsive">
                                                        <table className="table table-sm mb-0 align-middle">
                                                            <thead className="bg-light text-muted small">
                                                                <tr>
                                                                    <th className="ps-4 py-2">Test Name</th>
                                                                    <th>Result</th>
                                                                    <th>Ref Range</th>
                                                                    <th>Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Array.isArray(results) && results.map((item, i) => (
                                                                    <tr key={i}>
                                                                        <td className="ps-4 fw-bold text-dark">{item.test}</td>
                                                                        <td className="fw-bold">{item.result}</td>
                                                                        <td className="text-muted small">{item.range}</td>
                                                                        <td>{getStatusBadge(item.status || item.result)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="p-3 bg-light border-top text-end">
                                                        <button onClick={() => generatePDF(report)} className="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm">
                                                            <FaFileDownload className="me-2"/> Download Official Report
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center p-5 bg-white rounded-4 border shadow-sm">
                        <div className="mb-3 text-muted opacity-25"><FaNotesMedical size={60}/></div>
                        <h5 className="text-muted">No lab records found.</h5>
                    </div>
                )}
            </div>

            {/* QR Modal for Pending Lab Orders */}
            {qrModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)'}}>
                    <div className="bg-white p-4 rounded-4 shadow-lg text-center position-relative animate-zoom-in" style={{width: '350px'}}>
                        <button onClick={()=>setQrModal(false)} className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3"><FaTimes/></button>
                        <h5 className="fw-bold theme-text mb-1 mt-2">Lab Token</h5>
                        <p className="text-muted small mb-4">Show this QR to the Pathologist</p>
                        
                        <div className="bg-light p-3 rounded-4 d-inline-block border shadow-sm mb-3">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${userProfile.id}`} alt="Patient QR Code" />
                        </div>
                        
                        <h4 className="fw-bold text-dark mb-0">{userProfile.name}</h4>
                        <small className="text-muted font-monospace">{userProfile.id}</small>
                    </div>
                </div>
            )}

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .hover-bg-light:hover { background-color: #f8f9fa; }
                .ring-2 { box-shadow: 0 0 0 2px #0ea5e9 !important; }
                .transition-all { transition: all 0.2s ease; }
                .animate-slide-down { animation: slideDown 0.2s ease-out; }
                .animate-zoom-in { animation: zoomIn 0.3s ease-out; }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

export default LabReports;