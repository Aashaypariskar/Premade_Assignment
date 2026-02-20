const { InspectionAnswer } = require('./models');
const { Op } = require('sequelize');

async function debug() {
    console.log("--- FILTERED DB INSPECTION ---");
    const coach_id = 5;
    const date = '2026-02-20';

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const answers = await InspectionAnswer.findAll({
        where: {
            coach_id,
            answer: { [Op.in]: ['NO', 'NA'] },
            createdAt: { [Op.between]: [start, end] }
        },
        order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${answers.length} NO/NA answers for Coach ${coach_id} on ${date}`);

    answers.forEach(a => {
        console.log(`[ANS] ID: ${a.id} | SubID: ${a.submission_id} | Comp: ${a.subcategory_name} | Q: ${a.question_text_snapshot.substring(0, 50)} | Val: ${JSON.stringify(a.answer)}`);
    });

    process.exit(0);
}

debug();
