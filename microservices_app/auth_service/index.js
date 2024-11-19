const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');

const app = express();
const JWT_SECRET = 'jwt-secret'; // Update with secure secret

// MongoDB connection
mongoose.connect('mongodb://0.0.0.0:27017/authApp', {
    serverSelectionTimeoutMS: 5000,
}).catch(err => console.log('MongoDB connection error:', err));

// User schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    refreshToken: { type: String }
});

const User = mongoose.model('User', UserSchema);

// Enable CORS
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

// Add session middleware
app.use(session({
    secret: 'your-session-secret', // Change this to a secure secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Set to true for HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

const GOOGLE_CLIENT_ID = "960984635124-bg7e84mare2uoutlprr05vfce3ijhe4s.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "https://localhost:4000/auth/google/callback",
    scope: ['profile', 'email', 'gmail']
},
    function (accessToken, refreshToken, profile, cb) {
        console.log('Access token:', accessToken);
        console.log('Refresh token:', refreshToken);
        return cb(null, profile, { accessToken, refreshToken });
    }
));

app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:3000/login',
        session: true,
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://mail.google.com/",
        ],
        accessType: 'offline',
        prompt: 'consent',
    }),
    async function (req, res) {
        const { id, displayName, emails } = req.user;
        const email = emails[0].value;
        console.log(' info:', req.authInfo);
        const refreshToken = req.authInfo.refreshToken;

        console.log('refesh token:', refreshToken);

        try {
            let user = await User.findOne({ email });

            console.log('User found:', user);

            if (user) {
                user.refreshToken = refreshToken;
                await user.save();
            } else {
                user = new User({
                    email: email,
                    name: displayName,
                    refreshToken: refreshToken
                });
                await user.save();
            }

            console.log('User saved:', user);

            const token = jwt.sign({
                id,
                email,
                name: displayName,
                accessToken: req.authInfo.accessToken,
                refreshToken: refreshToken
            }, JWT_SECRET, { expiresIn: '24h' });

            res.redirect(`http://localhost:3000/dashboard?token=${token}`);
        } catch (error) {
            console.error('Error saving user:', error);
            res.status(500).json({ error: 'Failed to save user data' });
        }
    }
);

// Authenticated user info route
app.get('/auth/user', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        // Respond with the user's data
        res.json({
            id: user.id,
            email: user.email,
            name: user.name
        });
    });
});

// SSL configuration
const sslOptions = {
    key: fs.readFileSync('certificates/server.key'),
    cert: fs.readFileSync('certificates/server.cert')
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(4000, () => {
    console.log('Secure Auth service running on port 4000');
});