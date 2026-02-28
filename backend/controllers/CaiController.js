const { CaiQuestion, CaiSession, CaiAnswer, Coach } = require('../models');

// GET /api/cai/questions
const getQuestions = async (req, res) => {
    try {
        const questions = await CaiQuestion.findAll({
            where: { is_active: true },
            order: [['cai_code', 'ASC']]
        });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/cai/coaches
const listCoaches = async (req, res) => {
    try {
        const coaches = await Coach.findAll({
            where: { module_type: 'CAI' },
            order: [['createdAt', 'DESC']]
        });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list CAI coaches' });
    }
};

// POST /api/cai/coaches
const createCoach = async (req, res) => {
    try {
        const { coach_number, coach_type } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const existing = await Coach.findOne({ where: { coach_number } });
        if (existing) return res.status(400).json({ error: 'Coach number already exists' });

        const coach = await Coach.create({
            coach_number,
            coach_type,
            module_type: 'CAI',
            created_by: req.user.id
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create CAI coach' });
    }
};

// GET /api/cai/answers?session_id=XX
const getAnswers = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const answers = await CaiAnswer.findAll({ where: { session_id } });
        res.json(answers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/cai/session/start
const startSession = async (req, res) => {
    try {
        const { coach_id } = req.body;

        // Find coach to check module type
        const coach = await Coach.findByPk(coach_id);

        console.log("SESSION INIT:", {
            coach_id,
            coach_module_type: coach?.module_type,
            expected_module: 'CAI'
        });

        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        // Hard Validation: Ensure coach belongs to this module
        if (coach.module_type !== 'CAI') {
            return res.status(400).json({ error: 'Invalid coach module for this session type' });
        }

        if (!coach_id) return res.status(400).json({ error: 'coach_id is required' });

        let session = await CaiSession.findOne({
            where: { coach_id, status: 'DRAFT' }
        });

        if (!session) {
            session = await CaiSession.create({
                coach_id,
                inspector_id: req.user.id,
                status: 'DRAFT'
            });
        }

        res.json({ session_id: session.id });
    } catch (err) {
        console.error('Cai startSession Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/cai/submit
const submitSession = async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const session = await CaiSession.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.status = 'SUBMITTED';
        await session.save();

        res.json({ success: true, message: 'CAI Inspection submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: POST /api/cai/questions/add
const addQuestion = async (req, res) => {
    try {
        const { cai_code, question_text } = req.body;
        if (!cai_code || !question_text) return res.status(400).json({ error: 'Missing fields' });

        const question = await CaiQuestion.create({ cai_code, question_text });
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: POST /api/cai/questions/update
const updateQuestion = async (req, res) => {
    try {
        const { id, cai_code, question_text, is_active } = req.body;
        if (!id) return res.status(400).json({ error: 'Question ID is required' });

        const question = await CaiQuestion.findByPk(id);
        if (!question) return res.status(404).json({ error: 'Question not found' });

        if (cai_code !== undefined) question.cai_code = cai_code;
        if (question_text !== undefined) question.question_text = question_text;
        if (is_active !== undefined) question.is_active = is_active;

        await question.save();
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getQuestions,
    getAnswers,
    startSession,
    submitSession,
    addQuestion,
    updateQuestion,
    listCoaches,
    createCoach
};
