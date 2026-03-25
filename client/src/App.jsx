import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';
import BookAppointment from './pages/BookAppointment';
import AIChat from './pages/AIChat';
import MyRecords from './pages/MyRecords';
import Prescriptions from './pages/Prescriptions';
import LabReports from './pages/LabReports';

import AdminAuth from './pages/AdminAuth';
import AdminDashboard from './pages/AdminDashboard';
import ProfileSettings from './pages/ProfileSettings'; 

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Patient Routes */}
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/ai-chat" element={<AIChat />} />
        <Route path="/my-records" element={<MyRecords />} />
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/lab-reports" element={<LabReports />} />

        {/* 2. ADD THE SETTINGS ROUTE HERE */}
        <Route path="/settings" element={<ProfileSettings />} /> 
        <Route path="/profile" element={<ProfileSettings />} /> {/* Optional: Alias /profile too */}

        {/* Doctor Routes */}
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/pharmacist-dashboard" element={<PharmacistDashboard />} />
        <Route path="/system-override" element={<AdminAuth />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}

export default App;