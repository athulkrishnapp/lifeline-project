import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import { 
  FaHospital, FaCalendarCheck, FaHistory, FaSearch, FaPrint, 
  FaDownload, FaCheckCircle, FaMapMarkerAlt, FaUserMd, FaClock, FaInfoCircle, FaFilter 
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

  // =======================================================
  // 1. INITIAL LOAD (Hospitals + History)
  // =======================================================
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
    
    // Fetch from Database (This will get Dummy + New Data)
    axios.get('http://localhost:5000/api/my-appointments', {
        headers: { Authorization: token }
    })
    .then(res => setAppointmentHistory(res.data))
    .catch(err => console.error("History Error", err));
  };

  // =======================================================
  // 2. DROPDOWN HANDLERS
  // =======================================================
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
    
    // Parse Schedule Logic (From CSV Data)
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

  // =======================================================
  // 3. BOOKING LOGIC
  // =======================================================
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
    // Apply Free Logic
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
        // SAVE TO DATABASE
        await axios.post('http://localhost:5000/api/book-appointment', {
            token: newBooking.token,
            hospital: newBooking.hospital,
            dept: newBooking.dept,
            doctor: newBooking.doctor,
            date: newBooking.date,
            time: newBooking.time,
            fee: newBooking.fee,
            ref: newBooking.ref
        }, { headers: { Authorization: token } });

        // REFRESH HISTORY FROM DATABASE
        fetchHistory();
        
        setStep(4);
        setTimeout(() => generatePDF(), 1000);

    } catch (err) {
        console.error(err);
        alert("Booking failed to save.");
    }
  };

  const generatePDF = (booking = newBooking) => {
    if (!booking) return;
    const doc = new jsPDF();
    doc.setFillColor(13, 110, 253); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("LIFELINE HEALTH", 105, 20, { align: "center" });
    
    // Handle DB vs Local field names
    const displayToken = booking.tokenNum || booking.token_number || "N/A";
    const displayID = booking.token || booking.token_number;
    
    doc.setTextColor(0); doc.setFontSize(40);
    doc.text(`Token: ${displayToken}`, 105, 60, { align: "center" });
    
    // Barcode Mock
    doc.setDrawColor(0);
    let bx = 70;
    for(let i=0; i<50; i++) { doc.setLineWidth(Math.random()>0.5?0.5:1.5); doc.line(bx, 225, bx, 240); bx+=1.5; }
    
    doc.save(`Ticket_${displayID}.pdf`);
  };

  const startNewBooking = () => {
    setStep(1); setNewBooking(null); setSelectedToken(null); setSelectedDoc(null);
    setActiveTab('book');
  };

  return (
    <div className="page-background min-vh-100 p-4">
      <div className="container" style={{maxWidth: '1200px'}}>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div><h4 className="fw-bold m-0 theme-text">Appointment Portal</h4><small className="text-muted">State Digital Health Mission</small></div>
            <div className="btn-group bg-white shadow-sm p-1 rounded-pill">
                <button onClick={() => setActiveTab('book')} className={`btn rounded-pill px-4 fw-bold small ${activeTab === 'book' ? 'btn-primary' : 'btn-light text-muted'}`}><FaCalendarCheck className="me-2"/> New Booking</button>
                <button onClick={() => setActiveTab('history')} className={`btn rounded-pill px-4 fw-bold small ${activeTab === 'history' ? 'btn-primary' : 'btn-light text-muted'}`}><FaHistory className="me-2"/> History</button>
            </div>
        </div>

        {/* TAB 1: BOOKING */}
        {activeTab === 'book' && (
            <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
                <div className="card-header bg-primary text-white py-3 d-flex justify-content-between">
                    <h6 className="fw-bold m-0"><FaHospital className="me-2"/> BOOK APPOINTMENT</h6>
                    {step > 1 && step < 4 && <button onClick={() => setStep(step-1)} className="btn btn-sm btn-outline-light py-0">Back</button>}
                </div>
                <div className="card-body p-5">
                    {/* STEP 1: FORM */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <div className="row g-4">
                                <div className="col-md-4"><label className="small fw-bold text-muted">State</label><select className="form-select" value={selectedState} onChange={e=>setSelectedState(e.target.value)}><option value="">-- Select --</option>{states.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="col-md-4"><label className="small fw-bold text-muted">District</label><select className="form-select" value={selectedCity} onChange={e=>setSelectedCity(e.target.value)} disabled={!selectedState}><option value="">-- Select --</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                                <div className="col-md-4"><label className="small fw-bold text-muted">Hospital</label><select className="form-select" value={selectedHospital} onChange={handleHospitalChange} disabled={!selectedCity}><option value="">-- Select --</option>{hospitalsData.filter(h=>h.city===selectedCity).map(h=><option key={h.hospital_name} value={h.hospital_name}>{h.hospital_name}</option>)}</select></div>
                                <div className="col-md-6"><label className="small fw-bold text-muted">Department</label><select className="form-select" value={selectedDept} onChange={handleDeptChange} disabled={!selectedHospital}><option value="">-- Select --</option>{departments.map(d=><option key={d} value={d}>{d}</option>)}</select>{selectedDept && <small className="text-success fw-bold mt-1 d-block"><FaCheckCircle className="me-1"/> OP: {allowedDaysText}</small>}</div>
                                <div className="col-md-3"><label className="small fw-bold text-muted">Referral (Optional)</label><input className="form-control" value={referralDept} onChange={e=>setReferralDept(e.target.value)}/></div>
                                <div className="col-md-3"><label className="small fw-bold text-muted">Pref. Doctor (Optional)</label><input className="form-control" value={preferredDoc} onChange={e=>setPreferredDoc(e.target.value)}/></div>
                                <div className="col-md-12"><label className="small fw-bold text-muted">Date</label><input type="date" className="form-control" value={date} min={new Date().toISOString().split('T')[0]} onChange={handleDateChange} disabled={!selectedDept} /></div>
                            </div>
                            <div className="mt-4 text-end"><button onClick={handleSearchSlots} className="btn btn-primary px-5 fw-bold">Search Slots</button></div>
                        </div>
                    )}

                    {/* STEP 2: SLOTS */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <h5 className="fw-bold mb-4">Select Token</h5>
                            {availableDocs.map((doc, idx) => (
                                <div key={idx} className="border rounded p-3 mb-3">
                                    <div className="d-flex align-items-center gap-3 mb-3"><div className="bg-light p-2 rounded-circle"><FaUserMd size={24}/></div><div><h6 className="m-0 fw-bold">{doc.name}</h6><small className="text-muted">{doc.time}</small></div></div>
                                    <div className="row g-2">
                                        {doc.slots.map((slot, sIdx) => (
                                            <div key={sIdx} className="col-md-4"><div className="p-2 border rounded bg-light"><div className="small fw-bold text-primary mb-2">{slot.time}</div><div className="d-flex flex-wrap gap-1">{slot.tokens.map(t => (<button key={t.num} disabled={t.status==='booked'} onClick={() => { setSelectedDoc(doc); setSelectedSlot(slot); setSelectedToken(t.num); }} className={`btn btn-sm ${selectedToken===t.num?'btn-primary':'btn-outline-secondary'} py-0 px-2`} style={{fontSize:'10px'}}>{t.num}</button>))}</div></div></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="text-end mt-3"><button onClick={confirmBooking} disabled={!selectedToken} className="btn btn-success px-5">Continue</button></div>
                        </div>
                    )}

                    {/* STEP 3: PAYMENT */}
                    {step === 3 && newBooking && (
                        <div className="card border-0 shadow-sm rounded-3 p-5 text-center" style={{maxWidth:'500px', margin:'0 auto'}}>
                            <h5 className="fw-bold">Confirm Booking</h5>
                            <div className="bg-light p-3 rounded text-start my-4">
                                <div><strong>Hospital:</strong> {newBooking.hospital}</div>
                                <div><strong>Dept:</strong> {newBooking.dept}</div>
                                <div><strong>Token:</strong> {newBooking.tokenNum}</div>
                                <div><strong>Fee:</strong> <span className="text-success fw-bold">₹{newBooking.fee}</span></div>
                            </div>
                            <button onClick={handlePayment} className="btn btn-primary w-100 py-2">PAY & BOOK</button>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <div className="text-center mt-5">
                            <FaCheckCircle size={60} className="text-success mb-3"/>
                            <h3 className="fw-bold">Booking Successful!</h3>
                            <p>Ticket downloading...</p>
                            <div className="d-flex justify-content-center gap-3 mt-4">
                                <button onClick={() => generatePDF()} className="btn btn-primary"><FaDownload/> Download</button>
                                <button onClick={startNewBooking} className="btn btn-outline-dark">New Booking</button>
                                <button onClick={() => setActiveTab('history')} className="btn btn-success">View History</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
            <div className="card border-0 shadow-sm rounded-3">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between">
                    <h6 className="fw-bold m-0 text-primary"><FaHistory className="me-2"/> MY BOOKINGS</h6>
                    <button onClick={fetchHistory} className="btn btn-sm btn-light border"><FaSearch/> Refresh</button>
                </div>
                <div className="card-body p-0">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr><th className="ps-4">Token</th><th>Date</th><th>Hospital</th><th>Dept</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {appointmentHistory.map((appt, i) => (
                                <tr key={i}>
                                    <td className="ps-4 fw-bold text-primary">{appt.token_number}</td>
                                    <td>{String(appt.appointment_date).split('T')[0]}</td>
                                    <td>{appt.hospital_name}</td>
                                    <td>{appt.department}</td>
                                    <td><span className="badge bg-success bg-opacity-10 text-success">{appt.status}</span></td>
                                    <td><button onClick={() => generatePDF(appt)} className="btn btn-sm btn-light border"><FaDownload/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {appointmentHistory.length === 0 && <div className="p-5 text-center text-muted">No appointments found.</div>}
                </div>
            </div>
        )}

      </div>
      <style>{` .page-background { background-color: #f3f4f6; } `}</style>
    </div>
  );
}

export default BookAppointment;