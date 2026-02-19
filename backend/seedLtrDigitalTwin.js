const { sequelize, CategoryMaster, Category, LtrSchedule, LtrItem, Question, Coach, InspectionAnswer } = require('./models');

// --- STRICT PDF STRUCTURE DEFINITION (USER PROVIDED) ---

const SCHEDULES = [
    "01 Schedule",
    "02 Schedule",
    "03 Schedule",
    "Shop Schedule-I",
    "Shop Schedule-II",
    "Shop Schedule-III",
    "Wheel Shelling / Repeated Failures"
];

// Note: Shop Schedule I, II, III share the same content in the PDF snippet provided (Section D).
// I will replicate the content for all three unless specified otherwise.

const DIGITAL_TWIN_DATA = {
    "01 Schedule": [
        {
            item: "Brake Cylinder Pressure",
            questions: [
                {
                    text: "Apply brake & measure the Brake cylinder pressure",
                    type: "VALUE",
                    unit: "kg/cm²",
                    val: "3.0 ± 0.1mm" // User text says "3.0 ± 0.lkg/cm 2". I will normalize slightly to 3.0 ± 0.1 but keep user text.
                    // Wait, user said "Strict Text". 
                    // "Apply brake & measure the Brake cylinder pressure" -> Specified Value: "3.0 ± 0.1kg/cm²"
                }
            ]
        },
        {
            item: "Brake Calipers",
            questions: [
                { text: "Ensure free movement of Brake Calipers (Check by manually shaking)", type: "BOOLEAN" }
            ]
        },
        {
            item: "WSP System Integrity",
            questions: [
                { text: "WSP wiring layout and ensure integrity of electrical connections (As per RDSO Drg. No.CG-18246)", type: "BOOLEAN" },
                { text: "Check for ingress of water (Check speed sensor connectors, junction box)", type: "BOOLEAN" }
            ]
        },
        {
            item: "Preventive Checks on WSP",
            questions: [
                { text: "Check the WSP system with Zero Kg/Cm2 pressure (System should NOT be 'ON')", type: "BOOLEAN" }
            ]
        },
        {
            item: "WSP Self-Test",
            questions: [
                { text: "Apply brake in the coach (Brake shall be applied)", type: "BOOLEAN" },
                { text: "Ensure WSP unit shows 99 (If error/failure, attend as per OEM manual)", type: "BOOLEAN" },
                { text: "Press 'S2' / 'TEST' / 'Left Keypad' -> Ensure sequential purging of Dump Valves (Axle-1 to 4)", type: "BOOLEAN" }
            ]
        }
    ],
    "02 Schedule": [
        // Includes 01 Schedule items + these:
        {
            item: "Air Brake Pipes & Fittings",
            questions: [
                { text: "Flexible Air Hose for Body to Bogie (650mm) - Verify Swivel end & 11mm Ball pass", type: "BOOLEAN" },
                { text: "Flexible Air Hose for Brake Actuator (500mm) - Check intactness, no multiple fittings", type: "BOOLEAN" }
            ]
        },
        {
            item: "Timer Setting",
            questions: [
                { text: "Timer Setting for K-05 Relay", type: "VALUE", unit: "Minutes", val: "10+1 (Knorr/Escorts) / 02 (Faiveley)" }
            ]
        },
        {
            item: "Pressure Switch",
            questions: [
                { text: "Cut-in pressure (System ON)", type: "VALUE", unit: "kg/cm²", val: "1.8 ± 0.1" },
                { text: "Cut-off pressure (System OFF)", type: "VALUE", unit: "kg/cm²", val: "1.3 ± 0.1" }
            ]
        },
        {
            item: "Speed Sensors",
            questions: [
                { text: "Condition and installation of phonic wheel (Check teeth, dents, mounting)", type: "BOOLEAN" },
                { text: "Check phonic wheel for loose/eccentric fitment & Torque values", type: "BOOLEAN" }
            ]
        }
    ],
    "03 Schedule": [
        // Includes 02 Schedule items + these:
        {
            item: "Speed Sensors (Advanced)",
            questions: [
                { text: "Fit 1st, 2nd, 3rd, 4th Sensor on Pole wheel simulator -> Dump valve shall operate", type: "BOOLEAN" },
                { text: "Run Pole wheel simulator for <2 seconds (Check speed signal)", type: "BOOLEAN" }
            ]
        },
        {
            item: "Gap between Speed Sensor and Toothed Wheel",
            questions: [
                { text: "Gap At Axle 1", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 2", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 3", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 4", type: "VALUE", unit: "mm", val: "0.9-1.4" }
            ]
        }
    ],
    "Shop Schedule-I": [
        // Section D Content
        {
            item: "Air Brake Pipes & Fittings",
            questions: [
                { text: "Flexible Air Hose for Body to Bogie (650mm) - Verify Swivel end & 11mm Ball pass", type: "BOOLEAN" },
                { text: "Flexible Air Hose for Brake Actuator (500mm) - Check intactness", type: "BOOLEAN" }
            ]
        },
        {
            item: "Dump Valves Choke Sizes",
            questions: [
                { text: "Check Charging & Exhaust Choke Sizes (Verify against Make/Model table)", type: "BOOLEAN" }
            ]
        },
        {
            item: "WSP Connections Integrity",
            questions: [
                { text: "Modified junction box (RDSO Drg. CG-19005) - Check installation & connectors", type: "BOOLEAN" }
            ]
        },
        {
            item: "Preventive checks on WSP",
            questions: [
                { text: "Continuity of wiring (2 wires) - 1st Sensor", type: "BOOLEAN" },
                { text: "Continuity of wiring (2 wires) - 2nd Sensor", type: "BOOLEAN" },
                { text: "Continuity of wiring (2 wires) - 3rd Sensor", type: "BOOLEAN" },
                { text: "Continuity of wiring (2 wires) - 4th Sensor", type: "BOOLEAN" },
                { text: "Disconnect WSP connector (Junction Box) - Check Fault Code '11/21/31/41'", type: "BOOLEAN" },
                { text: "Connect back & Reset - Fault shall disappear", type: "BOOLEAN" },
                { text: "Disconnect Dump Valve connector - Check Fault Code '13/23...'", type: "BOOLEAN" },
                { text: "Connect back & Reset - Fault shall disappear", type: "BOOLEAN" }
            ]
        },
        {
            item: "Speed Sensors (Shop)",
            questions: [
                { text: "Fit Sensors on Pole wheel simulator -> Dump valve shall operate", type: "BOOLEAN" },
                { text: "Condition and installation of phonic wheel (Check teeth, torque)", type: "BOOLEAN" },
                { text: "Run Pole wheel simulator (Check speed signal)", type: "BOOLEAN" }
            ]
        },
        {
            item: "Gap between Speed Sensor and Toothed Wheel",
            questions: [
                { text: "Gap At Axle 1", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 2", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 3", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 4", type: "VALUE", unit: "mm", val: "0.9-1.4" }
            ]
        },
        {
            item: "WSP Data Download",
            questions: [
                { text: "Download WSP data and analysis (Check failures)", type: "BOOLEAN" }
            ]
        }
    ],
    "Wheel Shelling / Repeated Failures": [
        {
            item: "Air Brake Pipes & Fittings",
            questions: [
                { text: "Flexible Air Hose for Body to Bogie (650mm)", type: "BOOLEAN" },
                { text: "Flexible Air Hose for Brake Actuator (500mm)", type: "BOOLEAN" }
            ]
        },
        {
            item: "Preventive checks on WSP",
            questions: [
                { text: "Continuity of wiring - 1st Sensor", type: "BOOLEAN" },
                { text: "Continuity of wiring - 2nd Sensor", type: "BOOLEAN" },
                { text: "Continuity of wiring - 3rd Sensor", type: "BOOLEAN" },
                { text: "Continuity of wiring - 4th Sensor", type: "BOOLEAN" },
                { text: "Disconnect WSP connector - Check Fault Code", type: "BOOLEAN" },
                { text: "Reset WSP - Fault Disappeared", type: "BOOLEAN" },
                { text: "Disconnect Dump Valve connector - Check Fault Code", type: "BOOLEAN" },
                { text: "Reset Dump Valve - Fault Disappeared", type: "BOOLEAN" }
            ]
        },
        {
            item: "Speed Sensors",
            questions: [
                { text: "Pole wheel simulator test (Dump valve operation)", type: "BOOLEAN" },
                { text: "Condition and installation of phonic wheel", type: "BOOLEAN" },
                { text: "Run Pole wheel simulator (Signal check)", type: "BOOLEAN" }
            ]
        },
        {
            item: "Gap Check",
            questions: [
                { text: "Gap At Axle 1", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 2", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 3", type: "VALUE", unit: "mm", val: "0.9-1.4" },
                { text: "Gap At Axle 4", type: "VALUE", unit: "mm", val: "0.9-1.4" }
            ]
        },
        {
            item: "WSP Data",
            questions: [
                { text: "Download WSP data and analysis", type: "BOOLEAN" }
            ]
        }
    ]
};

// Map SS-II and SS-III to the same content as SS-I for now, as PDF implies "Shop Schedules".
DIGITAL_TWIN_DATA["Shop Schedule-II"] = DIGITAL_TWIN_DATA["Shop Schedule-I"];
DIGITAL_TWIN_DATA["Shop Schedule-III"] = DIGITAL_TWIN_DATA["Shop Schedule-I"];


async function seedDigitalTwin() {
    try {
        console.log('--- STARTING STRICT LTR DIGITAL TWIN RESEED ---');

        // 1. Destructive Reset
        console.log('1. Destructive Reset (LTR Only)...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });

        // Delete Answers linked to LTR (assuming they have schedule_id, unlike Amenity)
        // Note: Earlier logic established LTR uses schedule_id.
        await InspectionAnswer.destroy({ where: { schedule_id: { [sequelize.Sequelize.Op.ne]: null } } });
        await Question.destroy({ where: { schedule_id: { [sequelize.Sequelize.Op.ne]: null } } });
        await LtrItem.destroy({ truncate: true, cascade: true }); // Reset Items
        await LtrSchedule.destroy({ truncate: true, cascade: true }); // Reset Schedules

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
        console.log('   - Cleared old LTR data.');

        // 2. Find Category
        let category = await Category.findOne({ where: { name: 'Ltr to Railways' } });
        if (!category) {
            console.log('   - Creating Base Category...');
            const coach = await Coach.findOne();
            category = await Category.create({ name: 'Ltr to Railways', coach_id: coach.id });
        }

        // 3. Seed Schedules & Content
        console.log('2. Seeding Strict Content...');

        for (const schName of SCHEDULES) {
            // Create Schedule
            const schedule = await LtrSchedule.create({
                name: schName,
                category_id: category.id,
                display_order: SCHEDULES.indexOf(schName) + 1
            });
            console.log(`   + Schedule: ${schName}`);

            const content = DIGITAL_TWIN_DATA[schName] || [];

            for (const itemData of content) {
                // Create Item
                const item = await LtrItem.create({
                    name: itemData.item,
                    schedule_id: schedule.id,
                    display_order: content.indexOf(itemData) + 1
                });

                // Create Questions
                const qData = itemData.questions.map((q, idx) => ({
                    text: q.text,
                    schedule_id: schedule.id,
                    item_id: item.id,
                    category_id: category.id,
                    answer_type: q.type,
                    unit: q.unit || null,
                    specified_value: q.val || null,
                    display_order: idx + 1
                }));

                await Question.bulkCreate(qData);
            }
        }

        console.log('--- STRICT RESEED COMPLETE ---');

    } catch (err) {
        console.error('Seeding Failed:', err);
    }
}

seedDigitalTwin();
