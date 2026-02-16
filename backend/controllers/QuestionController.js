const { Question, Activity, Category } = require('../models');

/**
 * QuestionController - Admin Question Management
 * Allows dynamic CRUD operations on inspection questions
 */

// GET /api/questions?activity_id=X (All authenticated users)
exports.getQuestionsByActivity = async (req, res) => {
    try {
        const { activity_id } = req.query;
        if (!activity_id) {
            return res.status(400).json({ error: 'activity_id is required' });
        }

        const questions = await Question.findAll({
            where: { activity_id },
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
        const { activity_id, text } = req.body;

        if (!activity_id || !text) {
            return res.status(400).json({ error: 'activity_id and text are required' });
        }

        // Verify activity exists
        const activity = await Activity.findByPk(activity_id);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const question = await Question.create({ activity_id, text });

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
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
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const question = await Question.findByPk(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        question.text = text;
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
