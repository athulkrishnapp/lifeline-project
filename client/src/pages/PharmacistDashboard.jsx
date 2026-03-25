import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode'; 
import { 
    FaQrcode, FaPills, FaCheckCircle, FaMoneyBillWave, 
    FaBoxes, FaHistory, FaTimes, FaSearch, FaPlus, 
    FaStore, FaExclamationCircle, FaUserInjured, FaStethoscope,
    FaCircle, FaSave, FaShoppingCart, FaFingerprint
} from 'react-icons/fa';

function PharmacistDashboard() {
  const [showSidebar, setShowSidebar] = useState(true); 
  const [activeTab, setActiveTab] = useState('dispense'); 
  const [dispensedMeds, setDispensedMeds] = useState([]);

  // --- PHARMACY PROFILE ---
  const [pharmacistName, setPharmacistName] = useState("Loading...");
  const [shopName, setShopName] = useState("Loading..."); 

  // --- INVENTORY STATES ---
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  
  // --- HISTORY SEARCH STATE (For Main Screen) ---
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Modal States for Inventory
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', generic: '', category: 'Tablet', price: '', stock: '' });

  // --- DEMO HISTORY DATA ---
  const initialDemoHistory = [
      { patient_name: "Rahul Sharma", medicine_name: "Paracetamol 650", prescription_id: 45, dispensed_at: "2026-02-24T10:15:00" },
      { patient_name: "Priya Patel", medicine_name: "Amoxicillin 500", prescription_id: 45, dispensed_at: "2026-02-24T10:16:00" },
      { patient_name: "Amit Kumar", medicine_name: "Pantoprazole 40", prescription_id: 46, dispensed_at: "2026-02-23T09:05:00" },
      { patient_name: "Neha Gupta", medicine_name: "Vitamin C 500", prescription_id: 46, dispensed_at: "2026-02-22T09:07:00" },
  ];
  const [dispenseHistory, setDispenseHistory] = useState(initialDemoHistory);
  
  // --- SCANNER & PRESCRIPTION STATE ---
  const [scanMode, setScanMode] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [selectedMeds, setSelectedMeds] = useState({});
  const [drugDB, setDrugDB] = useState([]);
  const scannerRef = useRef(null);
  
  // Fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios.get('http://localhost:5000/api/drugs').then(res => setDrugDB(res.data)).catch(console.error);

    axios.get('http://localhost:5000/api/profile', { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
        setPharmacistName(res.data.full_name || "Pharmacist");
        setShopName(res.data.shop_name || "Pharmacy");
    }).catch(console.error);
    
    fetchHistory(token);
    fetchInventory(token);
  }, []);

  const fetchHistory = (token) => {
      axios.get('http://localhost:5000/api/pharmacist/history', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setDispenseHistory([...res.data, ...initialDemoHistory]))
      .catch(console.error);
  };

  const fetchInventory = (token) => {
      axios.get('http://localhost:5000/api/pharmacist/inventory', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setInventory(res.data))
      .catch(console.error);
  };

  // --- INVENTORY MANAGEMENT FUNCTIONS ---
  const handleAddItem = async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      try {
          await axios.post('http://localhost:5000/api/pharmacist/inventory', newItem, { headers: { Authorization: `Bearer ${token}` } });
          fetchInventory(token);
          setShowAddModal(false);
          setNewItem({ name: '', generic: '', category: 'Tablet', price: '', stock: '' });
      } catch (err) { alert("Failed to add item."); }
  };

  const handleUpdateItem = async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      try {
          await axios.put(`http://localhost:5000/api/pharmacist/inventory/${editItem.id}`, { price: editItem.price, stock: editItem.stock }, { headers: { Authorization: `Bearer ${token}` } });
          fetchInventory(token);
          setShowUpdateModal(false);
          setEditItem(null);
      } catch (err) { alert("Failed to update item."); }
  };

  // --- QR SCANNER LOGIC ---
  useEffect(() => {
    let html5QrCode;
    if (scanMode) {
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 320, height: 320 } },
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
        ).catch(err => {
            alert("Camera Error. Check permissions.");
            setScanMode(false);
        });
    }
    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(console.error);
        }
    };
  }, [scanMode]);

