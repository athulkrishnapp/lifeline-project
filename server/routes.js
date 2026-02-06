const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// =========================================================================
// 1. CONFIGURATION & HELPERS
// =========================================================================

// --- EMAIL CONFIGURATION (Nodemailer) ---
// Note: Use an "App Password", not your regular Gmail password.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lifelineforyouu@gmail.com', 
        pass: 'vocc tkwi kihe bffu' 
    }
});

// --- IN-MEMORY STORE ---
// Stores OTPs temporarily. In production, use Redis.
const otpStore = {}; // Format: { "email": "123456" }

// --- HELPER: Load & Parse CSV (Robust Version) ---
// This regex correctly handles values with commas inside quotes (e.g. "Cardiology, Neurology")
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
                // Remove leading comma if captured
                let val = match[0].startsWith(',') ? match[0].slice(1) : match[0];
                // Remove surrounding quotes and trim spaces
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
    const token = req.headers['authorization'];
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
        
        // Filter logic
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
// 3. APPOINTMENT SYSTEM (FROM DB - DYNAMIC DATA)
// =========================================================================

// A. BOOK NEW APPOINTMENT (Save to DB)
router.post('/book-appointment', verifyToken, async (req, res) => {
    const { token, hospital, dept, doctor, date, time, fee, ref } = req.body;
    
    try {
        const connection = db.promise();
        await connection.query(
            `INSERT INTO appointments 
            (user_id, token_number, hospital_name, department, doctor_name, appointment_date, appointment_time, fee, referral) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user_id, token, hospital, dept, doctor, date, time, fee, ref]
        );
        res.json({ message: "Booking Saved Successfully" });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ error: "Failed to save booking" });
    }
});

// B. GET MY APPOINTMENTS (Fetch from DB)
router.get('/my-appointments', verifyToken, async (req, res) => {
    try {
        const connection = db.promise();
        const [rows] = await connection.query(
            "SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date DESC, created_at DESC", 
            [req.user_id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// =========================================================================
// 4. REGISTRATION ROUTES
// =========================================================================

// --- A. SEND SMS OTP ---
router.post('/send-otp', (req, res) => {
    const { aadhaar, dob } = req.body;
    
    // Check Government Database
    const govtDB = loadCSV('government_db.csv');
    const citizen = govtDB.find(u => u.aadhaar_number === aadhaar);

    if (!citizen) return res.status(404).json({ error: "Identity Not Found in Govt Records." });
    if (citizen.dob !== dob) return res.status(400).json({ error: "Date of Birth does not match records." });

    res.json({ message: "OTP Sent to linked mobile.", otp_hint: "1234" });
});

// --- B. VERIFY SMS OTP ---
router.post('/verify-otp', (req, res) => {
    const { aadhaar, otp } = req.body;
    
    // Demo Logic: OTP is always 1234
    if (otp === "1234") {
        const govtDB = loadCSV('government_db.csv');
        const citizen = govtDB.find(u => u.aadhaar_number === aadhaar);
        
        if (citizen) {
            res.json({ message: "Verified", data: citizen });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

// --- C. COMPLETE REGISTRATION ---
router.post('/register', async (req, res) => {
    const { role, full_name, email, phone, aadhaar, dob, password, license_id, workplace } = req.body;
    const connection = db.promise();
    const unique_id = generateLifelineID(role);

    try {
        // --- SCENARIO 1: PATIENT REGISTRATION ---
        if (role === 'patient') {
            const [existing] = await connection.query("SELECT * FROM users WHERE aadhaar_number = ?", [aadhaar]);
            if (existing.length > 0) return res.status(409).json({ error: "This Aadhaar is already registered." });

            const dummyHash = await bcrypt.hash(`PATIENT_${Date.now()}`, 10);

            const [u] = await connection.query(
                `INSERT INTO users (unique_lifeline_id, full_name, email, phone, aadhaar_number, dob, password_hash, role, is_verified) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'patient', 1)`,
                [unique_id, full_name, email, phone, aadhaar, dob, dummyHash]
            );

            await connection.query("INSERT INTO patient_profiles (user_id, date_of_birth) VALUES (?, ?)", [u.insertId, dob]);
        } 
        
        // --- SCENARIO 2: DOCTOR / PHARMACIST REGISTRATION ---
        else {
            if (!password) return res.status(400).json({ error: "Password is required for professionals." });

            let registry = [], validPro = null;

            if (role === 'doctor') {
                registry = loadCSV('doctor_registry.csv');
                validPro = registry.find(d => d.license_id === license_id);
                if (!validPro) return res.status(400).json({ error: "Invalid Medical License ID." });
            } else {
                registry = loadCSV('pharmacist_registry.csv');
                validPro = registry.find(p => p.reg_id === license_id);
                if (!validPro) return res.status(400).json({ error: "Invalid Pharmacy Registration ID." });
            }

            const [existing] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
            if (existing.length > 0) return res.status(409).json({ error: "Email already registered." });

            const hash = await bcrypt.hash(password, 10);
            const [u] = await connection.query(
                `INSERT INTO users (unique_lifeline_id, full_name, email, phone, password_hash, role, is_verified) 
                 VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [unique_id, full_name, email, phone, hash, role]
            );

            if (role === 'doctor') {
                await connection.query("INSERT INTO doctor_profiles (user_id, license_id, workplace_name) VALUES (?, ?, ?)", [u.insertId, license_id, workplace]);
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

// --- A. PATIENT LOGIN: SEND EMAIL OTP ---
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
            html: `<h3>Your Lifeline Login Code is: <b style="color:#0ea5e9">${code}</b></h3><p>Valid for 10 minutes. Do not share this code.</p>`
        });

        console.log(`[EMAIL LOG] OTP ${code} sent to ${user.email}`);
        res.json({ message: "Verification code sent to email." });

    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ error: "Failed to send email. Check server configuration." });
    }
});

