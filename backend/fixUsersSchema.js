const { sequelize } = require('./models');

async function fixUsers() {
    try {
        console.log('--- FIXING USERS TABLE INDICES ---');

        // 1. Get Indices
        const [results] = await sequelize.query('SHOW INDEX FROM users');
        console.log(`Found ${results.length} indices.`);

        // 2. Identify Redundant Indices
        // Keep PRIMARY and 'email' (if properly formed)

        const toDrop = [];
        results.forEach(idx => {
            if (idx.Key_name !== 'PRIMARY') {
                // Drop all unique constraints on email. Sequelize will rebuild one if needed.
                toDrop.push(idx.Key_name);
            }
        });

        const uniqueNames = [...new Set(toDrop)];

        console.log(`Indices to drop: ${uniqueNames.join(', ')}`);

        if (uniqueNames.length === 0) {
            console.log('No indices to drop.');
            return;
        }

        // 3. Drop Them
        for (const idxName of uniqueNames) {
            try {
                await sequelize.query(`DROP INDEX \`${idxName}\` ON users`);
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

fixUsers();
