const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();
const axios = require('axios');

// =========================================================================
// 1. CONFIGURATION & HELPERS
// =========================================================================

// --- EMAIL CONFIGURATION (Nodemailer) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lifelineforyouu@gmail.com', 
        pass: 'vocc tkwi kihe bffu' 
    }
});

// --- IN-MEMORY STORE ---
// Stores OTPs temporarily.
const otpStore = {}; 

// --- HELPER: Load & Parse CSV (Robust Version) ---
const loadCSV = (filename) => {
    try {
        const dataPath = path.join(__dirname, 'data', filename);
        if (!fs.existsSync(dataPath)) {
            console.error(`⚠️ CSV Missing: ${filename}`);
            return [];
        }
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const lines = fileContent.split('\n').filter(l => l.trim());
        const headers = lines.shift().split(',').map(h => h.trim());

        return lines.map(line => {
            // Regex matches: (start or comma) + (quoted string OR non-comma string)
            const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
            let matches = [];
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                let val = match[0].startsWith(',') ? match[0].slice(1) : match[0];
                val = val.replace(/^"|"$/g, '').trim();
                matches.push(val);
            }

            let obj = {};
            headers.forEach((h, i) => {
                obj[h] = matches[i] || '';
            });
            return obj;
        });
    } catch (e) {
        console.error("CSV Parse Error:", e);
        return [];
    }
};

// --- HELPER: Generate Unique ID ---
const generateLifelineID = (role) => {
    const prefix = role === 'patient' ? 'LL-P' : (role === 'doctor' ? 'LL-D' : 'LL-PH');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${new Date().getFullYear()}-${random}`;
};

// --- MIDDLEWARE: Verify JWT Token ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
if (!authHeader) return res.status(403).json({ error: "No token provided" });

const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ error: "No token provided" });
    
    jwt.verify(token, 'secretkey', (err, decoded) => {
        if (err) return res.status(401).json({ error: "Unauthorized" });
        req.user_id = decoded.id;
        req.role = decoded.role;
        next();
    });
};

// =========================================================================
// 2. DATA API (FROM CSV - STATIC DATA)
// =========================================================================

// Get Hospitals (with filters)
router.get('/hospitals', (req, res) => {
    try {
        let hospitals = loadCSV('hospitals.csv');
        const { state, city } = req.query;
        if (state) hospitals = hospitals.filter(h => h.state === state);
        if (city) hospitals = hospitals.filter(h => h.city === city);
        res.json(hospitals);
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: "Failed to load hospitals" });
    }
});

// Get Drugs (Price Comparison)
router.get('/drugs', (req, res) => {
    try {
        let drugs = loadCSV('drugs.csv');
        const { search } = req.query;
        if (search) {
            const lowerSearch = search.toLowerCase();
            drugs = drugs.filter(d => 
                d.brand_name.toLowerCase().includes(lowerSearch) || 
                d.generic_name.toLowerCase().includes(lowerSearch)
            );
        }
        res.json(drugs);
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: "Failed to load drugs" });
    }
});

// =========================================================================
// 3. APPOINTMENT SYSTEM (UPGRADED DATABASE LOGIC)
// =========================================================================

// A. BOOK NEW APPOINTMENT
router.post('/book-appointment', verifyToken, async (req, res) => {
    const { token, hospital, dept, doctor, date, time, fee, ref } = req.body;
    
    try {
        const connection = db.promise();
        
        // Try to find if the selected doctor exists exactly
        const [docUser] = await connection.query(`SELECT user_id FROM doctor_profiles WHERE workplace_name = ? AND department = ?LIMIT 1`,[hospital, dept]);

        const doctorId = docUser.length > 0 ? docUser[0].user_id : null;

        await connection.query(
            `INSERT INTO appointments 
            (user_id, doctor_id, token_number, hospital_name, department, doctor_name, appointment_date, appointment_time, fee, referral, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [req.user_id, doctorId, token, hospital, dept, doctor, date, time, fee, ref]
        );

        // --- SEND NOTIFICATIONS ---
        // 1. Notify the Patient
        await connection.query(
            `INSERT INTO notifications (user_id, type, message) VALUES (?, 'success', '✅ Appointment confirmed at ${hospital} for ${date}.')`, 
            [req.user_id]
        );

        // 2. Notify the Doctors (Exact match OR All doctors in that hospital's department)
        let docsToNotify = [];
        if (doctorId) {
            docsToNotify.push(doctorId);
        } else {
            // Find all doctors working in this specific hospital and department
            const [deptDocs] = await connection.query(
                "SELECT user_id FROM doctor_profiles WHERE workplace_name = ? AND department = ?", 
                [hospital, dept]
            );
            docsToNotify = deptDocs.map(d => d.user_id);
        }

        // Send a notification to every doctor in the list
        for (let dId of docsToNotify) {
            await connection.query(
                `INSERT INTO notifications (user_id, type, message) VALUES (?, 'info', '📅 New appointment booked in your department for ${date} at ${time}.')`, 
                [dId]
            );
        }

        res.json({ message: "Booking Saved Successfully" });

    } catch (err) {
        console.error("❌ Booking Error:", err);
        res.status(500).json({ error: "Failed to save booking" });
    }
});

