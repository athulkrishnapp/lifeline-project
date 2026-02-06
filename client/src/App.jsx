import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home'; // The new Landing Page
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';
import BookAppointment from './pages/BookAppointment';
import MyRecords from './pages/MyRecords';
import ProfileSettings from './pages/ProfileSettings';
import AIChat from './pages/AIChat';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Feature Pages */}
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/pharmacist-dashboard" element={<PharmacistDashboard />} />
        
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/my-records" element={<MyRecords />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/ai-chat" element={<AIChat />} />
      </Routes>
    </div>
  );
}

export default App;