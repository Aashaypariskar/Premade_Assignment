const { sequelize, InspectionAnswer } = require('./models');

async function cleanup() {
    try {
        console.log('--- CLEANING UP REPORT DATA ---');
        // Check current count
        const count = await InspectionAnswer.count();
        console.log(`Found ${count} existing inspection records.`);

        if (count > 0) {
            // Truncate table to remove all rows and reset auto-increment if supported
            await InspectionAnswer.destroy({ where: {}, truncate: true });
            console.log('✔ All inspection records deleted successfully.');
        } else {
            console.log('✔ No records to delete. Table is already empty.');
        }

    } catch (err) {
        console.error('Cleanup Failed:', err);
    }
}

cleanup();
