import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode'; 
import MyRecords from './MyRecords'; // ADD THIS IMPORT
import { 
    FaQrcode, FaUserInjured, FaExclamationTriangle, FaCalendarTimes, 
    FaSave, FaHistory, FaLock, FaUnlock, FaBell, FaFileMedicalAlt, 
    FaPills, FaMoneyBillWave, FaAmbulance, FaSearch, FaStethoscope,
    FaTimes, FaChevronRight, FaCircle, FaPlus, FaTrash, FaNotesMedical,
    FaIdCard, FaPhone, FaUserPlus, FaCalendarCheck, FaCog, FaFileMedical,
    FaUserNurse, FaSyringe, FaFlask, FaClock, FaListUl, FaArrowRight, FaFileUpload,
    FaProcedures, FaCut, FaVial, FaMicroscope
} from 'react-icons/fa';


function DoctorDashboard() {
  const [showSidebar, setShowSidebar] = useState(true); 
  const [activeTab, setActiveTab] = useState('queue'); 
  const [queueLoading, setQueueLoading] = useState(false);
  const [alreadyInQueue, setAlreadyInQueue] = useState(false);
  const [showFullRecords, setShowFullRecords] = useState(false);

  // --- DOCTOR DEMO DATA ---
  const demoApptsRef = useRef([
      { id: 'demo1', patient_id: 'demo-1', appointment_time: '10:00 AM', patient_name: 'Rahul Sharma', token_number: '101' },
      { id: 'demo2', patient_id: 'demo-2', appointment_time: '10:30 AM', patient_name: 'Aditi Rao', token_number: '102' },
  ]);

  // --- PATHOLOGIST DEMO DATA ---
  const demoPathoQueueRef = useRef([
      { id: 'hist3', patient_id: 'demo-3', appointment_time: 'Pending', patient_name: 'Vikram Singh', lab_orders: 'Lipid Profile, Kidney Function Test (KFT)' },
      { id: 'hist4', patient_id: 'demo-4', appointment_time: 'Pending', patient_name: 'Priya Patel', lab_orders: 'Complete Blood Count (CBC)' }
  ]);

  
  // --- DEMO NURSE ROSTER ---
const demoNursesRef = useRef([
  { id: 1, name: "Nurse Anjali Menon", shift: "Morning (8 AM - 2 PM)", ward: "General Ward", status: "On Duty" },
  { id: 2, name: "Nurse Rohit Nair", shift: "Evening (2 PM - 8 PM)", ward: "ICU", status: "On Duty" },
  { id: 3, name: "Nurse Kavya Iyer", shift: "Night (8 PM - 8 AM)", ward: "Emergency", status: "On Call" },
  { id: 4, name: "Nurse Amit Verma", shift: "Morning (8 AM - 2 PM)", ward: "Pediatrics", status: "Off Duty" }
 ]);

// --- TODAY DEMO DOCTOR SCHEDULE ---
const demoTodayScheduleRef = useRef([
    { time: "09:00 AM", task: "OP Consultation Begins", location: "Room 201" },
    { time: "11:30 AM", task: "Ward Round", location: "General Ward" },
    { time: "01:30 PM", task: "Lunch Break", location: "Doctor Lounge" },
    { time: "02:30 PM", task: "Surgery Assistance", location: "Operation Theatre 2" },
    { time: "05:00 PM", task: "Patient Follow-up Review", location: "Consultation Room" },
]);

  // --- UNIFIED DEMO HISTORY ---
  const demoHistRef = useRef([
      { id: 'hist1', patient_id: 'demo-1', patient_name: 'Rahul Sharma', visit_date: new Date(Date.now() - 86400000 * 5).toISOString(), diagnosis: 'Viral Fever', prescription: 'Paracetamol 500mg (1-0-1)', lab_orders: 'Complete Blood Count (CBC)', lab_results: '[{"test":"CBC","result":"Normal","range":"-","status":"Normal"}]', procedures: 'Advised rest.' },
      { id: 'hist2', patient_id: 'demo-2', patient_name: 'Aditi Rao', visit_date: new Date(Date.now() - 86400000 * 12).toISOString(), diagnosis: 'Migraine', prescription: 'Sumatriptan 50mg (SOS)', lab_orders: '', lab_results: null, procedures: 'Dark room therapy advised.' },
      { id: 'hist3', patient_id: 'demo-3', patient_name: 'Vikram Singh',
  visit_date: new Date(Date.now() - 86400000).toISOString(), // ⬅️ 1 day old
  diagnosis: 'Hypertension',
  prescription: 'Amlodipine 5mg',
  lab_orders: 'Lipid Profile, Kidney Function Test (KFT)',
  lab_results: null,
  procedures: 'Pending lab results.'
},

{ id: 'hist4', patient_id: 'demo-4', patient_name: 'Priya Patel',
  visit_date: new Date(Date.now() - 86400000).toISOString(), // ⬅️ 1 day old
  diagnosis: 'Gastritis',
  prescription: 'Pantoprazole 40mg',
  lab_orders: 'Complete Blood Count (CBC)',
  lab_results: null,
  procedures: 'Pending lab results.'
}
  ]);

  const [appointments, setAppointments] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]); 
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [doctorName, setDoctorName] = useState("Loading...");
  const [department, setDepartment] = useState(""); 
  const isPathologist = department.toLowerCase().includes('pathology') || department.toLowerCase().includes('lab');
  
  const [scanMode, setScanMode] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('new'); 
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const [historySearch, setHistorySearch] = useState('');
  const [reportSearch, setReportSearch] = useState(''); 
  const [accessLevel, setAccessLevel] = useState('basic');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [diagnosis, setDiagnosis] = useState('');
  const [expiry, setExpiry] = useState('');
  const [followUp, setFollowUp] = useState(''); 
  const [procedureNote, setProcedureNote] = useState('');
  
  const [selectedTestOrder, setSelectedTestOrder] = useState('');
  const [addedLabOrders, setAddedLabOrders] = useState([]);

  const [selectedPendingRecord, setSelectedPendingRecord] = useState('');
  const [labTestName, setLabTestName] = useState('');
  const [labResultValue, setLabResultValue] = useState('');
  const [labRefRange, setLabRefRange] = useState('');
  const [labStatus, setLabStatus] = useState('Normal');
  const [addedResults, setAddedResults] = useState([]);
  
  const [drugSearch, setDrugSearch] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState(''); 
  const [duration, setDuration] = useState('');
  const [addedMedicines, setAddedMedicines] = useState([]); 
  const [showDrugSuggestions, setShowDrugSuggestions] = useState(false);
  const [aiAlert, setAiAlert] = useState(null);
  const [cheaperAlt, setCheaperAlt] = useState(null);
  const [drugsDB, setDrugsDB] = useState([]);

  const scannerRef = useRef(null);

  const stats = { 
      total: appointments.length + consultationHistory.length, 
      pending: appointments.length, 
      completed: consultationHistory.length 
  };

  const commonDiagnoses = ["Viral Fever", "Acute Bronchitis", "Type 2 Diabetes", "Hypertension", "Migraine", "Gastritis", "COVID-19", "Pneumonia", "Anemia"];
  const commonFrequencies = ["1-0-1", "1-1-1", "1-0-0", "0-0-1", "SOS", "Twice Daily", "Steam Inhale"];
  const labTestOptions = ["Complete Blood Count (CBC)", "Lipid Profile", "Liver Function Test (LFT)", "Kidney Function Test (KFT)", "Thyroid Profile (T3, T4, TSH)", "Blood Sugar Fasting (FBS)", "Blood Sugar Post Prandial (PPBS)", "HbA1c"];

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      try {
          const profileRes = await axios.get('http://localhost:5000/api/profile', { headers: { Authorization: `Bearer ${token}` } });
          setDoctorName(profileRes.data.full_name);
          const dept = profileRes.data.department || "General Medicine";
          setDepartment(dept);

          const pathoFlag = dept.toLowerCase().includes('pathology') || dept.toLowerCase().includes('lab');

          if (pathoFlag) {
              const labsRes = await axios.get('http://localhost:5000/api/doctor/pending-labs', { headers: { Authorization: `Bearer ${token}` } });
              setAppointments([...demoPathoQueueRef.current, ...labsRes.data]);

              const histRes = await axios.get('http://localhost:5000/api/doctor/pathology-history', { headers: { Authorization: `Bearer ${token}` } });
              const combinedHistory = [...demoHistRef.current.filter(h => h.lab_results), ...histRes.data];
              const sortedHistory = combinedHistory.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
              
              setConsultationHistory(sortedHistory);
              setFilteredHistory(sortedHistory);
          } else {
              const apptRes = await axios.get('http://localhost:5000/api/doctor/appointments', { headers: { Authorization: `Bearer ${token}` } });
              const uniqueAppts = Array.from(new Map(apptRes.data.map(item => [item.patient_id, item])).values());
              setAppointments([...demoApptsRef.current, ...uniqueAppts]);
              
              const histRes = await axios.get('http://localhost:5000/api/doctor/my-history', { headers: { Authorization: `Bearer ${token}` } });
              const combinedHistory = [...demoHistRef.current.filter(h => !h.lab_results), ...histRes.data];
              const sortedHistory = combinedHistory.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
              
              setConsultationHistory(sortedHistory);
              setFilteredHistory(sortedHistory);
          }

          const drugRes = await axios.get('http://localhost:5000/api/drugs');
          setDrugsDB(drugRes.data);
      } catch (err) { console.error("Load Error"); }
  };

  useEffect(() => {
    if (!historySearch.trim()) {
        setFilteredHistory(consultationHistory);
    } else {
        const lower = historySearch.toLowerCase();
        setFilteredHistory(consultationHistory.filter(rec => 
            (rec.patient_name && rec.patient_name.toLowerCase().includes(lower)) || 
            (rec.diagnosis && rec.diagnosis.toLowerCase().includes(lower))
        ));
    }
  }, [historySearch, consultationHistory]);

  useEffect(() => {
    let html5QrCode;

    if (scanMode) {
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
            { facingMode: "environment" },
            { 
                fps: 8,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.85;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0
            },
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
        ).catch(err => {
            alert("Camera Error. Allow camera permission.");
            setScanMode(false);
        });
    }

    return () => {
    if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                scannerRef.current.stop()
                .then(() => scannerRef.current.clear())
                .catch(() => {});
            }
        } catch (e) {
            console.log("Scanner already stopped");
        }
    }
};
}, [scanMode]);

  const handleScanSuccess = async (decodedText) => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            }
        } catch(e){}

        setScanMode(false);

        console.log("QR detected:", decodedText); // debug

        loadPatientContext(decodedText.trim(), 'new');
    };

        const loadPatientContext = async (data, mode, historicalData = null) => {
        setAlreadyInQueue(false);   // ⭐ reset before checking
    let identifier = data;
    let appointmentId = null;

    if (typeof data === 'object') {
        identifier = data.patient_id;
        appointmentId = data.id;
    }
      setLoading(true);
      
      // --- LOCAL DEMO PATIENT PROFILES ---
      if (String(identifier).startsWith('demo-')) {
          const patientDemoRecords = demoHistRef.current.filter(r => r.patient_id === identifier);

          let name, age, blood, allergies;
          if (identifier === 'demo-1') { name = 'Rahul Sharma'; age = 34; blood = 'O+'; allergies = 'Penicillin'; }
          else if (identifier === 'demo-2') { name = 'Aditi Rao'; age = 28; blood = 'B+'; allergies = 'None'; }
          else if (identifier === 'demo-3') { name = 'Vikram Singh'; age = 52; blood = 'A-'; allergies = 'Dust'; }
          else if (identifier === 'demo-4') { name = 'Priya Patel'; age = 31; blood = 'AB+'; allergies = 'None'; }

          setSelectedPatient({ id: identifier, full_name: name, age: age, blood_group: blood, allergies: allergies, emergency_contact: '+91 9876543210', recent_records: patientDemoRecords });
          setViewMode(mode);
          setAccessLevel('basic'); setShowOtpInput(false); setOtp('');
          
          if (mode === 'review' && historicalData) {
              setSelectedRecord(historicalData);
              setDiagnosis(historicalData.diagnosis || ''); setProcedureNote(historicalData.procedures || '');
              setAddedMedicines([]); setAddedLabOrders([]); setAddedResults([]); setExpiry(""); 
          } else {
              setSelectedRecord(null);
              setDiagnosis(''); setProcedureNote(''); setAddedMedicines([]); setExpiry(''); setAddedLabOrders([]); setAddedResults([]);
              
              // --- PATHOLOGIST AUTO-FILL LOGIC (DEMO) ---
            if (isPathologist && patientDemoRecords.length > 0) {
            const pending = patientDemoRecords.find(r => r.lab_orders && !r.lab_results);

            if (pending) {
                setSelectedPendingRecord(pending.id);

                const tests = pending.lab_orders.split(',').map(t => t.trim());

                setLabTestName(tests[0]);

                setAddedResults(
                    tests.map(t => ({
                        test: t,
                        result: '',
                        range: '',
                        status: 'Normal'
                    }))
                );
            } else {
                setSelectedPendingRecord('');
                setLabTestName('');
            }
        }
              
          }
          setLoading(false);
          return;
      }

      const token = localStorage.getItem('token');
      try {
          const res = await axios.get(`http://localhost:5000/api/doctor/patient-basics/${identifier}`, { headers: { Authorization: `Bearer ${token}` } });
          setSelectedPatient({ id: res.data.profile.id,appointment_id: appointmentId, ...res.data.profile, recent_records: res.data.recent_records });
          // 🔍 check if patient already in lab queue
        if (isPathologist) {
            try {
                const token = localStorage.getItem('token');
                const queueRes = await axios.get(
                    'http://localhost:5000/api/doctor/pending-labs',
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const exists = queueRes.data.some(q => q.patient_id === res.data.profile.id);
                setAlreadyInQueue(exists);
            } catch (err) {
                console.log("Queue check failed");
            }
        }
          setViewMode(mode); setAccessLevel('basic'); setShowOtpInput(false); setOtp('');

          if (mode === 'review' && historicalData) {
              setSelectedRecord(historicalData);
              setDiagnosis(historicalData.diagnosis || ''); setProcedureNote(historicalData.procedures || '');
              setAddedMedicines([]); setAddedLabOrders([]); setAddedResults([]); setExpiry(""); 
          } else {
              setSelectedRecord(null);
              setDiagnosis(''); setProcedureNote(''); setAddedMedicines([]); setExpiry(''); setAddedLabOrders([]); setAddedResults([]);
              
              // --- PATHOLOGIST AUTO-FILL LOGIC (REAL DB) ---
              if(isPathologist && res.data.recent_records && res.data.recent_records.length > 0) {
                  const pending = res.data.recent_records.find(r => r.lab_orders && !r.lab_results);
                  if(pending) {
                      setSelectedPendingRecord(pending.id);
                      setLabTestName(pending.lab_orders); // Auto-fill the test name
                  } else {
                      setSelectedPendingRecord('');
                      setLabTestName('');
                  }
              }
          }
      } catch (err) { alert("Patient Not Found."); } 
      finally { setLoading(false); }
  };

  // --- DYNAMIC DROPDOWN SELECTION FOR PATHOLOGIST ---
  const handlePendingRecordChange = (e) => {
      const val = e.target.value;
      setSelectedPendingRecord(val);
      
      if (val) {
          const rec = (selectedPatient?.recent_records || []).find(r => String(r.id) === String(val));
      if (rec) {
         const tests = rec.lab_orders.split(',');
         setLabTestName(tests[0].trim());
}      } else {
          setLabTestName(''); // Clears out if "Direct Walk-in" is selected
      }
  };

  const handleDrugSearch = (e) => {
      setDrugSearch(e.target.value);
      setShowDrugSuggestions(e.target.value.length > 0); 
  };

  const selectDrug = (drug) => {
      setDrugSearch(drug.brand_name);
      setShowDrugSuggestions(false);
      if (drug.price_inr > 50) setCheaperAlt(`💡 Cost Saving: Generic '${drug.generic_name}' is cheaper.`);
      else setCheaperAlt(null);
      checkAllergy(drug.generic_name || drug.brand_name);
  };

  const getFilteredDrugs = () => {
      if (!drugSearch) return [];
      const lowerSearch = drugSearch.toLowerCase();
      return drugsDB.filter(d => (d.brand_name?.toLowerCase().includes(lowerSearch) || d.generic_name?.toLowerCase().includes(lowerSearch))).slice(0, 10);
  };

  const checkAllergy = (drugName) => {
      if (!selectedPatient?.allergies) return;
      let allergies = [];
      try { allergies = typeof selectedPatient.allergies === 'string' ? JSON.parse(selectedPatient.allergies) : selectedPatient.allergies; } catch(e) { allergies = [selectedPatient.allergies]; }
      if (Array.isArray(allergies) && allergies.some(a => drugName.toLowerCase().includes(a.toLowerCase()))) setAiAlert(`🚫 CRITICAL: Patient is allergic to ${allergies.join(", ")}!`);
  };

  const addMedicine = () => {
      if (!drugSearch || !duration || !frequency) return alert("Please fill Name, Frequency, and Duration.");
      if (aiAlert) return alert("Cannot add medicine due to Allergy Conflict.");
      setAddedMedicines([...addedMedicines, { name: drugSearch, dosage, frequency, duration }]);
      setDrugSearch(''); setDosage(''); setDuration(''); setFrequency(''); setCheaperAlt(null);
  };

  const removeMedicine = (index) => { setAddedMedicines(addedMedicines.filter((_, i) => i !== index)); };
  const addLabOrder = () => { if(selectedTestOrder && !addedLabOrders.includes(selectedTestOrder)) setAddedLabOrders([...addedLabOrders, selectedTestOrder]); setSelectedTestOrder(''); };
  const removeLabOrder = (test) => { setAddedLabOrders(addedLabOrders.filter(t => t !== test)); };

  const addLabResult = () => {
    if(!labTestName) return alert("Test name required.");

        setAddedResults([
            ...addedResults,
            { test: labTestName, result: labResultValue || '-', range: labRefRange || '-', status: labStatus }
        ]);

        setLabTestName('');
        setLabResultValue('');
        setLabRefRange('');
        setLabStatus('Normal');
    };

  const removeLabResult = (index) => { setAddedResults(addedResults.filter((_, i) => i !== index)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode === 'review') return;
    setLoading(true);

    if (String(selectedPatient.id).startsWith('demo-')) {
        if (isPathologist && addedResults.length === 0) return alert("Please add at least one test result.");
        
        if (isPathologist && selectedPendingRecord) {
            const recIndex = demoHistRef.current.findIndex(r => String(r.id) === String(selectedPendingRecord));
            if(recIndex > -1) demoHistRef.current[recIndex].lab_results = JSON.stringify(addedResults);
        } else if (isPathologist && !selectedPendingRecord) {
            // Walk-in Demo Submit
            demoHistRef.current = [{
                id: `hist_${Date.now()}`,
                patient_id: selectedPatient.id,
                patient_name: selectedPatient.full_name,
                visit_date: new Date().toISOString(),
                diagnosis: 'Pathology Test',
                lab_orders: '',
                lab_results: JSON.stringify(addedResults)
            }, ...demoHistRef.current];
        }

        if (isPathologist) demoPathoQueueRef.current = demoPathoQueueRef.current.filter(a => a.patient_id !== selectedPatient.id);
        else demoApptsRef.current = demoApptsRef.current.filter(a => a.patient_id !== selectedPatient.id);

        alert(isPathologist ? "Lab Results Sent to Doctor!" : "Demo Record Saved!");
        setDiagnosis(''); setAddedMedicines([]); setExpiry(''); setAddedLabOrders([]); setAddedResults([]); setProcedureNote(''); setSelectedPendingRecord('');
        setSelectedPatient(null);
        fetchDashboardData(); 
        setLoading(false);
        return;
    }

    const token = localStorage.getItem('token');
    try {
        if (isPathologist) {
            if(addedResults.length === 0) return alert("Please add at least one test result.");
            await axios.post('http://localhost:5000/api/doctor/upload-lab-result', {
                record_id: selectedPendingRecord, 
                patient_id: selectedPatient.id,
                lab_results: JSON.stringify(addedResults)
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Lab Results Uploaded & Doctor Alerted!");
        } else {
            await axios.post('http://localhost:5000/api/doctor/create-prescription', {
                appointment_id: selectedPatient.appointment_id,   
                patient_id: selectedPatient.id,
                diagnosis,
                prescription: addedMedicines.map(m => `${m.name} ${m.dosage || ''} (${m.frequency}) for ${m.duration}`).join('\n'),
                expiry_date: expiry || new Date().toISOString().split('T')[0],
                lab_orders: addedLabOrders.join(', '),
                procedures: procedureNote,
                follow_up_date: followUp // <--- ADD THIS LINE
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Record Saved Successfully!");
        }

        setSelectedPatient(null);
        setFollowUp(''); // <--- CLEAR IT HERE
        fetchDashboardData();
    } catch(err) { alert("Failed to save."); } 
    finally { setLoading(false); }
  };

  const requestOtp = async () => {
      const token = localStorage.getItem('token');
      try {
          await axios.post('http://localhost:5000/api/doctor/request-access-otp', { patient_id: selectedPatient.id }, { headers: { Authorization: `Bearer ${token}` } });
          setShowOtpInput(true);
      } catch (err) { alert("Failed to send OTP"); }
  };

  const verifyOtp = async () => {
      const token = localStorage.getItem('token');
      try {
          // Send trimmed OTP to prevent trailing spaces causing invalid matches
          const res = await axios.post('http://localhost:5000/api/doctor/verify-access-otp', { 
              patient_id: selectedPatient.id, 
              otp: otp.trim() 
          }, { headers: { Authorization: `Bearer ${token}` } });
          
          setAccessLevel('full');
          // Override the recent_records with the newly fetched full history
          setSelectedPatient(prev => ({ ...prev, recent_records: res.data.history }));
          setShowOtpInput(false);
          alert("Access Granted: Full medical history loaded.");
      } catch (err) { 
          alert("Invalid OTP"); 
      }
  };

  const emergencyOverride = async () => { 
      if(window.confirm("⚠️ EMERGENCY LOG: Auditing Action. Proceed?")) {
          const token = localStorage.getItem('token');
          try {
              const res = await axios.post('http://localhost:5000/api/doctor/emergency-access', { 
                  patient_id: selectedPatient.id, 
                  reason: "Emergency Walk-in" 
              }, { headers: { Authorization: `Bearer ${token}` } });
              
              setAccessLevel('full');
              // Load the full history returned by the emergency route
              setSelectedPatient(prev => ({ ...prev, recent_records: res.data.history }));
              setShowOtpInput(false);
              alert("Emergency Access Granted! The system has logged this and notified the patient.");
          } catch (err) {
              alert("Failed to activate emergency protocol");
          }
      } 
  };

  const renderModal = () => {
    if (!activeModal) return null;

    return (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
             style={{zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}}>

            <div className="bg-white p-4 rounded-4 shadow-lg animate-zoom-in"
                 style={{width: '600px', maxWidth:'95%'}}>

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="m-0 fw-bold doc-text-main">
                        {activeModal === 'reports' && <><FaFlask className="me-2"/>Lab Reports Search</>}
                        {activeModal === 'schedule' && <><FaUserNurse className="me-2"/>Nurse Roster</>}
                        {activeModal === 'todaySchedule' && <><FaCalendarCheck className="me-2"/>Today's Schedule</>}
                    </h5>
                    <button onClick={()=>setActiveModal(null)}
                            className="btn btn-sm btn-light rounded-circle">
                        <FaTimes/>
                    </button>
                </div>

                {/* REPORT SEARCH MODAL */}
                {activeModal === 'reports' && (
                    <>
                        <div className="mb-3">
                            <input className="form-control form-control-sm"
                                   placeholder="Search Patient Name..."
                                   value={reportSearch}
                                   onChange={e=>setReportSearch(e.target.value)} />
                        </div>

                        <div style={{maxHeight:'300px', overflow:'auto'}}>
                            {consultationHistory
                              .filter(r => r.lab_results && r.patient_name.toLowerCase().includes(reportSearch.toLowerCase()))
                              .map((rec, i) => (
                                <div key={i} className="border-bottom pb-2 mb-2">
                                    <strong>{rec.patient_name}</strong>
                                    <small className="text-muted d-block">
                                        {new Date(rec.visit_date).toLocaleDateString()}
                                    </small>
                                </div>
                              ))}
                        </div>
                    </>
                )}

                {/* ROSTER MODAL */}
                {activeModal === 'schedule' && (
                    <div style={{maxHeight:'350px', overflow:'auto'}}>
                        {demoNursesRef.current.map(nurse => (
                            <div key={nurse.id}
                                 className="p-3 mb-3 border rounded-3 bg-light shadow-sm">

                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="fw-bold mb-1">{nurse.name}</h6>
                                        <small className="text-muted">
                                            Ward: {nurse.ward}
                                        </small>
                                    </div>
                                    <span className={`badge ${
                                        nurse.status === "On Duty"
                                            ? "bg-success"
                                            : nurse.status === "On Call"
                                            ? "bg-warning text-dark"
                                            : "bg-secondary"
                                    }`}>
                                        {nurse.status}
                                    </span>
                                </div>

                                <div className="mt-2 small text-muted">
                                    Shift: {nurse.shift}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TODAY DOCTOR SCHEDULE */}
                {activeModal === 'todaySchedule' && (
                    <div style={{maxHeight:'350px', overflow:'auto'}}>
                        {demoTodayScheduleRef.current.map((item, idx) => (
                            <div key={idx}
                                className="p-3 mb-3 border rounded-3 bg-light shadow-sm">

                                <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="fw-bold mb-1">{item.task}</h6>
                                    <span className="badge bg-primary">{item.time}</span>
                                </div>

                                <div className="small text-muted mt-2">
                                    Location: {item.location}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

  const pendingLabRecords = selectedPatient?.recent_records?.filter(r => r.lab_orders && !r.lab_results) || [];

  return (
    <div className="doc-theme-bg container-fluid p-0 d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* ----------------- DYNAMIC SIDEBAR ----------------- */}
      <div className="doc-sidebar d-flex flex-column border-end shadow-sm flex-shrink-0 bg-white" 
           style={{ width: '340px', marginLeft: showSidebar ? '0px' : '-340px', transition: 'margin-left 0.3s ease', zIndex: 10, height: '100vh', overflow: 'hidden'}}>
        
        <div className="p-4 doc-sidebar-header text-white">
            <div className="d-flex align-items-center gap-2 mb-4">
                {isPathologist ? <FaMicroscope size={22}/> : <FaStethoscope size={22}/>}
                <h5 className="m-0 fw-bold">{isPathologist ? 'Pathology Hub' : 'Doctor Console'}</h5>
            </div>
            <h6 className="small opacity-75 mb-1">Welcome, {doctorName}</h6>
            <small className="d-block text-white opacity-50 mb-3" style={{fontSize:'11px'}}>{department} Department</small>
            
            <button onClick={() => setScanMode(true)} className="btn btn-light w-100 fw-bold text-primary shadow-lg d-flex align-items-center justify-content-center gap-2 py-3 rounded-pill border-0">
                <FaQrcode size={18}/> SCAN PATIENT ID
            </button>
        </div>
        
        <div className="d-flex border-bottom bg-white">
            <button onClick={()=>setActiveTab('queue')} className={`flex-fill btn rounded-0 py-3 small fw-bold ${activeTab==='queue' ? 'doc-tab-active' : 'text-muted'}`}>
                {isPathologist ? 'PENDING TESTS' : 'ACTIVE QUEUE'}
            </button>
            <button onClick={()=>setActiveTab('history')} className={`flex-fill btn rounded-0 py-3 small fw-bold ${activeTab==='history' ? 'doc-tab-active' : 'text-muted'}`}>
                {isPathologist ? 'COMPLETED' : 'HISTORY'}
            </button>
        </div>

        {activeTab === 'history' && (
            <div className="p-2 bg-light border-bottom">
                <div className="input-group input-group-sm">
                    <span className="input-group-text border-0 bg-transparent"><FaSearch className="text-muted"/></span>
                    <input type="text" className="form-control border-0 bg-transparent" placeholder="Search history..." value={historySearch} onChange={(e)=>setHistorySearch(e.target.value)}/>
                </div>
            </div>
        )}

        <div className="flex-grow-1 overflow-auto doc-list-bg">
            {activeTab === 'queue' ? (
                appointments.length > 0 ? appointments.map((appt, i) => (
                    <div key={appt.id} onClick={() => loadPatientContext(appt, 'new')}
                         className={`p-3 border-bottom cursor-pointer doc-item ${selectedPatient?.id === appt.patient_id ? 'doc-item-active' : ''}`}>
                        <div className="d-flex justify-content-between mb-1">
                            <span className="badge bg-primary rounded-pill px-2">#{i+1}</span>
                            <small className="fw-bold doc-text-primary">{appt.appointment_time || 'Pending'}</small>
                        </div>
                        <h6 className="m-0 text-truncate fw-bold doc-text-main mt-1">{appt.patient_name}</h6>
                        {isPathologist ? (
                            <small className="text-danger fw-bold"><FaVial className="me-1"/>{appt.lab_orders}</small>
                        ) : (
                            <small className="text-muted">Token: #{appt.token_number || (i+1)}</small>
                        )}
                    </div>
                )) : <div className="p-5 text-center text-muted small">{isPathologist ? 'No pending lab orders.' : 'No pending patients.'}</div>
            ) : (
                filteredHistory.map(rec => (
                    <div key={rec.id} onClick={() => loadPatientContext(rec.unique_lifeline_id || rec.patient_id, 'review', rec)} className="p-3 border-bottom doc-item cursor-pointer hover-bg">
                        <div className="d-flex justify-content-between mb-1">
                            <small className="fw-bold doc-text-primary">{new Date(rec.visit_date).toLocaleDateString()}</small>
                            <small className="badge bg-secondary bg-opacity-10 text-secondary">Review</small>
                        </div>
                        <h6 className="m-0 small fw-bold doc-text-main">{rec.patient_name}</h6>
                        <small className="text-muted d-block text-truncate fst-italic">{isPathologist ? 'Lab Results Uploaded' : rec.diagnosis}</small>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* ----------------- DYNAMIC MAIN CONTENT ----------------- */}
      <div className="flex-grow-1 position-relative d-flex flex-column doc-main-bg">
        {scanMode && (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 100, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)'}}>
                <div className="bg-white rounded-5 shadow-2xl position-relative overflow-hidden" style={{width: '450px', maxWidth: '90%'}}>
                    <div className="d-flex justify-content-between align-items-center p-3 px-4 bg-light border-bottom">
                        <span className="badge bg-danger animate-pulse"><FaCircle size={8}/> LIVE</span>
                        <button onClick={() => setScanMode(false)} className="btn btn-sm btn-outline-dark rounded-circle p-2 border-0"><FaTimes size={18}/></button>
                    </div>
                    <div className="position-relative bg-black" style={{height: '350px'}}>
                        <div id="reader" style={{width: '100%', height: '100%'}}></div>
                        <div className="scan-line"></div>
                    </div>
                </div>
            </div>
        )}
        {renderModal()}

        {!selectedPatient ? (
            <div className="p-5 h-100 overflow-auto">
                <div className="d-flex align-items-end justify-content-between mb-5">
                    <div>
                        <h2 className="fw-bold doc-text-main m-0">
                            {isPathologist ? `Welcome to the Lab, ${doctorName}` : `Good Afternoon, ${doctorName}`}
                        </h2>
                        <p className="text-muted m-0">{new Date().toDateString()} &bull; <span className="text-success fw-bold">Online</span></p>
                    </div>
                    <div className="d-flex gap-4 text-center">
                        <div><h3 className="fw-bold m-0 doc-text-primary">{stats.total}</h3><small className="text-muted small fw-bold">{isPathologist ? 'ALL ORDERS' : 'TOTAL'}</small></div>
                        <div className="vr opacity-25"></div>
                        <div><h3 className="fw-bold m-0 text-warning">{stats.pending}</h3><small className="text-muted small fw-bold">PENDING</small></div>
                        <div className="vr opacity-25"></div>
                        <div><h3 className="fw-bold m-0 text-success">{stats.completed}</h3><small className="text-muted small fw-bold">PROCESSED</small></div>
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-md-8">
                        <div className="doc-card border-0 shadow-sm p-5 rounded-4 d-flex align-items-center justify-content-between">
                            <div>
                                <h4 className="fw-bold doc-text-main mb-2">
                                    {isPathologist ? 'Ready to Process Tests?' : 'Ready to Consult?'}
                                </h4>
                                <p className="text-muted mb-4">
                                    {isPathologist ? 'Scan patient health ID or select a pending lab order from the queue to enter results.' : 'Scan patient health ID or select from the queue to begin.'}
                                </p>
                                <button onClick={()=>setScanMode(true)} className="btn btn-primary px-4 rounded-pill fw-bold hover-scale"><FaQrcode className="me-2"/> Launch Scanner</button>
                            </div>
                            <div className="opacity-25 d-none d-md-block">
                                {isPathologist ? <FaMicroscope size={120} className="text-primary"/> : <FaUserInjured size={120} className="text-primary"/>}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="doc-card border-0 shadow-sm p-4 rounded-4 h-100">
                            <h6 className="fw-bold text-muted mb-3 small">QUICK ACTIONS</h6>
                            <div className="d-grid gap-2">
                                <button onClick={()=>setShowSidebar(!showSidebar)} className="btn btn-light w-100 text-start d-flex align-items-center gap-3 p-3 rounded-3 border-0">
                                    <div className="bg-primary text-white p-2 rounded-circle"><FaListUl/></div>
                                    <div><strong className="d-block text-dark small">{isPathologist ? 'Pending Orders' : 'Queues'}</strong><small className="text-muted small">{showSidebar ? 'Close' : 'Open'} list</small></div>
                                </button>
                                <div className="d-flex gap-2">
                                    <button onClick={()=>setActiveModal('todaySchedule')} className="btn btn-light w-100 text-center p-2 rounded-3 small fw-bold text-muted border-0">
                                        <FaCalendarCheck className="mb-1 d-block mx-auto text-primary"/>Schedule
                                    </button>

                                    {/* KEEP THIS ROSTER BUTTON UNCHANGED */}
                                    <button onClick={()=>setActiveModal('schedule')} className="btn btn-light w-100 text-center p-2 rounded-3 small fw-bold text-muted border-0">
                                        <FaUserNurse className="mb-1 d-block mx-auto text-warning"/>Roster
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="d-flex flex-column h-100">
                <div className="doc-header border-bottom p-3 px-4 d-flex align-items-center justify-content-between shadow-sm bg-white">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width:'45px', height:'45px', fontSize:'18px'}}>{selectedPatient?.full_name?.charAt(0)}</div>
                        <div>
                            <h5 className="m-0 fw-bold doc-text-main">{selectedPatient?.full_name} {viewMode === 'review' && <span className="badge bg-secondary ms-2 text-white" style={{fontSize:'12px'}}>REVIEW MODE</span>}</h5>
                            <div className="d-flex gap-3 small text-muted">
                                <span>{selectedPatient.age} Yrs</span><span>{selectedPatient.blood_group}</span>
                                {selectedPatient.allergies && <span className="text-danger fw-bold"><FaExclamationTriangle/> {selectedPatient.allergies}</span>}
                            </div>
                        </div>
                    </div>
                   <button onClick={()=>{
    setSelectedPatient(null); setAlreadyInQueue(false);}} className="btn btn-outline-danger btn-sm px-3 rounded-pill fw-bold">Close Case</button>
                </div>

                <div className="flex-grow-1 p-4 overflow-auto row g-4 m-0">
                    <div className="col-lg-8">
                        <div className="doc-card border-0 shadow-sm p-4 rounded-4 h-100 bg-white">
                            <h6 className="fw-bold text-primary mb-4 d-flex align-items-center">
                                {viewMode === 'review' ? <><FaHistory className="me-2"/> MEDICAL RECORD</> : (isPathologist ? <><FaFlask className="me-2"/>LAB ENTRY SYSTEM</> : <><FaPills className="me-2"/>CONSULTATION & RX</>)}
                            </h6>
                            
                            {viewMode === 'review' ? (
                                // --- REVIEW MODE READ-ONLY UI ---
                                <div className="bg-light p-4 rounded-4 border">
                                    <div className="mb-4">
                                        <label className="small fw-bold text-muted d-block mb-1">DIAGNOSIS</label>
                                        <h5 className="fw-bold text-dark m-0">{selectedRecord?.diagnosis || 'N/A'}</h5>
                                    </div>

                                    {selectedRecord?.prescription && (
                                        <div className="mb-4 border-top pt-3">
                                            <label className="small fw-bold text-muted d-block mb-2"><FaPills className="me-1"/> PRESCRIBED MEDICINES</label>
                                            <div className="p-3 bg-white border rounded-3 text-dark font-monospace" style={{whiteSpace: 'pre-wrap'}}>
                                                {selectedRecord.prescription}
                                            </div>
                                        </div>
                                    )}

                                    {selectedRecord?.lab_orders && (
                                        <div className="mb-4 border-top pt-3">
                                            <label className="small fw-bold text-muted d-block mb-2"><FaFlask className="me-1"/> LAB TESTS ORDERED</label>
                                            <div className="d-flex flex-wrap gap-2">
                                                {selectedRecord.lab_orders.split(',').map((test, idx) => (
                                                    <span key={idx} className="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2 rounded-pill">
                                                        {test.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedRecord?.procedures && (
                                        <div className="mb-4 border-top pt-3">
                                            <label className="small fw-bold text-muted d-block mb-2"><FaCut className="me-1"/> PROCEDURE / CLINICAL NOTES</label>
                                            <div className="p-3 bg-white border rounded-3 text-dark">
                                                {selectedRecord.procedures}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Pathologist specific view inside history */}
                                    {selectedRecord?.lab_results && (
                                        <div className="mb-4 border-top pt-3">
                                            <label className="small fw-bold text-muted d-block mb-2"><FaVial className="me-1"/> LAB RESULTS</label>
                                            <div className="table-responsive bg-white rounded-3 border">
                                                <table className="table table-sm m-0 align-middle">
                                                    <thead className="bg-light"><tr><th className="ps-3">Test</th><th>Result</th><th>Range</th><th>Status</th></tr></thead>
                                                    <tbody>
                                                        {(() => {
                                                            try {
                                                                let results = selectedRecord.lab_results;
                                                                if (typeof results === 'string') results = JSON.parse(results);
                                                                if (Array.isArray(results)) {
                                                                    return results.map((r, i) => (
                                                                        <tr key={i}>
                                                                            <td className="ps-3">{r.test}</td>
                                                                            <td className="fw-bold">{r.result}</td>
                                                                            <td className="small text-muted">{r.range}</td>
                                                                            <td className={r.status === 'Abnormal' ? 'text-danger fw-bold' : 'text-success fw-bold'}>{r.status}</td>
                                                                        </tr>
                                                                    ));
                                                                } else {
                                                                    return <tr><td colSpan="4" className="ps-3 text-muted fst-italic">{String(selectedRecord.lab_results)}</td></tr>;
                                                                }
                                                            } catch (e) {
                                                                return <tr><td colSpan="4" className="ps-3 text-muted fst-italic">{String(selectedRecord.lab_results)}</td></tr>;
                                                            }
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // --- EDIT MODE ---
                                <form onSubmit={handleSubmit}>
                                    {isPathologist ? (
                                        <>
                                            <div className="mb-4 p-3 bg-light rounded-3 border">
                                                <label className="small fw-bold text-primary mb-2">FULFILL PENDING LAB ORDERS</label>
                                                <select className="form-select mb-3 border-primary" value={selectedPendingRecord} onChange={handlePendingRecordChange}>
                                                    <option value="">-- Direct Walk-in (No prior order) --</option>
                                                    {pendingLabRecords.map(r => (
                                                        <option key={r.id} value={r.id}>Prescribed on {new Date(r.visit_date).toLocaleDateString()} : {r.lab_orders}</option>
                                                    ))}
                                                </select>

                                                <div className="row g-2 align-items-end">
                                                   <div className="col-md-3">
                                                    <label className="small text-muted mb-1">Test Name</label>

                                                    {pendingLabRecords.length > 0 && selectedPendingRecord && (
                                                        pendingLabRecords
                                                            .find(r => String(r.id) === String(selectedPendingRecord))
                                                            ?.lab_orders.split(',')
                                                            .map((test, idx) => (
                                                                <div key={idx} className="mb-2">
                                                                    <button
                                                                        type="button"
                                                                        className={`btn w-100 text-start ${
                                                                            labTestName === test.trim()
                                                                                ? 'btn-primary'
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                        onClick={() => setLabTestName(test.trim())}
                                                                    >
                                                                        {test.trim()}
                                                                    </button>
                                                                </div>
                                                            ))
                                                    )}

                                                    {/* 🔽 ADD THIS PART HERE */}
                                                    <hr/>

                                                    <label className="small fw-bold text-muted mt-2">
                                                        Manual Test Entry
                                                    </label>

                                                    <input
                                                        className="form-control"
                                                        placeholder="Type test name manually"
                                                        value={labTestName}
                                                        onChange={(e)=>setLabTestName(e.target.value)}
                                                    />
                                                </div>
                                                    <div className="col-md-3">
                                                        <label className="small text-muted mb-1">Result</label>
                                                        <input className="form-control" placeholder="e.g. 14.5 g/dL" value={labResultValue} onChange={e=>setLabResultValue(e.target.value)} />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="small text-muted mb-1">Ref Range</label>
                                                        <input className="form-control" placeholder="e.g. 13-17" value={labRefRange} onChange={e=>setLabRefRange(e.target.value)} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="small text-muted mb-1">Status</label>
                                                        <select className="form-select" value={labStatus} onChange={e=>setLabStatus(e.target.value)}>
                                                            <option value="Normal">Normal</option>
                                                            <option value="Abnormal">Abnormal</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-1">
                                                        <button type="button" onClick={addLabResult} className="btn btn-primary w-100"><FaPlus/></button>
                                                    </div>
                                                </div>
                                            </div>

                                            {addedResults.length > 0 && (
                                                <table className="table table-sm table-bordered mt-3">
                                                    <thead><tr className="bg-light"><th>Test</th><th>Result</th><th>Range</th><th>Status</th><th></th></tr></thead>
                                                    <tbody>
                                                        {addedResults.map((r,i)=>(
                                                            <tr key={i}>
                                                                <td>{r.test}</td><td className="fw-bold">{r.result}</td><td className="text-muted small">{r.range}</td>
                                                                <td className={r.status==='Abnormal'?'text-danger fw-bold':'text-success fw-bold'}>{r.status}</td>
                                                                <td className="text-center"><FaTrash className="text-danger cursor-pointer" onClick={()=>removeLabResult(i)}/></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                            {/* ADD TO LAB QUEUE BUTTON */}
                                            {!alreadyInQueue && (
                                            <button
                                                type="button"
                                                className="btn btn-warning w-100 py-2 fw-bold mb-2"
                                                onClick={async () => {
                                                    try {
                                                        const token = localStorage.getItem('token');

                                                        await axios.post(
                                                            'http://localhost:5000/api/doctor/add-to-lab-queue',
                                                            { patient_id: selectedPatient.id },
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );

                                                        alert("Patient added to lab queue successfully!");

                                                        setAlreadyInQueue(true);   // 🔥 hides button instantly
                                                        fetchDashboardData();      // refresh sidebar queue

                                                    } catch (err) {
                                                        alert("Failed to add patient to queue");
                                                    }
                                                }}
                                            >
                                                🧪 ADD TO LAB QUEUE
                                            </button>
                                        )}
                                            <button className="btn btn-dark w-100 mt-4 py-3 fw-bold"><FaFileUpload className="me-2"/> SUBMIT FINAL RESULTS</button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="mb-4">
                                                <label className="small fw-bold text-muted mb-1">DIAGNOSIS</label>
                                                <input list="diagnoses" className="form-control doc-input p-3" value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} required />
                                                <datalist id="diagnoses">{commonDiagnoses.map((d,i)=><option key={i} value={d}/>)}</datalist>
                                            </div>

                                            <div className="mb-4 p-3 bg-light rounded-3">
                                                <label className="small fw-bold text-primary mb-2">ADD MEDICINES</label>
                                                <div className="row g-2">
                                                    <div className="col-md-5 position-relative">
                                                        <input className="form-control" placeholder="Search Drug..." value={drugSearch} onChange={handleDrugSearch} />
                                                        {showDrugSuggestions && (
                                                            <ul className="list-group position-absolute w-100 shadow-sm" style={{zIndex:100}}>
                                                                {getFilteredDrugs().map(d=><li key={d.id} className="list-group-item list-group-item-action small cursor-pointer" onClick={()=>selectDrug(d)}><strong>{d.brand_name}</strong> - ₹{d.price_inr}</li>)}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <div className="col-md-3"><input list="freqs" className="form-control" placeholder="Freq" value={frequency} onChange={e=>setFrequency(e.target.value)} /></div>
                                                    <div className="col-md-2"><input className="form-control" placeholder="Days" value={duration} onChange={e=>setDuration(e.target.value)} /></div>
                                                    <div className="col-md-2"><button type="button" onClick={addMedicine} className="btn btn-dark w-100"><FaPlus/></button></div>
                                                </div>
                                            </div>

                                            {addedMedicines.length > 0 && (
                                                <table className="table table-sm table-bordered mt-3">
                                                    <thead><tr className="bg-light"><th>Medicine</th><th>Freq</th><th>Days</th><th></th></tr></thead>
                                                    <tbody>{addedMedicines.map((m,i)=><tr key={i}><td>{m.name}</td><td>{m.frequency}</td><td>{m.duration}</td><td className="text-center"><FaTrash className="text-danger cursor-pointer" onClick={()=>removeMedicine(i)}/></td></tr>)}</tbody>
                                                </table>
                                            )}

                                            <div className="mb-4 pt-3 border-top">
                                                <label className="small fw-bold text-dark mb-2"><FaFlask className="me-1"/>PRESCRIBE LAB TESTS</label>
                                                <div className="input-group mb-2">
                                                    <select className="form-select border-primary bg-light" value={selectedTestOrder} onChange={e=>setSelectedTestOrder(e.target.value)}>
                                                        <option value="">Select test to order...</option>
                                                        {labTestOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <button type="button" className="btn btn-primary" onClick={addLabOrder}><FaPlus/></button>
                                                </div>
                                                {addedLabOrders.length > 0 && (
                                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                                        {addedLabOrders.map((t, i) => (
                                                            <span key={i} className="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1">
                                                                {t} <FaTimes className="ms-1 cursor-pointer" onClick={()=>removeLabOrder(t)}/>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <label className="small fw-bold text-dark mb-1 mt-3"><FaCut className="me-1"/>PROCEDURE NOTES</label>
                                                <textarea className="form-control" rows="2" placeholder="Surgery/Procedure details..." value={procedureNote} onChange={e=>setProcedureNote(e.target.value)}></textarea>
                                            </div>

                                            <div className="row pt-3 border-top">
                                            <div className="col-md-4">
                                                <label className="small fw-bold text-danger">QR EXPIRY</label>
                                                <input type="date" className="form-control" value={expiry} onChange={e=>setExpiry(e.target.value)} required />
                                            </div>
                                            
                                            {/* --- ADD THIS NEW COLUMN FOR FOLLOW UP --- */}
                                            <div className="col-md-4">
                                                <label className="small fw-bold text-info">FOLLOW-UP DATE</label>
                                                <input type="date" className="form-control border-info" value={followUp} onChange={e=>setFollowUp(e.target.value)} />
                                            </div>
                                            {/* ----------------------------------------- */}

                                            <div className="col-md-4 text-end d-flex align-items-end justify-content-end">
                                                <button className="btn btn-primary px-5 rounded-pill fw-bold w-100"><FaSave className="me-2"/> SIGN & SAVE</button>
                                            </div>
                                        </div>
                                        </>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="doc-card border-0 shadow-sm p-4 rounded-4 h-100 bg-white">
                            <h6 className="fw-bold text-muted small mb-3">ACCESS & PROFILE</h6>
                            {viewMode === 'new' && !isPathologist && (
                                <div className="d-grid gap-2">
                                    {accessLevel === 'basic' ? (
                                        <>
                                            <button onClick={requestOtp} className="btn btn-outline-primary btn-sm rounded-pill">Request Full History OTP</button>
                                            {showOtpInput && (
                                                <div className="d-flex gap-2">
                                                    <input className="form-control form-control-sm doc-input" placeholder="Enter OTP" value={otp} onChange={e=>setOtp(e.target.value)}/>
                                                    <button className="btn btn-primary btn-sm rounded-circle" onClick={verifyOtp}><FaChevronRight/></button>
                                                </div>
                                            )}
                                            <button onClick={emergencyOverride} className="btn btn-danger btn-sm rounded-pill">⚠ Emergency Override</button>
                                        </>
                                    ) : (
                                        <div className="d-grid gap-2">
                                            <div className="alert alert-success small text-center mb-0 p-2 border-success border">
                                                🔓 Full Medical History Unlocked
                                            </div>
                                            <button onClick={() => setShowFullRecords(true)} className="btn btn-primary btn-sm rounded-pill fw-bold">
                                                <FaFileMedicalAlt className="me-2" /> View Medical Records
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-3 bg-light rounded-3 mt-4 border">
                                <div className="d-flex justify-content-between small mb-1"><span>Blood:</span><span className="fw-bold">{selectedPatient?.blood_group || '--'}</span></div>
                                <div className="d-flex justify-content-between small mb-1"><span>Emergency:</span><span className="fw-bold">{selectedPatient?.emergency_contact || '--'}</span></div>
                            </div>
                            
                            {viewMode === 'new' && !isPathologist && (
                                <>
                                    <h6 className="fw-bold text-muted small mt-4 mb-3">RECENT HISTORY</h6>
                                    <div className="overflow-auto" style={{maxHeight:'250px'}}>
                                        {selectedPatient?.recent_records?.map((r,i)=>(
                                            <div key={i} className="p-2 mb-2 rounded border-start border-4 border-info bg-light">
                                                <div className="fw-bold small">{r.diagnosis}</div>
                                                {r.lab_orders && <div className="small text-primary mt-1"><FaVial className="me-1"/>Ordered: {r.lab_orders}</div>}
                                                {r.procedures && <div className="small text-danger mt-1"><FaCut className="me-1"/>{r.procedures}</div>}
                                                <small className="text-muted d-block mt-1">{new Date(r.visit_date).toLocaleDateString()}</small>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* NEW OVERLAY TO SHOW PATIENT RECORDS */}
        {showFullRecords && (
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-white" style={{zIndex: 1050, overflow: 'auto'}}>
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light shadow-sm sticky-top">
                    <h5 className="m-0 fw-bold doc-text-main"><FaFileMedicalAlt className="me-2 text-primary"/> Patient Records: {selectedPatient?.full_name}</h5>
                    <button onClick={() => setShowFullRecords(false)} className="btn btn-danger btn-sm rounded-pill px-4 fw-bold">Close Records</button>
                </div>
                {/* Mount MyRecords in Doctor Mode and pass patient history */}
                <MyRecords isDoctorView={true} overrideRecords={selectedPatient?.recent_records} patientName={selectedPatient?.full_name} />
            </div>
        )}

      </div>

      <datalist id="labtests">
          {labTestOptions.map((t,i) => <option key={i} value={t} />)}
      </datalist>

      <style>{`
        .scan-line {
        position: absolute;
        width: 100%;
        height: 3px;
        background: #00ffcc;
        animation: scanMove 2s linear infinite;
        }

        @keyframes scanMove {
        0% { top: 0; }
        50% { top: 90%; }
        100% { top: 0; }
        }
        .cursor-pointer { cursor: pointer; }
        .doc-sidebar-header { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); }
        .doc-tab-active { color: #0ea5e9; border-bottom: 3px solid #0ea5e9 !important; background: #f8fafc; }
        .doc-item-active { background-color: rgba(14, 165, 233, 0.1); border-left: 4px solid #0ea5e9 !important; }
        .animate-zoom-in { animation: zoomIn 0.3s ease-out; }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        :root { --doc-bg: #f8fafc; --doc-text-main: #0f172a; --doc-primary: #0ea5e9; }
        .doc-theme-bg { background-color: var(--doc-bg); }
      `}</style>
    </div>
  );
}

export default DoctorDashboard;