// --- B. PATIENT LOGIN: VERIFY OTP ---
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

// --- C. PROFESSIONAL LOGIN: PASSWORD ---
router.post('/login-password', async (req, res) => {
    const { identifier, password } = req.body;
    const connection = db.promise();

    try {
        let user = null;

        // 1. Try Email
        const [byEmail] = await connection.query("SELECT * FROM users WHERE email = ?", [identifier]);
        if (byEmail.length > 0) user = byEmail[0];

        // 2. Try Doctor License ID
        if (!user) {
            const [doc] = await connection.query("SELECT user_id FROM doctor_profiles WHERE license_id = ?", [identifier]);
            if (doc.length > 0) {
                const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [doc[0].user_id]);
                user = u[0];
            }
        }

        // 3. Try Pharmacist Reg ID
        if (!user) {
            const [pharm] = await connection.query("SELECT user_id FROM pharmacist_profiles WHERE reg_id = ?", [identifier]);
            if (pharm.length > 0) {
                const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [pharm[0].user_id]);
                user = u[0];
            }
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

// --- D. GOOGLE LOGIN ---
router.post('/google-login', async (req, res) => {
    const { email } = req.body;
    try {
        const connection = db.promise();
        const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.status(404).json({ error: "Email not registered." });
        }

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
            if (doc.length > 0) {
                const [u] = await connection.query("SELECT * FROM users WHERE id = ?", [doc[0].user_id]);
                user = u[0];
            }
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
        const [rows] = await connection.query(`
            SELECT u.full_name, u.email, u.phone, u.unique_lifeline_id, u.aadhaar_number, u.dob,
                   p.blood_group, p.allergies, p.emergency_contact
            FROM users u
            LEFT JOIN patient_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        `, [req.user_id]);

        if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/profile/update', verifyToken, async (req, res) => {
    const { blood, allergies, emergency_contact, phone } = req.body;
    try {
        const connection = db.promise();
        await connection.query("UPDATE users SET phone = ? WHERE id = ?", [phone, req.user_id]);
        await connection.query(`
            UPDATE patient_profiles 
            SET blood_group = ?, allergies = ?, emergency_contact = ?
            WHERE user_id = ?
        `, [blood, allergies, emergency_contact, req.user_id]);
        res.json({ message: "Profile Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;