const { sequelize, AmenitySubcategory, AmenityItem, Question, Activity, Reason, CategoryMaster } = require('./models');

async function reset() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING AMENITY FRAMEWORK RESET ---');

        // 1. Find Amenity Master
        const amenityMaster = await CategoryMaster.findOne({ where: { name: 'Amenity' }, transaction });
        if (!amenityMaster) {
            throw new Error('Amenity Master Category not found!');
        }
        console.log(`Targeting Amenity Master ID: ${amenityMaster.id}`);

        // 2. Find all Subcategories linked to Amenity
        const subcategories = await AmenitySubcategory.findAll({
            where: { category_id: amenityMaster.id },
            transaction
        });
        const subIds = subcategories.map(s => s.id);
        console.log(`Found ${subIds.length} Amenity Subcategories to wipe.`);

        if (subIds.length > 0) {
            // 3. Delete Questions
            const deletedQuestions = await Question.destroy({
                where: { subcategory_id: subIds },
                transaction
            });
            console.log(`Deleted ${deletedQuestions} Questions.`);

            // 4. Delete Amenity Items
            const deletedItems = await AmenityItem.destroy({
                where: { subcategory_id: subIds },
                transaction
            });
            console.log(`Deleted ${deletedItems} Amenity Items.`);

            // 5. Delete Activities
            const deletedActivities = await Activity.destroy({
                where: { subcategory_id: subIds },
                transaction
            });
            console.log(`Deleted ${deletedActivities} Activities.`);

            // 6. Delete Subcategories
            const deletedSubs = await AmenitySubcategory.destroy({
                where: { id: subIds },
                transaction
            });
            console.log(`Deleted ${deletedSubs} Subcategories.`);
        }

        // 7. Safety cleanup for orphaned data (optional but good practice)
        // Check for any questions with item_id but no subcategory (ref integrity check)

        console.log('--- RESET COMPLETE ---');
        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        console.error('Reset Failed:', err);
    }
}

reset();
