const { sequelize, Question, InspectionAnswer } = require('./models');

async function validate() {
    try {
        console.log('--- VALIDATING LTR ANSWER TYPES ---');

        // 1. Check Questions Schema Usage
        const valueQuestions = await Question.findAll({ where: { answer_type: 'VALUE' } });
        const booleanQuestions = await Question.findAll({ where: { answer_type: 'BOOLEAN' } });

        console.log(`VALUE Questions Found: ${valueQuestions.length}`);
        console.log(`BOOLEAN Questions Found: ${booleanQuestions.length}`);

        const valueWithoutUnit = valueQuestions.filter(q => !q.unit);
        if (valueWithoutUnit.length > 0) {
            console.warn(`⚠️ Warning: ${valueWithoutUnit.length} VALUE questions are missing Units.`);
            // console.log(valueWithoutUnit.map(q => q.text));
        } else {
            console.log('✔ All VALUE questions have units (or acceptable nulls).');
        }

        // 2. Check Inspection Answers
        const answers = await InspectionAnswer.findAll({
            include: [{ model: Question }]
        });

        let valueMismatch = 0;
        let booleanMismatch = 0;
        let valueCaptured = 0;

        for (const ans of answers) {
            if (ans.Question?.answer_type === 'VALUE') {
                if (!ans.observed_value) {
                    valueMismatch++;
                } else {
                    valueCaptured++;
                }
            } else if (ans.Question?.answer_type === 'BOOLEAN') {
                if (ans.observed_value) {
                    // Not strictly an mismatch if we allow remarks in observed_value, but generally shouldn't happen
                    booleanMismatch++;
                }
            }
        }

        console.log(`Inspection Records Checked: ${answers.length}`);
        console.log(`Value Answers Captured: ${valueCaptured}`);
        if (valueMismatch > 0) console.error(`❌ Errors: ${valueMismatch} VALUE questions missing observed_value.`);
        if (booleanMismatch > 0) console.warn(`⚠️ Warning: ${booleanMismatch} BOOLEAN questions have observed_value (Check logic).`);

        console.log('--- VALIDATION COMPLETE ---');

    } catch (err) {
        console.error('Validation Failed:', err);
    }
}

validate();
