const {
    SickLineSession,
    SickLineAnswer,
    Coach,
    AmenitySubcategory,
    AmenityItem,
    Question,
    Activity,
    sequelize
} = require('../models');
const { Op } = require('sequelize');
const { calculateCompliance } = require('../utils/compliance');

// GET /api/sickline/coaches (Using shared Coach model but separate session flow)
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

// POST /api/sickline/coaches
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
            train_id: 1 // Dummy default
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/session?coach_number=X
exports.getOrCreateSession = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];

        let session = await SickLineSession.findOne({
            where: { coach_id: coach.id, inspection_date: today }
        });

        if (!session) {
            session = await SickLineSession.create({
                coach_id: coach.id,
                coach_number: coach.coach_number,
                inspection_date: today,
                created_by: req.user.id,
                status: 'IN_PROGRESS'
            });
        }

        res.json(session);
    } catch (err) {
        console.error('SickLine Session Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/questions
exports.getQuestions = async (req, res) => {
    try {
        const { subcategory_id, activity_type } = req.query;
        if (!subcategory_id) return res.status(400).json({ error: 'Missing subcategory_id' });

        console.log('[SUBCATEGORY REQUESTED]', req.query.subcategory_id);
        console.log(`[STABILIZATION-SL-INPUT] subcategory_id: ${subcategory_id}, activity_type: ${activity_type}`);

        // Phase 1 & 2: Enforce strict item filtering, remove loose filtering
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
        console.error('[STABILIZATION-SL-FATAL] getQuestions Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/answers
exports.getAnswers = async (req, res) => {
    try {
        const { session_id, subcategory_id, activity_type, compartment_id } = req.query;
        if (!session_id || !subcategory_id || !compartment_id || !activity_type) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const answers = await SickLineAnswer.findAll({
            where: { session_id, subcategory_id, activity_type, compartment_id }
        });

        res.json(answers);
    } catch (err) {
        console.error('getAnswers Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// POST /api/sickline/save
exports.saveAnswers = async (req, res) => {
    try {
        const { session_id, compartment_id, subcategory_id, activity_type, question_id, status, remarks } = req.body;

        if (!session_id || !question_id) return res.status(400).json({ message: "Missing required fields" });

        let parsedReasons = [];
        if (req.body.reasons) {
            try {
                parsedReasons = typeof req.body.reasons === 'string' ? JSON.parse(req.body.reasons) : req.body.reasons;
            } catch (e) { parsedReasons = []; }
        }

        let photo_url = null;
        if (req.file) {
            photo_url = `/public/uploads/${req.file.filename}`;
        } else if (req.body.photo_url) {
            photo_url = req.body.photo_url;
        }

        const qData = await Question.findByPk(question_id);

        const [ansRecord, created] = await SickLineAnswer.findOrCreate({
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

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("SickLine Save Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/sickline/progress
exports.getProgress = async (req, res) => {
    try {
        const { coach_number, subcategory_id } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];
        const session = await SickLineSession.findOne({
            where: { coach_id: coach.id, inspection_date: today }
        });

        // 1. Explicit dynamic engine response for Phase 3 integration
        if (session && subcategory_id) {
            const progress = await require('../utils/progressEngine').calculateProgress({
                subcategory_id,
                session_id: session.id,
                AnswerModel: SickLineAnswer,
                AmenityItemModel: AmenityItem,
                QuestionModel: Question
            });
            return res.json(progress);
        }

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

        // 2. Loop dynamically without hardcoded bounds or manual loops
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

            const majorAns = await SickLineAnswer.count({ where: { session_id: session.id, question_id: majorIds } });
            const minorAns = await SickLineAnswer.count({ where: { session_id: session.id, question_id: minorIds } });

            const isMajorDone = majorIds.length > 0 && majorAns === majorIds.length;
            const isMinorDone = minorIds.length > 0 && minorAns === minorIds.length;

            return {
                subcategory_id: sub.id,
                subcategory_name: sub.name,
                majorTotal: majorIds.length,
                majorAnswered: majorAns,
                minorTotal: minorIds.length,
                minorAnswered: minorAns,
                isComplete: isMajorDone && isMinorDone
            };
        }));

        const totalExpected = progress.reduce((sum, p) => sum + p.requiredItems, 0);
        const totalCompleted = progress.reduce((sum, p) => sum + p.completedItems, 0);

        let percentage = 0;
        if (totalExpected > 0) percentage = Math.round((totalCompleted / totalExpected) * 100);

        // Retain specific sickle line overall compliance logic if intact
        const allAnswers = await SickLineAnswer.findAll({ where: { session_id: session.id } });
        const overallCompliance = calculateCompliance(allAnswers);

        return res.json({
            session_id: session.id,
            completed_count: totalCompleted,
            total_expected: totalExpected,
            progress_percentage: percentage,
            overall_compliance: overallCompliance,
            status: (totalExpected > 0 && totalCompleted === totalExpected) ? 'COMPLETED' : 'IN_PROGRESS',
            perAreaStatus: progress,
            fully_complete: (totalExpected > 0 && totalCompleted === totalExpected),
            breakdown: {}
        });
    } catch (err) {
        console.error('SickLine Progress Error:', err);
        return res.status(500).json({ error: 'Failed' });
    }
};

// POST /api/sickline/complete
exports.completeSession = async (req, res) => {
    try {
        const { coach_number } = req.body;
        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];
        const session = await SickLineSession.findOne({ where: { coach_id: coach.id, inspection_date: today } });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.status = 'COMPLETED';
        await session.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/combined-report
exports.getCombinedReport = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const session = await SickLineSession.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const answers = await SickLineAnswer.findAll({
            where: { session_id },
            include: [
                { model: Question, attributes: ['text', 'display_order'] },
                { model: AmenitySubcategory, attributes: ['name'] }
            ],
            order: [[AmenitySubcategory, 'id', 'ASC'], [Question, 'display_order', 'ASC']]
        });

        const matrixData = {};
        answers.forEach(ans => {
            const subId = ans.subcategory_id;
            const qId = ans.question_id;
            const compId = ans.compartment_id;

            if (!matrixData[subId]) {
                matrixData[subId] = { subName: ans.AmenitySubcategory.name, questions: {} };
            }
            if (!matrixData[subId].questions[qId]) {
                matrixData[subId].questions[qId] = { qText: ans.Question.text, cells: {} };
            }
            if (!matrixData[subId].questions[qId].cells[compId]) {
                matrixData[subId].questions[qId].cells[compId] = { Major: null, Minor: null };
            }
            matrixData[subId].questions[qId].cells[compId][ans.activity_type] = {
                status: ans.status,
                remark: ans.remarks,
                hasPhoto: !!ans.photo_url
            };
        });

        const overallCompliance = calculateCompliance(answers);
        const stats = { overall: overallCompliance, subcategories: {}, compartments: {} };
        const comps = [...new Set(answers.map(a => a.compartment_id))].filter(Boolean);
        comps.forEach(c => stats.compartments[c] = calculateCompliance(answers.filter(a => a.compartment_id === c)));
        Object.keys(matrixData).forEach(id => stats.subcategories[id] = calculateCompliance(answers.filter(a => a.subcategory_id == id)));

        res.json({
            coach_number: session.coach_number,
            date: session.inspection_date,
            matrix: matrixData,
            stats,
            compartments: comps
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};
