const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables
const db = require('./db'); 
const routes = require('./routes'); // <--- 1. IMPORT YOUR NEW ROUTES

const app = express();
app.use(express.json());
app.use(cors());

// Use the Routes for any link starting with /api
app.use('/api', routes); // <--- 2. ACTIVATE THE ROUTES

// Test Route
app.get('/', (req, res) => {
    res.send('LIFELINE Backend is Running!');
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});