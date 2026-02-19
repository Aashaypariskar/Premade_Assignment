const { sequelize, Train, Coach, Category, LtrSchedule } = require('./models');

async function debugAvailability() {
    try {
        console.log('--- CHECKING LTR SCHEDULE AVAILABILITY ---');

        const coaches = await Coach.findAll({
            include: [{
                model: Train
            }, {
                model: Category,
                required: false,
                where: { name: 'Ltr to Railways' },
                include: [{
                    model: LtrSchedule,
                    attributes: ['id', 'name']
                }]
            }]
        });

        console.log(`Total Coaches Found: ${coaches.length}`);

        let coachesWithSchedules = 0;
        let coachesWithoutSchedules = 0;
        let coachesWithoutCategory = 0;

        for (const coach of coaches) {
            const trainNum = coach.Train ? coach.Train.train_number : 'Unknown';
            const categories = coach.Categories || [];

            if (categories.length === 0) {
                console.log(`[EMPTY] Train ${trainNum} - Coach ${coach.coach_number}: No 'Ltr to Railways' Category`);
                coachesWithoutCategory++;
                continue;
            }

            const ltrCat = categories[0];
            const scheduleCount = ltrCat.LtrSchedules ? ltrCat.LtrSchedules.length : 0;

            if (scheduleCount === 0) {
                console.log(`[MISSING] Train ${trainNum} - Coach ${coach.coach_number}: Category exists (ID: ${ltrCat.id}) but 0 Schedules`);
                coachesWithoutSchedules++;
            } else {
                console.log(`[OK] Train ${trainNum} - Coach ${coach.coach_number}: ${scheduleCount} Schedules`);
                coachesWithSchedules++;
            }
        }

        console.log('--- SUMMARY ---');
        console.log(`OK (Has Schedules): ${coachesWithSchedules}`);
        console.log(`MISSING (Has Cat, No Sch): ${coachesWithoutSchedules}`);
        console.log(`EMPTY (No Category): ${coachesWithoutCategory}`);

    } catch (err) {
        console.error('Debug Failed:', err);
    }
}

debugAvailability();
