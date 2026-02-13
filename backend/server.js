const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const inspectionRoutes = require('./routes/inspectionRoutes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

// Routes
app.use('/api', inspectionRoutes);

// Database connection and Server start
sequelize.authenticate()
    .then(() => {
        console.log('Connected to MySQL via Sequelize');
        app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('Unable to connect to MySQL:', err);
    });
