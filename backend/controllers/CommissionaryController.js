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
const { calculateCompliance } = require('../utils/compliance');



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
    console.log(`[DEBUG] saveAnswers ENTERED - Question: ${req.body.question_id}, File: ${!!req.file}`);
    try {
        const {
            session_id,
            compartment_id,
            subcategory_id,
            activity_type,
            question_id,
            status,
            remarks
        } = req.body;

        if (!session_id || !question_id) {
            console.warn('[DEBUG] saveAnswers - Missing fields:', { session_id, question_id });
            return res.status(400).json({ message: "Missing required session_id or question_id" });
        }

        let parsedReasons = [];
        if (req.body.reasons) {
            try {
                parsedReasons = typeof req.body.reasons === 'string'
                    ? JSON.parse(req.body.reasons)
                    : req.body.reasons;
            } catch (pErr) {
                console.error('[DEBUG] Reasons parse fail:', pErr);
                parsedReasons = [];
            }
        }

        let photo_url = null;
        if (req.file) {
            photo_url = `/public/uploads/${req.file.filename}`;
            console.log('[DEBUG] Image saved at:', photo_url);
        } else if (req.body.photo_url) {
            photo_url = req.body.photo_url;
        }

        // Fetch question text for snapshot (required by schema)
        const qData = await Question.findByPk(question_id);

        const [ansRecord, created] = await CommissionaryAnswer.findOrCreate({
            where: { session_id, question_id, compartment_id, subcategory_id, activity_type },
            defaults: {
                status: status || 'OK',
                reasons: parsedReasons,
                remarks: remarks || '',
                photo_url,
                question_text_snapshot: qData?.text || 'Standard Question'
            }
        });

        if (!created) {
            await ansRecord.update({
                status: status || 'OK',
                reasons: parsedReasons,
                remarks: remarks || '',
                photo_url: photo_url || ansRecord.photo_url,
                question_text_snapshot: qData?.text || ansRecord.question_text_snapshot
            });
        }

        console.log(`[DEBUG] saveAnswers SUCCESS - ID: ${question_id}`);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Commissionary Save Error (FATAL):", error);
        // Ensure we ALWAYS return a response even on fatal crash
        if (!res.headersSent) {
            return res.status(500).json({ message: "Internal Server Error", error: error.message });
        }
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

        const subcategories = await AmenitySubcategory.findAll({ where: { category_id: 6 } });
        const totalAreasCount = subcategories.length;

        if (!session) {
            return res.json({
                session_id: null,
                completed_count: 0,
                total_expected: totalAreasCount,
                progress_percentage: 0,
                status: 'NOT_STARTED',
                perAreaStatus: subcategories.map(s => ({
                    subcategory_id: s.id,
                    hasMajor: false,
                    hasMinor: false
                })),
                breakdown: {}
            });
        }

        const COMPARTMENTS = ['L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4'];

        const progress = await Promise.all(subcategories.map(async (sub) => {
            const subName = sub.name;
            const subId = sub.id;

            // Strict Question Counts for this subcategory
            const totalMajor = await Question.count({
                where: { subcategory_id: subId },
                include: [{ model: AmenityItem, where: { activity_type: 'Major' } }]
            });
            const totalMinor = await Question.count({
                where: { subcategory_id: subId },
                include: [{ model: AmenityItem, where: { activity_type: 'Minor' } }]
            });

            // For each compartment, check if ALL questions are answered
            let compartmentsCompleted = 0;
            const compBreakdown = {};

            for (const compId of COMPARTMENTS) {
                const answeredMajor = await CommissionaryAnswer.count({
                    where: { session_id: session.id, subcategory_id: subId, activity_type: 'Major', compartment_id: compId }
                });
                const answeredMinor = await CommissionaryAnswer.count({
                    where: { session_id: session.id, subcategory_id: subId, activity_type: 'Minor', compartment_id: compId }
                });

                const majorDone = (totalMajor > 0) ? (answeredMajor === totalMajor) : true;
                const minorDone = (totalMinor > 0) ? (answeredMinor === totalMinor) : true;

                if (majorDone && minorDone) {
                    compartmentsCompleted++;
                }

                compBreakdown[compId] = { major: majorDone, minor: minorDone, isComplete: majorDone && minorDone };
            }

            // In Commissionary, ALMOST EVERYTHING with DUAL check needs all 8 compartments
            // Exception: If an area has NO questions in either Major or Minor, we effectively treat it as done.
            // But usually, Exterior, Interior, etc. have questions in all 8.
            const isFullyComplete = (compartmentsCompleted === COMPARTMENTS.length);

            return {
                subcategory_id: subId,
                subcategory_name: subName,
                isComplete: isFullyComplete,
                hasMajor: compartmentsCompleted > 0, // Partial indicator for UI
                hasMinor: compartmentsCompleted > 0, // Partial indicator for UI
                compartmentStatus: compBreakdown
            };
        }));

        const completedAreasCount = progress.filter(p => p.isComplete).length;
        const percentage = totalAreasCount > 0 ? Math.round((completedAreasCount / totalAreasCount) * 100) : 0;

        const allAnswers = await CommissionaryAnswer.findAll({ where: { session_id: session.id } });
        const overallCompliance = calculateCompliance(allAnswers);

        return res.json({
            session_id: session.id,
            completed_count: completedAreasCount,
            total_expected: totalAreasCount,
            progress_percentage: percentage,
            overall_compliance: overallCompliance,
            status: session.status,
            perAreaStatus: progress,
            progress: progress, // For compatibility
            fully_complete: completedAreasCount === totalAreasCount
        });

    } catch (err) {
        console.error('Progress Error:', err);
        return res.status(500).json({ error: 'Failed' });
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
                remark: ans.remarks || ans.reason, // Use remarks with compatibility fallback
                hasPhoto: !!ans.photo_url
            };
        });

        // Use central utility for stats
        const overallCompliance = calculateCompliance(answers);

        // Group-wise stats
        const stats = {
            overall: overallCompliance,
            subcategories: {},
            compartments: {}
        };

        const compartmentsList = ['L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4'];
        compartmentsList.forEach(c => {
            const compRecords = answers.filter(a => a.compartment_id === c);
            stats.compartments[c] = calculateCompliance(compRecords);
        });

        Object.keys(matrixData).forEach(subId => {
            const subRecords = answers.filter(a => a.subcategory_id == subId);
            stats.subcategories[subId] = calculateCompliance(subRecords);
        });

        res.json({
            coach_number: session.coach_number,
            date: session.inspection_date,
            matrix: matrixData,
            stats,
            compartments: compartmentsList
        });
    } catch (err) {
        console.error('Combined Report Error:', err);
        res.status(500).json({ error: 'Failed to generate combined report' });
    }
};
