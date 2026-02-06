import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaHeartbeat, FaUserMd, FaShieldAlt, FaBrain, FaGlobe, 
  FaPrescriptionBottleAlt, FaArrowRight, FaCheckCircle, FaHospital,
  FaTwitter, FaLinkedin, FaGithub, FaEnvelope
} from 'react-icons/fa';

function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="page-background transition-bg overflow-hidden d-flex flex-column" style={{minHeight: '100vh'}}>
      
      {/* ==================== HERO SECTION ==================== */}
      <section className="position-relative pt-5 pb-5 d-flex align-items-center flex-grow-1">
        
        <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden pointer-events-none">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
        </div>

        <div className="container position-relative z-1">
          <div className="row align-items-center">
            
            <div className="col-lg-6 mb-5 mb-lg-0">
              <div className={`animate-slide-up ${isVisible ? 'active' : ''}`} style={{ transitionDelay: '0.1s' }}>
                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-3 py-2 mb-4 fw-bold letter-spacing-1">
                  <FaGlobe className="me-2"/> NATIONAL HEALTH NETWORK
                </span>
                <h1 className="display-3 fw-bold theme-text mb-4" style={{ lineHeight: '1.2' }}>
                  The Future of <br/>
                  <span className="text-gradient">Connected Care.</span>
                </h1>
                <p className="lead theme-text-muted mb-5" style={{ maxWidth: '90%' }}>
                  A unified, blockchain-secured ecosystem connecting 1.4 Billion citizens with doctors, pharmacists, and AI diagnostics in real-time.
                </p>
                <div className="d-flex gap-3">
                  <Link to="/register" className="btn btn-primary btn-lg rounded-0 px-5 py-3 fw-bold shadow-lg lift-on-hover">
                    GET STARTED
                  </Link>
                  <Link to="/login" className="btn btn-outline-dark theme-btn-outline btn-lg rounded-0 px-5 py-3 fw-bold lift-on-hover">
                    LOGIN
                  </Link>
                </div>
                
                <div className="mt-5 d-flex align-items-center gap-4 theme-text-muted small fw-bold">
                  <div className="d-flex align-items-center gap-2"><FaCheckCircle className="text-success"/> GOVT COMPLIANT</div>
                  <div className="d-flex align-items-center gap-2"><FaCheckCircle className="text-success"/> AES-256 ENCRYPTED</div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className={`glass-card p-4 position-relative animate-float ${isVisible ? 'active' : ''}`}>
                <div className="floating-badge badge-1 shadow-lg">
                    <FaBrain className="text-white mb-2" size={24}/>
                    <div className="small fw-bold text-white">AI Analysis</div>
                    <div className="tiny text-white opacity-75">Processing...</div>
                </div>
                <div className="floating-badge badge-2 shadow-lg">
                    <FaHeartbeat className="text-white mb-2" size={24}/>
                    <div className="small fw-bold text-white">Vitals Stable</div>
                    <div className="tiny text-white opacity-75">98 BPM</div>
                </div>

                <div className="bg-white rounded-3 overflow-hidden shadow-sm dark-mode-adjust">
                    <div className="p-3 border-bottom d-flex align-items-center gap-2 bg-light dark-header">
                        <div className="circle red"></div>
                        <div className="circle yellow"></div>
                        <div className="circle green"></div>
                        <div className="ms-auto small text-muted">Lifeline Patient Portal</div>
                    </div>
                    <div className="p-4">
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="width-50 height-50 rounded-circle bg-light d-flex align-items-center justify-content-center text-primary fw-bold fs-4">AK</div>
                            <div>
                                <h5 className="fw-bold m-0 theme-text-inner">Athulkrishna P P</h5>
                                <small className="text-muted">ID: LL-P-2026-1922</small>
                            </div>
                        </div>
                        <div className="row g-2">
                            <div className="col-4">
                                <div className="p-3 bg-light rounded-2 text-center border dark-box">
                                    <div className="fw-bold text-primary">A+</div>
                                    <div className="tiny text-muted">Blood</div>
                                </div>
                            </div>
                            <div className="col-4">
                                <div className="p-3 bg-light rounded-2 text-center border dark-box">
                                    <div className="fw-bold text-success">Normal</div>
                                    <div className="tiny text-muted">Status</div>
                                </div>
                            </div>
                            <div className="col-4">
                                <div className="p-3 bg-light rounded-2 text-center border dark-box">
                                    <div className="fw-bold text-warning">2</div>
                                    <div className="tiny text-muted">Reports</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS BANNER (FIXED COLORS) ==================== */}
      <section className="py-5 border-top border-bottom theme-border">
        <div className="container">
            <div className="row text-center g-4">
                <div className="col-md-3">
                    <h2 className="fw-bold theme-text mb-0 counter">10M+</h2>
                    <small className="theme-text-muted text-uppercase fw-bold letter-spacing-1">Records Secured</small>
                </div>
                <div className="col-md-3">
                    <h2 className="fw-bold theme-text mb-0 counter">500+</h2>
                    <small className="theme-text-muted text-uppercase fw-bold letter-spacing-1">Hospitals Connected</small>
                </div>
                <div className="col-md-3">
                    <h2 className="fw-bold theme-text mb-0 counter">24/7</h2>
                    <small className="theme-text-muted text-uppercase fw-bold letter-spacing-1">AI Availability</small>
                </div>
                <div className="col-md-3">
                    <h2 className="fw-bold theme-text mb-0 counter">100%</h2>
                    <small className="theme-text-muted text-uppercase fw-bold letter-spacing-1">Data Privacy</small>
                </div>
            </div>
        </div>
      </section>

      {/* ==================== BENTO FEATURES GRID ==================== */}
      <section className="py-5">
        <div className="container py-5">
            <div className="text-center mb-5">
                <h6 className="text-primary fw-bold letter-spacing-2">ECOSYSTEM</h6>
                <h2 className="display-5 fw-bold theme-text">One Platform. Three Pillars.</h2>
            </div>

            <div className="row g-4">
                {/* Card 1: Patient */}
                <div className="col-lg-4">
                    <div className="feature-card h-100 p-5 border rounded-0 position-relative overflow-hidden group">
                        <div className="position-absolute top-0 end-0 p-4 opacity-10">
                            <FaUserMd size={100} className="theme-text"/>
                        </div>
                        <div className="icon-box bg-primary text-white mb-4"><FaHeartbeat size={24}/></div>
                        <h3 className="fw-bold theme-text">For Patients</h3>
                        <p className="theme-text-muted mt-3">
                            No more carrying paper files. Access your entire medical history via a secure QR code. Get AI health tips tailored to you.
                        </p>
                        <ul className="list-unstyled theme-text-muted mt-4 small d-flex flex-column gap-2">
                            <li><FaCheckCircle className="text-primary me-2"/> Universal Medical ID</li>
                            <li><FaCheckCircle className="text-primary me-2"/> OTP-Based Access</li>
                            <li><FaCheckCircle className="text-primary me-2"/> AI Symptom Checker</li>
                        </ul>
                    </div>
                </div>

                {/* Card 2: Doctor (UPDATED: Light Green in Light Mode) */}
                <div className="col-lg-4">
                    <div className="feature-card doctor-card h-100 p-5 border rounded-0 position-relative overflow-hidden group">
                        <div className="position-absolute top-0 end-0 p-4 opacity-10">
                            <FaHospital size={100} className="theme-text"/>
                        </div>
                        <div className="icon-box bg-success text-white mb-4"><FaUserMd size={24}/></div>
                        <h3 className="fw-bold theme-text">For Doctors</h3>
                        <p className="theme-text-muted mt-3">
                            Instant access to patient history means faster, more accurate diagnosis. AI summarizes complex history in seconds.
                        </p>
                        <ul className="list-unstyled theme-text-muted mt-4 small d-flex flex-column gap-2">
                            <li><FaCheckCircle className="text-success me-2"/> 1-Click History View</li>
                            <li><FaCheckCircle className="text-success me-2"/> Digital Prescriptions</li>
                            <li><FaCheckCircle className="text-success me-2"/> AI Clinical Support</li>
                        </ul>
                    </div>
                </div>

                {/* Card 3: Pharmacist */}
                <div className="col-lg-4">
                    <div className="feature-card h-100 p-5 border rounded-0 position-relative overflow-hidden group">
                        <div className="position-absolute top-0 end-0 p-4 opacity-10">
                            <FaPrescriptionBottleAlt size={100} className="theme-text"/>
                        </div>
                        <div className="icon-box bg-success text-white mb-4"><FaPrescriptionBottleAlt size={24}/></div>
                        <h3 className="fw-bold theme-text">For Pharmacy</h3>
                        <p className="theme-text-muted mt-3">
                            Eliminate errors. Verify prescriptions digitally and update dispensing status in real-time to the network.
                        </p>
                        <ul className="list-unstyled theme-text-muted mt-4 small d-flex flex-column gap-2">
                            <li><FaCheckCircle className="text-success me-2"/> Anti-Forgery System</li>
                            <li><FaCheckCircle className="text-success me-2"/> Inventory Sync</li>
                            <li><FaCheckCircle className="text-success me-2"/> Digital Records</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* ==================== AI SHOWCASE ==================== */}
      <section className="py-5 bg-gradient-dark text-white position-relative overflow-hidden">
          <div className="container py-5 position-relative z-1">
              <div className="row align-items-center">
                  <div className="col-lg-6">
                      <h6 className="text-warning fw-bold letter-spacing-2">AGENTIC AI CORE</h6>
                      <h2 className="display-4 fw-bold mb-4">Self-Improving Medical Intelligence.</h2>
                      <p className="lead opacity-75 mb-4">
                          Lifeline isn't just a database. It's an intelligent agent that learns from anonymized patterns to predict outbreaks and suggest preventative care.
                      </p>
                      <div className="d-flex gap-4">
                          <div>
                              <h3 className="fw-bold text-warning">0.2s</h3>
                              <small>Analysis Speed</small>
                          </div>
                          <div>
                              <h3 className="fw-bold text-warning">99%</h3>
                              <small>Accuracy Rate</small>
                          </div>
                      </div>
                  </div>
                  <div className="col-lg-6 text-center mt-5 mt-lg-0">
                      <div className="ai-visual-circle">
                          <FaBrain size={80} className="ai-icon"/>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="pt-5 pb-4 theme-footer-bg border-top theme-border">
          <div className="container">
              <div className="row g-4 mb-5">
                  <div className="col-lg-4">
                      <div className="d-flex align-items-center gap-2 mb-3 theme-text">
                          <FaHeartbeat size={28} className="text-primary"/>
                          <h4 className="fw-bold m-0">LIFELINE</h4>
                      </div>
                      <p className="theme-text-muted small">
                          The unified healthcare interface for the next generation. Secure, accessible, and intelligent.
                      </p>
                      <div className="d-flex gap-3 mt-4">
                          <button className="btn btn-sm btn-outline-primary rounded-circle"><FaTwitter/></button>
                          <button className="btn btn-sm btn-outline-primary rounded-circle"><FaLinkedin/></button>
                          <button className="btn btn-sm btn-outline-primary rounded-circle"><FaGithub/></button>
                          <button className="btn btn-sm btn-outline-primary rounded-circle"><FaEnvelope/></button>
                      </div>
                  </div>
                  <div className="col-6 col-lg-2">
                      <h6 className="fw-bold theme-text mb-3">PLATFORM</h6>
                      <ul className="list-unstyled small theme-text-muted d-flex flex-column gap-2">
                          <li><Link to="/login" className="text-decoration-none theme-text-muted">Patient Portal</Link></li>
                          <li><Link to="/login" className="text-decoration-none theme-text-muted">Doctor Dashboard</Link></li>
                          <li><Link to="/login" className="text-decoration-none theme-text-muted">Pharmacy Access</Link></li>
                      </ul>
                  </div>
                  <div className="col-6 col-lg-2">
                      <h6 className="fw-bold theme-text mb-3">COMPANY</h6>
                      <ul className="list-unstyled small theme-text-muted d-flex flex-column gap-2">
                          <li>About Us</li>
                          <li>Careers</li>
                          <li>Press Kit</li>
                      </ul>
                  </div>
                  <div className="col-lg-4">
                      <h6 className="fw-bold theme-text mb-3">STAY UPDATED</h6>
                      <div className="input-group">
                          <input type="text" className="form-control rounded-0 border-end-0" placeholder="Enter email"/>
                          <button className="btn btn-dark rounded-0 px-3">SUBSCRIBE</button>
                      </div>
                      <small className="text-muted mt-2 d-block tiny">We respect your privacy. No spam.</small>
                  </div>
              </div>
              
              <div className="border-top theme-border pt-4 d-flex justify-content-between align-items-center flex-column flex-md-row">
                  <small className="theme-text-muted mb-2 mb-md-0">
                      &copy; 2026 Lifeline Project. <strong>Athulkrishna P P</strong>. All Rights Reserved.
                  </small>
                  <div className="d-flex gap-4 small theme-text-muted">
                      <span>Privacy Policy</span>
                      <span>Terms of Service</span>
                      <span>Cookie Settings</span>
                  </div>
              </div>
          </div>
      </footer>

      {/* ==================== STYLES ==================== */}
      <style>{`
        /* GLOBAL THEME */
        .transition-bg { transition: background-color 0.5s ease, color 0.3s ease; }
        .page-background { 
            background-color: #f8fafc;
            background-image: radial-gradient(at 0% 0%, hsla(253,16%,7%,0) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,0) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,0) 0, transparent 50%);
        }
        
        .theme-text { color: #0f172a; transition: color 0.3s ease; }
        .theme-text-muted { color: #64748b; transition: color 0.3s ease; } /* Fixed Color Logic */
        .theme-border { border-color: #e2e8f0 !important; }
        .theme-btn-outline { border-color: #0f172a; color: #0f172a; }
        .theme-btn-outline:hover { background-color: #0f172a; color: #fff; }
        .theme-footer-bg { background-color: #ffffff; }
        
        /* CARD STYLES */
        .feature-card { background-color: #fff; border-color: #e2e8f0 !important; transition: all 0.3s ease; }
        
        /* DOCTOR CARD SPECIFIC (Light Mode Green) */
        .doctor-card { background-color: #f0fdf4 !important; border-color: #bbf7d0 !important; }
        .doctor-card .theme-text { color: #14532d; } 
        .doctor-card .theme-text-muted { color: #15803d; }

        /* DARK MODE OVERRIDES */
        body.dark-mode .page-background { background-color: #0f172a !important; background-image: none; }
        body.dark-mode .theme-text { color: #fff; }
        body.dark-mode .theme-text-muted { color: #94a3b8; } /* Ensures readability in dark mode */
        body.dark-mode .theme-border { border-color: #334155 !important; }
        body.dark-mode .theme-btn-outline { border-color: #fff; color: #fff; }
        body.dark-mode .theme-btn-outline:hover { background-color: #fff; color: #000; }
        body.dark-mode .theme-footer-bg { background-color: #1e293b; }
        
        body.dark-mode .feature-card { background-color: #1e293b !important; border-color: #334155 !important; }
        
        /* Reset Doctor Card in Dark Mode to match others */
        body.dark-mode .doctor-card { background-color: #1e293b !important; border-color: #334155 !important; }
        body.dark-mode .doctor-card .theme-text { color: #fff; }
        body.dark-mode .doctor-card .theme-text-muted { color: #94a3b8; }

        /* HERO ANIMATIONS */
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; }
        .blob-1 { top: -10%; right: -10%; width: 500px; height: 500px; background: #3b82f6; }
        .blob-2 { bottom: -10%; left: -10%; width: 400px; height: 400px; background: #10b981; }
        .animate-slide-up { opacity: 0; transform: translateY(30px); transition: all 0.8s ease-out; }
        .animate-slide-up.active { opacity: 1; transform: translateY(0); }
        .text-gradient { background: linear-gradient(135deg, #0ea5e9, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; transform: perspective(1000px) rotateY(-5deg) rotateX(5deg); transition: transform 0.5s ease; }
        .glass-card:hover { transform: perspective(1000px) rotateY(0) rotateX(0); }
        .floating-badge { position: absolute; padding: 15px; border-radius: 16px; width: 140px; text-align: center; backdrop-filter: blur(10px); animation: float 6s ease-in-out infinite; z-index: 10; }
        .badge-1 { top: 20px; right: -20px; background: rgba(59, 130, 246, 0.9); }
        .badge-2 { bottom: 40px; left: -30px; background: rgba(16, 185, 129, 0.9); animation-delay: 2s; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
        
        /* DARK MODE ADJUSTMENTS FOR MOCK UI */
        body.dark-mode .dark-mode-adjust { background-color: #1e293b; }
        body.dark-mode .dark-header { background-color: #0f172a; border-bottom-color: #334155 !important; }
        body.dark-mode .theme-text-inner { color: #fff; }
        body.dark-mode .dark-box { background-color: #0f172a; border-color: #334155 !important; }

        /* FEATURES */
        .feature-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .icon-box { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        
        /* AI SECTION */
        .bg-gradient-dark { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
        .ai-visual-circle { width: 300px; height: 300px; margin: 0 auto; border-radius: 50%; background: radial-gradient(circle, rgba(234,179,8,0.2) 0%, rgba(234,179,8,0) 70%); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(234,179,8,0.3); animation: pulse 3s infinite; }
        .ai-icon { color: #eab308; filter: drop-shadow(0 0 20px #eab308); }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); } 70% { box-shadow: 0 0 0 50px rgba(234, 179, 8, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); } }

        /* UTILS */
        .letter-spacing-1 { letter-spacing: 1px; } .letter-spacing-2 { letter-spacing: 2px; } .lift-on-hover:hover { transform: translateY(-3px); } .tiny { font-size: 10px; }
        
        .circle { width: 10px; height: 10px; border-radius: 50%; } .red { background: #ef4444; } .yellow { background: #eab308; } .green { background: #22c55e; } .width-50 { width: 50px; } .height-50 { height: 50px; }
      `}</style>
    </div>
  );
}

export default Home;