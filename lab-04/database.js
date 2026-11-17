const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine database path:
// On Vercel / AWS Lambda, the local filesystem is read-only, but /tmp is writable.
const isServerless = process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dbDirectory = isServerless ? '/tmp' : __dirname;
const dbPath = process.env.DB_PATH || path.join(dbDirectory, 'userData.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
    } else {
        console.log(`SQLite database connected successfully at: ${dbPath}`);
    }
});

// Create user table with unique username, name, and hashed password column
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('Error creating user table:', err.message);
        } else {
            console.log('User table initialized successfully');
        }
    });
});

module.exports = db;
