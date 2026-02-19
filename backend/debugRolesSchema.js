const { sequelize } = require('./models');

async function debugRoles() {
    try {
        const [results] = await sequelize.query('SHOW INDEX FROM roles');
        console.log(`Found ${results.length} indices on 'roles' table.`);
        results.forEach(idx => {
            console.log(`- ${idx.Key_name} (${idx.Column_name})`);
        });
    } catch (err) {
        console.error(err);
    }
}

debugRoles();
