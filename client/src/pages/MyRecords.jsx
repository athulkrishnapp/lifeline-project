import React from 'react';
import { FaFileMedical, FaDownload, FaStethoscope } from 'react-icons/fa';

function MyRecords() {
  // Demo Data (In real app, fetch from /api/medical-records)
  const records = [
    { date: '2026-02-01', doctor: 'Dr. Liz George', hospital: 'Apollo Hospital', diagnosis: 'Viral Fever', type: 'OPD' },
    { date: '2025-11-15', doctor: 'Dr. A. Kumar', hospital: 'City Heart Clinic', diagnosis: 'Routine Cardiac Checkup', type: 'Checkup' },
    { date: '2025-08-10', doctor: 'Dr. Sarah Smith', hospital: 'Skin Care Center', diagnosis: 'Eczema Treatment', type: 'OPD' }
  ];

  return (
    <div className="page-background min-vh-100 p-5">
      <div className="container">
        <h2 className="fw-bold theme-text mb-4">My Medical History</h2>
        
        <div className="timeline-section">
            {records.map((rec, index) => (
                <div key={index} className="row mb-4">
                    <div className="col-md-2 text-end d-none d-md-block">
                        <div className="fw-bold theme-text">{rec.date}</div>
                        <small className="text-muted">{rec.type}</small>
                    </div>
                    
                    {/* Timeline Line */}
                    <div className="col-md-1 position-relative d-flex justify-content-center">
                        <div className="timeline-line bg-secondary bg-opacity-25" style={{width: '2px', height: '100%', position: 'absolute'}}></div>
                        <div className="timeline-dot bg-primary rounded-circle border border-white border-4 shadow-sm" style={{width: '20px', height: '20px', zIndex: 1, marginTop: '5px'}}></div>
                    </div>

                    <div className="col-md-9">
                        <div className="bg-white p-4 rounded-4 shadow-sm border theme-border">
                            <div className="d-flex justify-content-between">
                                <h5 className="fw-bold text-primary">{rec.diagnosis}</h5>
                                <button className="btn btn-sm btn-light border"><FaDownload/> PDF</button>
                            </div>
                            <p className="mb-1 fw-bold theme-text">{rec.hospital}</p>
                            <p className="text-muted small"><FaStethoscope className="me-2"/> {rec.doctor}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default MyRecords;