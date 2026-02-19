const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const auditRoutes = require('./routes/AuditRoutes');
const authRoutes = require('./routes/AuthRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const questionRoutes = require('./routes/QuestionRoutes');
const reasonRoutes = require('./routes/ReasonRoutes');

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
app.use('/api', auditRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', questionRoutes);
app.use('/api', reasonRoutes);
app.use('/api', require('./routes/ReportRoutes'));


// Catch-all for 404
app.use((req, res) => {
    console.warn(`[404 NOT FOUND] ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route ${req.url} not found` });
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
        // Sync models to update schema (create submission_id column)
        // Sync models (Disabled alter to stop index bloat)
        return sequelize.sync();
    })
    .then(() => {
        console.log('--- SCHEMA SYNCED ---');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`--- BACKEND IS LIVE ---`);
            console.log(`Listening on http://localhost:${PORT}`);
            console.log(`Or http://192.168.1.7:${PORT} (for mobile)`);
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
