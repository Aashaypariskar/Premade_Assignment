const { sequelize, InspectionAnswer } = require('./models');

async function syncSchema() {
    try {
        console.log('--- SYNCING SCHEMA FOR ANSWER_TYPE ---');
        // We need to alter table to add the column. 
        // Since we disabled global alter, we can do it explicitly or just use query interface.
        // Or re-enable alter just for this run.

        await InspectionAnswer.sync({ alter: true });
        console.log('InspectionAnswer Synced.');

    } catch (err) {
        console.error('Sync Failed:', err);
    }
}

syncSchema();
