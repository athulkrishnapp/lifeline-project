import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    unique_lifeline_id: "",
    phone: "",
    blood_group: "",
    allergies: "",
    emergency_contact: ""
  });

  // 1. Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get('http://localhost:5000/api/profile', {
                headers: { Authorization: token }
            });
            setProfile(res.data); // Fills state with DB data
            setLoading(false);
        } catch (err) {
            alert("Error fetching profile");
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  // 2. Handle Update
  const handleSave = async () => {
    const token = localStorage.getItem('token');
    try {
        await axios.post('http://localhost:5000/api/profile/update', {
            blood: profile.blood_group,
            allergies: profile.allergies,
            emergency_contact: profile.emergency_contact,
            phone: profile.phone
        }, { headers: { Authorization: token } });
        
        setMsg("✅ Profile Updated Successfully!");
        setTimeout(() => setMsg(""), 3000);
    } catch (err) {
        setMsg("❌ Update Failed");
    }
  };

  const handleChange = (e) => setProfile({...profile, [e.target.name]: e.target.value});

  if (loading) return <div className="p-5 text-center">Loading Settings...</div>;

  return (
    <div className="container p-4 animate-entry" style={{ maxWidth: '800px' }}>
      
      <button onClick={() => navigate('/patient-dashboard')} className="btn btn-link text-decoration-none mb-3 ps-0">
         <FaArrowLeft/> Back to Dashboard
      </button>

      <h2 className="fw-bold text-primary mb-4">⚙️ Profile Settings</h2>

      <div className="modern-card p-5 shadow-lg border-0">
        <form>
            <div className="row g-4">
                {/* READ ONLY FIELDS */}
                <div className="col-md-6">
                    <label className="fw-bold small text-muted">Full Name (Read Only)</label>
                    <input type="text" className="form-control bg-light" value={profile.full_name} disabled />
                </div>
                <div className="col-md-6">
                    <label className="fw-bold small text-muted">Lifeline ID (Read Only)</label>
                    <input type="text" className="form-control bg-light" value={profile.unique_lifeline_id} disabled />
                </div>

                {/* CRITICAL MEDICAL INFO */}
                <div className="col-12">
                    <div className="p-3 bg-danger bg-opacity-10 rounded border border-danger">
                        <div className="d-flex align-items-center gap-2 mb-2 text-danger">
                            <FaExclamationTriangle />
                            <h6 className="fw-bold m-0">Critical Medical Data</h6>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="fw-bold small">Blood Group</label>
                                <select className="form-control" name="blood_group" value={profile.blood_group || ''} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="A+">A+</option>
                                    <option value="B+">B+</option>
                                    <option value="AB+">AB+</option>
                                </select>
                            </div>
                            <div className="col-md-8">
                                <label className="fw-bold small">Allergies (Comma separated)</label>
                                <input type="text" className="form-control" name="allergies" 
                                       placeholder="e.g. Peanuts, Penicillin"
                                       value={profile.allergies || ''} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* EDITABLE CONTACT */}
                <div className="col-md-6">
                    <label className="fw-bold small text-muted">Phone Number</label>
                    <input type="text" className="form-control" name="phone" value={profile.phone || ''} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                    <label className="fw-bold small text-muted">Emergency Contact</label>
                    <input type="text" className="form-control border-danger" name="emergency_contact" 
                           placeholder="Primary Emergency Number"
                           value={profile.emergency_contact || ''} onChange={handleChange} />
                </div>

                {/* SAVE BUTTON */}
                <div className="col-12 mt-4">
                    <button type="button" onClick={handleSave} className="btn btn-primary px-5 py-3 fw-bold w-100 shadow-sm">
                        <FaSave className="me-2"/> Save Changes
                    </button>
                    {msg && <div className="alert alert-info mt-3 text-center">{msg}</div>}
                </div>
            </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileSettings;