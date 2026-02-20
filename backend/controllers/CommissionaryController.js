const {
    CommissionarySession,
    CommissionaryAnswer,
    Coach,
    AmenitySubcategory,
    AmenityItem,
    Question,
    Activity,
    sequelize
} = require('../models');
const { Op } = require('sequelize');



// GET /api/commissionary/coaches
exports.listCoaches = async (req, res) => {
    try {
        const coaches = await Coach.findAll({
            where: { created_by: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list coaches' });
    }
};

// POST /api/commissionary/coaches
exports.createCoach = async (req, res) => {
    try {
        const { coach_number, coach_type } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const existing = await Coach.findOne({ where: { coach_number } });
        if (existing) return res.status(400).json({ error: 'Coach number already exists' });

        const coach = await Coach.create({
            coach_number,
            coach_type,
            created_by: req.user.id,
            train_id: 1 // Default to a dummy train for now to satisfy FK if not nullable
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create coach' });
    }
};

// GET /api/commissionary/session?coach_number=X
exports.getOrCreateSession = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];

        // Check for ANY session today for this coach
        let session = await CommissionarySession.findOne({
            where: {
                coach_id: coach.id,
                inspection_date: today
            }
        });

        if (!session) {
            session = await CommissionarySession.create({
                coach_id: coach.id,
                coach_number: coach.coach_number,
                inspection_date: today,
                created_by: req.user.id,
                status: 'DRAFT'
            });
        }

        res.json(session);
    } catch (err) {
        console.error('Session Error:', err);
        res.status(500).json({ error: 'Failed to manage session' });
    }
};

// GET /api/commissionary/questions?subcategory_id=X&activity_type=Y
exports.getQuestions = async (req, res) => {
    try {
        const { subcategory_id, activity_type } = req.query;
        if (!subcategory_id || !activity_type) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const items = await AmenityItem.findAll({
            where: { subcategory_id, activity_type },
            include: [{
                model: Question,
                required: true,
                where: { subcategory_id }
            }],
            order: [
                ['id', 'ASC'],
                [{ model: Question }, 'display_order', 'ASC']
            ]
        });

        const grouped = items.map(item => ({
            item_name: item.name,
            questions: item.Questions
        }));

        res.json(grouped);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
};

// POST /api/commissionary/save
exports.saveAnswers = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { session_id, compartment_id, subcategory_id, activity_type, answers } = req.body;

        if (!session_id || !compartment_id || !subcategory_id || !activity_type || !answers) {
            return res.status(400).json({ error: 'Missing submission data' });
        }

        // Verify session is DRAFT
        const session = await CommissionarySession.findByPk(session_id);
        if (!session || session.status !== 'DRAFT') {
            return res.status(403).json({ error: 'Session is locked or not found' });
        }

        // Remove existing answers for this specific block to allow overwrite/update
        await CommissionaryAnswer.destroy({
            where: { session_id, compartment_id, subcategory_id, activity_type },
            transaction
        });

        const records = answers.map(ans => ({
            session_id,
            compartment_id,
            subcategory_id,
            activity_type,
            question_id: ans.question_id,
            status: ans.status,
            reason: ans.remarks || ans.reason, // Map for compatibility
            photo_url: ans.photo_url
        }));

        await CommissionaryAnswer.bulkCreate(records, { transaction });
        await transaction.commit();

        res.json({ success: true });
    } catch (err) {
        await transaction.rollback();
        console.error('Save error:', err);
        res.status(500).json({ error: 'Failed to save answers' });
    }
};

// GET /api/commissionary/progress?coach_number=X
exports.getProgress = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];
        const session = await CommissionarySession.findOne({
            where: { coach_id: coach.id, inspection_date: today }
        });

        if (!session) {
            return res.json({
                completed_count: 0,
                total_expected: 112, // 7 areas * 8 comps * 2 (Major/Minor)
                fully_complete: false,
                overall_compliance: 0,
                status: 'NOT_STARTED'
            });
        }

        const answers = await CommissionaryAnswer.findAll({
            where: { session_id: session.id },
            attributes: ['compartment_id', 'subcategory_id', 'activity_type']
        });

        // We assume 7 subcategories (Areas) and 8 compartments based on strict requirements
        const subcategories = await AmenitySubcategory.findAll({
            where: { category_id: 6 } // 'Amenity' category
        });

        const subIds = subcategories.map(s => s.id);
        const compartments = ['L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4'];
        const activities = ['Major', 'Minor'];

        const completedSet = new Set(
            answers.map(a => `${a.subcategory_id}-${a.compartment_id}-${a.activity_type}`)
        );

        completedCount = completedSet.size;

        res.json({
            session_id: session.id,
            completed_count: completedCount,
            total_expected: totalExpected,
            fully_complete: completedCount >= totalExpected,
            overall_compliance: totalExpected > 0 ? (completedCount / totalExpected) : 1,
            status: session.status
        });
    } catch (err) {
        console.error('Progress Error:', err);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
};

