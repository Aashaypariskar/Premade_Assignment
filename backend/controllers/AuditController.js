const { Train, Coach, Category, Activity, Question, InspectionAnswer, sequelize } = require('../models');

/**
 * AuditController - Handles all business logic for Train Inspections.
 * Manages master data retrieval and transactional audit saves.
 */

// GET /trains
exports.getTrains = async (req, res) => {
    try {
        const trains = await Train.findAll({ order: [['name', 'ASC']] });
        if (trains.length === 0) return res.status(404).json({ error: 'No trains found in service' });
        res.json(trains);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal server failure' });
    }
};

// GET /coaches?train_id=
exports.getCoaches = async (req, res) => {
    try {
        const { train_id } = req.query;
        if (!train_id) return res.status(400).json({ error: 'Train ID is mandatory' });

        const coaches = await Coach.findAll({ where: { train_id } });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve coaches' });
    }
};

// GET /categories?coach_id=
exports.getCategories = async (req, res) => {
    try {
        const { coach_id } = req.query;
        if (!coach_id) return res.status(400).json({ error: 'Coach ID is mandatory' });

        const categories = await Category.findAll({ where: { coach_id } });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve areas' });
    }
};

// GET /activities?category_id=X
exports.getActivities = async (req, res) => {
    try {
        const { category_id } = req.query;
        if (!category_id) return res.status(400).json({ error: 'Category ID is mandatory' });

        const activities = await Activity.findAll({ where: { category_id } });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve activities' });
    }
};

// GET /questions?activity_type=Minor&category_id=X
exports.getQuestions = async (req, res) => {
    try {
        const { activity_type, category_id } = req.query;
        if (!activity_type || !category_id) return res.status(400).json({ error: 'Missing query parameters' });

        const activity = await Activity.findOne({
            where: { type: activity_type, category_id: category_id }
        });

        if (!activity) return res.status(404).json({ error: 'Activity map not found' });

        const questions = await Question.findAll({
            where: { activity_id: activity.id }
        });

        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch checklist' });
    }
};

// POST /inspection/submit
exports.submitInspection = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { train_id, coach_id, activity_id, answers } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid submission format' });
        }

        // 1. Fetch Master Data for Snapshots
        const [train, coach, activity] = await Promise.all([
            Train.findByPk(train_id),
            Coach.findByPk(coach_id),
            Activity.findByPk(activity_id, { include: [Category] })
        ]);

        if (!train || !coach || !activity) {
            await transaction.rollback();
            return res.status(404).json({ error: 'One or more master records not found' });
        }

        // 2. Validate Answers & Prepare Payload
        const processedAnswers = answers.map(ans => {
            // Validation: Negative findings require reasons and image
            if (ans.answer === 'NO') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasImage = !!ans.image_path;
                if (!hasReasons || !hasImage) {
                    throw new Error(`Validation Failed: Question ID ${ans.question_id} requires reasons and an image.`);
                }
            }

            return {
                train_id,
                coach_id,
                activity_id,
                question_id: ans.question_id,
                answer: ans.answer,
                reasons: ans.reasons,
                remarks: ans.remarks,
                image_path: ans.image_path,
                // Enterprise Snapshots
                train_number: train.train_number,
                coach_number: coach.coach_number,
                category_name: activity.Category?.name || 'Unknown',
                activity_type: activity.type
            };
        });

        // 3. Optimized Bulk Insert
        const results = await InspectionAnswer.bulkCreate(processedAnswers, { transaction });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Audit records persisted with enterprise snapshots',
            recordsSaved: results.length
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Submit Error:', err.message);

        if (err.message.includes('Validation Failed')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Critical failure during data persistence' });
    }
};
