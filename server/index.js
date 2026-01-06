const express = require('express');
const cors = require('cors');
const db = require('./db'); // This imports the file you just made

const app = express();
app.use(express.json());
app.use(cors());

// Test Route to check if server is working
app.get('/', (req, res) => {
    res.send('LIFELINE Backend is Running!');
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});