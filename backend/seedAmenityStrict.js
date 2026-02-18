const xlsx = require('xlsx');
const { sequelize, AmenitySubcategory, AmenityItem, Question, Activity, CategoryMaster } = require('./models');

const filePath = 'D:\\Premade_Assignment\\Final amenity correction.xlsx';

async function seed() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING STRICT AMENITY SEEDING ---');

        // 1. Get Amenity Master
        const amenityMaster = await CategoryMaster.findOne({ where: { name: 'Amenity' }, transaction });
        if (!amenityMaster) {
            throw new Error('Amenity Master not found!');
        }

        const workbook = xlsx.readFile(filePath);
        let totalQuestions = 0;
        let totalItems = 0;
        let totalSubcats = 0;

        for (const sheetName of workbook.SheetNames) {
            if (sheetName === 'Final Estimate') continue;

            console.log(`Processing Subcategory: "${sheetName}"`);

            // 2. Create Subcategory (One per Sheet)
            const [subcategory] = await AmenitySubcategory.findOrCreate({
                where: { name: sheetName, category_id: amenityMaster.id },
                transaction
            });
            totalSubcats++;

            // 3. Process Rows
            // Header is Row 3 (index 3 via sheet_to_json if 0-indexed?? No, standard is index 0)
            // But we can iterate all rows and look for data.
            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            let currentActivityType = 'Minor'; // Default
            let lastItemName = null;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const rowStr = JSON.stringify(row).toLowerCase();

                // --- DETECT ACTIVITY TYPE CHANGE ---
                if (rowStr.includes('major activities')) {
                    currentActivityType = 'Major';
                    console.log(`  > Switched to MAJOR activities at Row ${i + 1}`);
                    continue; // Skip header row
                }
                if (rowStr.includes('minor activities')) {
                    currentActivityType = 'Minor';
                    console.log(`  > Switched to MINOR activities at Row ${i + 1}`);
                    continue; // Skip header row
                }
                if (rowStr.includes('sr.no') || rowStr.includes('workstation')) {
                    continue; // Skip metadata rows
                }

                // --- PARSE DATA ---
                // Col A(0): SrNo, Col B(1): Item, Col C(2): Question
                const colB = String(row[1] || '').trim(); // Item
                const colC = String(row[2] || '').trim(); // Question

                // If no question text, skip
                if (!colC) continue;

                // Determine Item Name
                let itemName = colB;
                if (!itemName && lastItemName) {
                    itemName = lastItemName; // Merge cell logic
                }

                if (!itemName) {
                    // If we still have no item name, and we have a question, strict rules say:
                    // "Each unique Item per subcategory + activity becomes one record."
                    // If Item Name is missing in Excel, maybe use "General"?
                    // But we expect well-formed data based on analysis.
                    // Let's log warning and use "General".
                    console.warn(`  Warning: Question "${colC}" has no Item. Using 'General'.`);
                    itemName = 'General';
                }

                lastItemName = itemName; // Update for next row

                // 4. Create/Find Activity
                // Note: Activities are simple records linking subcategory to type.
                const [activity] = await Activity.findOrCreate({
                    where: { subcategory_id: subcategory.id, type: currentActivityType },
                    transaction
                });

                // 5. Create/Find Amenity Item
                const [item, itemCreated] = await AmenityItem.findOrCreate({
                    where: {
                        name: itemName,
                        subcategory_id: subcategory.id,
                        activity_type: currentActivityType
                    },
                    transaction
                });
                if (itemCreated) totalItems++;

                // 6. Create Question
                // Strict: No punctuation cleaning. formatting strictly.
                await Question.create({
                    text: colC,
                    activity_id: activity.id,
                    subcategory_id: subcategory.id,
                    category_id: amenityMaster.id, // Link to Master
                    item_id: item.id
                }, { transaction });

                totalQuestions++;
            }
        }

        await transaction.commit();
        console.log('--- SEEDING COMPLETE ---');
        console.log(`Subcategories: ${totalSubcats}`);
        console.log(`Items: ${totalItems}`);
        console.log(`Questions: ${totalQuestions}`);

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Seeding Failed:', err);
    }
}

seed();
