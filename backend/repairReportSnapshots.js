const { sequelize, InspectionAnswer, Question } = require('./models');

async function repair() {
    try {
        console.log('--- STARTING SNAPSHOT REPAIR ---');

        // 1. Fetch Answers without Snapshot
        const answers = await InspectionAnswer.findAll({
            where: { question_text_snapshot: null }
        });

        console.log(`Found ${answers.length} records to repair.`);

        let updatedCount = 0;
        let orphanedCount = 0;

        for (const ans of answers) {
            const question = await Question.findByPk(ans.question_id);
            if (question) {
                ans.question_text_snapshot = question.text;
                await ans.save();
                updatedCount++;
            } else {
                console.warn(`Orphaned Answer ID: ${ans.id} (Question ID: ${ans.question_id} not found)`);
                // Optional: set a placeholder
                ans.question_text_snapshot = 'Archived Question';
                await ans.save();
                orphanedCount++;
            }
        }

        console.log('--- REPAIR COMPLETE ---');
        console.log(`Updated: ${updatedCount}`);
        console.log(`Orphans (Marked Archived): ${orphanedCount}`);

    } catch (err) {
        console.error('Repair Failed:', err);
    }
}

repair();
