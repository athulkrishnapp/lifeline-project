import React, { useState } from 'react';
import axios from 'axios';
import { FaPills, FaSearch, FaRupeeSign, FaCheckCircle } from 'react-icons/fa';

function Prescriptions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [drugResults, setDrugResults] = useState([]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    const res = await axios.get(`http://localhost:5000/api/drugs?search=${searchTerm}`);
    setDrugResults(res.data);
  };

  return (
    <div className="page-background min-vh-100 p-5">
      <div className="container">
        
        <div className="row g-5">
            {/* LEFT: Active Prescriptions */}
            <div className="col-lg-6">
                <h3 className="fw-bold theme-text mb-4">Active Medications</h3>
                <div className="bg-white p-4 rounded-4 shadow-sm border theme-border mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-warning bg-opacity-10 p-3 rounded-circle text-warning"><FaPills size={20}/></div>
                            <div>
                                <h5 className="fw-bold m-0">Amoxicillin 500mg</h5>
                                <small className="text-muted">1-0-1 (After Food)</small>
                            </div>
                        </div>
                        <span className="badge bg-success">Active</span>
                    </div>
                    <div className="progress" style={{height: '6px'}}>
                        <div className="progress-bar bg-warning" style={{width: '60%'}}></div>
                    </div>
                    <small className="text-muted mt-2 d-block">3 days remaining</small>
                </div>
            </div>

            {/* RIGHT: Price Comparison Tool */}
            <div className="col-lg-6">
                <div className="bg-primary bg-opacity-5 p-5 rounded-4 border border-primary border-opacity-10">
                    <h4 className="fw-bold text-primary mb-3">Find Cheaper Substitutes</h4>
                    <p className="small text-muted mb-4">Search for your prescribed medicine to see generic alternatives with the same content but lower price.</p>
                    
                    <div className="input-group mb-4">
                        <input 
                            className="form-control form-control-lg border-0 shadow-sm" 
                            placeholder="e.g. Dolo 650, Atorva..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button onClick={handleSearch} className="btn btn-primary px-4"><FaSearch/></button>
                    </div>

                    <div className="results-area" style={{maxHeight: '400px', overflowY: 'auto'}}>
                        {drugResults.length > 0 && (
                            <div className="d-flex flex-column gap-2">
                                {drugResults.map((drug, i) => (
                                    <div key={i} className="bg-white p-3 rounded-3 shadow-sm border d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="fw-bold m-0">{drug.brand_name}</h6>
                                            <small className="text-muted">{drug.manufacturer} • {drug.category}</small>
                                            <div className="tiny text-success fw-bold"><FaCheckCircle/> {drug.generic_name}</div>
                                        </div>
                                        <div className="text-end">
                                            <h5 className="fw-bold text-dark m-0">₹{drug.price_inr}</h5>
                                            <small className="text-muted">per strip</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Prescriptions;