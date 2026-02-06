import React, { useState } from 'react';
import { FaQrcode, FaSearch, FaUserInjured, FaExclamationTriangle } from 'react-icons/fa';

function DoctorDashboard() {
  const [patientID, setPatientID] = useState('');
  const [patientData, setPatientData] = useState(null);

  const handleScan = () => {
    if (!patientID) return alert("Enter an ID or Scan QR");
    setPatientData({
      name: "Athulkrishna P P",
      age: 23,
      blood: "O+",
      allergies: ["Penicillin", "Peanuts"],
      history: ["Viral Fever (2024)", "Mild Gastritis (2025)"]
    });
  };

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh' }}>
      <h2 className="fw-bold text-primary mb-4">👨‍⚕️ Doctor Console</h2>
      <div className="row g-4">
        <div className="col-md-4">
          <div className="modern-card p-4 mb-4">
            <h5 className="fw-bold mb-3">Identify Patient</h5>
            <div className="input-group mb-3">
                <input type="text" className="form-control" placeholder="Scan QR or Enter ID" 
                    value={patientID} onChange={(e) => setPatientID(e.target.value)} />
                <button className="btn btn-primary" onClick={handleScan}><FaSearch /></button>
            </div>
            <button className="btn btn-outline-primary w-100 py-2"><FaQrcode className="me-2"/> Activate Camera Scan</button>
          </div>

          {patientData && (
            <div className="modern-card p-4 animate-entry border-start border-4 border-success">
                <h5 className="fw-bold text-success"><FaUserInjured/> Patient Verified</h5>
                <h3 className="fw-bold">{patientData.name}</h3>
                <p className="text-muted mb-3">Age: {patientData.age} | Blood: {patientData.blood}</p>
                <div className="p-3 bg-danger bg-opacity-10 rounded border border-danger">
                    <strong className="text-danger"><FaExclamationTriangle/> Allergies:</strong>
                    <p className="m-0 small">{patientData.allergies.join(", ")}</p>
                </div>
                <div className="mt-3">
                    <strong>Recent History:</strong>
                    <ul className="small text-muted ps-3">
                        {patientData.history.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                </div>
            </div>
          )}
        </div>

        <div className="col-md-8">
          <div className="modern-card p-5" style={{ minHeight: '500px' }}>
            {!patientData ? (
                <div className="text-center opacity-50 py-5">
                    <FaUserInjured size={50} />
                    <h4 className="mt-3">No Patient Selected</h4>
                    <p>Scan a QR code to begin consultation.</p>
                </div>
            ) : (
                <form>
                    <h4 className="fw-bold mb-4">New Consultation Record</h4>
                    <div className="mb-3">
                        <label className="fw-bold small">DIAGNOSIS</label>
                        <textarea className="form-control" rows="3" placeholder="Clinical observations..."></textarea>
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="fw-bold small">PRESCRIBE MEDICINE</label>
                            <input className="form-control" placeholder="Search medicine (e.g. Dolo)" />
                        </div>
                        <div className="col-md-3 mb-3">
                            <label className="fw-bold small">DOSAGE</label>
                            <input className="form-control" placeholder="500mg" />
                        </div>
                        <div className="col-md-3 mb-3">
                            <label className="fw-bold small">FREQ</label>
                            <select className="form-control">
                                <option>1-0-1</option>
                                <option>1-1-1</option>
                                <option>0-0-1</option>
                            </select>
                        </div>
                    </div>
                    <div className="alert alert-warning d-flex align-items-center gap-2">
                        <FaExclamationTriangle />
                        <span><strong>AI Guard:</strong> Safe to prescribe. No conflict with Penicillin allergy.</span>
                    </div>
                    <div className="d-flex justify-content-end gap-3 mt-4">
                        <button type="button" className="btn btn-outline-secondary">Save as Draft</button>
                        <button type="submit" className="btn btn-primary px-5">Finalize & Sign</button>
                    </div>
                </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;