// B. GET MY APPOINTMENTS (Smart Fetch)
router.get('/my-appointments', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        
        // --- UPGRADE: JOIN with users to get live Doctor Name ---
        const [rows] = await connection.query(`
            SELECT a.*, 
                   COALESCE(u.full_name, a.doctor_name) as display_doctor_name 
            FROM appointments a
            LEFT JOIN users u ON a.doctor_id = u.id
            WHERE a.user_id = ? 
            ORDER BY a.appointment_date DESC, a.created_at DESC`, 
            [req.user_id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// =========================================================================
// 4. REGISTRATION ROUTES (UPGRADED)
// =========================================================================

// --- A. SEND SMS OTP (PATIENT ONLY) ---
router.post('/send-otp', (req, res) => {
    const { aadhaar, dob } = req.body;
    
    const govtDB = loadCSV('government_db.csv');
    const citizen = govtDB.find(u => u.aadhaar_number === aadhaar);

    if (!citizen) return res.status(404).json({ error: "Identity Not Found in Govt Records." });
    if (citizen.dob !== dob) return res.status(400).json({ error: "Date of Birth does not match records." });

    // --- FIXED: GENERATE RANDOM 4-DIGIT OTP ---
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[`REG_${aadhaar}`] = code;

    res.json({ message: "OTP Sent to linked mobile.", otp_hint: code });
});

// --- B. VERIFY SMS OTP (PATIENT ONLY) ---
router.post('/verify-otp', (req, res) => {
    const { aadhaar, otp } = req.body;
    
    // --- FIXED: CHECK AGAINST RANDOM OTP ---
    if (otpStore[`REG_${aadhaar}`] === otp) {
        const govtDB = loadCSV('government_db.csv');
        const citizen = govtDB.find(u => u.aadhaar_number === aadhaar);
        
        if (citizen) {
            delete otpStore[`REG_${aadhaar}`]; // clear OTP after success
            res.json({ message: "Verified", data: citizen });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

// --- C. FETCH UNREGISTERED DEMO CREDENTIALS (NEW ENDPOINT) ---
router.get('/demo-credentials/:role', async (req, res) => {
    const role = req.params.role;
    try {
        const connection = db.promise();
        
        if (role === 'doctor') {
            const registry = loadCSV('doctor_registry.csv');
            // Find already registered doctors
            const [registered] = await connection.query("SELECT license_id FROM doctor_profiles");
            const registeredIds = registered.map(r => r.license_id);
            
            // Filter out registered ones
            const available = registry.filter(d => !registeredIds.includes(d.license_id));
            if (available.length === 0) return res.json({ id: 'All Registered', dob: 'N/A' });
            
            // Pick a random unregistered doctor
            const randomDoc = available[Math.floor(Math.random() * available.length)];
            res.json({ id: randomDoc.license_id, dob: randomDoc.dob });
            
        } else if (role === 'pharmacist') {
            const registry = loadCSV('pharmacist_registry.csv');
            // Find already registered pharmacists
            const [registered] = await connection.query("SELECT reg_id FROM pharmacist_profiles");
            const registeredIds = registered.map(r => r.reg_id);
            
            // Filter out registered ones
            const available = registry.filter(p => !registeredIds.includes(p.reg_id));
            if (available.length === 0) return res.json({ id: 'All Registered', dob: 'N/A' });
            
            // Pick a random unregistered pharmacist
            const randomPharm = available[Math.floor(Math.random() * available.length)];
            res.json({ id: randomPharm.reg_id, dob: randomPharm.dob });
            
        } else {
            res.status(400).json({ error: "Invalid role" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch demo data" });
    }
});

// --- D. VERIFY PROFESSIONAL (DOCTOR/PHARMACIST) ---
router.post('/verify-professional', async (req, res) => {
    const { role, identifier, dob } = req.body; 

    try {
        let registry = [];
        let validPro = null;

        if (role === 'doctor') {
            registry = loadCSV('doctor_registry.csv');
            validPro = registry.find(d => d.license_id === identifier);
        } else if (role === 'pharmacist') {
            registry = loadCSV('pharmacist_registry.csv');
            validPro = registry.find(p => p.reg_id === identifier);
        } else {
            return res.status(400).json({ error: "Invalid Role" });
        }

        if (!validPro) return res.status(404).json({ error: "ID not found in official registry." });
        
        if (validPro.dob !== dob) {
            return res.status(400).json({ error: "Date of Birth does not match official records." });
        }

        const connection = db.promise();
        const [existing] = await connection.query("SELECT email FROM users WHERE email = ?", [validPro.email]);
        
        if (existing.length > 0) {
            return res.status(409).json({ error: "Account already exists. Please Login." });
        }

        res.json({
            message: "Verified",
            data: {
                full_name: validPro.full_name,
                email: validPro.email,
                workplace: validPro.workplace_name || validPro.shop_name,
                department: validPro.department || '' 
            }
        });

    } catch (err) {
        console.error("Prof Verify Error:", err);
        res.status(500).json({ error: "Server Verification Failed" });
    }
});

// --- E. COMPLETE REGISTRATION (FINAL SUBMIT) ---
router.post('/register', async (req, res) => {
    const { role, full_name, email, phone, aadhaar, dob, password, license_id, workplace, department } = req.body;
    const connection = db.promise();
    const unique_id = generateLifelineID(role);

    try {
        if (role === 'patient') {
            const [existing] = await connection.query("SELECT * FROM users WHERE aadhaar_number = ?", [aadhaar]);
            if (existing.length > 0) return res.status(409).json({ error: "This Aadhaar is already registered." });

            const dummyHash = await bcrypt.hash(`PATIENT_${Date.now()}`, 10);

            const [u] = await connection.query(
                `INSERT INTO users (unique_lifeline_id, full_name, email, phone, aadhaar_number, dob, password_hash, role, is_verified) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'patient', 1)`,
                [unique_id, full_name, email, phone, aadhaar, dob, dummyHash]
            );

            await connection.query("INSERT INTO patient_profiles (user_id) VALUES (?)", [u.insertId]);
        } 
        else {
            if (!password) return res.status(400).json({ error: "Password is required." });

            let registry = [], validPro = null;

            if (role === 'doctor') {
                registry = loadCSV('doctor_registry.csv');
                validPro = registry.find(d => d.license_id === license_id);
            } else {
                registry = loadCSV('pharmacist_registry.csv');
                validPro = registry.find(p => p.reg_id === license_id);
            }

            if (!validPro) return res.status(400).json({ error: "Invalid Registration ID." });
            if (validPro.dob !== dob) return res.status(400).json({ error: "DOB Validation Failed." });

            const [existing] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
            if (existing.length > 0) return res.status(409).json({ error: "Email already registered." });

            const hash = await bcrypt.hash(password, 10);
            const [u] = await connection.query(
                `INSERT INTO users (unique_lifeline_id, full_name, email, phone, password_hash, role, is_verified) 
                 VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [unique_id, full_name, email, phone, hash, role]
            );

            if (role === 'doctor') {
                const docDept = validPro.department || department || 'General Medicine';
                await connection.query("INSERT INTO doctor_profiles (user_id, license_id, workplace_name, department) VALUES (?, ?, ?, ?)", [u.insertId, license_id, workplace, docDept]);
            } else {
                await connection.query("INSERT INTO pharmacist_profiles (user_id, reg_id, shop_name) VALUES (?, ?, ?)", [u.insertId, license_id, workplace]);
            }
        }

        res.json({ message: "Registration Successful", unique_id });

    } catch (err) {
        console.error("Register Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Account details (Email/ID) already exist." });
        }
        res.status(500).json({ error: "Server Error during Registration." });
    }
});

// =========================================================================
// 5. LOGIN SYSTEM
// =========================================================================

router.post('/login-send-otp', async (req, res) => {
    const { identifier } = req.body;
    const connection = db.promise();

    try {
        const [users] = await connection.query(
            "SELECT * FROM users WHERE email = ? OR unique_lifeline_id = ?", 
            [identifier, identifier]
        );

        if (users.length === 0) return res.status(404).json({ error: "User not found. Please Register." });
        const user = users[0];

        if (user.role !== 'patient') return res.status(400).json({ error: "Professionals must use Password Login." });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[user.email] = code;

        await transporter.sendMail({
            from: '"Lifeline Secure" <lifelineforyouu@gmail.com>',
            to: user.email,
            subject: 'Your Login Verification Code',
            html: `<h3>Your Lifeline Login Code is: <b style="color:#0ea5e9">${code}</b></h3><p>Valid for 10 minutes.</p>`
        });

        console.log(`[EMAIL LOG] OTP ${code} sent to ${user.email}`);
        
        // --- FIXED: Pass the random OTP back to the frontend for Demo purposes ---
        res.json({ message: "Verification code sent to email.", otp_hint: code });

    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ error: "Failed to send email." });
    }
});

router.post('/login-verify-otp', async (req, res) => {
    const { identifier, otp } = req.body;
    const connection = db.promise();

    try {
        const [users] = await connection.query("SELECT * FROM users WHERE email = ? OR unique_lifeline_id = ?", [identifier, identifier]);
        if (users.length === 0) return res.status(404).json({ error: "User not found" });
        const user = users[0];

        if (otpStore[user.email] === otp) {
            delete otpStore[user.email];
            const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey', { expiresIn: '24h' });
            res.json({ 
                message: "Success", 
                token, 
                user: { name: user.full_name, role: user.role, id: user.unique_lifeline_id } 
            });
        } else {
            res.status(400).json({ error: "Invalid or Expired OTP." });
        }
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

router.post('/login-password', async (req, res) => {
    const { identifier, password } = req.body;
    const connection = db.promise();

    try {
        let user = null;
        const [byEmail] = await connection.query("SELECT * FROM users WHERE email = ?", [identifier]);
        if (byEmail.length > 0) user = byEmail[0];

        if (!user) {
            const [doc] = await connection.query("SELECT user_id FROM doctor_profiles WHERE license_id = ?", [identifier]);
            if (doc.length > 0) { const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [doc[0].user_id]); user = u[0]; }
        }

        if (!user) {
            const [pharm] = await connection.query("SELECT user_id FROM pharmacist_profiles WHERE reg_id = ?", [identifier]);
            if (pharm.length > 0) { const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [pharm[0].user_id]); user = u[0]; }
        }

        if (!user) return res.status(400).json({ error: "User not found." });
        if (user.role === 'patient') return res.status(400).json({ error: "Patients must use OTP Login." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid Password." });

        const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey', { expiresIn: '24h' });
        res.json({ 
            message: "Success", 
            token, 
            user: { name: user.full_name, role: user.role, id: user.unique_lifeline_id } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.post('/google-login', async (req, res) => {
    const { email } = req.body;
    try {
        const connection = db.promise();
        const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

        if (users.length === 0) return res.status(404).json({ error: "Email not registered." });

        const user = users[0];
        const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey', { expiresIn: '24h' });

        res.json({ 
            message: "Google Login Successful", 
            token, 
            user: { name: user.full_name, role: user.role, id: user.unique_lifeline_id } 
        });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// =========================================================================
// 6. FORGOT PASSWORD & PROFILE
// =========================================================================

router.post('/forgot-password-init', async (req, res) => {
    const { identifier } = req.body;
    const connection = db.promise();

    try {
        let user = null;
        const [byEmail] = await connection.query("SELECT * FROM users WHERE email = ?", [identifier]);
        if (byEmail.length > 0) user = byEmail[0];

        if (!user) {
            const [doc] = await connection.query("SELECT user_id FROM doctor_profiles WHERE license_id = ?", [identifier]);
            if (doc.length > 0) { const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [doc[0].user_id]); user = u[0]; }
        }

        if (!user || user.role === 'patient') return res.status(404).json({ error: "Professional account not found." });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[user.email] = code;

        await transporter.sendMail({
            from: '"Lifeline Support"', to: user.email, subject: 'Password Reset', text: `Reset Code: ${code}`
        });

        const masked = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        res.json({ message: "OTP Sent", email_hint: masked });

    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

router.post('/forgot-password-complete', async (req, res) => {
    const { identifier, otp, newPassword } = req.body;
    const connection = db.promise();

    try {
        let user = null;
        const [byEmail] = await connection.query("SELECT * FROM users WHERE email = ?", [identifier]);
        if (byEmail.length > 0) user = byEmail[0];
        
        if (!user && identifier.includes('@') === false) {
             const [doc] = await connection.query("SELECT user_id FROM doctor_profiles WHERE license_id = ?", [identifier]);
             if (doc.length > 0) { const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [doc[0].user_id]); user = u[0]; }
        }

        if (!user) return res.status(400).json({ error: "Invalid Request" });
        if (otpStore[user.email] !== otp) return res.status(400).json({ error: "Invalid OTP" });

        const hash = await bcrypt.hash(newPassword, 10);
        await connection.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id]);
        
        delete otpStore[user.email];
        res.json({ message: "Password Reset Successfully" });

    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

router.get('/profile', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        
        if (req.role === 'patient') {
            const [rows] = await connection.query(`
                SELECT u.full_name, u.email, u.phone, u.unique_lifeline_id, u.aadhaar_number, u.dob,
                       YEAR(u.dob) as yob_check,
                       p.blood_group, p.allergies, p.emergency_contact, 
                       p.health_tags, p.profile_image 
                FROM users u
                LEFT JOIN patient_profiles p ON u.id = p.user_id
                WHERE u.id = ?
            `, [req.user_id]);
            if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
            res.json(rows[0]);
        } 
        else if (req.role === 'doctor') {
            const [rows] = await connection.query(`
                SELECT u.full_name, u.email, u.phone, u.unique_lifeline_id,
                       d.license_id, d.workplace_name, d.department
                FROM users u
                LEFT JOIN doctor_profiles d ON u.id = d.user_id
                WHERE u.id = ?
            `, [req.user_id]);
            if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
            res.json(rows[0]);
        }
        else if (req.role === 'pharmacist') {
            const [rows] = await connection.query(`
                SELECT u.full_name, u.email, u.phone, u.unique_lifeline_id,
                       p.reg_id, p.shop_name
                FROM users u
                LEFT JOIN pharmacist_profiles p ON u.id = p.user_id
                WHERE u.id = ?
            `, [req.user_id]);
            if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
            res.json(rows[0]);
        }

    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/profile/update', verifyToken, async (req, res) => {
    const { blood, allergies, emergency_contact, phone, health_tags, profile_image } = req.body;
    try {
        const connection = db.promise();
        await connection.query("UPDATE users SET phone = ? WHERE id = ?", [phone, req.user_id]);

        const tagsJSON = JSON.stringify(health_tags || []);

        await connection.query(`
            UPDATE patient_profiles 
            SET blood_group = ?, allergies = ?, emergency_contact = ?, health_tags = ?, profile_image = ? 
            WHERE user_id = ?
        `, [blood, allergies, emergency_contact, tagsJSON, profile_image, req.user_id]);

        res.json({ message: "Profile Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// 7. NOTIFICATION SYSTEM
// =========================================================================

router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        const [rows] = await connection.query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", 
            [req.user_id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

router.put('/notifications/read', verifyToken, async (req, res) => {
    const { id, all } = req.body; 
    try {
        const connection = db.promise();
        if (all) {
            await connection.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user_id]);
        } else {
            await connection.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, req.user_id]);
        }
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ error: "Update Failed" }); }
});

router.delete('/notifications/:id', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        await connection.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [req.params.id, req.user_id]);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: "Delete Failed" }); }
});

// =========================================================================
// 8. SECURE MEDICAL RECORDS
// =========================================================================

router.post('/verify-dob-year', verifyToken, async (req, res) => {
    const { yob } = req.body;
    try {
        const connection = db.promise();
        
        // 1. Get Year from DB
        const [users] = await connection.query(
            "SELECT YEAR(dob) as dbYear, email FROM users WHERE id = ?", 
            [req.user_id]
        );
        
        if (users.length === 0 || !users[0].dbYear) {
            return res.status(400).json({ error: "No Date of Birth found in profile." });
        }

        const userYear = users[0].dbYear.toString();
        const inputYear = yob.toString().trim();
        const email = users[0].email.toLowerCase().trim(); 

        // 2. Check Match
        if (userYear === inputYear) {
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            otpStore[`${email}_MED`] = code;
            
            try {
                await transporter.sendMail({
                    from: '"Lifeline Security" <lifelineforyouu@gmail.com>',
                    to: users[0].email,
                    subject: 'Medical Unlock Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #0d6efd;">Lifeline Security</h2>
                            <p>You requested access to your secure medical records.</p>
                            <p>Your One-Time Password (OTP) is:</p>
                            <h1 style="background: #f8f9fa; padding: 10px 20px; display: inline-block; border-radius: 5px; color: #dc3545;">${code}</h1>
                        </div>
                    `
                });
                res.json({ message: "OTP Sent" });
            } catch (emailErr) {
                console.error("Email Failed:", emailErr.message);
                res.json({ message: "OTP Generated (Check Console if Email fails)" }); 
            }

        } else {
            res.status(400).json({ error: `Incorrect Year. Please check your profile.` });
        }
    } catch (err) { 
        res.status(500).json({ error: "Server Error" }); 
    }
});

router.post('/verify-medical-otp', verifyToken, async (req, res) => {
    const { otp } = req.body;
    try {
        const connection = db.promise();
        const [users] = await connection.query("SELECT email FROM users WHERE id = ?", [req.user_id]);
        
        if (users.length === 0) return res.status(404).json({ error: "User not found" });
        
        const email = users[0].email.toLowerCase().trim(); 
        const storedOTP = otpStore[`${email}_MED`];
        const inputOTP = otp ? otp.toString().trim() : '';

        if (!storedOTP) {
            return res.status(400).json({ error: "OTP Expired. Please request a new one." });
        }

        if (storedOTP === inputOTP) {
            delete otpStore[`${email}_MED`]; // Burn OTP
            
            // --- NEW: Log Patient Self-Access ---
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
            await connection.query(
                "INSERT INTO access_logs (actor_id, target_id, action_type, ip_address) VALUES (?, ?, 'patient_access', ?)",
                [req.user_id, req.user_id, ip]
            );
            // ------------------------------------

            res.json({ message: "Access Granted" });
        } else {
            res.status(400).json({ error: "Invalid OTP" });
        }
    } catch (err) { 
        res.status(500).json({ error: "Server Error" }); 
    }
});

// GET PATIENT ACCESS LOGS
router.get('/patient/access-logs', verifyToken, async (req, res) => {
    if(req.role !== 'patient') return res.status(403).json({error: "Access Denied"});
    try {
        const [logs] = await db.promise().query(`
            SELECT al.id, al.action_type, al.timestamp, al.ip_address,
                   u.full_name as actor_name, u.role as actor_role,
                   dp.workplace_name as hospital
            FROM access_logs al
            JOIN users u ON al.actor_id = u.id
            LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
            WHERE al.target_id = ?
            ORDER BY al.timestamp DESC
        `, [req.user_id]);
        
        res.json(logs);
    } catch (err) {
        res.status(500).json({error: "Failed to fetch access logs"});
    }
});

router.get('/my-records', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        const [rows] = await connection.query(`
            SELECT mr.*, 
                   u.full_name as doctor_name, 
                   COALESCE(
                       NULLIF(dp.workplace_name, ''), 
                       (SELECT NULLIF(hospital_name, '') FROM appointments a WHERE a.user_id = mr.patient_id AND a.doctor_id = mr.doctor_id ORDER BY created_at DESC LIMIT 1)
                   ) as hospital_name 
            FROM medical_records mr
            JOIN users u ON mr.doctor_id = u.id
            LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
            WHERE mr.patient_id = ?
            ORDER BY mr.visit_date DESC
        `, [req.user_id]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load medical records" });
    }
});

router.get('/my-prescriptions', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        const [rows] = await connection.query(`
            SELECT mr.id, mr.diagnosis, mr.prescription, mr.visit_date, mr.expiry_date,
                   u.full_name as doctor_name, 
                   COALESCE(
                       NULLIF(dp.workplace_name, ''), 
                       (SELECT NULLIF(hospital_name, '') FROM appointments a WHERE a.user_id = mr.patient_id AND a.doctor_id = mr.doctor_id ORDER BY created_at DESC LIMIT 1)
                   ) as hospital_name
            FROM medical_records mr
            LEFT JOIN users u ON mr.doctor_id = u.id
            LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
            WHERE mr.patient_id = ? 
            AND mr.prescription IS NOT NULL 
            AND mr.prescription != ''
            ORDER BY mr.visit_date DESC
        `, [req.user_id]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load prescriptions" });
    }
});


router.get('/my-lab-reports', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        const [rows] = await connection.query(`
            SELECT mr.id, mr.diagnosis, mr.lab_results, mr.lab_orders, mr.visit_date, 
                   COALESCE(u.full_name, 'Pathology Lab') as doctor_name,
                   COALESCE(
                       NULLIF(dp.workplace_name, ''), 
                       (SELECT NULLIF(hospital_name, '') FROM appointments a WHERE a.user_id = mr.patient_id AND a.doctor_id = mr.doctor_id ORDER BY created_at DESC LIMIT 1)
                   ) as hospital_name
            FROM medical_records mr
            LEFT JOIN users u ON mr.doctor_id = u.id
            LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
            WHERE mr.patient_id = ? 
            AND (mr.lab_results IS NOT NULL OR mr.lab_orders IS NOT NULL OR mr.lab_orders != '')
            ORDER BY mr.visit_date DESC
        `, [req.user_id]);
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load reports" });
    }
});

// =========================================================================
// 9. ACCOUNT SETTINGS & SECURITY
// =========================================================================

router.post('/settings/email-otp', verifyToken, async (req, res) => {
    const { newEmail } = req.body;
    try {
        const connection = db.promise();
        const [exists] = await connection.query("SELECT id FROM users WHERE email = ?", [newEmail]);
        if(exists.length > 0) return res.status(409).json({ error: "Email already in use." });

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        otpStore[`UPDATE_EMAIL_${req.user_id}`] = { email: newEmail, code: code };

        await transporter.sendMail({
            from: '"Lifeline Security" <lifelineforyouu@gmail.com>',
            to: newEmail,
            subject: 'Verify Email Change',
            html: `<h3>Verification Code: <b>${code}</b></h3><p>Use this to confirm your new email address.</p>`
        });

        res.json({ message: "OTP sent to new email." });

    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

router.post('/settings/verify-email', verifyToken, async (req, res) => {
    const { otp } = req.body;
    const pending = otpStore[`UPDATE_EMAIL_${req.user_id}`];

    if (!pending) return res.status(400).json({ error: "No pending request." });
    if (pending.code !== otp) return res.status(400).json({ error: "Invalid OTP." });

    try {
        const connection = db.promise();
        await connection.query("UPDATE users SET email = ? WHERE id = ?", [pending.email, req.user_id]);
        delete otpStore[`UPDATE_EMAIL_${req.user_id}`];
        res.json({ message: "Email updated successfully!" });
    } catch (err) { res.status(500).json({ error: "Update Failed" }); }
});

router.delete('/settings/delete-account', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        await connection.query("DELETE FROM users WHERE id = ?", [req.user_id]);
        await connection.query("DELETE FROM patient_profiles WHERE user_id = ?", [req.user_id]);
        await connection.query("DELETE FROM medical_records WHERE patient_id = ?", [req.user_id]);
        
        res.json({ message: "Account deleted." });
    } catch (err) { res.status(500).json({ error: "Deletion Failed" }); }
});

router.post('/settings/phone-otp', verifyToken, async (req, res) => {
    const { newPhone } = req.body;
    try {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        otpStore[`UPDATE_PHONE_${req.user_id}`] = { phone: newPhone, code: code };
        
        res.json({ message: "OTP sent to mobile.", debug_otp: code }); 

    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

router.post('/settings/verify-phone', verifyToken, async (req, res) => {
    const { otp } = req.body;
    const pending = otpStore[`UPDATE_PHONE_${req.user_id}`];

    if (!pending) return res.status(400).json({ error: "No pending request." });
    if (pending.code !== otp) return res.status(400).json({ error: "Invalid OTP." });

    try {
        const connection = db.promise();
        await connection.query("UPDATE users SET phone = ? WHERE id = ?", [pending.phone, req.user_id]);
        delete otpStore[`UPDATE_PHONE_${req.user_id}`];
        res.json({ message: "Phone number updated successfully!" });
    } catch (err) { res.status(500).json({ error: "Update Failed" }); }
});

// =========================================================================
// 10. REAL AI CHAT BOT (OPENROUTER LLM INTEGRATION)
// =========================================================================

router.post('/ai-chat', verifyToken, async (req, res) => {
    const { message } = req.body;
    try {
        const connection = db.promise();
        
        // 1. Fetch Patient Context
        const [profile] = await connection.query(
            `SELECT u.full_name, TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age,
                    p.blood_group, p.allergies, p.health_tags
             FROM users u 
             LEFT JOIN patient_profiles p ON u.id = p.user_id 
             WHERE u.id = ?`, [req.user_id]
        );
        
        // 2. Fetch Medical History
        const [history] = await connection.query(
            `SELECT diagnosis, prescription, lab_results 
             FROM medical_records 
             WHERE patient_id = ? 
             ORDER BY visit_date DESC LIMIT 5`, [req.user_id]
        );

        const userContext = profile[0] || { full_name: "Patient", age: "Unknown", blood_group: "Unknown" };
        
        // 3. Construct System Prompt
        const systemPrompt = `
            You are the 'Lifeline Health Assistant', a professional AI for a secure healthcare app.
            You are talking to: ${userContext.full_name}, Age: ${userContext.age}, Blood: ${userContext.blood_group}.
            Allergies: ${userContext.allergies || 'None'}.
            Recent Medical History: ${JSON.stringify(history)}.
            
            RULES:
            1. Keep answers concise, empathetic, and strictly related to health/medicine based on their history.
            2. If they ask about non-health topics, politely decline.
            3. Always add a disclaimer that you are an AI and they should consult their doctor for emergencies.
        `;

        // 4. Call OpenRouter API
        const aiResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000", 
                    "X-Title": "Lifeline AI"
                }
            }
        );
        
        // 5. Send Response back to React
        res.json({ response: aiResponse.data.choices[0].message.content });

    } catch (err) {
        console.error("OpenRouter API Error:", err.response?.data || err.message);
        res.status(500).json({ error: "AI Services are currently unavailable." });
    }
});

// NEW: AI Health Analyzer Route for Dashboard suggestions
router.get('/ai/analyze-health', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        
        // Fetch patient details
        const [patient] = await connection.query(
            "SELECT blood_group, allergies, health_tags FROM patient_profiles WHERE user_id = ?", [req.user_id]
        );

        // Fetch recent lab results
        const [labs] = await connection.query(
            "SELECT lab_results FROM medical_records WHERE patient_id = ? AND lab_results IS NOT NULL ORDER BY visit_date DESC LIMIT 5", [req.user_id]
        );

        // Extract individual tests for the "Select Lab Result" dropdown
        let recentLabs = [];
        labs.forEach(row => {
            try {
                const results = typeof row.lab_results === 'string' ? JSON.parse(row.lab_results) : row.lab_results;
                results.forEach(item => recentLabs.push(`${item.test}: ${item.result}`));
            } catch(e) {}
        });

        // Simple suggestion logic based on blood group or allergies
        let suggestions = ["Regular Checkup"];
        if (patient[0]?.blood_group?.includes('-')) suggestions.push("Iron Deficiency");
        if (patient[0]?.allergies) suggestions.push("Seasonal Allergies");

        res.json({
            suggested_conditions: [...new Set(suggestions)],
            recent_labs: [...new Set(recentLabs)]
        });
    } catch (err) {
        res.status(500).json({ error: "AI Scan failed" });
    }
});


// =========================================================================
// 11. DOCTOR SPECIFIC ROUTES (New Additions)
// =========================================================================
router.get('/doctor/appointments', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') {
        return res.status(403).json({ error: "Access Denied" });
    }

    try {
        const connection = db.promise();

        // 1️⃣ Get doctor's workplace + department
        const [docProfile] = await connection.query(
            "SELECT workplace_name, department FROM doctor_profiles WHERE user_id = ?",
            [req.user_id]
        );

        if (!docProfile.length) {
            return res.json([]); // doctor profile not set yet
        }

        const workplace = docProfile[0].workplace_name;
        const dept = docProfile[0].department;

        // 2️⃣ Fetch matching appointments
        const [rows] = await connection.query(`
            SELECT 
                a.id,
                a.token_number,
                a.appointment_date,
                a.appointment_time,
                a.department,
                a.hospital_name,
                a.status,
                u.full_name AS patient_name,
                u.id AS patient_id,
                u.unique_lifeline_id
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            WHERE 
                (
                    a.doctor_id = ?
                    OR 
                    (a.hospital_name = ? AND a.department = ?)
                )
            AND a.status = 'pending'
            AND a.appointment_date >= CURDATE()
            ORDER BY 
                a.appointment_date ASC,
                a.token_number ASC
        `, [req.user_id, workplace, dept]);

        res.json(rows);

    } catch (err) {
        console.error("Doctor Queue Error:", err);
        res.status(500).json({ error: "Failed to load doctor appointments" });
    }
});

// A2. GET PATHOLOGIST PENDING LABS (For Lab Sidebar)
router.get('/doctor/pending-labs', verifyToken, async (req, res) => {
    if (req.role !== 'doctor')
        return res.status(403).json({ error: "Access Denied" });

    try {
        const connection = db.promise();

        const [rows] = await connection.query(`
            SELECT 
                lq.id,
                lq.token_number,
                lq.status,
                mr.lab_orders,
                u.full_name as patient_name,
                u.unique_lifeline_id,
                u.id as patient_id
            FROM lab_queue lq
            JOIN medical_records mr ON lq.record_id = mr.id
            JOIN users u ON lq.patient_id = u.id
            WHERE lq.pathologist_id = ?
            AND lq.status = 'waiting'
            ORDER BY lq.token_number ASC
        `, [req.user_id]);

        res.json(rows);

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch lab queue" });
    }
});

// B. GET PATIENT DETAILS (Smart Search: Accepts ID, QR String, or JSON QR)
router.get('/doctor/patient-basics/:identifier', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') return res.status(403).json({ error: "Access Denied" });

    let { identifier } = req.params;
    identifier = identifier.trim();

    if (identifier.startsWith('{') || identifier.includes('"id":')) {
        try {
            const parsed = JSON.parse(identifier);
            if (parsed.id) identifier = parsed.id; 
        } catch (e) {}
    }

    try {
        const connection = db.promise();
        
        let query = `
            SELECT u.id, u.full_name, u.phone, u.unique_lifeline_id, u.email,
                   p.blood_group, p.allergies, p.emergency_contact, p.health_tags,
                   TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age
            FROM users u
            JOIN patient_profiles p ON u.id = p.user_id
            WHERE `;
        
        if (/^\d+$/.test(identifier)) {
            query += `u.id = ?`; 
        } else {
            query += `u.unique_lifeline_id = ?`; 
        }

        const [profile] = await connection.query(query, [identifier]);

        if (profile.length === 0) return res.status(404).json({ error: "Patient not found in database." });

        const patientId = profile[0].id;
        
        const [recentRecords] = await connection.query(`
            SELECT id, diagnosis, visit_date, lab_results, lab_orders, procedures, prescription
            FROM medical_records 
            WHERE patient_id = ? 
            ORDER BY visit_date DESC LIMIT 10
        `, [patientId]);

        res.json({ profile: profile[0], recent_records: recentRecords });

    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});


// C. EMERGENCY "BREAK GLASS" ACCESS (Tier 3)
router.post('/doctor/emergency-access', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') return res.status(403).json({ error: "Access Denied" });
    const { patient_id, reason } = req.body; 

    try {
        const connection = db.promise();
        const [fullHistory] = await connection.query(`SELECT * FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC`, [patient_id]);
        const [contact] = await connection.query(`SELECT emergency_contact FROM patient_profiles WHERE user_id = ?`, [patient_id]);
        
        await connection.query(
            `INSERT INTO notifications (user_id, type, message) VALUES (?, 'danger', '⚠️ EMERGENCY ACCESS: A doctor has used break-glass override to access your medical records. Reason: ${reason}')`,
            [patient_id]
        );

        // --- NEW: Log Emergency Override ---
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        await connection.query(
            "INSERT INTO access_logs (actor_id, target_id, action_type, ip_address) VALUES (?, ?, 'doctor_override', ?)",
            [req.user_id, patient_id, ip]
        );
        // -----------------------------------
        
        const familyMsg = contact[0]?.emergency_contact ? `ALERT: Emergency medical access granted for patient. Reason: ${reason}.` : "No emergency contact on file.";

        res.json({ message: "ACCESS GRANTED. Audit Logged.", history: fullHistory, audit_notice: familyMsg });
    } catch (err) { res.status(500).json({ error: "Emergency Protocol Failed" }); }
});

