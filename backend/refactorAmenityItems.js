const { sequelize, Question, AmenityItem, CategoryMaster, AmenitySubcategory, Activity } = require('./models');

async function migrate() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING AMENITY ITEM-WISE REFACTOR MIGRATION ---');
        await sequelize.sync({ alter: true });

        const amenityMaster = await CategoryMaster.findOne({ where: { name: 'Amenity' }, transaction });
        if (!amenityMaster) {
            console.log('Amenity Master category not found. Nothing to migrate.');
            await transaction.rollback();
            return;
        }

        const subcategories = await AmenitySubcategory.findAll({
            where: { category_id: amenityMaster.id },
            transaction
        });
        const subIds = subcategories.map(s => s.id);
        console.log(`Found ${subIds.length} Amenity Subcategories via Category Link.`);
        if (subIds.length > 0) console.log('Sample SubIDs:', subIds.slice(0, 5));

        const questions = await Question.findAll({
            where: { subcategory_id: subIds },
            transaction
        });

        console.log(`Found ${questions.length} Amenity questions to refactor.`);

        let itemsCreated = 0;
        let questionsUpdated = 0;

        for (const q of questions) {
            const originalText = q.text;

            // Heuristic to split "Item Name: Question Content" or "Item Name - Question Content"
            let itemName = "";
            let cleanQuestionText = "";

            if (originalText.includes(':')) {
                const parts = originalText.split(':');
                itemName = parts[0].trim();
                cleanQuestionText = parts.slice(1).join(':').trim();
            } else if (originalText.includes(' – ')) {
                const parts = originalText.split(' – ');
                itemName = parts[0].trim();
                cleanQuestionText = parts.slice(1).join(' – ').trim();
            } else if (originalText.includes(' - ')) {
                const parts = originalText.split(' - ');
                itemName = parts[0].trim();
                cleanQuestionText = parts.slice(1).join(' - ').trim();
            } else {
                // Fallback: If no separator, use a generic "General" item
                itemName = 'General';
                cleanQuestionText = originalText.trim();
            }

            if (itemName && cleanQuestionText) {
                // Find or Create AmenityItem
                // Activity type must match the question's activity type
                const activity = await Activity.findByPk(q.activity_id, { transaction });
                const activityType = activity ? activity.type : 'Minor'; // Default to Minor if unknown

                if (q.subcategory_id === 29) {
                    console.log(`[DEBUG SC29] Creating Item: "${itemName}" | ActType: ${activityType} | QID: ${q.id}`);
                }

                const [item, created] = await AmenityItem.findOrCreate({
                    where: {
                        name: itemName,
                        subcategory_id: q.subcategory_id,
                        activity_type: activityType
                    },
                    transaction
                });

                if (q.subcategory_id === 29) {
                    console.log(`[DEBUG SC29] Item ID: ${item.id} | Created: ${created}`);
                }

                if (created) itemsCreated++;

                // Update Question
                await q.update({
                    text: cleanQuestionText,
                    item_id: item.id
                }, { transaction });

                questionsUpdated++;
            }
        }

        await transaction.commit();
        console.log(`\nMigration Completed!`);
        console.log(`Total Amenity Items Created: ${itemsCreated}`);
        console.log(`Total Questions Updated: ${questionsUpdated}`);
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Migration Failed:', err);
    }
}

migrate();
