const { Train, Coach, Category, Activity, Question, InspectionAnswer } = require('../models');

// GET /trains
exports.getTrains = async (req, res) => {
    try {
        const trains = await Train.findAll();
        res.json(trains);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /coaches?train_id=
exports.getCoaches = async (req, res) => {
    try {
        const { train_id } = req.query;
        const coaches = await Coach.findAll({ where: { train_id } });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /categories?coach_id=X
exports.getCategories = async (req, res) => {
    try {
        const { coach_id } = req.query;
        const filter = coach_id ? { where: { coach_id } } : {};
        const categories = await Category.findAll(filter);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /questions?activity_type= (Minor/Major)
exports.getQuestions = async (req, res) => {
    try {
        const { activity_type } = req.query;
        const questions = await Question.findAll({
            include: [{
                model: Activity,
                where: { type: activity_type }
            }]
        });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /activities?category_id=X
exports.getActivities = async (req, res) => {
    try {
        const { category_id } = req.query;
        const filter = category_id ? { where: { category_id } } : {};
        const activities = await Activity.findAll(filter);
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /inspection/submit
exports.submitInspection = async (req, res) => {
    try {
        const { train_id, coach_id, activity_id, answers } = req.body;

        // answers is expected to be an array of objects
        const results = await Promise.all(answers.map(ans =>
            InspectionAnswer.create({
                train_id,
                coach_id,
                activity_id,
                question_id: ans.question_id,
                answer: ans.answer,
                reasons: ans.reasons,
                remarks: ans.remarks,
                image_path: ans.image_path
            })
        ));

        res.status(201).json({ message: 'Inspection saved successfully', count: results.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
