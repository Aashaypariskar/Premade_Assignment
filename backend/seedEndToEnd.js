const { Train, Coach, Category, Activity, Question, Reason, User, Role, CategoryMaster, UserCategory, sequelize } = require('./models');
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
                    // Create Questions and Reasons together
                    const minorQuestions = [
                        'Checking of boards for torn vinyl',
                        'Application of Vinyl on the board',
                        'Removal of boards from sick coaches',
                        'Fitment of boards as per location',
                        'Checking vinyl graphics (Plate)',
                        'Application of vinyl (Plate)',
                        'Removal from sick coaches (Plate)',
                        'Checking hand rails',
                        'Attention to loose handrails',
                        'Checking corrosion (Steps)',
                        'Attention to loose footsteps',
                        'Checking paint condition',
                        'Checking marking condition'
                    ];

                    const majorQuestions = [
                        'Painting & lettering if vinyl unavailable',
                        'Painting & lettering (Plate)',
                        'Fitment of new handrail',
                        'Fitment of new footstep',
                        'Touch-up painting',
                        'Proper marking & lettering'
                    ];

                    const commissionaryMajorQuestions = [
                        'CBC height (BB end / KYN end)',
                        'Torquing',
                        'WSP (Phonic wheel sensor face gap)',
                        'WSP junction box modification',
                        'Undergear painting',
                        'FIBA Bellow air pressure testing',
                        'Air spring elbow pipeline modification',
                        'Drainpipe modification',
                        'Condition of tough floor paint',
                        'Bio-toilet condition',
                        'Provision of garbage rings',
                        'Linen room fittings',
                        'ACP cover condition',
                        'Toilet panel condition',
                        'Mirror condition',
                        'Berth & seats condition',
                        'Fire extinguishers brackets',
                        'Dustbins',
                        'Emergency window fittings',
                        'Exterior painting'
                    ];

                    const defaultMinorReasons = ['Dirty', 'Broken', 'Missing', 'Loose', 'Worn Out', 'Damaged'];
                    const defaultMajorReasons = ['Complete Failure', 'Structural Damage', 'Replacement Required', 'Safety Hazard', 'Beyond Repair'];

                    // Seed Minor Questions & Reasons
                    for (const qText of minorQuestions) {
                        const q = await Question.create({ activity_id: minorAct.id, text: qText });
                        const reasons = defaultMinorReasons.map(r => ({ question_id: q.id, text: r }));
                        await Reason.bulkCreate(reasons);
                    }

                    // Seed Major Questions & Reasons
                    const questionsToSeed = masterCat.name === 'Coach Commissionary' ? commissionaryMajorQuestions : majorQuestions;
                    for (const qText of questionsToSeed) {
                        const q = await Question.create({ activity_id: majorAct.id, text: qText });
                        const reasons = defaultMajorReasons.map(r => ({ question_id: q.id, text: r }));
                        await Reason.bulkCreate(reasons);
                    }
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