// D. GET DOCTOR'S CONSULTATION HISTORY
router.get('/doctor/my-history', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') return res.status(403).json({ error: "Access Denied" });
    try {
        const connection = db.promise();
        const [rows] = await connection.query(`
            SELECT mr.id, mr.patient_id, mr.visit_date, mr.diagnosis, mr.prescription, mr.lab_results, mr.lab_orders, mr.procedures,
                   u.full_name as patient_name, u.unique_lifeline_id
            FROM medical_records mr 
            JOIN users u ON mr.patient_id = u.id
            WHERE mr.doctor_id = ? 
            ORDER BY mr.visit_date DESC LIMIT 50
        `, [req.user_id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Failed to load history" }); }
});

// D2. GET PATHOLOGIST HISTORY
router.get('/doctor/pathology-history', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') return res.status(403).json({ error: "Access Denied" });
    try {
        const connection = db.promise();
        const [rows] = await connection.query(`
            SELECT mr.id, mr.patient_id, mr.visit_date, mr.diagnosis, mr.lab_results, mr.lab_orders, 
                   u.full_name as patient_name, u.unique_lifeline_id
            FROM medical_records mr
            JOIN users u ON mr.patient_id = u.id
            WHERE mr.lab_results IS NOT NULL 
            AND mr.lab_results != ''
            ORDER BY mr.visit_date DESC LIMIT 50
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Failed to load history" }); }
});


// E. GENERAL DOCTOR: CREATE PRESCRIPTION & LAB ORDERS & SET REMINDERS
router.post('/doctor/create-prescription', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') return res.status(403).json({ error: "Access Denied" });

    const { appointment_id, patient_id, diagnosis, prescription, expiry_date, lab_orders, procedures, follow_up_date } = req.body;

    try {
        const connection = db.promise();

        // 1. Save medical record
        await connection.query(
            `INSERT INTO medical_records 
            (patient_id, doctor_id, diagnosis, prescription, expiry_date, lab_orders, procedures, visit_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [patient_id, req.user_id, diagnosis, prescription, expiry_date, lab_orders, procedures]
        );

        // 2. Mark EXACT appointment as completed
        await connection.query(
            `UPDATE appointments SET status = 'completed' WHERE id = ?`,
            [appointment_id]
        );

        // 3. Notify patient of the new record
        await connection.query(
            `INSERT INTO notifications (user_id, type, message) VALUES (?, 'success', '💊 A new prescription/medical record has been added to your account.')`,
            [patient_id]
        );

        // 4. NEW: IF FOLLOW UP DATE IS SET, SCHEDULE A REMINDER
        if (follow_up_date) {
            const [doc] = await connection.query("SELECT full_name FROM users WHERE id = ?", [req.user_id]);
            const docName = doc.length > 0 ? doc[0].full_name : "your doctor";
            
            const reminderMsg = `This is a friendly reminder for your follow-up visit regarding your recent treatment for ${diagnosis} with Dr. ${docName}.`;
            
            await connection.query(
                "INSERT INTO reminders (patient_id, doctor_id, reminder_date, message) VALUES (?, ?, ?, ?)",
                [patient_id, req.user_id, follow_up_date, reminderMsg]
            );
        }

        res.json({ message: "Record Saved Successfully" });

    } catch (err) {
        console.error("Prescription Save Error:", err);
        res.status(500).json({ error: "Failed to create record" });
    }
});

// F. PATHOLOGIST: UPLOAD LAB RESULTS & ALERT DOCTOR
router.post('/doctor/upload-lab-result', verifyToken, async (req, res) => {
    if (req.role !== 'doctor') return res.status(403).json({ error: "Access Denied" });
    const { record_id, patient_id, lab_results } = req.body;

    try {
        const connection = db.promise();
        
        if (record_id) {
            await connection.query(
                `UPDATE medical_records SET lab_results = ? WHERE id = ?`,
                [lab_results, record_id]
            );

            // mark ONLY active waiting entry as completed
            await connection.query(`
                UPDATE lab_queue 
                SET status = 'completed'
                WHERE record_id = ?
                AND status = 'waiting'
                LIMIT 1
            `, [record_id]);
                    
            // --- ALERT PRESCRIBING DOCTOR ---
            const [rec] = await connection.query(`SELECT doctor_id FROM medical_records WHERE id = ?`, [record_id]);
            if (rec.length > 0 && rec[0].doctor_id) {
                const [pat] = await connection.query(`SELECT full_name FROM users WHERE id = ?`, [patient_id]);
                const pName = pat.length > 0 ? pat[0].full_name : "your patient";
                await connection.query(
                    `INSERT INTO notifications (user_id, type, message) VALUES (?, 'success', '🧪 Lab results are ready for patient: ${pName}.')`, 
                    [rec[0].doctor_id]
                );
            }
        } else {
            await connection.query(
                `INSERT INTO medical_records (patient_id, doctor_id, diagnosis, lab_results, visit_date) VALUES (?, ?, 'Pathology Test', ?, NOW())`,
                [patient_id, req.user_id, lab_results]
            );
        }

        // --- NEW: NOTIFY PATIENT ---
        await connection.query(
            `INSERT INTO notifications (user_id, type, message) VALUES (?, 'info', '🔬 Your new lab test results are now available to view.')`, 
            [patient_id]
        );
        // ---------------------------

        res.json({ message: "Lab Result Uploaded Successfully" });
    } catch (err) { res.status(500).json({ error: "Failed to upload result" }); }
});

// ADD TO LAB QUEUE (Manual Only)
router.post('/doctor/add-to-lab-queue', verifyToken, async (req, res) => {
    if (req.role !== 'doctor')
        return res.status(403).json({ error: "Access Denied" });

    const { patient_id } = req.body;

    try {
        const connection = db.promise();

        // find latest pending lab order
        const [pendingLab] = await connection.query(`
            SELECT id FROM medical_records
            WHERE patient_id = ?
            AND lab_orders IS NOT NULL
            AND lab_orders != ''
            AND (lab_results IS NULL OR lab_results = '')
            ORDER BY visit_date DESC
            LIMIT 1
        `, [patient_id]);

        if (!pendingLab.length)
            return res.status(400).json({ error: "No pending lab order found" });

        const recordId = pendingLab[0].id;

        // 🚫 prevent duplicate entry
        const [already] = await connection.query(`
            SELECT id FROM lab_queue
            WHERE record_id = ?
            AND status = 'waiting'
        `, [recordId]);

        if (already.length > 0)
            return res.json({ message: "Already in queue" });

        // generate today's next token
        const [lastToken] = await connection.query(`
            SELECT MAX(token_number) as last
            FROM lab_queue
            WHERE DATE(created_at) = CURDATE()
        `);

        const nextToken = (lastToken[0].last || 0) + 1;

        await connection.query(`
            INSERT INTO lab_queue (record_id, patient_id, pathologist_id, token_number)
            VALUES (?, ?, ?, ?)
        `, [recordId, patient_id, req.user_id, nextToken]);

        res.json({ message: "Added to Lab Queue", token: nextToken });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Queue add failed" });
    }
});

// =========================================================================
// 12. DOCTOR ACCESS OTP (New)
// =========================================================================

// A. REQUEST OTP (Logs to Terminal)
router.post('/doctor/request-access-otp', verifyToken, async (req, res) => {
    const { patient_id } = req.body;
    try {
        const connection = db.promise();
        // Get patient email
        const [users] = await connection.query("SELECT email, full_name FROM users WHERE id = ?", [patient_id]);
        if (users.length === 0) return res.status(404).json({ error: "Patient not found" });

        const patient = users[0];
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Store OTP linked to this specific access request
        const key = `ACCESS_OTP_${req.user_id}_${patient_id}`; // Key: DocID_PatientID
        otpStore[key] = code;

        console.log("\n==================================================");
        console.log(`[EMAIL SIMULATION] To: ${patient.email}`);
        console.log(`Subject: Doctor Access Request`);
        console.log(`Your OTP to allow access is: >> ${code} <<`);
        console.log("==================================================\n");

        res.json({ message: "OTP sent to patient's email (Check Server Console)" });

    } catch (err) {
        res.status(500).json({ error: "Failed to generate OTP" });
    }
});

// B. VERIFY OTP (Doctor Access)
router.post('/doctor/verify-access-otp', verifyToken, async (req, res) => {
    const { patient_id, otp } = req.body;
    const key = `ACCESS_OTP_${req.user_id}_${patient_id}`;

    if (otpStore[key] === otp) {
        delete otpStore[key]; // Burn OTP after use
        try {
            const connection = db.promise();
            
            // --- NEW: Log Doctor Normal Access ---
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
            await connection.query(
                "INSERT INTO access_logs (actor_id, target_id, action_type, ip_address) VALUES (?, ?, 'doctor_normal', ?)",
                [req.user_id, patient_id, ip]
            );
            // -------------------------------------

            const [fullHistory] = await connection.query(
                `SELECT * FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC`, 
                [patient_id]
            );
            res.json({ message: "Access Granted", history: fullHistory });
        } catch (err) {
            res.status(500).json({ error: "Failed to load full history" });
        }
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

// =========================================================================
// 13. HIDDEN ADMIN SYSTEM
// =========================================================================

const ADMIN_SECRET_KEY = "LIFELINE_MASTER_2026"; 
let isSystemInMaintenance = false; 

// A. HIDDEN ADMIN REGISTRATION
router.post('/admin/register', async (req, res) => {
    const { full_name, email, password, secret_key } = req.body;

    if (secret_key !== ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: "Invalid Master Key. Access Denied." });
    }

    try {
        const connection = db.promise();
        const [existing] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existing.length > 0) return res.status(409).json({ error: "Email already registered." });

        const hash = await bcrypt.hash(password, 10);
        const unique_id = `LL-ADMIN-${Math.floor(1000 + Math.random() * 9000)}`;

        await connection.query(
            `INSERT INTO users (unique_lifeline_id, full_name, email, password_hash, role, is_verified) 
             VALUES (?, ?, ?, ?, 'admin', 1)`,
            [unique_id, full_name, email, hash]
        );

        res.json({ message: "Admin Authorized and Registered", unique_id });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// B. ADMIN LOGIN
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const connection = db.promise();
        const [users] = await connection.query("SELECT * FROM users WHERE email = ? AND role = 'admin'", [email]);

        if (users.length === 0) return res.status(404).json({ error: "Admin account not found." });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid Credentials." });

        const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey', { expiresIn: '24h' });
        res.json({ message: "Admin Login Success", token, user: { name: user.full_name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// C. GET ADMIN DASHBOARD STATS
router.get('/admin/dashboard-stats', verifyToken, async (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: "Access Denied. Admins Only." });

    try {
        const connection = db.promise();
        
        const [patients] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'patient'");
        const [doctors] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'");
        const [pharmacists] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'pharmacist'");
        const [records] = await connection.query("SELECT COUNT(*) as count FROM medical_records");
        
        const [recentUsers] = await connection.query(`
            SELECT unique_lifeline_id, full_name, role, created_at 
            FROM users 
            ORDER BY created_at DESC LIMIT 5
        `);

        res.json({
            metrics: {
                total_patients: patients[0].count,
                total_doctors: doctors[0].count,
                total_pharmacists: pharmacists[0].count,
                total_records: records[0].count
            },
            recent_users: recentUsers
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to load system metrics" });
    }
});

// D. USER MANAGEMENT: GET ALL USERS
router.get('/admin/users', verifyToken, async (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: "Access Denied." });
    try {
        const connection = db.promise();
        const [users] = await connection.query("SELECT id, unique_lifeline_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC");
        res.json(users);
    } catch (err) { res.status(500).json({ error: "Failed to fetch users" }); }
});

// E. USER MANAGEMENT: DELETE USER
router.delete('/admin/users/:id', verifyToken, async (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: "Access Denied." });
    try {
        const connection = db.promise();
        await connection.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ message: "User permanently deleted" });
    } catch (err) { res.status(500).json({ error: "Failed to delete user" }); }
});

// F. SYSTEM MAINTENANCE TOGGLE
router.get('/admin/maintenance', verifyToken, (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: "Access Denied." });
    res.json({ status: isSystemInMaintenance });
});

