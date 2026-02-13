const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const inspectionRoutes = require('./routes/inspectionRoutes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Log every request to see if things are working
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use('/public', express.static('public'));

// Routes
app.use('/api', inspectionRoutes);

// Catch-all for 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler to prevent crash
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Something broke on the server' });
});

// Database connection and Server start
sequelize.authenticate()
    .then(() => {
        console.log('--- DATABASE CONNECTED ---');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`--- BACKEND IS LIVE ---`);
            console.log(`Listening on http://localhost:${PORT}`);
            console.log(`Or http://192.168.31.188:${PORT} (for mobile)`);
        });
    })
    .catch(err => {
        console.error('FATAL DB ERROR:', err);
        process.exit(1);
    });

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
