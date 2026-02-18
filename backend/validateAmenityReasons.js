const { sequelize, Question, Reason, CategoryMaster } = require('./models');

async function check() {
    try {
        console.log('--- VALIDATING AMENITY REASONS ---');

        const master = await CategoryMaster.findOne({ where: { name: 'Amenity' } });
        if (!master) throw new Error('Amenity Master not found');

        const questions = await Question.findAll({ where: { category_id: master.id } });
        console.log(`Checking ${questions.length} Amenity Questions...`);

        let zeroReasonParams = 0;

        for (const q of questions) {
            const count = await Reason.count({ where: { question_id: q.id } });
            if (count === 0) {
                console.error(`!!! QID ${q.id} has 0 reasons! Text: "${q.text.substring(0, 30)}..."`);
                zeroReasonParams++;
            }
        }

        if (zeroReasonParams === 0) {
            console.log('✔ SUCCESS: All Amenity questions have reasons.');
        } else {
            console.error(`FAILURE: ${zeroReasonParams} questions still missing reasons.`);
        }

    } catch (err) {
        console.error('Validation Failed:', err);
    }
}

check();