router.post('/admin/maintenance', verifyToken, (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: "Access Denied." });
    isSystemInMaintenance = req.body.status;
    res.json({ message: `Maintenance mode ${isSystemInMaintenance ? 'enabled' : 'disabled'}`, status: isSystemInMaintenance });
});

// =========================================================================
// 14. ADMIN OUTBREAK ANALYTICS & DEPENDENTS
// =========================================================================

// Outbreak Heatmap / Trends
router.get('/admin/health-trends', verifyToken, async (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: "Access Denied" });
    try {
        const connection = db.promise();
        const [trends] = await connection.query(`
            SELECT diagnosis as name, COUNT(*) as count 
            FROM medical_records 
            WHERE diagnosis IS NOT NULL AND diagnosis != ''
            GROUP BY diagnosis 
            ORDER BY count DESC 
            LIMIT 5
        `);
        res.json(trends);
    } catch (err) { res.status(500).json({ error: "Trend generation failed" }); }
});

// Fetch Dependents
router.get('/dependents', verifyToken, async (req, res) => {
    try {
        const [deps] = await db.promise().query("SELECT * FROM dependents WHERE primary_user_id = ?", [req.user_id]);
        res.json(deps);
    } catch (err) { res.status(500).json({ error: "Failed to fetch dependents" }); }
});

