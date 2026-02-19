const { sequelize } = require('./models');

async function fixRoles() {
    try {
        console.log('--- FIXING ROLES TABLE INDICES ---');

        // 1. Get Indices
        const [results] = await sequelize.query('SHOW INDEX FROM roles');
        console.log(`Found ${results.length} indices.`);

        // 2. Identify Redundant Indices (everything except PRIMARY and maybe one specific unique)
        // Usually 'role_name' or 'role_name_2', 'role_name_3'...
        // We want to keep 'PRIMARY' and maybe 'role_name' (if it exists and is correct).

        const toDrop = [];
        results.forEach(idx => {
            if (idx.Key_name !== 'PRIMARY') {
                // If we want to be safe, drop ALL unique constraints on role_name and let sequelize add one back cleanly?
                // Or keep one? 
                // Let's drop ALL non-primary indices to be clean. Sequelize will add the unique one back on sync.
                toDrop.push(idx.Key_name);
            }
        });

        // Unique set of names (since SHOW INDEX returns row per column)
        const uniqueNames = [...new Set(toDrop)];

        console.log(`Indices to drop: ${uniqueNames.join(', ')}`);

        if (uniqueNames.length === 0) {
            console.log('No indices to drop.');
            return;
        }

        // 3. Drop Them
        for (const idxName of uniqueNames) {
            try {
                await sequelize.query(`DROP INDEX \`${idxName}\` ON roles`);
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

fixRoles();
