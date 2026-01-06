const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', // <--- REPLACE THIS (e.g., 'admin123')
    database: 'lifeline_db'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed: ' + err.stack);
        return;
    }
    console.log('✅ Connected to MySQL Database');
});

module.exports = db;