const { sequelize } = require('./models');

async function fixCMS() {
    try {
        console.log('--- FIXING CATEGORIES_MASTER TABLE INDICES ---');

        const [results] = await sequelize.query('SHOW INDEX FROM categories_master');
        console.log(`Found ${results.length} indices.`);

        const toDrop = [];
        results.forEach(idx => {
            if (idx.Key_name !== 'PRIMARY') {
                toDrop.push(idx.Key_name);
            }
        });

        const uniqueNames = [...new Set(toDrop)];
        console.log(`Indices to drop: ${uniqueNames.join(', ')}`);

        if (uniqueNames.length === 0) {
            console.log('No indices to drop.');
            return;
        }

        for (const idxName of uniqueNames) {
            try {
                await sequelize.query(`DROP INDEX \`${idxName}\` ON categories_master`);
                console.log(`Dropped index: ${idxName}`);
            } catch (e) {
                console.error(`Failed to drop ${idxName}:`, e.message);
            }
        }
        console.log('--- REPAIR COMPLETE ---');
    } catch (err) {
        console.error('Fix Failed:', err);
    }
}

fixCMS();
