const { Train, Coach, Category, Activity, Question, User, Role, CategoryMaster, UserCategory, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function seedProductionData() {
    try {
        await sequelize.sync({ force: true });
        console.log('--- Database Reset Successfully ---');

        // 1. Seed Roles
        const roles = await Role.bulkCreate([
            { role_name: 'Admin' },
            { role_name: 'Engineer' },
            { role_name: 'Auditor' },
            { role_name: 'Field User' },
        ]);
        console.log('--- Roles Seeded ---');

        // 2. Seed Master Categories
        const catMaster = await CategoryMaster.bulkCreate([
            { name: 'Exterior' },
            { name: 'Coach Commissionary' },
            { name: 'Sick Line Examination' },
            { name: 'Pit Line Examination' },
        ]);
        console.log('--- Master Categories Seeded ---');

        // 3. Create Default Admin User
        const adminRole = roles.find(r => r.role_name === 'Admin');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = await User.create({
            name: 'System Admin',
            email: 'admin@inspection.com',
            password: hashedPassword,
            role_id: adminRole.id
        });

        // 4. Assign all categories to Admin
        for (const cat of catMaster) {
            await UserCategory.create({
                user_id: adminUser.id,
                category_id: cat.id
            });
        }
        console.log('--- Admin User Created & Assigned to All Categories ---');

        // 5. Seed Trains & Domain Data
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
                for (const masterCat of catMaster) {
                    const category = await Category.create({
                        coach_id: coach.id,
                        name: masterCat.name
                    });

                    const minorAct = await Activity.create({ category_id: category.id, type: 'Minor' });
                    const majorAct = await Activity.create({ category_id: category.id, type: 'Major' });

                    // Use the same comprehensive question set for all categories
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
        }

        console.log('--- PRODUCTION SEEDING COMPLETE WITH RBAC ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedProductionData();
