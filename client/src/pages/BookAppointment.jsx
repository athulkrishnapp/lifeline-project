import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import { 
    FaHospital, FaCalendarCheck, FaHistory, FaSearch, 
    FaDownload, FaCheckCircle, FaUserMd, FaArrowRight
} from 'react-icons/fa';

function BookAppointment() {
    const [activeTab, setActiveTab] = useState('book');
    
    // --- DATA ---
    const [hospitalsData, setHospitalsData] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [departments, setDepartments] = useState([]);

    // --- SELECTION ---
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [referralDept, setReferralDept] = useState('');
    const [preferredDoc, setPreferredDoc] = useState('');
    const [date, setDate] = useState('');
    
    // --- LOGIC ---
    const [allowedDays, setAllowedDays] = useState([]); 
    const [allowedDaysText, setAllowedDaysText] = useState("All Days");
    
    // --- BOOKING STATE ---
    const [availableDocs, setAvailableDocs] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [newBooking, setNewBooking] = useState(null);
    const [step, setStep] = useState(1);

    // --- HISTORY STATE ---
    const [appointmentHistory, setAppointmentHistory] = useState([]);

    // 1. INITIAL LOAD
    useEffect(() => {
        axios.get('http://localhost:5000/api/hospitals').then(res => {
            setHospitalsData(res.data);
            setStates([...new Set(res.data.map(h => h.state))].filter(Boolean));
        });
        fetchHistory();
    }, []);

    const fetchHistory = () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        axios.get('http://localhost:5000/api/my-appointments', {
            // ✅ FIXED: Added Bearer prefix
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => setAppointmentHistory(res.data))
        .catch(err => console.error("History Error", err));
    };

    // 2. DROPDOWN HANDLERS
    useEffect(() => {
        if (selectedState) {
            const filtered = hospitalsData.filter(h => h.state === selectedState);
            setCities([...new Set(filtered.map(h => h.city))]);
            setSelectedCity(''); setSelectedHospital(''); setSelectedDept('');
        }
    }, [selectedState]);

    const handleHospitalChange = (e) => {
        const hName = e.target.value;
        setSelectedHospital(hName);
        const hosp = hospitalsData.find(h => h.hospital_name === hName);
        setDepartments(hosp?.departments ? hosp.departments.split(',').map(d => d.trim()) : []);
        setSelectedDept(''); setDate('');
    };

    const handleDeptChange = (e) => {
        const dept = e.target.value;
        setSelectedDept(dept);
        const hosp = hospitalsData.find(h => h.hospital_name === selectedHospital);
        
        let days = [0,1,2,3,4,5,6]; 
        let text = "All Days";
        if (hosp && hosp.op_schedule) {
            const rules = hosp.op_schedule.split('|');
            const deptRule = rules.find(r => r.startsWith(dept + ":"));
            if (deptRule) {
                const dayStr = deptRule.split(':')[1];
                const map = { "Sun":0, "Mon":1, "Tue":2, "Wed":3, "Thu":4, "Fri":5, "Sat":6 };
                days = dayStr.split(',').map(d => map[d.trim()]);
                text = dayStr.replace(/,/g, ", ");
            }
        }
        setAllowedDays(days);
        setAllowedDaysText(text);
        setDate('');
    };

    const handleDateChange = (e) => {
        const selectedDate = new Date(e.target.value);
        const dayIndex = selectedDate.getDay();
        if (!allowedDays.includes(dayIndex)) {
            alert(`Sorry, ${selectedDept} OP is only available on: ${allowedDaysText}`);
            setDate(''); return;
        }
        setDate(e.target.value);
    };

    // 3. BOOKING LOGIC
    const handleSearchSlots = () => {
        if (!selectedHospital || !selectedDept || !date) { alert("Fill all fields"); return; }
        const docs = [{ 
            name: selectedDept.includes("Uro") ? "Dr. Specialist A" : "Dr. Duty Doctor", 
            qual: "MBBS, MD", 
            time: "09:00 AM - 01:00 PM", 
            slots: generateTokens(40) 
        }];
        setAvailableDocs(docs);
        setStep(2);
    };

    const generateTokens = (total) => {
        const batches = [];
        let startTime = 9; 
        for (let i = 1; i <= total; i += 20) {
            const end = Math.min(i + 19, total);
            const tokens = [];
            for (let t = i; t <= end; t++) tokens.push({ num: t, status: Math.random()>0.8?'booked':'available' });
            batches.push({ time: `${startTime}:00 - ${startTime+1}:00`, tokens });
            startTime++;
        }
        return batches;
    };

    const confirmBooking = () => {
        const hosp = hospitalsData.find(h => h.hospital_name === selectedHospital);
        let fee = parseInt(hosp.base_fee || 0);
        if (hosp.type === 'Government' && selectedDept.includes('Gynecology')) fee = 0;

        const booking = {
            token: `LL-${Math.floor(10000+Math.random()*90000)}`,
            hospital: selectedHospital,
            dept: selectedDept,
            doctor: selectedDoc.name,
            date: date,
            time: selectedSlot.time,
            tokenNum: selectedToken,
            fee: fee,
            ref: referralDept || "None"
        };
        setNewBooking(booking);
        setStep(3);
    };

    const handlePayment = async () => {
        const token = localStorage.getItem('token');
        if(!token) { alert("Login required!"); return; }

        try {
            await axios.post('http://localhost:5000/api/book-appointment', {
                token: newBooking.token,
                hospital: newBooking.hospital,
                dept: newBooking.dept,
                doctor: newBooking.doctor,
                date: newBooking.date,
                time: newBooking.time,
                fee: newBooking.fee,
                ref: newBooking.ref
            // ✅ FIXED: Added Bearer prefix
            }, { headers: { Authorization: `Bearer ${token}` } });

            fetchHistory(); 
            setStep(4);
            setTimeout(() => generatePDF(), 1000); 

        } catch (err) {
            console.error(err);
            alert("Booking failed.");
        }
    };

    // PDF GENERATION (Professional)
    const generatePDF = (booking = newBooking) => {
        if (!booking) return;
        const doc = new jsPDF();

        const tokenDisplay = booking.tokenNum || booking.token_number || "N/A";
        const idDisplay = booking.token || booking.token_number || "N/A";
        const hospName = booking.hospital || booking.hospital_name || "";
        const deptName = booking.dept || booking.department || "";
        const docName = booking.doctor || booking.doctor_name || "";
        const dateStr = booking.date ? booking.date : (booking.appointment_date ? String(booking.appointment_date).split('T')[0] : "");
        const timeStr = booking.time || booking.appointment_time || "";
        const feeStr = booking.fee !== undefined ? `Rs. ${booking.fee}` : "Free";

        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 45, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("LIFELINE HEALTH NETWORK", 105, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Official Outpatient Ticket", 105, 30, { align: "center" });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 38, { align: "center" });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(50);
        doc.setFont("helvetica", "bold");
        doc.text(`Token: ${tokenDisplay}`, 105, 70, { align: "center" });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Booking ID: ${idDisplay}`, 105, 80, { align: "center" });

        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.rect(25, 90, 160, 95);

        doc.setFontSize(12);
        doc.setTextColor(0);
        
        const startY = 105;
        const lineHeight = 12;
        const labelX = 35;
        const valueX = 85;

        const printRow = (label, value, y) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, labelX, y);
            doc.setFont("helvetica", "normal");
            doc.text(value, valueX, y);
        };

        printRow("Hospital:", hospName, startY);
        printRow("Department:", deptName, startY + lineHeight);
        printRow("Doctor:", docName, startY + lineHeight * 2);
        printRow("Date:", dateStr, startY + lineHeight * 3);
        printRow("Time Slot:", timeStr, startY + lineHeight * 4);
        printRow("Fee Paid:", feeStr, startY + lineHeight * 5);

        doc.setDrawColor(220, 38, 38);
        doc.setTextColor(220, 38, 38);
        doc.setLineWidth(1);
        doc.circle(150, 160, 18);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("LIFELINE", 150, 158, { align: "center" });
        doc.text("VERIFIED", 150, 164, { align: "center" });

        doc.save(`Ticket_${idDisplay}.pdf`);
    };

    const startNewBooking = () => {
        setStep(1); setNewBooking(null); setSelectedToken(null); setSelectedDoc(null);
        setActiveTab('book');
    };

    return (
        <div className="theme-bg min-vh-100 p-4 transition-all">
            <div className="container" style={{maxWidth: '1000px'}}>
                
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 className="fw-bold m-0 theme-text">Appointments</h4>
                        <small className="theme-text-muted">Digital Booking System</small>
                    </div>
                    <div className="btn-group theme-card shadow-sm p-1 rounded-pill">
                        <button onClick={() => setActiveTab('book')} className={`btn rounded-pill px-4 fw-bold small ${activeTab === 'book' ? 'btn-primary' : 'theme-text-muted'}`}><FaCalendarCheck className="me-2"/> New</button>
                        <button onClick={() => setActiveTab('history')} className={`btn rounded-pill px-4 fw-bold small ${activeTab === 'history' ? 'btn-primary' : 'theme-text-muted'}`}><FaHistory className="me-2"/> History</button>
                    </div>
                </div>

                {/* TAB 1: BOOKING */}
                {activeTab === 'book' && (
                    <div className="theme-card border-0 shadow-lg rounded-4 overflow-hidden">
                        <div className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold m-0"><FaHospital className="me-2"/> NEW BOOKING</h6>
                            {step > 1 && step < 4 && <button onClick={() => setStep(step-1)} className="btn btn-sm btn-light bg-opacity-25 border-0 text-white">Back</button>}
                        </div>
                        <div className="p-4 p-md-5">
                            {/* STEP 1: FORM */}
                            {step === 1 && (
                                <div className="animate-fade-in">
                                    <div className="row g-4">
                                        <div className="col-md-4"><label className="small fw-bold theme-text-muted">State</label><select className="form-select theme-input" value={selectedState} onChange={e=>setSelectedState(e.target.value)}><option value="">Select</option>{states.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                        <div className="col-md-4"><label className="small fw-bold theme-text-muted">District</label><select className="form-select theme-input" value={selectedCity} onChange={e=>setSelectedCity(e.target.value)} disabled={!selectedState}><option value="">Select</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                                        <div className="col-md-4"><label className="small fw-bold theme-text-muted">Hospital</label><select className="form-select theme-input" value={selectedHospital} onChange={handleHospitalChange} disabled={!selectedCity}><option value="">Select</option>{hospitalsData.filter(h=>h.city===selectedCity).map(h=><option key={h.hospital_name} value={h.hospital_name}>{h.hospital_name}</option>)}</select></div>
                                        <div className="col-md-6"><label className="small fw-bold theme-text-muted">Department</label><select className="form-select theme-input" value={selectedDept} onChange={handleDeptChange} disabled={!selectedHospital}><option value="">Select</option>{departments.map(d=><option key={d} value={d}>{d}</option>)}</select>{selectedDept && <small className="text-success fw-bold mt-1 d-block"><FaCheckCircle className="me-1"/> {allowedDaysText}</small>}</div>
                                        <div className="col-md-6"><label className="small fw-bold theme-text-muted">Date</label><input type="date" className="form-control theme-input" value={date} min={new Date().toISOString().split('T')[0]} onChange={handleDateChange} disabled={!selectedDept} /></div>
                                        <div className="col-md-6"><label className="small fw-bold theme-text-muted">Referral (Optional)</label><input className="form-control theme-input" value={referralDept} onChange={e=>setReferralDept(e.target.value)}/></div>
                                        <div className="col-md-6"><label className="small fw-bold theme-text-muted">Pref. Doctor (Optional)</label><input className="form-control theme-input" value={preferredDoc} onChange={e=>setPreferredDoc(e.target.value)}/></div>
                                    </div>
                                    <div className="mt-5 text-end"><button onClick={handleSearchSlots} className="btn btn-primary px-5 fw-bold rounded-pill">Search Slots <FaArrowRight/></button></div>
                                </div>
                            )}

                            {/* STEP 2: SLOTS */}
                            {step === 2 && (
                                <div className="animate-fade-in">
                                    <h5 className="fw-bold mb-4 theme-text">Select a Token</h5>
                                    {availableDocs.map((doc, idx) => (
                                        <div key={idx} className="theme-border border rounded-4 p-3 mb-3">
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                            <div className="theme-bg p-2 rounded-circle border theme-border"><FaHospital size={20}/></div><div><h6 className="m-0 fw-bold theme-text">{selectedHospital}</h6><small className="theme-text-muted">{selectedDept} OP</small></div></div>
                                            <div className="row g-2">
                                                {doc.slots.map((slot, sIdx) => (
                                                    <div key={sIdx} className="col-md-4"><div className="p-2 border theme-border rounded theme-bg"><div className="small fw-bold text-primary mb-2">{slot.time}</div><div className="d-flex flex-wrap gap-1">{slot.tokens.map(t => (<button key={t.num} disabled={t.status==='booked'} onClick={() => { setSelectedDoc(doc); setSelectedSlot(slot); setSelectedToken(t.num); }} className={`btn btn-sm ${selectedToken===t.num?'btn-primary':'btn-outline-secondary theme-text'} py-0 px-2`} style={{fontSize:'10px'}}>{t.num}</button>))}</div></div></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-end mt-3"><button onClick={confirmBooking} disabled={!selectedToken} className="btn btn-success px-5 rounded-pill">Continue</button></div>
                                </div>
                            )}

                            {/* STEP 3: CONFIRM */}
                            {step === 3 && newBooking && (
                                <div className="text-center animate-fade-in">
                                    <div className="theme-card border theme-border rounded-4 p-4 d-inline-block text-start w-100" style={{maxWidth:'400px'}}>
                                        <h5 className="fw-bold theme-text mb-4 text-center">Confirm Booking</h5>
                                        <div className="d-flex justify-content-between mb-2"><span className="theme-text-muted">Hospital</span><span className="fw-bold theme-text text-end">{newBooking.hospital}</span></div>
                                        <div className="d-flex justify-content-between mb-2"><span className="theme-text-muted">Department</span><span className="fw-bold theme-text">{newBooking.dept}</span></div>
                                        <div className="d-flex justify-content-between mb-2"><span className="theme-text-muted">Date</span><span className="fw-bold theme-text">{newBooking.date}</span></div>
                                        <hr className="theme-border"/>
                                        <div className="d-flex justify-content-between mb-4"><span className="theme-text-muted">Fee</span><span className="fw-bold text-success fs-5">₹{newBooking.fee}</span></div>
                                        <button onClick={handlePayment} className="btn btn-primary w-100 rounded-pill fw-bold">PAY & BOOK</button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: SUCCESS */}
                            {step === 4 && (
                                <div className="text-center mt-4 animate-fade-in">
                                    <FaCheckCircle size={60} className="text-success mb-3"/>
                                    <h3 className="fw-bold theme-text">Booking Successful!</h3>
                                    <p className="theme-text-muted">Your ticket is downloading...</p>
                                    <div className="d-flex justify-content-center gap-3 mt-4">
                                        <button onClick={() => generatePDF()} className="btn btn-primary rounded-pill px-4"><FaDownload className="me-2"/> Download Again</button>
                                        <button onClick={startNewBooking} className="btn btn-outline-secondary rounded-pill px-4">New Booking</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: HISTORY */}
                {activeTab === 'history' && (
                    <div className="theme-card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="p-3 border-bottom theme-border d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold m-0 theme-text">Booking History</h6>
                            <button onClick={fetchHistory} className="btn btn-sm btn-light border theme-btn-secondary"><FaSearch/> Refresh</button>
                        </div>
                        <div className="table-responsive">
                            <table className="table theme-table align-middle mb-0">
                                <thead className="theme-bg theme-text-muted small">
                                    <tr><th className="ps-4">Token</th><th>Date</th><th>Hospital</th><th>Dept</th><th>Status</th><th>Action</th></tr>
                                </thead>
                                <tbody className="theme-text">
                                    {appointmentHistory.map((appt, i) => (
                                        <tr key={i} className="border-bottom theme-border">
                                            <td className="ps-4 fw-bold text-primary">{appt.token_number}</td>
                                            <td>{String(appt.appointment_date).split('T')[0]}</td>
                                            <td>{appt.hospital_name}</td>
                                            <td>{appt.department}</td>
                                            <td><span className="badge bg-success bg-opacity-10 text-success">{appt.status}</span></td>
                                            <td><button onClick={() => generatePDF(appt)} className="btn btn-sm theme-btn-secondary border"><FaDownload/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {appointmentHistory.length === 0 && <div className="p-5 text-center theme-text-muted">No appointments found.</div>}
                        </div>
                    </div>
                )}

            </div>
            
            {/* STYLES (Light & Dark Mode) */}
            <style>{`
                /* Global Theme Variables */
                :root {
                    --bg-color: #f8fafc;
                    --card-bg: #ffffff;
                    --text-color: #0f172a;
                    --text-muted: #64748b;
                    --border-color: #e2e8f0;
                    --input-bg: #f1f5f9;
                    --hover-bg: #f1f5f9;
                }

                /* Dark Mode Override */
                body.dark-mode {
                    --bg-color: #0f172a;
                    --card-bg: #1e293b;
                    --text-color: #f8fafc;
                    --text-muted: #94a3b8;
                    --border-color: #334155;
                    --input-bg: #334155;
                    --hover-bg: #334155;
                }

                /* Apply Variables */
                .theme-bg { background-color: var(--bg-color); color: var(--text-color); }
                .theme-card { background-color: var(--card-bg); color: var(--text-color); transition: background-color 0.3s, color 0.3s; }
                .theme-text { color: var(--text-color); }
                .theme-text-muted { color: var(--text-muted); }
                .theme-border { border-color: var(--border-color) !important; }
                .theme-input { background-color: var(--input-bg); color: var(--text-color); border: 1px solid transparent; }
                .theme-input:focus { background-color: var(--input-bg); color: var(--text-color); box-shadow: 0 0 0 2px #2563eb; }
                
                .theme-table th, .theme-table td { background-color: transparent !important; color: var(--text-color); border-color: var(--border-color); }
                .theme-btn-secondary { background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); }
                
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

export default BookAppointment;