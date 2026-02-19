const { sequelize, CategoryMaster, Category, LtrSchedule, Question, Reason, InspectionAnswer } = require('./models');

async function reset() {
    try {
        console.log('--- STARTING LTR FRAMEWORK HARD RESET ---');

        // 1. Identify LTR Categories
        const categories = await Category.findAll({
            where: { name: 'Ltr to Railways' }
        });

        const categoryIds = categories.map(c => c.id);
        console.log(`Found ${categoryIds.length} LTR Categories.`);

        if (categoryIds.length > 0) {
            // 2. Delete Inspection Answers (Audit Trail)
            const deletedAnswers = await InspectionAnswer.destroy({
                where: { category_name: 'Ltr to Railways' }
            });
            console.log(`Refreshed Audit Trail: Deleted ${deletedAnswers} records.`);

            // 3. Find Questions linked to these categories
            const questions = await Question.findAll({
                where: { category_id: categoryIds }
            });
            const questionIds = questions.map(q => q.id);

            // 4. Delete Reasons linked to these Questions
            if (questionIds.length > 0) {
                const deletedReasons = await Reason.destroy({
                    where: { question_id: questionIds }
                });
                console.log(`Deleted ${deletedReasons} Reasons.`);
            }

            // 5. Delete Questions
            const deletedQuestions = await Question.destroy({
                where: { category_id: categoryIds }
            });
            console.log(`Deleted ${deletedQuestions} Questions.`);

            // 6. Delete Schedules
            const deletedSchedules = await LtrSchedule.destroy({
                where: { category_id: categoryIds }
            });
            console.log(`Deleted ${deletedSchedules} Schedules.`);
        }

        console.log('--- LTR RESET COMPLETE ---');

    } catch (err) {
        console.error('Reset Failed:', err);
    }
}

reset();
