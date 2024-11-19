const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

mongoose.connect('mongodb://0.0.0.0:27017/requestsApp', {
    serverSelectionTimeoutMS: 5000
}).catch(err => console.log(err));

const RequestSchema = new mongoose.Schema({
    title: String,
    description: String,
    type: {
        type: String,
        enum: ['Leave', 'Equipment', 'Overtime']
    },
    urgency: String,
    requestor: {
        email: String,
        name: String
    },
    superior: {
        email: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Request = mongoose.model('Request', RequestSchema);

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

app.post('/requests', authenticateToken, async (req, res) => {
    try {
        const request = new Request({
            ...req.body,
            requestor: {
                email: req.user.email,
                name: req.user.name
            }
        });
        console.log(request);
        await request.save();
        res.json(request);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/requests', authenticateToken, async (req, res) => {
    try {
        const requests = await Request.find({
            $or: [
                { 'requestor.email': req.user.email },
                { 'superior.email': req.user.email }
            ]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/requests/:id/status', authenticateToken, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (request.superior.email !== req.user.email) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        request.status = req.body.status;
        await request.save();

        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SSL configuration
const sslOptions = {
    key: fs.readFileSync('certificates/server.key'),
    cert: fs.readFileSync('certificates/server.cert')
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(4002, () => {
    console.log('Secure Request service running on port 4002');
});