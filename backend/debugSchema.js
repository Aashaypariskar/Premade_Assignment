const { sequelize } = require('./models');

async function debug() {
    try {
        const [results] = await sequelize.query('SHOW INDEX FROM questions');
        console.log(`Found ${results.length} indices on 'questions' table.`);
        results.forEach(idx => {
            console.log(`- ${idx.Key_name} (${idx.Column_name})`);
        });
    } catch (err) {
        console.error(err);
    }
}

debug();
