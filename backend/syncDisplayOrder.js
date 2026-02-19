const { sequelize, Question } = require('./models');

async function syncDO() {
    try {
        console.log('--- SYNCING QUESTION TABLE (display_order) ---');
        await Question.sync({ alter: true });
        console.log('Question Table Synced.');
    } catch (err) {
        console.error('Sync Failed:', err);
    }
}

syncDO();
