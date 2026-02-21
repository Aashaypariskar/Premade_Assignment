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

// Log every request to see if things are working
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - INCOMING`);
    // console.log(' - Headers:', JSON.stringify(req.headers));

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
});

app.use(cors());
app.use(express.json());

// Log body after parsing for JSON requests
app.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && !req.header('content-type')?.includes('multipart')) {
        console.log(' - Parsed Body:', JSON.stringify(req.body));
    }
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
const commController = require('./controllers/CommissionaryController');
const { verifyToken } = require('./middleware/auth');
app.get('/api/commissionary-coaches', verifyToken, commController.listCoaches);
app.post('/api/commissionary-coaches', verifyToken, commController.createCoach);

app.use('/api/commissionary', require('./routes/CommissionaryRoutes'));


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
            console.log(`Or http://192.168.1.11:${PORT} (for mobile)`);
        });
    })
    .catch(err => {
        console.error('FATAL DB ERROR:', err);
        process.exit(1);
    });

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('FATAL: Uncaught Exception:', err);
    // Give time for log to print
    setTimeout(() => process.exit(1), 500);
});
