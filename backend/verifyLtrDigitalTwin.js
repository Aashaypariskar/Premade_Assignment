const { sequelize, LtrSchedule, LtrItem, Question } = require('./models');

const EXPECTED_SCHEDULES = 11;

async function verifyDigitalTwin() {
    try {
        console.log('--- VERIFYING LTR DIGITAL TWIN (STRICT JS SORT) ---');

        // 1. Check Schedules
        const schedules = await LtrSchedule.findAll({});

        // Sort in JS
        schedules.sort((a, b) => a.display_order - b.display_order);

        console.log(`Schedules Found: ${schedules.length} (Expected: ${EXPECTED_SCHEDULES})`);

        if (schedules.length !== EXPECTED_SCHEDULES) {
            console.error('FAIL: Schedule count mismatch.');
        } else {
            console.log('PASS: Schedule count matches.');
        }

        // 2. Check Hierarchy & Order manually
        for (const schedule of schedules) {
            console.log(`\nSchedule: [${schedule.display_order}] ${schedule.name}`);

            const items = await LtrItem.findAll({
                where: { schedule_id: schedule.id }
            });

            // Sort in JS
            items.sort((a, b) => a.display_order - b.display_order);

            if (items.length === 0) {
                console.warn('  WARN: No Items found in this schedule.');
            }

            let lastItemOrder = 0;
            for (const item of items) {
                if (item.display_order <= lastItemOrder) {
                    console.error(`  FAIL: Item Order Invalid for "${item.name}" (${item.display_order} <= ${lastItemOrder})`);
                }
                lastItemOrder = item.display_order;

                const questions = await Question.findAll({
                    where: { item_id: item.id }
                });

                // Sort in JS
                questions.sort((a, b) => a.display_order - b.display_order);

                console.log(`  - Item: [${item.display_order}] ${item.name} (${questions.length} Qs)`);

                if (questions.length === 0) console.warn('    WARN: No Questions found.');

                // Validate answer types
                const values = questions.filter(q => q.answer_type === 'VALUE').length;
                const bools = questions.filter(q => q.answer_type === 'BOOLEAN').length;
                // console.log(`    > VALUE: ${values}, BOOLEAN: ${bools}`);

                let lastQOrder = 0;
                for (const q of questions) {
                    if (q.display_order <= lastQOrder) {
                        console.error(`    FAIL: Question Order Invalid (${q.display_order} <= ${lastQOrder})`);
                    }
                    lastQOrder = q.display_order;
                }
            }
        }

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('Verification Failed:', err);
    }
}

verifyDigitalTwin();
