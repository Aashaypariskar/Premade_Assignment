const { sequelize, CategoryMaster, Category, LtrSchedule, Question, Coach } = require('./models');

// Master List EXACTLY as requested by User
const MASTER_SCHEDULES = [
    "D1 Schedule",
    "D2 Schedule",
    "D3 Schedule",
    "Trip Schedule",
    "Monthly Schedule",
    "Quarterly Schedule",
    "Half-Yearly Schedule",
    "Yearly Schedule",
    "IOH Schedule",
    "ROH Schedule",
    "POH Schedule",
    "Workshop Schedule"
];

// Representative Questions for LTR Framework (Simulating PDF Content)
const COMMON_QUESTIONS = [
    { text: "Ensure free movement of brake calipers", type: "BOOLEAN" },
    { text: "Check intactness of wiring and conduits", type: "BOOLEAN" },
    { text: "Measure brake cylinder pressure (Spec: 3.0 ± 0.1 kg/cm²)", type: "VALUE", unit: "kg/cm²", val: "3.0 ± 0.1 kg/cm²" },
    { text: "Inspect mounting bolts of traction motor", type: "BOOLEAN" },
    { text: "Record wheel diameter (Condemn: < 800 mm)", type: "VALUE", unit: "mm", val: "Condemn: < 800 mm" },
    { text: "Check oil level in dashpot", type: "BOOLEAN" },
    { text: "Measure buffer height (Spec: 1105 mm)", type: "VALUE", unit: "mm", val: "1105 mm" },
    { text: "Verify safety loop clearance", type: "BOOLEAN" },
    { text: "Record air spring pressure (Bar)", type: "VALUE", unit: "Bar" }
];

const ELECTRICAL_QUESTIONS = [
    { text: "Check operation of all fans and lights", type: "BOOLEAN" },
    { text: "Measure battery voltage (Spec: 110 V)", type: "VALUE", unit: "Volts", val: "110 V" },
    { text: "Verify proper locking of electrical panels", type: "BOOLEAN" },
    { text: "Record AC plant current draw (Amps)", type: "VALUE", unit: "Amps" },
    { text: "Check passenger alarm chain apparatus", type: "BOOLEAN" },
    { text: "Measure regulating voltage", type: "VALUE", unit: "Volts" }
];

const INTERIOR_QUESTIONS = [
    { text: "Check flushing mechanism", type: "BOOLEAN" },
    { text: "Measure discharge time of bio-toilet (Sec)", type: "VALUE", unit: "Seconds" },
    { text: "Verify water availability in tanks", type: "BOOLEAN" },
    { text: "Check condition of washbasin and mirrors", type: "BOOLEAN" },
    { text: "Record chlorine level in water (PPM)", type: "VALUE", unit: "PPM" }
];

// Assign questions to schedules logically
const SCHEDULE_CONTENT = {
    "D1 Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS],
    "D2 Schedule": [...COMMON_QUESTIONS, ...INTERIOR_QUESTIONS],
    "D3 Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "Trip Schedule": [...COMMON_QUESTIONS],
    "Monthly Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS],
    "Quarterly Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "Half-Yearly Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "Yearly Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "IOH Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "ROH Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "POH Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS],
    "Workshop Schedule": [...COMMON_QUESTIONS, ...ELECTRICAL_QUESTIONS, ...INTERIOR_QUESTIONS]
};

async function seedStrict() {
    try {
        console.log('--- STARTING STRICT LTR MASTER TEMPLATE SEEDING ---');

        // Note: resetLtrFramework.js has already cleared data.
        // We will execute a safe sync to ensure schema is correct, but avoid 'alter' if possible to prevent errors.
        // Given previous issues, we assume schema is correct (Questions table exists).

        // 1. Find or Create 'Ltr to Railways' Categories
        let targetCategories = await Category.findAll({ where: { name: 'Ltr to Railways' } });

        if (targetCategories.length === 0) {
            console.log('No existing LTR categories. Creating one for testing...');
            let coach = await Coach.findOne();
            if (!coach) {
                console.error('CRITICAL: No coaches found in DB. Cannot seed LTR.');
                return;
            }
            const newCat = await Category.create({ name: 'Ltr to Railways', coach_id: coach.id });
            targetCategories.push(newCat);
        }

        console.log(`Seeding into ${targetCategories.length} Categories...`);

        for (const category of targetCategories) {
            console.log(`Processing Category ID: ${category.id}`);

            for (const schName of MASTER_SCHEDULES) {
                // Create Schedule
                const schedule = await LtrSchedule.create({
                    name: schName,
                    category_id: category.id
                });
                console.log(`   + Created Schedule: ${schName}`);

                const questions = SCHEDULE_CONTENT[schName] || COMMON_QUESTIONS; // Fallback

                // Prepare Questions
                const qData = questions.map(q => ({
                    text: q.text,
                    schedule_id: schedule.id,
                    category_id: category.id,
                    answer_type: q.type,
                    unit: q.unit || null,
                    specified_value: q.val || null
                }));

                // Bulk Insert Questions
                // Using individual creates to catch errors if bulk fails
                await Question.bulkCreate(qData);
            }
        }

        console.log('--- LTR STRICT SEEDING SUCCESS ---');

    } catch (err) {
        console.error('Seeding Failed:', err);
    }
}

seedStrict();
