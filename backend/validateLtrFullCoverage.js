const { sequelize, LtrSchedule, Question, Category, Coach } = require('./models');

async function validate() {
    try {
        console.log('--- VALIDATING LTR FULL COVERAGE ---');

        // 1. Schedule Count per Coach
        const coaches = await Coach.findAll();
        let issues = 0;

        for (const coach of coaches) {
            const cat = await Category.findOne({
                where: { name: 'Ltr to Railways', coach_id: coach.id }
            });

            if (!cat) {
                console.error(`❌ Coach ${coach.coach_number} missing LTR Category!`);
                issues++;
                continue;
            }

            const scheduleCount = await LtrSchedule.count({ where: { category_id: cat.id } });
            if (scheduleCount < 12) { // We seeded 12
                console.error(`❌ Coach ${coach.coach_number} has only ${scheduleCount} schedules (Expected 12).`);
                issues++;
            } else {
                // console.log(`✔ Coach ${coach.coach_number}: ${scheduleCount} schedules.`);
            }

            // 2. Questions per Schedule
            const schedules = await LtrSchedule.findAll({ where: { category_id: cat.id } });
            for (const sch of schedules) {
                const qCount = await Question.count({ where: { schedule_id: sch.id } });
                if (qCount === 0) {
                    console.error(`❌ Schedule "${sch.name}" for Coach ${coach.coach_number} is EMPTY.`);
                    issues++;
                }
            }
        }

        // 3. Orphan Questions
        const orphanCount = await Question.count({
            where: {
                schedule_id: null,
                category_id: { [require('sequelize').Op.in]: sequelize.literal(`(SELECT id FROM categories WHERE name = 'Ltr to Railways')`) }
            }
        });

        if (orphanCount > 0) {
            console.error(`❌ Found ${orphanCount} Orphan Questions in LTR Categories.`);
            issues++;
        } else {
            console.log('✔ No Orphan Questions found.');
        }

        if (issues === 0) {
            console.log('✔✔ ALL VALIDATION CHECKS PASSED ✔✔');
            console.log(`Verified ${coaches.length} Coaches. All have full LTR Framework.`);
        } else {
            console.error(`found ${issues} issues.`);
        }

    } catch (err) {
        console.error(err);
    }
}

validate();
