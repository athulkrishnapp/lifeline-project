import React, { useState } from 'react';
import { FaQrcode, FaPills, FaCheckCircle, FaMoneyBillWave } from 'react-icons/fa';

function PharmacistDashboard() {
  const [prescription, setPrescription] = useState(null);

  const handleScanRx = () => {
    setPrescription({
      doctor: "Dr. Liz George",
      patient: "Athulkrishna P P",
      medicines: [
        { name: "Dolo-650", generic: "Paracetamol", price: 30, cheaper_alt: "Pacimol (₹15)" },
        { name: "Augmentin 625", generic: "Amoxicillin", price: 250, cheaper_alt: null }
      ],
      status: "active"
    });
  };

  return (
    <div className="container p-4">
      <h2 className="fw-bold text-primary mb-4"><FaPills/> Pharmacy Dispenser</h2>

      {!prescription && (
        <div className="modern-card text-center p-5 animate-entry">
            <FaQrcode size={60} className="text-muted mb-3"/>
            <h4>Scan Digital Prescription</h4>
            <p className="text-muted">Use the scanner to verify and dispense medicines.</p>
            <button onClick={handleScanRx} className="btn btn-primary px-4 py-2 mt-2">Simulate Scan</button>
        </div>
      )}

      {prescription && (
        <div className="modern-card p-4 animate-entry">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <div>
                    <h5 className="fw-bold m-0">Rx for: {prescription.patient}</h5>
                    <small className="text-muted">Prescribed by {prescription.doctor}</small>
                </div>
                <span className="badge bg-success px-3 py-2">VALID</span>
            </div>

            <table className="table">
                <thead>
                    <tr className="text-muted small text-uppercase">
                        <th>Medicine</th>
                        <th>Generic Name</th>
                        <th>Price</th>
                        <th>Savings Alert</th>
                    </tr>
                </thead>
                <tbody>
                    {prescription.medicines.map((med, i) => (
                        <tr key={i} className="align-middle">
                            <td className="fw-bold">{med.name}</td>
                            <td>{med.generic}</td>
                            <td>₹{med.price}</td>
                            <td>
                                {med.cheaper_alt ? (
                                    <span className="badge bg-success bg-opacity-25 text-success border border-success px-2 py-1">
                                        <FaMoneyBillWave className="me-1"/> Save with {med.cheaper_alt}
                                    </span>
                                ) : (
                                    <span className="text-muted small">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="d-flex justify-content-end mt-4">
                <button className="btn btn-success btn-lg fw-bold">
                    <FaCheckCircle className="me-2"/> Mark as Dispensed
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

export default PharmacistDashboard;