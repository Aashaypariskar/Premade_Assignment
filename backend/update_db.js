const sequelize = require('./config/db');
require('./models'); // Ensure models are loaded

console.log('--- STARTING DB UPDATE... ---');

sequelize.authenticate()
    .then(() => {
        console.log('--- DB CONNECTED ---');
        console.log('--- SYNCING SCHEMA (ALTER=TRUE) ---');
        return sequelize.sync({ alter: true });
    })
    .then(() => {
        console.log('--- DB UPDATE COMPLETE ---');
        process.exit(0);
    })
    .catch(err => {
        console.error('--- DB UPDATE FAILED ---', err);
        process.exit(1);
    });
