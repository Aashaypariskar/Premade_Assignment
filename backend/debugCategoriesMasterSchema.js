const { sequelize } = require('./models');

async function debugCMS() {
    try {
        const [results] = await sequelize.query('SHOW INDEX FROM categories_master');
        console.log(`Found ${results.length} indices on 'categories_master' table.`);
        results.forEach(idx => {
            console.log(`- ${idx.Key_name} (${idx.Column_name})`);
        });
    } catch (err) {
        console.error(err);
    }
}

debugCMS();
