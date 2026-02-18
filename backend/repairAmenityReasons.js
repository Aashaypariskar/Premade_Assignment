const { sequelize, Question, Reason, AmenityItem, Activity, CategoryMaster } = require('./models');

const MINOR_REASONS = [
    'Dirty', 'Loose', 'Missing', 'Damaged', 'Worn Out', 'Improper Fitment'
];

const MAJOR_REASONS = [
    'Complete Failure', 'Structural Damage', 'Replacement Required', 'Safety Hazard', 'Beyond Repair', 'Non-Functional'
];

async function repair() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING AMENITY REASONS REPAIR ---');

        // 1. Find Amenity Master
        const master = await CategoryMaster.findOne({ where: { name: 'Amenity' }, transaction });
        if (!master) throw new Error('Amenity Master not found');

        // 2. Find all Amenity Questions
        const questions = await Question.findAll({
            where: { category_id: master.id },
            include: [
                { model: AmenityItem, required: false }, // Join Item to get Type
                { model: Activity, required: false }     // Fallback
            ],
            transaction
        });

        console.log(`Found ${questions.length} Amenity Questions.`);

        let seededCount = 0;
        let skippedCount = 0;

        for (const q of questions) {
            // Check if reasons exist
            const reasonCount = await Reason.count({ where: { question_id: q.id }, transaction });
            if (reasonCount > 0) {
                skippedCount++;
                continue;
            }

            // Determine Type
            let type = 'Minor'; // Default
            if (q.AmenityItem && q.AmenityItem.activity_type) {
                type = q.AmenityItem.activity_type;
            } else if (q.Activity && q.Activity.type) {
                type = q.Activity.type;
            }

            // Select Set
            const reasonsToSeed = type === 'Major' ? MAJOR_REASONS : MINOR_REASONS;

            // Seed Reasons
            const reasonData = reasonsToSeed.map(text => ({
                question_id: q.id,
                text: text
            }));

            await Reason.bulkCreate(reasonData, { transaction });
            seededCount++;
        }

        await transaction.commit();
        console.log('--- REPAIR COMPLETE ---');
        console.log(`Questions Processed: ${questions.length}`);
        console.log(`Seeded Reasons for: ${seededCount} Questions`);
        console.log(`Skipped (Already had reasons): ${skippedCount} Questions`);

    } catch (err) {
        await transaction.rollback();
        console.error('Repair Failed:', err);
    }
}

repair();
