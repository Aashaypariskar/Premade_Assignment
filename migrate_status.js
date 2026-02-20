const sequelize = require('./backend/config/db');

async function migrate() {
    try {
        console.log('--- GLOBAL STATUS MIGRATION START ---');

        // 1. Resolve naming conflict in inspection_answers
        console.log('Checking for naming conflicts...');
        const [inspColumns] = await sequelize.query("SHOW COLUMNS FROM inspection_answers LIKE 'status'");
        if (inspColumns.length > 0) {
            const typeValue = inspColumns[0].Type || inspColumns[0].type;
            if (typeValue.toLowerCase().includes('varchar') || typeValue.toLowerCase().includes('string')) {
                console.log('Renaming existing "status" column to "inspection_status"...');
                try {
                    await sequelize.query("ALTER TABLE inspection_answers CHANGE COLUMN status inspection_status VARCHAR(50) DEFAULT 'Completed'");
                } catch (e) {
                    console.log('CHANGE COLUMN failed, trying RENAME COLUMN...');
                    await sequelize.query("ALTER TABLE inspection_answers RENAME COLUMN status TO inspection_status");
                }
            }
        }

        // 2. Add new status column
        console.log('Adding new "status" columns (OK, DEFICIENCY, NA)...');
        const [statusColInsp] = await sequelize.query("SHOW COLUMNS FROM inspection_answers LIKE 'status'");
        if (statusColInsp.length === 0) {
            await sequelize.query("ALTER TABLE inspection_answers ADD COLUMN status ENUM('OK', 'DEFICIENCY', 'NA') NULL AFTER answer");
        }

        const [statusColComm] = await sequelize.query("SHOW COLUMNS FROM commissionary_answers LIKE 'status'");
        if (statusColComm.length === 0) {
            await sequelize.query("ALTER TABLE commissionary_answers ADD COLUMN status ENUM('OK', 'DEFICIENCY', 'NA') NULL AFTER answer");
        }

        // 3. Migrate data
        console.log('Migrating data (YES -> OK, NO -> DEFICIENCY)...');
        const [ansColInsp] = await sequelize.query("SHOW COLUMNS FROM inspection_answers LIKE 'answer'");
        if (ansColInsp.length > 0) {
            await sequelize.query(`
                UPDATE inspection_answers 
                SET status = CASE 
                    WHEN answer = 'YES' THEN 'OK' 
                    WHEN answer = 'NO' THEN 'DEFICIENCY' 
                    WHEN answer = 'NA' THEN 'NA' 
                    ELSE 'OK'
                END
                WHERE status IS NULL
            `);
        }

        const [ansColComm] = await sequelize.query("SHOW COLUMNS FROM commissionary_answers LIKE 'answer'");
        if (ansColComm.length > 0) {
            await sequelize.query(`
                UPDATE commissionary_answers 
                SET status = CASE 
                    WHEN answer = 'YES' THEN 'OK' 
                    WHEN answer = 'NO' THEN 'DEFICIENCY' 
                    WHEN answer = 'NA' THEN 'NA' 
                    ELSE 'OK'
                END
                WHERE status IS NULL
            `);
        }

        // 4. Verification
        console.log('Verifying migration...');
        await sequelize.query("UPDATE inspection_answers SET status = 'OK' WHERE status IS NULL");
        await sequelize.query("UPDATE commissionary_answers SET status = 'OK' WHERE status IS NULL");
        console.log('Verification successful.');

        // 5. Drop old columns
        console.log('Dropping old "answer" columns...');
        try { await sequelize.query("ALTER TABLE inspection_answers DROP COLUMN answer"); } catch (e) { }
        try { await sequelize.query("ALTER TABLE commissionary_answers DROP COLUMN answer"); } catch (e) { }

        // 6. Enforce NOT NULL
        console.log('Enforcing NOT NULL constraint...');
        await sequelize.query("ALTER TABLE inspection_answers MODIFY COLUMN status ENUM('OK', 'DEFICIENCY', 'NA') NOT NULL");
        await sequelize.query("ALTER TABLE commissionary_answers MODIFY COLUMN status ENUM('OK', 'DEFICIENCY', 'NA') NOT NULL");

        console.log('--- MIGRATION COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('!!! MIGRATION FAILED !!!');
        console.error(error.message);
        process.exit(1);
    }
}

migrate();
