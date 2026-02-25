const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const auditRoutes = require('./routes/AuditRoutes');
const authRoutes = require('./routes/AuthRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const questionRoutes = require('./routes/QuestionRoutes');
const reasonRoutes = require('./routes/ReasonRoutes');
const { verifyToken } = require('./middleware/auth');
const CaiController = require('./controllers/CaiController');

const app = express();
const PORT = 3000;

app.use(cors()); // Move to top to ensure all responses (including errors) have CORS headers
app.use(express.json());

// Health check for frontend to verify reachability
app.get('/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' }));

// Log every request
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

// Log body after parsing for JSON requests
app.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && !req.header('content-type')?.includes('multipart')) {
        console.log(' - Parsed Body:', JSON.stringify(req.body));
    }
    next();
});

app.use('/public', express.static('public'));

// Routes
app.use('/api', authRoutes);
app.use('/api', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', questionRoutes);
app.use('/api', reasonRoutes);
app.use('/api', require('./routes/ReportRoutes'));
app.use('/api/commissionary', require('./routes/CommissionaryRoutes'));
app.use('/api/sickline', require('./routes/SickLineRoutes'));
app.use('/api/wsp', require('./routes/WspRoutes'));
app.use('/api/pitline', require('./routes/PitLineRoutes'));
app.use('/api/common', require('./routes/CommonRoutes'));

// CAI Routes (Explicit Registration)
app.post('/api/cai/session/start', verifyToken, CaiController.startSession);
app.get('/api/cai/questions', verifyToken, CaiController.getQuestions);
app.get('/api/cai/answers', verifyToken, CaiController.getAnswers);
app.post('/api/cai/submit', verifyToken, CaiController.submitSession);
app.post('/api/cai/questions/add', verifyToken, CaiController.addQuestion);
app.post('/api/cai/questions/update', verifyToken, CaiController.updateQuestion);

// Inspection Lifecycle
const inspectionController = require('./controllers/InspectionController');
const upload = require('./middleware/upload');
app.post('/api/inspection/resolve', (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) return res.status(400).json({ error: `Upload error: ${err.message}` });
        next();
    });
}, inspectionController.resolveDefect);
app.get('/api/inspection/defects', inspectionController.getPendingDefects);
app.post('/api/inspection/autosave', verifyToken, inspectionController.autosave);
app.post('/api/inspection/save-checkpoint', verifyToken, inspectionController.saveCheckpoint);


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
        // Sync models (Disabled alter to prevent "Too many keys" error)
        return sequelize.sync({ alter: false });
    })
    .then(() => {
        console.log('--- SCHEMA SYNCED ---');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`--- BACKEND IS LIVE ---`);
            console.log(`Listening on http://localhost:${PORT}`);
            console.log(`Or http://192.168.1.2:${PORT} (for mobile)`);
        });
    })
    .catch(err => {
        console.error('FATAL DB/SYNC ERROR:', err.message, err.stack);
        console.error('Server process will now exit.');
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
