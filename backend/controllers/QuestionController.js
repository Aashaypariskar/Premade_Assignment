const { Question, Activity, Category, Reason } = require('../models');

/**
 * QuestionController - Admin Question Management
 * Allows dynamic CRUD operations on inspection questions
 */

// GET /api/questions?activity_id=X (All authenticated users)
exports.getQuestionsByActivity = async (req, res) => {
    try {
        const { activity_id, schedule_id } = req.query;
        if (!activity_id && !schedule_id) {
            return res.status(400).json({ error: 'activity_id or schedule_id is required' });
        }

        const where = {};
        if (activity_id) where.activity_id = activity_id;
        if (schedule_id) where.schedule_id = schedule_id;

        const questions = await Question.findAll({
            where,
            order: [['id', 'ASC']]
        });

        res.json(questions);
    } catch (err) {
        console.error('Get Questions Error:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
};

// POST /api/admin/question (Admin only)
exports.createQuestion = async (req, res) => {
    try {
        const { activity_id, schedule_id, subcategory_id, text, specified_value } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const questionData = { text, specified_value };
        if (activity_id) questionData.activity_id = activity_id;
        if (schedule_id) questionData.schedule_id = schedule_id;
        if (subcategory_id) questionData.subcategory_id = subcategory_id;

        const question = await Question.create(questionData);

        // Auto-seed default reasons ONLY if activity_id is provided
        if (activity_id) {
            const activity = await Activity.findByPk(activity_id);
            if (activity) {
                const defaultMinorReasons = ['Dirty', 'Broken', 'Missing', 'Loose', 'Worn Out', 'Damaged'];
                const defaultMajorReasons = ['Complete Failure', 'Structural Damage', 'Replacement Required', 'Safety Hazard', 'Beyond Repair'];
                const reasonsToSeed = activity.type === 'Major' ? defaultMajorReasons : defaultMinorReasons;

                const reasonObjects = reasonsToSeed.map(rText => ({
                    question_id: question.id,
                    text: rText
                }));
                await Reason.bulkCreate(reasonObjects);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Question created successfully with default reasons',
            question
        });
    } catch (err) {
        console.error('Create Question Error:', err);
        res.status(500).json({ error: 'Failed to create question' });
    }
};

// PUT /api/admin/question/:id (Admin only)
exports.updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, specified_value } = req.body;

        if (!text && specified_value === undefined) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        const question = await Question.findByPk(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (text) question.text = text;
        if (specified_value !== undefined) question.specified_value = specified_value;
        await question.save();

        res.json({
            success: true,
            message: 'Question updated successfully',
            question
        });
    } catch (err) {
        console.error('Update Question Error:', err);
        res.status(500).json({ error: 'Failed to update question' });
    }
};

// DELETE /api/admin/question/:id (Admin only)
exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const question = await Question.findByPk(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        await question.destroy();

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (err) {
        console.error('Delete Question Error:', err);
        res.status(500).json({ error: 'Failed to delete question' });
    }
};
