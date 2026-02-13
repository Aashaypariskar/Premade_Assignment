const { Category, Activity, Question, Train, Coach } = require('./models');
const sequelize = require('./config/db');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('--- Seeding real Excel checklist data ---');

        // 1. Create a Train and Coach if not exist
        const [train] = await Train.findOrCreate({
            where: { train_number: '12345' },
            defaults: { name: 'Rajdhani Express' }
        });

        const [coach] = await Coach.findOrCreate({
            where: { coach_number: 'C1', train_id: train.id }
        });

        // 2. Create 'Exterior' Category for this coach
        const [category] = await Category.findOrCreate({
            where: { name: 'Exterior', coach_id: coach.id }
        });

        // 3. Create Minor Activity and Questions
        const [minorAct] = await Activity.findOrCreate({
            where: { type: 'Minor', category_id: category.id }
        });

        const minorQuestions = [
            'Checking of boards for torn vinyl',
            'Application of Vinyl on the board',
            'Removal of boards from sick coaches',
            'Fitment of boards as per location',
            'Checking of Hand Rails',
            'Attention to loose handrails',
            'Checking foot steps for corrosion',
            'Attention to loose footsteps',
            'Checking Exterior Paint Condition',
            'Checking Coach Number Marking'
        ];

        for (const text of minorQuestions) {
            await Question.findOrCreate({ where: { text, activity_id: minorAct.id } });
        }

        // 4. Create Major Activity and Questions
        const [majorAct] = await Activity.findOrCreate({
            where: { type: 'Major', category_id: category.id }
        });

        const majorQuestions = [
            'Painting destination board',
            'Painting coach number plate',
            'Fitment of new handrail',
            'Fitment of new footstep',
            'Touch-up exterior painting',
            'Coach number marking'
        ];

        for (const text of majorQuestions) {
            await Question.findOrCreate({ where: { text, activity_id: majorAct.id } });
        }

        console.log('--- SEEDING COMPLETE! ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
