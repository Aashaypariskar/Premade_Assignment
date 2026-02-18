const { sequelize, AmenitySubcategory, AmenityItem, Question, CategoryMaster } = require('./models');

async function validate() {
    try {
        console.log('--- VALIDATING AMENITY HIERARCHY ---');

        // 1. Validate Subcategories
        const subcategories = await AmenitySubcategory.findAll();
        console.log(`\nTotal Subcategories: ${subcategories.length}`);

        const subNames = subcategories.map(s => s.name);
        const uniqueNames = new Set(subNames);
        if (subNames.length !== uniqueNames.size) {
            console.error('!!! DUPLICATE SUBCATEGORIES FOUND !!!');
        } else {
            console.log('✔ No duplicate subcategories.');
        }

        // 2. Validate Items
        const items = await AmenityItem.findAll();
        console.log(`\nTotal Items: ${items.length}`);

        // 3. Validate Questions
        // Find Master
        const master = await CategoryMaster.findOne({ where: { name: 'Amenity' } });
        if (!master) {
            console.error('Amenity Master not found');
            return;
        }

        const amenityQuestions = await Question.findAll({ where: { category_id: master.id } });

        console.log(`\nTotal Amenity Questions: ${amenityQuestions.length}`);

        // 4. Check Orphans
        const orphans = amenityQuestions.filter(q => !q.item_id);
        if (orphans.length > 0) {
            console.error(`!!! FOUND ${orphans.length} ORPHAN QUESTIONS (No Item ID) !!!`);
            orphans.slice(0, 3).forEach(q => console.log(` - QID: ${q.id} Text: ${q.text}`));
        } else {
            console.log('✔ All Amenity questions have valid Item IDs.');
        }

        const subOrphans = amenityQuestions.filter(q => !q.subcategory_id);
        if (subOrphans.length > 0) {
            console.error(`!!! FOUND ${subOrphans.length} QUESTIONS WITHOUT SUBCATEGORY !!!`);
        } else {
            console.log('✔ All Amenity questions have valid Subcategory IDs.');
        }

        console.log('\n--- VALIDATION COMPLETE ---');

    } catch (err) {
        console.error('Validation Failed:', err);
    }
}

validate();
