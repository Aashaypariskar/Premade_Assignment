const { sequelize, Question, Reason } = require('./models');

const LTR_REASONS = [
    "Measurement exceeded limit",
    "Component worn out / Damaged",
    "Improper fitment / Loose",
    "Leakage detected",
    "Alignment deviation / Bent",
    "Missing part / Not found"
];

async function seedReasons() {
    try {
        console.log('--- STARTING LTR REASONS SEEDING ---');

        // 1. Find all LTR Questions
        // Logic: Find Questions belonging to 'Ltr to Railways' Categories
        // Or simply find all questions with a schedule_id (since only LTR uses schedules)
        // More robust:
        const questions = await Question.findAll({
            where: {
                schedule_id: { [require('sequelize').Op.ne]: null }
            }
        });

        console.log(`Found ${questions.length} LTR Questions.`);

        if (questions.length === 0) {
            console.warn('No LTR questions found. Run seedLtrStrictFromPdf.js first.');
            return;
        }

        // 2. Prepare Reasons
        const reasonsData = [];
        for (const q of questions) {
            LTR_REASONS.forEach(rText => {
                reasonsData.push({
                    question_id: q.id,
                    text: rText
                });
            });
        }

        // 3. Bulk Insert
        // Chunking slightly to be safe
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < reasonsData.length; i += CHUNK_SIZE) {
            const chunk = reasonsData.slice(i, i + CHUNK_SIZE);
            await Reason.bulkCreate(chunk);
            console.log(`Inserted chunk ${i} - ${i + chunk.length}`);
        }

        console.log(`--- SEEDED REASONS FOR ${questions.length} QUESTIONS ---`);

    } catch (err) {
        console.error('Reason Seeding Failed:', err);
    }
}

seedReasons();
