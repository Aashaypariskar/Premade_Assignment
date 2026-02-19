const { sequelize } = require('./models');

async function fixColumn() {
    try {
        console.log('--- ADDING display_order COLUMN ---');
        // Check if column exists first to avoid error
        const [columns] = await sequelize.query("SHOW COLUMNS FROM ltr_items LIKE 'display_order'");
        if (columns.length === 0) {
            await sequelize.query("ALTER TABLE ltr_items ADD COLUMN display_order INT DEFAULT 0");
            console.log('Column added.');
        } else {
            console.log('Column already exists.');
        }

        const [qCols] = await sequelize.query("SHOW COLUMNS FROM questions LIKE 'display_order'");
        if (qCols.length === 0) {
            await sequelize.query("ALTER TABLE questions ADD COLUMN display_order INT DEFAULT 0");
            console.log('Questions Column added.');
        } else {
            console.log('Questions Column already exists.');
        }

    } catch (err) {
        console.error('Fix Failed:', err);
    }
}

fixColumn();
