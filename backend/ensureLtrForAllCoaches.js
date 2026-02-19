const { sequelize, Coach, Category, LtrSchedule, Question, Reason } = require('./models');

// Reuse the master data logic or copy from existing
const MASTER_SCHEDULES = [
    "D1 Schedule", "D2 Schedule", "D3 Schedule", "Trip Schedule",
    "Monthly Schedule", "Quarterly Schedule", "Half-Yearly Schedule",
    "Yearly Schedule", "IOH Schedule", "ROH Schedule", "POH Schedule", "Workshop Schedule"
];

// We need the questions... 
// Strategy: Find a "Source" Category (the one we seeded) and copy its structure.
async function propagate() {
    try {
        console.log('--- PROPAGATING LTR DATA TO ALL COACHES ---');

        // 1. Find Source Category (The one we just seeded)
        const sourceMethod = await Category.findOne({
            where: { name: 'Ltr to Railways' },
            include: [{
                model: LtrSchedule,
                include: [Question]
            }]
        });

        if (!sourceMethod) {
            console.error('No source LTR data found. Run seedLtrStrictFromPdf.js first.');
            return;
        }

        console.log(`Source Category ID: ${sourceMethod.id} with ${sourceMethod.LtrSchedules.length} Schedules`);

        // 2. Find All Coaches
        const coaches = await Coach.findAll();
        console.log(`Found ${coaches.length} Coaches total.`);

        for (const coach of coaches) {
            // Check if coach already has LTR category
            let cat = await Category.findOne({
                where: { name: 'Ltr to Railways', coach_id: coach.id }
            });

            if (cat && cat.id === sourceMethod.id) {
                // This is the source coach, skip
                continue;
            }

            if (cat) {
                // Already has one. Check if it has schedules.
                // For "Strict Rebuild", maybe we wipe and re-copy to be sure?
                // The user ran 'reset', so likely only the source exists or empty ones.
                // Let's assume if it exists and isn't source, it might be stale or empty.
                const count = await LtrSchedule.count({ where: { category_id: cat.id } });
                if (count > 0) {
                    console.log(`Coach ${coach.coach_number} already has ${count} schedules. Skipping.`);
                    continue;
                }
            }

            if (!cat) {
                // Create Category
                cat = await Category.create({
                    name: 'Ltr to Railways',
                    coach_id: coach.id
                });
                console.log(`Created LTR Category for Coach ${coach.coach_number}`);
            }

            // 3. Clone Schedules & Questions
            console.log(`Cloning data for Coach ${coach.coach_number}...`);

            for (const sourceSch of sourceMethod.LtrSchedules) {
                const newSch = await LtrSchedule.create({
                    name: sourceSch.name,
                    category_id: cat.id
                });

                const sourceQuestions = sourceSch.Questions || [];
                // Bulk prepare questions
                const qData = sourceQuestions.map(q => ({
                    text: q.text,
                    schedule_id: newSch.id,
                    category_id: cat.id,
                    answer_type: q.answer_type,
                    unit: q.unit,
                    specified_value: q.specified_value
                }));

                const newQuestions = await Question.bulkCreate(qData);

                // Clone Reasons? 
                // We need to fetch reasons for source questions and copy them?
                // Or just run `seedLtrReasonsStrict.js` again?
                // `seedLtrReasonsStrict.js` finds ALL questions with schedule_id != null and adds reasons.
                // So if we just create Questions here, we can re-run reason seeder.
            }
        }

        console.log('--- PROPAGATION COMPLETE ---');

    } catch (err) {
        console.error('Propagation Failed:', err);
    }
}

propagate();
