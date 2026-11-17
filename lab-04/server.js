const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./database');

const app = express();

// Task 1: Add app.use(express.json()) so the body can be read
app.use(express.json());
app.use(cors());

// Task 5: Keep the secret key in a constant for now (moved to .env in Lab 8)
const JWT_SECRET = 'AURORA_BDF_SECRET_KEY_2026';
const PORT = process.env.PORT || 3000;

// Root / Health-check route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Lab 4: Authentication and User Management API',
        course: 'Backend Development Fundamentals',
        faculty: 'Joel Prashanth D',
        student: {
            name: 'Gollagari Akash Reddy',
            registrationNumber: '252U1R6080',
            section: 'CSE-AIML-2B'
        },
        endpoints: [
            { method: 'POST', path: '/register', description: 'Register a new user with bcrypt-hashed password' },
            { method: 'POST', path: '/login', description: 'Authenticate user and return JWT token' },
            { method: 'GET', path: '/users', description: 'View all users in database (verifies hashed passwords)' },
            { method: 'GET', path: '/profile', description: 'Protected route requiring Bearer JWT token' }
        ]
    });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let jwtToken;

    if (authHeader !== undefined) {
        jwtToken = authHeader.split(' ')[1];
    }

    if (jwtToken === undefined) {
        return res.status(401).json({ message: 'Invalid JWT Token' });
    }

    jwt.verify(jwtToken, JWT_SECRET, (error, payload) => {
        if (error) {
            return res.status(401).json({ message: 'Invalid JWT Token' });
        }
        req.username = payload.username;
        next();
    });
};

/**
 * Task 3: POST /register/
 * Reject an existing username with 400; otherwise hash the password with bcrypt.hash and save the user.
 */
const registerHandler = async (req, res) => {
    try {
        const { username, name, password } = req.body;

        // Input validation
        if (!username || !name || !password) {
            return res.status(400).json({
                message: 'Username, name, and password are required'
            });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                message: 'Invalid input types'
            });
        }

        // Check whether user already exists using parameterized query
        const selectUserQuery = 'SELECT * FROM user WHERE username = ?';
        db.get(selectUserQuery, [username.trim()], async (error, existingUser) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (existingUser) {
                return res.status(400).json({
                    message: 'User already exists'
                });
            }

            try {
                // Hash password using bcrypt.hash with salt rounds = 10
                // Passwords are never stored in plain text
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert new user into database using parameterized query
                const insertUserQuery = `
                    INSERT INTO user (username, name, password)
                    VALUES (?, ?, ?)
                `;

                db.run(insertUserQuery, [username.trim(), name.trim(), hashedPassword], function (insertError) {
                    if (insertError) {
                        console.error('Insert user error:', insertError.message);
                        return res.status(500).json({ message: 'Failed to create user' });
                    }

                    return res.status(200).json({
                        message: 'User created successfully',
                        userId: this.lastID
                    });
                });
            } catch (hashError) {
                console.error('Password hashing error:', hashError.message);
                return res.status(500).json({ message: 'Failed to hash password' });
            }
        });
    } catch (err) {
        console.error('Register route exception:', err.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

app.post('/register', registerHandler);
app.post('/register/', registerHandler);

/**
 * Task 4: POST /login/
 * Return 400 for an unknown user, compare password with bcrypt.compare,
 * return 400 for wrong password, and on success return { jwt_token } created with jwt.sign.
 * Task 5: Put only the username (never the password) in the token payload.
 */
const loginHandler = (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        const selectUserQuery = 'SELECT * FROM user WHERE username = ?';

        db.get(selectUserQuery, [username.trim()], async (error, user) => {
            if (error) {
                console.error('Database error during login:', error.message);
                return res.status(500).json({ message: 'Internal server error' });
            }

            // Return 400 for unknown user
            if (!user) {
                return res.status(400).json({
                    message: 'Invalid user'
                });
            }

            // Compare entered password with stored bcrypt hash
            const isPasswordMatched = await bcrypt.compare(password, user.password);

            // Return 400 for wrong password
            if (!isPasswordMatched) {
                return res.status(400).json({
                    message: 'Invalid password'
                });
            }

            // Task 5: Put only username (never password) in token payload
            const payload = {
                username: user.username
            };

            const jwt_token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

            return res.status(200).json({
                jwt_token
            });
        });
    } catch (err) {
        console.error('Login route exception:', err.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

app.post('/login', loginHandler);
app.post('/login/', loginHandler);

// Verification endpoint to inspect stored users and confirm password hashing
app.get('/users', (req, res) => {
    const getUsersQuery = 'SELECT id, username, name, password FROM user';
    db.all(getUsersQuery, [], (error, rows) => {
        if (error) {
            return res.status(500).json({ message: 'Failed to retrieve users' });
        }
        res.status(200).json(rows);
    });
});

// Protected profile route to demonstrate JWT verification
app.get('/profile', authenticateToken, (req, res) => {
    const getUserQuery = 'SELECT id, username, name FROM user WHERE username = ?';
    db.get(getUserQuery, [req.username], (error, user) => {
        if (error || !user) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        res.status(200).json({
            message: 'Authenticated profile fetched successfully',
            user
        });
    });
});

// Fallback for unmatched routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start local server if not running in serverless environment
if (!process.env.VERCEL && !process.env.NOW_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
}

module.exports = app;
