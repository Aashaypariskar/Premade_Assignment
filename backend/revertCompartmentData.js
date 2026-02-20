const { Question, AmenityItem, AmenitySubcategory, sequelize } = require('./models');

async function revert() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING COMPARTMENT DATA REVERT ---');

        // Mapping Duplicate IDs (180-184) to Original IDs (120-124)
        // 120 | Interior passenger area <=> 180
        // 121 | Door Area              <=> 181
        // 122 | Passage area            <=> 182
        // 123 | Lavatory area           <=> 183
        // 124 | Seat and Berths         <=> 184
        const mapping = {
            180: 120,
            181: 121,
            182: 122,
            183: 123,
            184: 124
        };

        for (const [dupId, origId] of Object.entries(mapping)) {
            console.log(`Migrating data from ${dupId} to ${origId}...`);

            // 1. Update Questions
            const [qUpdated] = await Question.update(
                { subcategory_id: origId },
                { where: { subcategory_id: dupId }, transaction }
            );
            console.log(`- Updated ${qUpdated} Questions.`);

            // 2. Update AmenityItems
            const [iUpdated] = await AmenityItem.update(
                { subcategory_id: origId },
                { where: { subcategory_id: dupId }, transaction }
            );
            console.log(`- Updated ${iUpdated} AmenityItems.`);
        }

        // 3. Delete Duplicate Subcategories
        const deletedSubs = await AmenitySubcategory.destroy({
            where: { id: Object.keys(mapping) },
            transaction
        });
        console.log(`--- DELETED ${deletedSubs} DUPLICATE SUBCATEGORIES ---`);

        await transaction.commit();
        console.log('--- REVERT COMPLETE ---');
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Revert Failed:', err);
    }
}

revert();
