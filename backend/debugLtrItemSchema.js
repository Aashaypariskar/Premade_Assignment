const { sequelize } = require('./models');

async function debugSchema() {
    try {
        const [results] = await sequelize.query('DESCRIBE ltr_items');
        console.log('ltr_items Schema:', results);
    } catch (err) {
        console.error('Error:', err);
    }
}

debugSchema();