// Add Dependent
router.post('/dependents', verifyToken, async (req, res) => {
    const { full_name, dob, blood_group } = req.body;
    const unique_id = `LL-DEP-${Math.floor(10000 + Math.random() * 90000)}`;
    try {
        await db.promise().query(
            "INSERT INTO dependents (primary_user_id, full_name, dob, blood_group, unique_lifeline_id) VALUES (?, ?, ?, ?, ?)",
            [req.user_id, full_name, dob, blood_group, unique_id]
        );
        res.json({ message: "Dependent added successfully", unique_id });
    } catch (err) { res.status(500).json({ error: "Failed to add dependent" }); }
});


// =========================================================================
// 15. PHARMACIST: GET PRESCRIPTION BY ID (QR FETCH)
// =========================================================================

router.get('/pharmacist/get-prescription/:id', verifyToken, async (req, res) => {
    if (req.role !== 'pharmacist') return res.status(403).json({ error: "Access Denied" });
    const prescriptionId = req.params.id;

    try {
        const connection = db.promise();
        const [rows] = await connection.query(`
            SELECT 
                mr.id, mr.prescription, mr.visit_date,
                u.full_name as patient, d.full_name as doctor
            FROM medical_records mr
            JOIN users u ON mr.patient_id = u.id
            LEFT JOIN users d ON mr.doctor_id = d.id
            WHERE mr.id = ?
        `, [prescriptionId]);

        if (!rows.length) return res.status(404).json({ error: "Prescription not found" });

        const record = rows[0];
        res.json({
            id: record.id, patient: record.patient, doctor: record.doctor,
            date: record.visit_date, original_prescription: record.prescription,
            medicines: parsePrescription(record.prescription)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

function parsePrescription(text) {
    if (!text) return [];
    return text.split('\n').map(line => {
        const clean = line.trim();
        const dosageMatch = clean.match(/\(.*?\)/);
        let dosage = '';
        let namePart = clean;

        if (dosageMatch) {
            dosage = dosageMatch[0];
            namePart = clean.replace(dosageMatch[0], '').trim();
        }

        return { rawName: namePart, dosage: dosage, freq: clean.replace(namePart, '').replace(dosage, '').trim() };
    });
}

// =========================================================================
// 16. PHARMACY DISPENSE & INVENTORY TRACKING
// =========================================================================

// A. GET medicine dispense status
router.get('/pharmacist/dispense-status/:prescription_id', verifyToken, async (req, res) => {
    if(req.role !== 'pharmacist') return res.status(403).json({error:'Access denied'});
    try{
        const [rows] = await db.promise().query("SELECT * FROM prescription_dispense_log WHERE prescription_id = ?", [req.params.prescription_id]);
        res.json(rows);
    } catch(err){
        res.status(500).json({error:'Failed to load dispense status'});
    }
});

// B. SAVE dispense (WITH INVENTORY DEDUCTION FIX)
router.post('/pharmacist/dispense-medicine', verifyToken, async (req, res) => {
    if(req.role !== 'pharmacist') return res.status(403).json({error:'Access denied'});

    const { prescription_id, medicine_name, quantity } = req.body;
    const dispensed_qty = quantity || 1;

    if(!prescription_id || !medicine_name) return res.status(400).json({error:'Invalid data'});

    try{
        // ⭐ FIX: Removed "AND pharmacist_id = ?" to check globally for this prescription
        const [existing] = await db.promise().query(`
            SELECT id FROM prescription_dispense_log
            WHERE prescription_id = ? AND LOWER(TRIM(medicine_name)) = LOWER(TRIM(?))
        `, [prescription_id, medicine_name]);

        if(existing.length > 0){
            return res.status(409).json({ error: 'Medicine already dispensed for this prescription' });
        }

        // 2. Insert into Log
        await db.promise().query(`
            INSERT INTO prescription_dispense_log (prescription_id, medicine_name, dispensed_qty, pharmacist_id)
            VALUES (?, ?, ?, ?)
        `, [prescription_id, medicine_name, dispensed_qty, req.user_id]);

        // 3. Update Live Inventory
        await db.promise().query(`
            UPDATE pharmacy_inventory 
            SET stock = GREATEST(0, stock - ?) 
            WHERE pharmacist_id = ? AND LOWER(TRIM(medicine_name)) = LOWER(TRIM(?))
        `, [dispensed_qty, req.user_id, medicine_name]);

        res.json({message:'Medicine dispensed successfully'});

    }catch(err){
        console.error("DISPENSE DB ERROR:", err);
        res.status(500).json({error:'Failed to update dispense'});
    }
});

// C. GET pharmacist dispense history
router.get('/pharmacist/history', verifyToken, async (req, res) => {
    if (req.role !== 'pharmacist') return res.status(403).json({ error: "Access Denied" });
    try {
        const [rows] = await db.promise().query(`
            SELECT l.id, l.medicine_name, l.dispensed_at, mr.id as prescription_id, u.full_name as patient_name
            FROM prescription_dispense_log l
            JOIN medical_records mr ON l.prescription_id = mr.id
            JOIN users u ON mr.patient_id = u.id
            WHERE l.pharmacist_id = ? ORDER BY l.dispensed_at DESC
        `, [req.user_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load history" });
    }
});

// D. GET Live Inventory (FIXED FOR DEMO)
router.get('/pharmacist/inventory', verifyToken, async (req, res) => {
    if (req.role !== 'pharmacist') return res.status(403).json({ error: "Access Denied" });
    try {
        // 🔥 Removed the 'WHERE pharmacist_id = ?' filter 
        // Now ALL inventory will show up for your demo, regardless of user ID!
        const [rows] = await db.promise().query("SELECT * FROM pharmacy_inventory");
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: "Failed to fetch inventory" }); 
    }
});

// E. ADD New Item to Inventory
router.post('/pharmacist/inventory', verifyToken, async (req, res) => {
    if (req.role !== 'pharmacist') return res.status(403).json({ error: "Access Denied" });
    const { name, generic, category, price, stock } = req.body;
    try {
        await db.promise().query(`
            INSERT INTO pharmacy_inventory (pharmacist_id, medicine_name, generic_name, category, price, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.user_id, name, generic, category, price, stock]);
        res.json({ message: "Item added successfully" });
    } catch (err) { res.status(500).json({ error: "Failed to add item" }); }
});

// F. UPDATE Item in Inventory
router.put('/pharmacist/inventory/:id', verifyToken, async (req, res) => {
    if (req.role !== 'pharmacist') return res.status(403).json({ error: "Access Denied" });
    const { price, stock } = req.body;
    try {
        // 🔥 REMOVED 'AND pharmacist_id = ?' so you can update the demo data!
        const [result] = await db.promise().query(`
            UPDATE pharmacy_inventory 
            SET price = ?, stock = ? 
            WHERE id = ?
        `, [price, stock, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json({ message: "Item updated successfully" });
    } catch (err) { 
        console.error("Update Error:", err);
        res.status(500).json({ error: "Failed to update item" }); 
    }
});

// =========================================================================
// 17. PATIENT REPORTING SYSTEM
// =========================================================================

// 1. Patient submits a report
router.post('/patient/report', verifyToken, async (req, res) => {
    if(req.role !== 'patient') return res.status(403).json({error: "Only patients can report"});
    const { doctor_name, hospital_name, department, reason, details } = req.body;
    
    try {
        const connection = db.promise();
        
        // Find the main Admin's User ID to send them a notification
        const [admin] = await connection.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        const adminId = admin.length > 0 ? admin[0].id : null;
        
        // Save the report to the database with the new fields
        await connection.query(
            "INSERT INTO user_reports (patient_id, doctor_name, hospital_name, department, reason, details) VALUES (?, ?, ?, ?, ?, ?)", 
            [req.user_id, doctor_name, hospital_name, department, reason, details]
        );
        
        // Send a high-priority notification to the Admin including the new fields
        const [patient] = await connection.query("SELECT full_name FROM users WHERE id = ?", [req.user_id]);
        if (adminId) {
            await connection.query(
                "INSERT INTO notifications (user_id, type, message) VALUES (?, 'danger', ?)", 
                [adminId, `⚠️ URGENT: New report filed by ${patient[0].full_name} against Dr. ${doctor_name} (${hospital_name} - ${department}). Reason: ${reason}`]
            );
        }
        
        res.json({message: "Report submitted successfully. Admin has been notified."});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Failed to submit report"});
    }
});

// 2. Admin fetches all reports for the dashboard
router.get('/admin/reports', verifyToken, async (req, res) => {
    if(req.role !== 'admin') return res.status(403).json({error: "Access Denied"});
    try {
        const [rows] = await db.promise().query(`
            SELECT r.*, u.full_name as patient_name, u.unique_lifeline_id 
            FROM user_reports r 
            JOIN users u ON r.patient_id = u.id 
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({error: "Failed to fetch reports"});
    }
});

// 3. Admin resolves a report
router.put('/admin/reports/:id/resolve', verifyToken, async (req, res) => {
    if(req.role !== 'admin') return res.status(403).json({error: "Access Denied"});
    try {
        const connection = db.promise();
        await connection.query("UPDATE user_reports SET status = 'resolved' WHERE id = ?", [req.params.id]);
        
        // Send a notification back to the patient confirming the action was taken
        const [report] = await connection.query("SELECT patient_id, doctor_name FROM user_reports WHERE id = ?", [req.params.id]);
        if(report.length > 0) {
            await connection.query(
                "INSERT INTO notifications (user_id, type, message) VALUES (?, 'success', ?)", 
                [report[0].patient_id, `✅ Admin has reviewed and resolved your report regarding Dr. ${report[0].doctor_name}. Necessary actions have been taken.`]
            );
        }
        
        res.json({message: "Report resolved & patient notified"});
    } catch (err) {
        res.status(500).json({error: "Failed to resolve report"});
    }
});

// =========================================================================
// 18. AUTOMATED BACKGROUND WORKER: FOLLOW-UP REMINDERS
// =========================================================================
// For demo purposes, this checks every 1 minute. 
// In a real production app, change `60 * 1000` to `86400000` (24 hours).
setInterval(async () => {
    try {
        const connection = db.promise();
        
        // Find all reminders where the date is today (or earlier) and hasn't been sent yet
        const [reminders] = await connection.query(`
            SELECT r.id, r.patient_id, r.message, u.email, u.full_name 
            FROM reminders r
            JOIN users u ON r.patient_id = u.id
            WHERE r.reminder_date <= CURDATE() AND r.is_sent = 0
        `);

        for (let rem of reminders) {
            console.log(`[SYSTEM] Sending automated reminder to ${rem.email}...`);

            // 1. Send Email Alert
            await transporter.sendMail({
                from: '"Lifeline Care" <lifelineforyouu@gmail.com>',
                to: rem.email,
                subject: '📅 Medical Follow-up Reminder',
                html: `
                    <div style="font-family: Arial; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <h2 style="color: #0ea5e9;">Lifeline Health Network</h2>
                        <h3>Hello ${rem.full_name},</h3>
                        <p>${rem.message}</p>
                        <p>Please log in to your Lifeline Dashboard to book your follow-up appointment.</p>
                        <br/>
                        <small style="color: #64748b;">This is an automated health reminder.</small>
                    </div>
                `
            }).catch(e => console.error("Reminder Email Failed", e.message));

            // 2. Add In-App Notification Alert
            await connection.query(
                `INSERT INTO notifications (user_id, type, message) VALUES (?, 'warning', ?)`,
                [rem.patient_id, `🗓️ Follow-up Reminder: ${rem.message}`]
            );

            // 3. Mark as Sent so it doesn't spam
            await connection.query(`UPDATE reminders SET is_sent = 1 WHERE id = ?`, [rem.id]);
        }
    } catch (err) {
        console.error("Reminder Worker Error:", err);
    }
}, 60 * 1000); // 1-minute interval


module.exports = router;