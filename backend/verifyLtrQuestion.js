const { sequelize, Question } = require('./models');

async function verify() {
    try {
        const question = await Question.findOne({
            where: { answer_type: 'VALUE' }
        });

        if (question) {
            console.log('--- FOUND VALUE QUESTION ---');
            console.log('Text:', question.text);
            console.log('Type:', question.answer_type);
            console.log('Unit:', question.unit);
            console.log('Spec:', question.specified_value);
        } else {
            console.log('No VALUE questions found.');
        }

    } catch (err) {
        console.error(err);
    }
}

verify();
