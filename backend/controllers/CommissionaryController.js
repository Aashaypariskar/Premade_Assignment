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



// GET /api/commissionary/seed-reasons (TEMPORARY FIX)
exports.seedReasons = async (req, res) => {
    try {
        const [questions] = await sequelize.query("SELECT id FROM questions WHERE category = 'Undergear'");
        const reasons = [
            'Complete Failure',
            'Structural Damage',
            'Replacement Required',
            'Safety Hazard',
            'Beyond Repair',
            'Non-Functional'
        ];

        let count = 0;
        for (const q of questions) {
            for (const text of reasons) {
                try {
                    await sequelize.query(
                        `INSERT INTO Reasons (question_id, text, created_at, updatedAt) VALUES (?, ?, NOW(), NOW())`,
                        { replacements: [q.id, text] }
                    );
                    count++;
                } catch (e) {
                    if (e.name === 'SequelizeUniqueConstraintError' || e.original?.code === 'ER_DUP_ENTRY') continue;
                    try {
                        await sequelize.query(
                            `INSERT INTO Reasons (question_id, text) VALUES (?, ?)`,
                            { replacements: [q.id, text] }
                        );
                        count++;
                    } catch (e2) { }
                }
            }
        }
        res.json({ message: `Successfully seeded ${count} reasons for Undergear` });
    } catch (err) {
        console.error('Seed Error:', err);
        res.status(500).json({ error: err.message });
    }
};

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
        const { subcategory_id, activity_type, categoryName } = req.query;
        if (req.query.categoryName?.toLowerCase() === 'undergear') {
            const questions = await Question.findAll({
                where: {
                    category: 'Undergear',
                    is_active: 1
                },
                order: [['display_order', 'ASC']]
            });
            return res.json({ questions });
        }

        if (!subcategory_id) return res.status(400).json({ error: 'Missing subcategory_id' });

        console.log('[SUBCATEGORY REQUESTED]', req.query.subcategory_id);
        console.log(`[STABILIZATION-INPUT] subcategory_id: ${subcategory_id}, activity_type: ${activity_type}, categoryName: ${categoryName}`);

        // Phase 1 & 2: Enforce strict item filtering, remove ANY loose filtering
        const includeConfig = {
            model: AmenityItem,
            required: true,
            where: {
                subcategory_id: req.query.subcategory_id
            }
        };

        if (activity_type) {
            includeConfig.where.activity_type = activity_type;
        }

        const questions = await Question.findAll({
            where: { subcategory_id: req.query.subcategory_id },
            include: [includeConfig],
            order: [['display_order', 'ASC'], ['id', 'ASC']]
        });

        let supportsActivityType = false;
        if (questions.some(q => q.AmenityItem && q.AmenityItem.activity_type !== null)) {
            supportsActivityType = true;
        }

        const groupedResults = [{
            item_name: 'Questions',
            questions: questions
        }];

        // Phase 3: Add Diagnostic Log
        console.log('[ISOLATION CHECK]', {
            requestedSubcategory: req.query.subcategory_id,
            returnedItemNames: groupedResults.map(g => g.item_name)
        });

        res.json({
            groups: groupedResults,
            supportsActivityType
        });
    } catch (err) {
        console.error('[STABILIZATION-FATAL] getQuestions Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/commissionary/answers
exports.getAnswers = async (req, res) => {
    try {
        const { session_id, subcategory_id, activity_type, compartment_id } = req.query;
        if (!session_id || !subcategory_id || !compartment_id || !activity_type) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const answers = await CommissionaryAnswer.findAll({
            where: { session_id, subcategory_id, activity_type, compartment_id },
            attributes: [
                'id', 'question_id', 'status', 'reasons', 'remarks', 'photo_url',
                'resolved', 'after_photo_url', 'resolution_remark'
            ]
        });

        res.json(answers);
    } catch (err) {
        console.error('getAnswers Error:', err);
        res.status(500).json({ error: 'Failed' });
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

        const progress = await Promise.all(subcategories.map(async (sub) => {
            const majorItems = await AmenityItem.findAll({
                where: { subcategory_id: sub.id, activity_type: 'Major' },
                include: [{ model: Question, attributes: ['id'] }]
            });
            const minorItems = await AmenityItem.findAll({
                where: { subcategory_id: sub.id, activity_type: 'Minor' },
                include: [{ model: Question, attributes: ['id'] }]
            });

            const majorIds = majorItems.flatMap(item => (item.Questions || []).map(q => q.id));
            const minorIds = minorItems.flatMap(item => (item.Questions || []).map(q => q.id));

            const compartments = ['A', 'B', 'C', 'D'];
            const compStatus = {};
            await Promise.all(compartments.map(async (compId) => {
                const majorAns = await CommissionaryAnswer.count({
                    where: { session_id: session.id, question_id: majorIds, compartment_id: compId }
                });
                const minorAns = await CommissionaryAnswer.count({
                    where: { session_id: session.id, question_id: minorIds, compartment_id: compId }
                });

                const pendingDefects = await CommissionaryAnswer.count({
                    where: {
                        session_id: session.id,
                        compartment_id: compId,
                        status: 'DEFICIENCY',
                        resolved: false
                    }
                });

                compStatus[compId] = {
                    majorTotal: majorIds.length,
                    majorAnswered: majorAns,
                    minorTotal: minorIds.length,
                    minorAnswered: minorAns,
                    pendingDefects: pendingDefects,
                    isComplete: (majorIds.length > 0 && majorAns === majorIds.length) &&
                        (minorIds.length > 0 && minorAns === minorIds.length) &&
                        (pendingDefects === 0)
                };
            }));

            const isAreaComplete = Object.values(compStatus).every(c => c.isComplete);

            // Fix: Calculate total pending defects for the whole subcategory at once (including NA, L1-L4, etc)
            const totalPendingDefects = await CommissionaryAnswer.count({
                where: {
                    session_id: session.id,
                    subcategory_id: sub.id,
                    status: 'DEFICIENCY',
                    resolved: { [Op.or]: [false, null] } // Support NULL values as per Step 4
                }
            });

            return {
                subcategory_id: sub.id,
                subcategory_name: sub.name,
                isComplete: isAreaComplete && totalPendingDefects === 0,
                pendingDefects: totalPendingDefects,
                pending_defects: totalPendingDefects, // Step 7: Parity/Compatibility
                majorTotal: majorIds.length,
                majorAnswered: await CommissionaryAnswer.count({ where: { session_id: session.id, question_id: majorIds } }),
                minorTotal: minorIds.length,
                minorAnswered: await CommissionaryAnswer.count({ where: { session_id: session.id, question_id: minorIds } }),
                compartmentStatus: compStatus
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

        const compartmentsList = [...new Set(answers.map(a => a.compartment_id))].filter(Boolean);
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
// POST /api/commissionary/submit
exports.submitSession = async (req, res) => {
    try {
        const { coach_number } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'coach_number is required' });

        const today = new Date().toISOString().split('T')[0];
        const coach = await Coach.findOne({ where: { coach_number } });
        const session = await CommissionarySession.findOne({
            where: { coach_id: coach.id, inspection_date: today }
        });

        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.status = 'SUBMITTED';
        await session.save();
        res.json({ success: true, message: 'Commissionary Inspection submitted and locked' });
    } catch (err) {
        console.error('Commissionary Submit Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};
