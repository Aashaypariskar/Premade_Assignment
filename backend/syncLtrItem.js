const { sequelize, LtrItem } = require('./models');

async function syncLtrItem() {
    try {
        console.log('--- SYNCING LTR ITEMS TABLE ---');
        await LtrItem.sync({ alter: true });
        console.log('LtrItem Table Synced.');
    } catch (err) {
        console.error('Sync Failed:', err);
    }
}

syncLtrItem();