// POST /api/commissionary/complete
exports.completeSession = async (req, res) => {
    try {
        const { session_id, coach_number } = req.body;
        let session;
        if (session_id) {
            session = await CommissionarySession.findByPk(session_id);
        } else if (coach_number) {
            const coach = await Coach.findOne({ where: { coach_number } });
            if (!coach) return res.status(404).json({ error: 'Coach not found' });
            const today = new Date().toISOString().split('T')[0];
            session = await CommissionarySession.findOne({
                where: { coach_id: coach.id, inspection_date: today }
            });
        }

        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.status = 'COMPLETED';
        await session.save();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to complete session' });
    }
};

// GET /api/commissionary/combined-report?session_id=X
exports.getCombinedReport = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const session = await CommissionarySession.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const answers = await CommissionaryAnswer.findAll({
            where: { session_id },
            include: [
                { model: Question, attributes: ['text', 'display_order'] },
                { model: AmenitySubcategory, attributes: ['name'] }
            ],
            order: [
                [AmenitySubcategory, 'id', 'ASC'],
                [Question, 'display_order', 'ASC']
            ]
        });

        // Grouping logic for Matrix
        // matrix: { subcategoryId: { subName, questions: { qId: { qText, cells: { compId: { Major: {ans, rem}, Minor: {ans, rem} } } } } } }
        const matrixData = {};

        answers.forEach(ans => {
            const subId = ans.subcategory_id;
            const qId = ans.question_id;
            const compId = ans.compartment_id;

            if (!matrixData[subId]) {
                matrixData[subId] = {
                    subName: ans.AmenitySubcategory.name,
                    questions: {}
                };
            }

            if (!matrixData[subId].questions[qId]) {
                matrixData[subId].questions[qId] = {
                    qText: ans.Question.text,
                    cells: {}
                };
            }

            if (!matrixData[subId].questions[qId].cells[compId]) {
                matrixData[subId].questions[qId].cells[compId] = { Major: null, Minor: null };
            }

            matrixData[subId].questions[qId].cells[compId][ans.activity_type] = {
                status: ans.status,
                remark: ans.reason, // Using reason column for remark snapshot
                hasPhoto: !!ans.photo_url
            };
        });

        // Calculate Compliance
        const stats = {
            overall: { yes: 0, total: 0 },
            subcategories: {},
            compartments: {}
        };

        const compartments = ['L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4'];
        compartments.forEach(c => stats.compartments[c] = { yes: 0, total: 0 });

        answers.forEach(ans => {
            if (ans.status === 'OK' || ans.status === 'DEFICIENCY') {
                const isOk = ans.status === 'OK' ? 1 : 0;

                stats.overall.yes += isOk;
                stats.overall.total += 1;

                if (!stats.subcategories[ans.subcategory_id]) stats.subcategories[ans.subcategory_id] = { yes: 0, total: 0 };
                stats.subcategories[ans.subcategory_id].yes += isOk;
                stats.subcategories[ans.subcategory_id].total += 1;

                if (stats.compartments[ans.compartment_id]) {
                    stats.compartments[ans.compartment_id].yes += isOk;
                    stats.compartments[ans.compartment_id].total += 1;
                }
            }
        });

        res.json({
            coach_number: session.coach_number,
            date: session.inspection_date,
            matrix: matrixData,
            stats,
            compartments
        });
    } catch (err) {
        console.error('Combined Report Error:', err);
        res.status(500).json({ error: 'Failed to generate combined report' });
    }
};
