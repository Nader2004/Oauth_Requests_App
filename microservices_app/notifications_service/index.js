const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

const JWT_SECRET = 'jwt-secret'; // Same secret as auth service

// MongoDB connection
mongoose.connect('mongodb://0.0.0.0:27017/authApp', {
    serverSelectionTimeoutMS: 5000,
}).catch(err => console.log('MongoDB connection error:', err));

// User model 
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    refreshToken: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'jwt-secret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/notify', authenticateToken, async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token to extract user email
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        const { email } = decoded;
        const { recipients, subject, content } = req.body;

        try {
            // Retrieve user's refresh token from MongoDB
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const GOOGLE_CLIENT_ID = "960984635124-bg7e84mare2uoutlprr05vfce3ijhe4s.apps.googleusercontent.com";
            const GOOGLE_CLIENT_SECRET = "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";

            // Set up OAuth2 client with Google's API
            const oAuth2Client = new google.auth.OAuth2(
                GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET,
                "https://localhost:4000/auth/google/callback"
            );
            oAuth2Client.setCredentials({ refresh_token: user.refreshToken });
 
            console.log('Credentials:', oAuth2Client.credentials);

            const accessToken = await oAuth2Client.getAccessToken().catch(err => {
                console.error('Error obtaining access token:', err);
                res.status(500).json({ error: 'Error obtaining access token' });
                return null;
            });

            if (!accessToken) return;
            console.log('Access token:', accessToken.token);
            
            // Set up Nodemailer transporter with the new access token
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    type: "OAuth2",
                    user: email,
                    clientId: GOOGLE_CLIENT_ID,
                    clientSecret: GOOGLE_CLIENT_SECRET,
                    refreshToken: user.refreshToken,
                    accessToken: accessToken.token
                },
            });

            // Send email
            await transporter.sendMail({
                from: email, // User's email
                to: recipients.join(','),
                subject: subject,
                text: content
            });

            res.json({ success: true });
        } catch (error) {
            console.log('Error sending email:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// SSL configuration
const sslOptions = {
    key: fs.readFileSync('certificates/server.key'),
    cert: fs.readFileSync('certificates/server.cert')
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(4001, () => {
    console.log('Secure Notification service running on port 4001');
});