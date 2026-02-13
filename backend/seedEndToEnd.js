const { Train, Coach, Category, Activity, Question, sequelize } = require('./models');

async function seedProductionData() {
    try {
        await sequelize.sync({ force: true });
        console.log('--- Database Reset Successfully ---');

        const trainsData = [
            { name: 'Rajdhani Express', train_number: '12301' },
            { name: 'Shatabdi Express', train_number: '12002' },
            { name: 'Duronto Express', train_number: '12213' },
            { name: 'Garib Rath', train_number: '12909' },
            { name: 'Vande Bharat Express', train_number: '22436' },
        ];

        for (const tData of trainsData) {
            const train = await Train.create(tData);

            // 2 Coaches per train
            const coaches = await Coach.bulkCreate([
                { train_id: train.id, coach_number: `${tData.train_number}-B1` },
                { train_id: train.id, coach_number: `${tData.train_number}-B2` },
            ]);

            for (const coach of coaches) {
                const category = await Category.create({ coach_id: coach.id, name: 'Exterior' });

                const minorAct = await Activity.create({ category_id: category.id, type: 'Minor' });
                const majorAct = await Activity.create({ category_id: category.id, type: 'Major' });

                await Question.bulkCreate([
                    { activity_id: minorAct.id, text: 'Checking of boards for torn vinyl' },
                    { activity_id: minorAct.id, text: 'Application of Vinyl on the board' },
                    { activity_id: minorAct.id, text: 'Removal of boards from sick coaches' },
                    { activity_id: minorAct.id, text: 'Fitment of boards as per location' },
                    { activity_id: minorAct.id, text: 'Checking vinyl graphics (Plate)' },
                    { activity_id: minorAct.id, text: 'Application of vinyl (Plate)' },
                    { activity_id: minorAct.id, text: 'Removal from sick coaches (Plate)' },
                    { activity_id: minorAct.id, text: 'Checking hand rails' },
                    { activity_id: minorAct.id, text: 'Attention to loose handrails' },
                    { activity_id: minorAct.id, text: 'Checking corrosion (Steps)' },
                    { activity_id: minorAct.id, text: 'Attention to loose footsteps' },
                    { activity_id: minorAct.id, text: 'Checking paint condition' },
                    { activity_id: minorAct.id, text: 'Checking marking condition' },
                ]);

                await Question.bulkCreate([
                    { activity_id: majorAct.id, text: 'Painting & lettering if vinyl unavailable' },
                    { activity_id: majorAct.id, text: 'Painting & lettering (Plate)' },
                    { activity_id: majorAct.id, text: 'Fitment of new handrail' },
                    { activity_id: majorAct.id, text: 'Fitment of new footstep' },
                    { activity_id: majorAct.id, text: 'Touch-up painting' },
                    { activity_id: majorAct.id, text: 'Proper marking & lettering' },
                ]);
            }
        }

        console.log('--- PRODUCTION SEEDING COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedProductionData();