const handleScanSuccess = async (decodedText) => {
    if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
    }
    setScanMode(false);

    // ⭐ ADD THESE 3 LINES: Clear old data to prevent UI ghosting
    setPrescription(null);
    setDispensedMeds([]);
    setSelectedMeds({});

    try {
        const token = localStorage.getItem('token');
        let prescriptionId = decodedText;
        if (decodedText.startsWith('{')) {
            const parsed = JSON.parse(decodedText);
            prescriptionId = parsed.rx_id;
        }

        const res = await axios.get(`http://localhost:5000/api/pharmacist/get-prescription/${prescriptionId}`, { headers: { Authorization: `Bearer ${token}` } });
        setPrescription(res.data);
        setActiveTab('dispense');

        axios.get(`http://localhost:5000/api/pharmacist/dispense-status/${prescriptionId}`, { headers:{ Authorization: `Bearer ${token}` } })
        .then(r=> setDispensedMeds(r.data)).catch(()=>{});
    } catch (err) {
        alert("Prescription not found or expired");
    }
  };

  // --- DISPENSING MATCH LOGIC ---
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const matchInventory = (medName) => {
    if (!drugDB.length && inventory.length === 0) return { status: 'unknown', available: null, matches: [] };
    const normalizedInput = normalize(medName);

    // 1. Direct Inventory Match
    const directMatches = inventory.filter(item => item.medicine_name && normalize(item.medicine_name).includes(normalizedInput));
    if (directMatches.length > 0) {
        return { status: 'in_stock', matches: directMatches, available: directMatches[0] };
    }

    // 2. Generic Match
    const drug = drugDB.find(d => normalize(d.brand_name).includes(normalizedInput) || normalize(d.generic_name).includes(normalizedInput));
    if (!drug) return { status: 'unknown', available: null, matches: [] };

    const generic = normalize(drug.generic_name);
    const storeMatches = inventory.filter(item => item.generic_name && (normalize(item.generic_name).includes(generic) || generic.includes(normalize(item.generic_name))));
    
    if (storeMatches.length === 0) return { status: 'unknown', matches: inventory, available: null };

    const sorted = [...storeMatches].sort((a, b) => a.price - b.price);
    const availableItem = sorted.find(i => i.stock > 0) || null;

    return { status: availableItem ? 'in_stock' : 'out_of_stock', matches: sorted, available: availableItem };
  };

  const handleDispense = async () => {
    try {
        const token = localStorage.getItem('token');
        let totalBill = 0;

        for (let index = 0; index < prescription.medicines.length; index++) {
            const med = prescription.medicines[index];
            const chosenMed = selectedMeds[index];

            if (!chosenMed) continue;

            await axios.post('http://localhost:5000/api/pharmacist/dispense-medicine',{
                prescription_id: prescription.id,
                medicine_name: chosenMed.medicine_name || chosenMed.name, 
                quantity: chosenMed.qty
            }, { headers:{Authorization:`Bearer ${token}`} });
            
            totalBill += chosenMed.price * chosenMed.qty;
        }

        alert(`✅ Prescription Dispensed Successfully!\nTotal Bill: ₹${totalBill}`);

        fetchInventory(token);
        fetchHistory(token);
        const res = await axios.get(`http://localhost:5000/api/pharmacist/dispense-status/${prescription.id}`, { headers: { Authorization: `Bearer ${token}` } });
        setDispensedMeds(res.data);
        setSelectedMeds({});
        setPrescription({ ...prescription });

    } catch (err) {
        alert(err.response?.data?.error || "Dispense failed. Check inventory stock.");
    }
  };

  let grandTotal = 0;
  const perMedTotals = prescription?.medicines?.map((med, i) => {
    const selected = selectedMeds[i];
    if (!selected || !selected.qty) return 0;
    const total = selected.price * selected.qty;
    grandTotal += total;
    return total;
  }) || [];

  return (
    <div className="theme-bg container-fluid p-0 d-flex transition-all" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* ----------------- SIDEBAR ----------------- */}
      <div className="theme-card d-flex flex-column border-end theme-border shadow-sm flex-shrink-0 transition-all" 
           style={{ width: '340px', marginLeft: showSidebar ? '0px' : '-340px', zIndex: 10, height: '100vh', overflow: 'hidden'}}>
        
        <div className="p-4 text-white" style={{background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)'}}>
            <div className="d-flex align-items-center gap-2 mb-4">
                <FaStore size={22}/>
                <h5 className="m-0 fw-bold">Pharmacy Console</h5>
            </div>
            <h6 className="small opacity-75 mb-1">{pharmacistName}</h6>
            <h4 className="fw-bold m-0 text-truncate">{shopName}</h4>
            
            <button onClick={() => setScanMode(true)} className="btn btn-light w-100 fw-bold text-success shadow-lg d-flex align-items-center justify-content-center gap-2 py-3 rounded-pill border-0 mt-4 interactive-btn">
                <FaQrcode size={18}/> SCAN E-PRESCRIPTION
            </button>
        </div>
        
        <div className="d-flex border-bottom theme-border theme-card">
            <button onClick={()=>setActiveTab('dispense')} className={`flex-fill btn rounded-0 py-3 small fw-bold transition-all ${activeTab==='dispense' ? 'pharma-tab-active' : 'theme-text-muted'}`}>DISPENSE</button>
            <button onClick={()=>setActiveTab('inventory')} className={`flex-fill btn rounded-0 py-3 small fw-bold transition-all ${activeTab==='inventory' ? 'pharma-tab-active' : 'theme-text-muted'}`}>INVENTORY</button>
            <button onClick={()=>setActiveTab('history')} className={`flex-fill btn rounded-0 py-3 small fw-bold transition-all ${activeTab==='history' ? 'pharma-tab-active' : 'theme-text-muted'}`}>HISTORY</button>
        </div>

        <div className="flex-grow-1 overflow-auto theme-bg-light p-3 transition-all">
            {activeTab === 'inventory' && (
                <div className="alert alert-warning small border-warning shadow-sm rounded-3">
                    <strong>Low Stock Alerts:</strong>
                    <ul className="mb-0 mt-2 ps-3">
                        {inventory.length === 0 ? <li className="theme-text-muted">No stock data available</li> : null}
                        {inventory.filter(i => i.stock < 50).map(i => <li key={i.id} className="text-dark">{i.medicine_name} ({i.stock} left)</li>)}
                    </ul>
                </div>
            )}
            
            {/* Sidebar History List */}
            {activeTab === 'history' && dispenseHistory.length === 0 && (
                <div className="text-center theme-text-muted small p-4">No recent dispensations.</div>
            )}
            {activeTab === 'history' && dispenseHistory.map((h, i) => (
            <div key={i} className="p-3 mb-2 theme-card rounded-3 shadow-sm border theme-border hover-lift transition-all">
                <div className="d-flex justify-content-between mb-1">
                    <span className="fw-bold small theme-text">{h.patient_name}</span>
                    <span className="text-success small text-truncate fw-bold" style={{maxWidth:'120px'}}>{h.medicine_name}</span>
                </div>
                <small className="theme-text-muted d-block">Rx #{h.prescription_id}</small>
                <small className="theme-text-muted d-block" style={{fontSize:'10px'}}>{new Date(h.dispensed_at).toLocaleString()}</small>
            </div>
            ))}
        </div>
      </div>

      {/* ----------------- MAIN CONTENT ----------------- */}
      <div className="flex-grow-1 position-relative d-flex flex-column theme-bg transition-all">
        
        {scanMode && (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 100, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)'}}>
                <div className="theme-card rounded-5 shadow-2xl position-relative overflow-hidden" style={{width: '450px', maxWidth: '90%'}}>
                    <div className="d-flex justify-content-between align-items-center p-3 px-4 theme-bg-light border-bottom theme-border">
                        <span className="badge bg-success animate-pulse-soft"><FaCircle size={8} className="me-1"/> SCANNING LIVE</span>
                        <button onClick={() => setScanMode(false)} className="btn btn-sm btn-outline-danger rounded-circle p-2 border-0"><FaTimes size={18}/></button>
                    </div>
                    <div className="position-relative bg-black" style={{height: '420px'}}><div id="reader" style={{width: '100%', height: '100%'}}></div></div>
                </div>
            </div>
        )}

        <div className="p-4 p-lg-5 h-100 overflow-auto">
            
            {/* ======================= HIGHLY INTERACTIVE DISPENSE TAB ======================= */}
            {activeTab === 'dispense' && !prescription && (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center">
                    <div className="scanner-animation-wrapper mb-4 rounded-circle theme-card shadow-lg d-flex align-items-center justify-content-center position-relative" style={{width:'150px', height:'150px'}}>
                        <div className="pulse-ring"></div>
                        <FaQrcode size={60} className="text-success position-relative z-1"/>
                        <div className="scanner-line"></div>
                    </div>
                    <h2 className="fw-bold theme-text mb-2">Ready to Dispense</h2>
                    <p className="theme-text-muted max-w-md mb-4" style={{fontSize: '15px'}}>Point the scanner at the patient's Lifeline QR Code to instantly verify and load their digital prescription.</p>
                    <button onClick={()=>setScanMode(true)} className="btn btn-success btn-lg px-5 py-3 rounded-pill fw-bold shadow-lg hover-scale d-flex align-items-center gap-2">
                        <FaQrcode size={20}/> LAUNCH SECURE SCANNER
                    </button>
                </div>
            )}

            {activeTab === 'dispense' && prescription && (
                <div className="animate-slide-up">
                    
                    {/* Header Row */}
                    <div className="d-flex align-items-center justify-content-between mb-4 theme-card p-3 rounded-4 shadow-sm border theme-border">
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle"><FaCheckCircle size={24}/></div>
                            <div>
                                <h4 className="fw-bold m-0 theme-text">Verify & Dispense</h4>
                                <p className="theme-text-muted m-0 small font-monospace">Prescription ID: #{prescription.id}</p>
                            </div>
                        </div>
                        <button onClick={()=>setPrescription(null)} className="btn btn-outline-danger rounded-pill px-4 fw-bold hover-danger transition-all">Clear Session</button>
                    </div>

                    {/* Summary Bar */}
                    <div className="row g-3 mb-4">
                        {(() => {
                            let inStock = 0, outOfStock = 0;
                            prescription.medicines.forEach(m => {
                                matchInventory(m.rawName).status === 'in_stock' ? inStock++ : outOfStock++;
                            });
                            return (
                                <>
                                    <div className="col-md-4">
                                        <div className="theme-card p-3 rounded-3 border border-start border-4 border-primary theme-border shadow-sm d-flex justify-content-between align-items-center">
                                            <div><small className="theme-text-muted fw-bold">Total Items</small><h4 className="m-0 fw-bold theme-text">{prescription.medicines.length}</h4></div>
                                            <FaPills size={24} className="text-primary opacity-25"/>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="theme-card p-3 rounded-3 border border-start border-4 border-success theme-border shadow-sm d-flex justify-content-between align-items-center">
                                            <div><small className="theme-text-muted fw-bold">In Stock</small><h4 className="m-0 fw-bold text-success">{inStock}</h4></div>
                                            <FaBoxes size={24} className="text-success opacity-25"/>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="theme-card p-3 rounded-3 border border-start border-4 border-danger theme-border shadow-sm d-flex justify-content-between align-items-center">
                                            <div><small className="theme-text-muted fw-bold">Out of Stock</small><h4 className="m-0 fw-bold text-danger">{outOfStock}</h4></div>
                                            <FaExclamationCircle size={24} className="text-danger opacity-25"/>
                                        </div>
                                    </div>
                                </>
                            )
                        })()}
                    </div>

                    <div className="row g-4">
                        {/* Profile Cards */}
                        <div className="col-lg-4 d-flex flex-column gap-3">
                            <div className="theme-card p-4 rounded-4 shadow-sm border theme-border profile-card-gradient">
                                <h6 className="fw-bold theme-text-muted small mb-3 letter-spacing-1">PATIENT DETAILS</h6>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{width:'50px', height:'50px', fontSize:'20px'}}>
                                        {prescription.patient.charAt(0)}
                                    </div>
                                    <div>
                                        <h5 className="m-0 fw-bold theme-text">{prescription.patient}</h5>
                                        <small className="theme-text-muted d-flex align-items-center gap-1"><FaFingerprint/> Lifeline Verified</small>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="theme-card p-4 rounded-4 shadow-sm border theme-border profile-card-gradient">
                                <h6 className="fw-bold theme-text-muted small mb-3 letter-spacing-1">PRESCRIBING DOCTOR</h6>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-info text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{width:'50px', height:'50px', fontSize:'20px'}}>
                                        <FaStethoscope/>
                                    </div>
                                    <div>
                                        <h5 className="m-0 fw-bold theme-text">{prescription.doctor}</h5>
                                        <small className="theme-text-muted d-flex align-items-center gap-1"><FaCheckCircle className="text-success"/> e-Signed on {new Date(prescription.date).toLocaleDateString()}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Table Area */}
                        <div className="col-lg-8">
                            <div className="theme-card p-4 rounded-4 shadow-sm border theme-border h-100 d-flex flex-column">
                                
                                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom theme-border">
                                    <h6 className="fw-bold theme-text m-0 d-flex align-items-center"><FaShoppingCart className="me-2 text-primary"/> Inventory Match & Billing</h6>
                                </div>

                                <div className="table-responsive flex-grow-1">
                                    <table className="table align-middle interactive-table theme-table">
                                        <thead className="theme-bg-light theme-text-muted small text-uppercase letter-spacing-1">
                                            <tr>
                                                <th className="rounded-start ps-3 py-3 border-0">Prescribed Med</th>
                                                <th className="py-3 border-0">Stock Status</th>
                                                <th className="py-3 border-0">Unit Price</th>
                                                <th className="py-3 border-0">Selection & Qty</th>
                                                <th className="rounded-end pe-3 py-3 text-end border-0">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prescription.medicines.map((med, i) => {
                                                const match = matchInventory(med.rawName);
                                                const normalizeMed = (name) => name?.toLowerCase().replace(/[^a-z0-9]/g,'').trim();
                                                const alreadySold = dispensedMeds.find(d => normalizeMed(d.medicine_name) === normalizeMed(med.rawName));
                                                
                                                return (
                                                    <tr key={i} className="border-bottom theme-border">
                                                        <td className="ps-3 py-3">
                                                            <div className="fw-bold theme-text fs-6">{med.rawName} {med.dosage}</div>
                                                            <small className="theme-text-muted theme-bg-light px-2 py-1 rounded mt-1 d-inline-block">{med.freq}</small>
                                                        </td>
                                                        <td>
                                                            {match.status === 'in_stock' && <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success px-3 py-2"><FaCheckCircle className="me-1"/> Available</span>}
                                                            {match.status === 'out_of_stock' && <span className="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2"><FaTimes className="me-1"/> Out of Stock</span>}
                                                            {match.status === 'unknown' && <span className="badge rounded-pill bg-secondary bg-opacity-10 text-secondary border border-secondary px-3 py-2">Unknown Drug</span>}
                                                        </td>
                                                        <td className="fw-bold theme-text-muted">
                                                            {selectedMeds[i] ? `₹${selectedMeds[i].price}` : match.available ? `₹${match.available.price}` : '-'}
                                                        </td>
                                                         <td>
                                                            {alreadySold ? (
                                                                <span className="badge bg-secondary px-3 py-2 rounded-pill"><FaCheckCircle className="me-1"/> Purchased</span>
                                                            ) : match.matches && match.matches.length > 0 ? (
                                                                <div className="d-flex gap-2 align-items-center">
                                                                    <select className="form-select form-select-sm theme-input fw-bold" style={{width: '140px', borderRadius:'8px'}} value={selectedMeds[i]?.id || ""}
                                                                        onChange={(e) => {
                                                                            const chosen = match.matches.find(m => m.id === parseInt(e.target.value));
                                                                            setSelectedMeds({ ...selectedMeds, [i]: { ...chosen, qty: 1 }});
                                                                        }}>
                                                                        <option value="">Select Brand</option>
                                                                        {match.matches.map(option => <option key={option.id} value={option.id}>{option.medicine_name}</option>)}
                                                                    </select>
                                                                    <input type="number" min="1" className="form-control form-control-sm text-center fw-bold theme-input" style={{width:'60px', borderRadius:'8px'}} placeholder="Qty" value={selectedMeds[i]?.qty || ""}
                                                                        onChange={(e) => setSelectedMeds({...selectedMeds, [i]: {...selectedMeds[i], qty: parseInt(e.target.value)}})} />
                                                                </div>
                                                            ) : <span className="text-danger small fw-bold">Cannot Fulfill</span>}
                                                        </td>
                                                        <td className="fw-bold text-primary fs-5 text-end pe-3">
                                                            {perMedTotals[i] ? `₹${perMedTotals[i]}` : '-'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="mt-4 pt-3 border-top theme-border d-flex justify-content-between align-items-center theme-bg-light p-3 rounded-4">
                                    <div>
                                        <small className="theme-text-muted fw-bold text-uppercase d-block letter-spacing-1">Amount Due</small>
                                        <h3 className="fw-bold text-success m-0 display-6">₹{grandTotal}</h3>
                                    </div>
                                    <button onClick={handleDispense} disabled={Object.keys(selectedMeds).length === 0} className="btn btn-success btn-lg px-5 rounded-pill fw-bold shadow-lg interactive-btn d-flex align-items-center gap-2">
                                        <FaMoneyBillWave size={20}/> PROCESS BILL & DISPENSE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= INVENTORY TAB ======================= */}
            {activeTab === 'inventory' && (
                <div className="animate-slide-up h-100 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="fw-bold m-0 theme-text"><FaBoxes className="me-2 text-success"/> Live Inventory</h3>
                        <div className="d-flex gap-2">
                            <div className="input-group">
                                <span className="input-group-text theme-bg-light theme-border border-end-0"><FaSearch className="theme-text-muted"/></span>
                                <input type="text" className="form-control theme-input border-start-0" placeholder="Search..." value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/>
                            </div>
                            <button onClick={() => setShowAddModal(true)} className="btn btn-success text-nowrap d-flex align-items-center gap-2 fw-bold"><FaPlus/> Add Item</button>
                        </div>
                    </div>
                    
                    <div className="theme-card rounded-4 shadow-sm border theme-border flex-grow-1 overflow-auto">
                        <table className="table align-middle m-0 theme-table table-hover interactive-table">
                            <thead className="theme-bg-light sticky-top" style={{zIndex: 1}}>
                                <tr className="theme-text-muted small text-uppercase letter-spacing-1">
                                    <th className="ps-4 py-3 border-0">Medicine Name</th>
                                    <th className="py-3 border-0">Generic Name</th>
                                    <th className="py-3 border-0">Category</th>
                                    <th className="py-3 border-0">Price (₹)</th>
                                    <th className="py-3 border-0">Stock Level</th>
                                    <th className="pe-4 py-3 text-end border-0">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center theme-text-muted py-5">No inventory loaded. Please add items.</td></tr>
                                ) : (
                                    inventory.filter(item => item.medicine_name.toLowerCase().includes(inventorySearch.toLowerCase()) || (item.generic_name && item.generic_name.toLowerCase().includes(inventorySearch.toLowerCase()))).map((item) => (
                                        <tr key={item.id} className="theme-border border-bottom">
                                            <td className="ps-4 fw-bold theme-text">{item.medicine_name}</td>
                                            <td className="theme-text-muted">{item.generic_name}</td>
                                            <td><span className="badge bg-secondary bg-opacity-10 text-secondary">{item.category}</span></td>
                                            <td className="fw-bold text-success">₹{item.price}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="progress flex-grow-1" style={{height: '6px', width: '80px', backgroundColor: 'var(--border-color)'}}>
                                                        <div className={`progress-bar ${item.stock > 100 ? 'bg-success' : 'bg-danger'}`} style={{width: `${Math.min(100, (item.stock/500)*100)}%`}}></div>
                                                    </div>
                                                    <span className={`small fw-bold ${item.stock < 100 ? 'text-danger' : 'theme-text'}`}>{item.stock}</span>
                                                </div>
                                            </td>
                                            <td className="pe-4 text-end">
                                                <button onClick={() => { setEditItem(item); setShowUpdateModal(true); }} className="btn btn-sm btn-outline-primary rounded-pill px-3">Update</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================= FULL HISTORY TAB ======================= */}
            {activeTab === 'history' && (
                <div className="animate-slide-up h-100 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="fw-bold m-0 theme-text"><FaHistory className="me-2 text-primary"/> Dispensation Log</h3>
                        <div className="input-group" style={{width: '300px'}}>
                            <span className="input-group-text theme-bg-light theme-border border-end-0"><FaSearch className="theme-text-muted"/></span>
                            <input type="text" className="form-control theme-input border-start-0" placeholder="Search patient or medicine..." value={historySearchTerm} onChange={e=>setHistorySearchTerm(e.target.value)}/>
                        </div>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="p-3 theme-card border theme-border rounded-4 shadow-sm d-flex align-items-center gap-3 hover-lift transition-all">
                                <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle"><FaBoxes size={20}/></div>
                                <div><h4 className="fw-bold m-0 theme-text">{dispenseHistory.length}</h4><small className="theme-text-muted">Total Dispensations</small></div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="p-3 theme-card border theme-border rounded-4 shadow-sm d-flex align-items-center gap-3 hover-lift transition-all">
                                <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle"><FaUserInjured size={20}/></div>
                                <div><h4 className="fw-bold m-0 theme-text">{new Set(dispenseHistory.map(h => h.patient_name)).size}</h4><small className="theme-text-muted">Unique Patients Served</small></div>
                            </div>
                        </div>
                         <div className="col-md-4">
                            <div className="p-3 theme-card border theme-border rounded-4 shadow-sm d-flex align-items-center gap-3 hover-lift transition-all">
                                <div className="bg-info bg-opacity-10 text-info p-3 rounded-circle"><FaPills size={20}/></div>
                                <div><h4 className="fw-bold m-0 theme-text">{new Set(dispenseHistory.map(h => h.medicine_name)).size}</h4><small className="theme-text-muted">Unique Medicines</small></div>
                            </div>
                        </div>
                    </div>

                    <div className="theme-card rounded-4 shadow-sm border theme-border flex-grow-1 overflow-auto">
                        <table className="table table-hover align-middle m-0 theme-table interactive-table">
                            <thead className="theme-bg-light sticky-top" style={{zIndex: 1}}>
                                <tr className="theme-text-muted small text-uppercase letter-spacing-1">
                                    <th className="ps-4 py-3 border-0">Patient Name</th>
                                    <th className="py-3 border-0">Medicine Dispensed</th>
                                    <th className="py-3 border-0">Prescription ID</th>
                                    <th className="py-3 border-0">Date & Time</th>
                                    <th className="pe-4 py-3 text-end border-0">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dispenseHistory.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center theme-text-muted py-5">No history records found.</td></tr>
                                ) : (
                                    dispenseHistory.filter(h => 
                                        h.patient_name.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
                                        h.medicine_name.toLowerCase().includes(historySearchTerm.toLowerCase())
                                    ).map((h, idx) => (
                                        <tr key={idx} className="border-bottom theme-border">
                                            <td className="ps-4 fw-bold theme-text">{h.patient_name}</td>
                                            <td className="fw-bold text-success">{h.medicine_name}</td>
                                            <td className="theme-text-muted font-monospace">#{h.prescription_id}</td>
                                            <td className="theme-text-muted">{new Date(h.dispensed_at).toLocaleString()}</td>
                                            <td className="pe-4 text-end">
                                                <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded-pill"><FaCheckCircle className="me-1"/> Delivered</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- ADD ITEM MODAL --- */}
      {showAddModal && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
              <div className="theme-card p-4 rounded-4 shadow-lg animate-zoom-in" style={{width: '400px'}}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold m-0 theme-text">Add New Medicine</h5>
                      <button onClick={() => setShowAddModal(false)} className="btn theme-bg-light theme-text rounded-circle"><FaTimes/></button>
                  </div>
                  <form onSubmit={handleAddItem}>
                      <div className="mb-3"><label className="small theme-text-muted fw-bold">Brand Name</label><input required className="form-control theme-input" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} /></div>
                      <div className="mb-3"><label className="small theme-text-muted fw-bold">Generic Name</label><input className="form-control theme-input" value={newItem.generic} onChange={e=>setNewItem({...newItem, generic: e.target.value})} /></div>
                      <div className="mb-3"><label className="small theme-text-muted fw-bold">Category</label>
                          <select className="form-select theme-input" value={newItem.category} onChange={e=>setNewItem({...newItem, category: e.target.value})}>
                              <option value="Tablet">Tablet</option><option value="Syrup">Syrup</option><option value="Injection">Injection</option><option value="Ointment">Ointment</option>
                          </select>
                      </div>
                      <div className="row mb-4">
                          <div className="col-6"><label className="small theme-text-muted fw-bold">Price (₹)</label><input type="number" required className="form-control theme-input" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} /></div>
                          <div className="col-6"><label className="small theme-text-muted fw-bold">Initial Stock</label><input type="number" required className="form-control theme-input" value={newItem.stock} onChange={e=>setNewItem({...newItem, stock: e.target.value})} /></div>
                      </div>
                      <button type="submit" className="btn btn-success w-100 fw-bold rounded-pill py-2"><FaSave className="me-2"/> Save to Database</button>
                  </form>
              </div>
          </div>
      )}

      {/* --- UPDATE ITEM MODAL --- */}
      {showUpdateModal && editItem && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
              <div className="theme-card p-4 rounded-4 shadow-lg animate-zoom-in" style={{width: '350px'}}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold m-0 theme-text">Update Stock</h5>
                      <button onClick={() => {setShowUpdateModal(false); setEditItem(null);}} className="btn theme-bg-light theme-text rounded-circle"><FaTimes/></button>
                  </div>
                  <div className="mb-4 text-center">
                      <h6 className="fw-bold text-primary">{editItem.medicine_name}</h6>
                      <small className="theme-text-muted">{editItem.generic_name}</small>
                  </div>
                  <form onSubmit={handleUpdateItem}>
                      <div className="mb-3"><label className="small theme-text-muted fw-bold">Update Price (₹)</label><input type="number" required className="form-control text-center fs-5 theme-input" value={editItem.price} onChange={e=>setEditItem({...editItem, price: e.target.value})} /></div>
                      <div className="mb-4"><label className="small theme-text-muted fw-bold">Update Total Stock</label><input type="number" required className="form-control text-center fs-5 fw-bold theme-input" value={editItem.stock} onChange={e=>setEditItem({...editItem, stock: e.target.value})} /></div>
                      <button type="submit" className="btn btn-primary w-100 fw-bold rounded-pill py-2"><FaSave className="me-2"/> Update Database</button>
                  </form>
              </div>
          </div>
      )}

      {/* --- CSS VARIABLES & STYLES --- */}
      <style>{`
        /* Centralized Theme Variables */
        :root {
            --bg-color: #f8fafc;
            --bg-light: #f1f5f9;
            --card-bg: #ffffff;
            --text-color: #0f172a;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --input-bg: #ffffff;
            --hover-bg: #f8fafc;
        }

        /* Dark Mode Theme Variables */
        body.dark-mode {
            --bg-color: #0f172a;
            --bg-light: #1e293b;
            --card-bg: #1e293b;
            --text-color: #f8fafc;
            --text-muted: #94a3b8;
            --border-color: #334155;
            --input-bg: #0f172a;
            --hover-bg: #334155;
        }

        /* Theme Classes */
        .theme-bg { background-color: var(--bg-color); color: var(--text-color); }
        .theme-bg-light { background-color: var(--bg-light); }
        .theme-card { background-color: var(--card-bg); color: var(--text-color); transition: background-color 0.3s, color 0.3s; }
        .theme-text { color: var(--text-color); }
        .theme-text-muted { color: var(--text-muted); }
        .theme-border { border-color: var(--border-color) !important; }
        .theme-input { background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); }
        .theme-input:focus { background-color: var(--input-bg); color: var(--text-color); border-color: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,0.25); }

        .theme-table th, .theme-table td { background-color: transparent !important; color: var(--text-color); border-color: var(--border-color); }

        /* Gradients & Details */
        .profile-card-gradient { background: linear-gradient(to bottom right, var(--card-bg), var(--bg-color)); }
        
        .interactive-table tbody tr { transition: background-color 0.2s; }
        .interactive-table tbody tr:hover { background-color: var(--hover-bg); }

        /* Animations & Interactions */
        .hover-scale { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .hover-scale:hover { transform: scale(1.05); }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; }
        .interactive-btn { transition: all 0.3s; }
        .interactive-btn:active { transform: scale(0.95); }
        .hover-danger:hover { background-color: #dc3545; color: white !important; }

        .transition-all { transition: all 0.3s ease; }
        .letter-spacing-1 { letter-spacing: 1px; }

        .pharma-tab-active { color: #10b981; border-bottom: 3px solid #10b981 !important; background: var(--hover-bg); }

        /* Animated Scanner Empty State */
        .scanner-animation-wrapper {
            overflow: hidden;
            border: 2px solid var(--border-color);
            background-color: var(--card-bg);
        }
        .pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            animation: pulseRing 2s infinite;
        }
        .scanner-line {
            position: absolute;
            width: 100%;
            height: 3px;
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
            animation: scanMove 2s linear infinite;
        }

        .animate-zoom-in { animation: zoomIn 0.3s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        .animate-pulse-soft { animation: pulseSoft 2s infinite; }

        @keyframes scanMove { 0% { top: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseSoft { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default PharmacistDashboard;