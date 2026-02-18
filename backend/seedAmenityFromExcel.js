const xlsx = require('xlsx');
const { sequelize, CategoryMaster, AmenitySubcategory, Activity, Question, Reason } = require('./models');

const filePath = 'D:\\Premade_Assignment\\Final amenity correction.xlsx';

const subcategoryMap = {
    'Exterior': 'Exterior',
    'Interior passenger area': 'Interior Passenger Area',
    'Toile Area ': 'Toilets',
    'Seat and Berths': 'Seats & Berths',
    'Door Area': 'Doors & Windows',
    'Flooring Area': 'Flooring',
    'Lighting': 'Lighting',
    'Water System': 'Water System',
    'Window Area': 'Doors & Windows',
    'Signage area': 'Signages',
    'Pantry area': 'Pantry'
};

const minorReasons = ['Dirty', 'Broken', 'Loose', 'Missing', 'Worn Out'];
const majorReasons = ['Structural Damage', 'Safety Hazard', 'Complete Failure', 'Replacement Required', 'Beyond Repair'];

async function seed() {
    let transaction;
    try {
        console.log('--- AMENITY SEEDING LOGIC OVERHAUL ---');
        const workbook = xlsx.readFile(filePath);

        transaction = await sequelize.transaction();

        const [amenityMaster] = await CategoryMaster.findOrCreate({
            where: { name: 'Amenity' },
            transaction
        });

        // CLEANUP
        const subs = await AmenitySubcategory.findAll({ where: { category_id: amenityMaster.id }, transaction });
        const subIds = subs.map(s => s.id);
        if (subIds.length > 0) {
            const qs = await Question.findAll({ where: { subcategory_id: subIds }, transaction });
            const qIds = qs.map(q => q.id);
            if (qIds.length > 0) {
                await Reason.destroy({ where: { question_id: qIds }, transaction });
                await Question.destroy({ where: { id: qIds }, transaction });
            }
        }

        let totalQuestions = 0;

        for (const sheetName of workbook.SheetNames) {
            if (sheetName === 'Final Estimate') continue;

            const mappedSubName = (subcategoryMap[sheetName.trim()] || sheetName.trim()).trim();
            console.log(`\n### SHEET: "${sheetName}" -> "${mappedSubName}" ###`);

            const [sub] = await AmenitySubcategory.findOrCreate({
                where: { name: mappedSubName, category_id: amenityMaster.id },
                transaction
            });

            const [minorAct] = await Activity.findOrCreate({
                where: { type: 'Minor', subcategory_id: sub.id },
                defaults: { category_id: null },
                transaction
            });
            const [majorAct] = await Activity.findOrCreate({
                where: { type: 'Major', subcategory_id: sub.id },
                defaults: { category_id: null },
                transaction
            });

            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            let currentActivity = null;
            let currentItemHeader = "";
            let countInSheet = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const col0 = String(row[0] || '').trim();
                const col1 = String(row[1] || '').trim();
                const col2 = String(row[2] || '').trim();

                // 1. Detection of Sections
                if (col2.toLowerCase().includes('minor activities')) {
                    currentActivity = minorAct;
                    currentItemHeader = "";
                    continue;
                }
                if (col2.toLowerCase().includes('major activities')) {
                    currentActivity = majorAct;
                    currentItemHeader = "";
                    continue;
                }

                // 2. Question Parsing
                if (currentActivity) {
                    // Skip header rows or total rows
                    if (col1.toLowerCase() === 'total' || col1.toLowerCase().includes('sr.no') || col1.toLowerCase().includes('description')) {
                        continue;
                    }

                    // Update Item Header if col1 is not empty
                    if (col1 !== '') {
                        currentItemHeader = col1;
                    }

                    // If col2 has text, it's an activity (question)
                    if (col2 !== '' && col2.toLowerCase() !== 'requirement') {
                        const questionText = currentItemHeader ? `${currentItemHeader}: ${col2}` : col2;

                        const q = await Question.create({
                            text: questionText,
                            activity_id: currentActivity.id,
                            subcategory_id: sub.id,
                            category_id: amenityMaster.id
                        }, { transaction });

                        totalQuestions++;
                        countInSheet++;

                        const reasons = currentActivity.type === 'Minor' ? minorReasons : majorReasons;
                        for (const rText of reasons) {
                            await Reason.create({ question_id: q.id, text: rText }, { transaction });
                        }
                    }
                }
            }
            console.log(`  Seeded ${countInSheet} questions.`);
        }

        await transaction.commit();
        console.log(`\n\nDONE. Total Questions Seeded: ${totalQuestions}`);
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('FAILED:', err);
    }
}

seed();
