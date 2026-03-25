const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables
const db = require('./db'); 
const routes = require('./routes'); 

const app = express();

// --- 1. INCREASE PAYLOAD LIMIT (For Profile Images) ---
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors());

// --- 2. ACTIVATE ROUTES ---
app.use('/api', routes); 

// Test Route
app.get('/', (req, res) => {
    res.send('LIFELINE Backend is Running!');
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});