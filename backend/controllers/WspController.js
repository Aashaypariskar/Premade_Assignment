const {
    Coach, LtrSchedule, LtrItem, Question, InspectionAnswer, WspSession, SickLineSession, User, Role, sequelize
} = require('../models');
const { Op } = require('sequelize');

exports.getOrCreateSession = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];
        let session = await WspSession.findOne({
            where: { coach_id: coach.id, inspection_date: today }
        });

        if (!session) {
            session = await WspSession.create({
                coach_id: coach.id,
                coach_number: coach.coach_number,
                inspection_date: today,
                created_by: req.user.id,
                status: 'DRAFT'
            });
        }

        res.json(session);
    } catch (err) {
        console.error('WSP Session Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getSchedules = async (req, res) => {
    try {
        let schedules;
        try {
            schedules = await LtrSchedule.findAll({ where: { is_active: true } });
        } catch (e) {
            console.log('[WSP] is_active column missing, falling back');
            schedules = await LtrSchedule.findAll();
        }

        if (schedules.length === 0) {
            console.error('[CRITICAL] No WSP schedules found in database');
        }

        res.json(schedules);
    } catch (err) {
        console.error('[WSP ERROR] getSchedules:', err);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
};

exports.getQuestions = async (req, res) => {
    try {
        const { schedule_id } = req.query;
        if (!schedule_id) return res.status(400).json({ error: 'schedule_id is required' });

        const items = await LtrItem.findAll({
            where: { schedule_id },
            include: [{
                model: Question,
                required: true,
            }],
            order: [
                ['display_order', 'ASC'],
                [{ model: Question }, 'display_order', 'ASC']
            ]
        });

        const grouped = items.map(item => ({
            item_name: item.name,
            questions: item.Questions
        }));

        console.log(`[DIAGNOSTIC-WSP] schedule_id: ${schedule_id}, items: ${items.length}, questions: ${grouped.reduce((a, b) => a + b.questions.length, 0)}`);

        res.json(grouped);
    } catch (err) {
        console.error('[CRITICAL-WSP] getQuestions:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
};

exports.saveAnswers = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { session_id, mode, answers, coach_id, schedule_id } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers' });
        }

        const coach = await Coach.findByPk(coach_id);
        const user = await User.findByPk(req.user.id, { include: [Role] });
        const schedule = await LtrSchedule.findByPk(schedule_id);

        if (!coach || !user || !schedule) {
            throw new Error('Missing context for save');
        }

        const validAnswers = answers.filter(a => a.status);
        if (validAnswers.length === 0) return res.json({ success: true, count: 0 });

        const questionIds = validAnswers.map(a => a.question_id);
        const questionsList = await Question.findAll({
            where: { id: questionIds },
            include: [{ model: LtrItem, required: false }]
        });

        const records = validAnswers.map(ans => {
            const qData = questionsList.find(q => q.id === ans.question_id);
            if (!qData) throw new Error(`Question ${ans.question_id} not found`);

            return {
                status: ans.status,
                observed_value: ans.observed_value,
                reasons: ans.reasons,
                remarks: ans.remarks,
                photo_url: ans.image_path || ans.photo_url,

                coach_id: coach.id,
                coach_number: coach.coach_number,
                user_id: user.id,
                user_name: user.name,
                role_snapshot: user.Role?.role_name,

                schedule_id: schedule.id,
                schedule_name: schedule.name,
                question_id: ans.question_id,
                question_text_snapshot: qData.text,
                item_name: qData.LtrItem?.name || 'Standard',

                submission_id: `WSP-${mode}-${session_id}-${Date.now()}`,
                category_name: 'WSP Examination'
            };
        });

        // Reuse InspectionAnswer
        await InspectionAnswer.bulkCreate(records, { transaction });
        await transaction.commit();

        res.json({ success: true, saved: records.length });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('WSP Save Error:', err);
        res.status(500).json({ error: 'Failed to save answers' });
    }
};

exports.getAnswers = async (req, res) => {
    try {
        const { session_id, mode, schedule_id } = req.query;
        if (!session_id || !mode || !schedule_id) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        console.log(`[WSP ANSWERS] Fetching - Session: ${session_id}, Mode: ${mode}, Schedule: ${schedule_id}`);

        // Get the session to find the coach number
        let session;
        if (mode === 'SICKLINE') {
            session = await SickLineSession.findByPk(session_id, { include: [Coach] });
        } else {
            session = await WspSession.findByPk(session_id, { include: [Coach] });
        }

        const coach_number = session?.Coach?.coach_number;
        if (!coach_number) {
            console.log('[WSP ANSWERS] No coach found for session');
            return res.json([]);
        }

        const answers = await InspectionAnswer.findAll({
            where: {
                coach_number,
                category_name: 'WSP Examination',
                schedule_id,
                submission_id: {
                    [Op.like]: `WSP-${mode}-${session_id}-%`
                }
            },
            attributes: [
                'id', 'question_id', 'status', 'reasons', 'remarks',
                'photo_url', 'image_path', // Get both, photo_url is standard now
                'resolved', 'after_photo_url', 'resolution_remark'
            ]
        });

        res.json(answers);
    } catch (err) {
        console.error('[CRITICAL-WSP] getAnswers Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getProgress = async (req, res) => {
    try {
        const { coach_number, mode } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'coach_number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) {
            if (coach_number === 'GLOBAL' || coach_number === 'HEALTH_CHECK') {
                return res.json({ completed: false, completedCount: 0, totalCount: 0, status: 'UP' });
            }
            return res.status(404).json({ error: 'Coach not found' });
        }

        // 1. Get total schedules
        let schedules;
        try {
            schedules = await LtrSchedule.findAll({ where: { is_active: true } });
        } catch (e) {
            schedules = await LtrSchedule.findAll();
        }
        const totalCount = schedules.length;

        // 2. Identify session context
        let session;
        const today = new Date().toISOString().split('T')[0];

        if (mode === 'SICKLINE') {
            session = await SickLineSession.findOne({
                where: { coach_id: coach.id, inspection_date: today }
            });
        } else {
            session = await WspSession.findOne({
                where: { coach_id: coach.id, inspection_date: today }
            });
        }

        if (!session) {
            return res.json({
                completed: false,
                completedCount: 0,
                totalCount
            });
        }

        // 3. Count distinct schedules answered for this session
        // We match by coach_number, category_name, and session_id extracted from submission_id
        // Since we didn't add the session_id column, we use the tagging logic
        const answers = await InspectionAnswer.findAll({
            where: {
                coach_number: coach.coach_number,
                category_name: 'WSP Examination',
                submission_id: {
                    [Op.like]: `WSP-${mode}-${session.id}-%`
                }
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('schedule_id')), 'schedule_id']]
        });

        const completedCount = answers.length;

        // 4. Count pending defects for this WSP session/mode
        const pendingDefects = await InspectionAnswer.count({
            where: {
                coach_number: coach.coach_number,
                category_name: 'WSP Examination',
                submission_id: {
                    [Op.like]: `WSP-${mode}-${session.id}-%`
                },
                status: 'DEFICIENCY',
                resolved: { [Op.or]: [false, null] }
            }
        });

        res.json({
            completed: (totalCount > 0) ? (completedCount === totalCount && pendingDefects === 0) : false,
            completedCount,
            totalCount,
            pendingDefects,
            pending_defects: pendingDefects
        });
    } catch (err) {
        console.error('[CRITICAL-WSP] getProgress Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching progress' });
    }
};
