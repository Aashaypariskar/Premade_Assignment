const {
    InspectionAnswer,
    CommissionaryAnswer,
    SickLineAnswer,
    CommissionarySession,
    SickLineSession,
    WspSession,
    Question,
    Coach,
    User,
    Role,
    sequelize
} = require('../models');

/**
 * Universal API to resolve a defect
 * POST /api/inspection/resolve
 */
exports.resolveDefect = async (req, res) => {
    try {
        const { answer_id, type, resolution_remark } = req.body;

        let after_photo_url = req.body.after_photo || null;
        if (req.file) {
            after_photo_url = `/public/uploads/${req.file.filename}`;
        }

        if (!answer_id || !type) {
            return res.status(400).json({ error: 'Missing answer_id or type' });
        }

        let Model, SessionModel;
        if (type === 'COMMISSIONARY') {
            Model = CommissionaryAnswer;
            SessionModel = CommissionarySession;
        } else if (type === 'SICKLINE') {
            Model = SickLineAnswer;
            SessionModel = SickLineSession;
        } else {
            Model = InspectionAnswer; // For Generic/Amenity/WSP
            SessionModel = WspSession;
        }

        const answer = await Model.findByPk(answer_id);
        if (!answer) {
            return res.status(404).json({ error: 'Defect record not found' });
        }

        const session = await SessionModel.findByPk(answer.session_id);
        if (!session) return res.status(404).json({ error: 'Session not found for this defect' });
        if (session.status === 'SUBMITTED' || session.status === 'COMPLETED') {
            return res.status(403).json({ error: 'Cannot edit a submitted inspection' });
        }

        // Update defect status
        answer.resolved = true;
        answer.resolution_remark = resolution_remark;
        answer.after_photo_url = after_photo_url;
        answer.resolved_at = new Date();

        await answer.save();

        res.json({
            success: true,
            message: 'Defect resolved successfully',
            data: answer
        });

    } catch (err) {
        console.error('Resolve Defect Error:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to resolve defect', details: err.message });
    }
};

/**
 * Universal API to get pending defects for a session/subcategory
 * GET /api/inspection/defects
 */
exports.getPendingDefects = async (req, res) => {
    try {
        const { session_id, subcategory_id, type, schedule_id, mode, compartment_id } = req.query;

        if (!session_id || !type) {
            return res.status(400).json({ error: 'Missing session_id or type' });
        }

        let Model;
        let where = { session_id, status: 'DEFICIENCY', resolved: false };

        if (type === 'COMMISSIONARY') {
            Model = CommissionaryAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
            if (compartment_id) where.compartment_id = compartment_id;
        } else if (type === 'SICKLINE') {
            Model = SickLineAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
        } else if (type === 'WSP') {
            Model = InspectionAnswer;
            const subIdMatch = `WSP-${mode}-${session_id}-%`;
            where.submission_id = { [require('sequelize').Op.like]: subIdMatch };
            if (schedule_id) where.schedule_id = schedule_id;
        } else {
            Model = InspectionAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
        }

        const defects = await Model.findAll({ where });

        res.json({ success: true, defects });

    } catch (err) {
        console.error('Get Defects Error:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch defects', details: err.message });
    }
};

/**
 * Universal Auto-Save
 * POST /api/inspection/autosave
 */
exports.autosave = async (req, res) => {
    try {
        const { module_type, session_id, question_id, status, remarks, reason_ids, photo_url } = req.body;

        if (!module_type || !session_id || !question_id) {
            return res.status(400).json({ error: 'Missing module_type, session_id or question_id' });
        }

        // 1. Resolve Models and Session Locking
        let AnswerModel, SessionModel;
        switch (module_type) {
            case 'commissionary':
                AnswerModel = CommissionaryAnswer;
                SessionModel = CommissionarySession;
                break;
            case 'sickline':
                AnswerModel = SickLineAnswer;
                SessionModel = SickLineSession;
                break;
            case 'wsp':
            case 'amenity':
            case 'pitline':
                AnswerModel = InspectionAnswer;
                SessionModel = WspSession; // Generic for WSP/Amenity
                break;
            default:
                return res.status(400).json({ error: 'Invalid module_type' });
        }

        const session = await SessionModel.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.status === 'SUBMITTED' || session.status === 'COMPLETED') {
            return res.status(403).json({ error: 'Cannot edit a submitted inspection' });
        }

        // 2. Fetch Question for snapshot
        const qData = await Question.findByPk(question_id);
        if (!qData) return res.status(404).json({ error: 'Question not found' });

        // 3. Upsert Logic with Module Specialized Routing
        if (module_type === 'sickline') {
            console.log('[AUTOSAVE SICKLINE]', { session_id, coach_id: session.coach_id, question_id });

            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id
                },
                defaults: {
                    coach_id: session.coach_id,
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: Array.isArray(reason_ids) ? reason_ids : [],
                    photo_url: photo_url || null,
                    question_text_snapshot: qData.text
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: Array.isArray(reason_ids) ? reason_ids : ansRecord.reasons,
                    photo_url: photo_url || ansRecord.photo_url
                });
            }
        } else {
            // Standard multi-context routing (Commissionary, etc.)
            const compartment_id = req.body.compartment_id || 'NA';
            const subcategory_id = req.body.subcategory_id || 0;
            const activity_type = req.body.activity_type || 'Major';

            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id,
                    compartment_id,
                    subcategory_id,
                    activity_type
                },
                defaults: {
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: Array.isArray(reason_ids) ? reason_ids : [],
                    photo_url: photo_url || null,
                    question_text_snapshot: qData.text
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: Array.isArray(reason_ids) ? reason_ids : ansRecord.reasons,
                    photo_url: photo_url || ansRecord.photo_url
                });
            }
        }

        res.json({ success: true, message: 'Autosave successful' });

    } catch (err) {
        console.error('Universal Autosave Error:', err.message, err.stack);
        // Special safe return to prevent server crash and allow frontend to continue
        if (req.body.module_type === 'sickline') {
            return res.status(200).json({ success: false, error: 'Autosave failed safely', details: err.message });
        }
        res.status(500).json({ error: 'Autosave failed', details: err.message });
    }
};

/**
 * Universal Save Checkpoint
 * POST /api/inspection/save-checkpoint
 */
exports.saveCheckpoint = async (req, res) => {
    try {
        const { module_type, session_id, answers } = req.body;

        if (!module_type || !session_id) {
            return res.status(400).json({ error: 'Missing module_type or session_id' });
        }

        let SessionModel;
        switch (module_type) {
            case 'commissionary': SessionModel = CommissionarySession; break;
            case 'sickline': SessionModel = SickLineSession; break;
            case 'wsp':
            case 'amenity':
            case 'pitline': SessionModel = WspSession; break;
            default: return res.status(400).json({ error: 'Invalid module_type' });
        }

        const session = await SessionModel.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.status === 'SUBMITTED' || session.status === 'COMPLETED') {
            return res.status(403).json({ error: 'Cannot edit a submitted inspection' });
        }

        // 1. Bulk Upsert logic for checkpoint
        if (answers && Array.isArray(answers)) {
            const transaction = await sequelize.transaction();
            try {
                for (const ans of answers) {
                    const { question_id, status, remarks, reason_ids, photo_url } = ans;
                    if (!question_id) continue;

                    let AnswerModel;
                    switch (module_type) {
                        case 'commissionary': AnswerModel = CommissionaryAnswer; break;
                        case 'sickline': AnswerModel = SickLineAnswer; break;
                        default: AnswerModel = InspectionAnswer; break;
                    }

                    const qData = await Question.findByPk(question_id);

                    let searchCriteria, defaultData;

                    if (module_type === 'sickline') {
                        searchCriteria = { session_id, question_id };
                        defaultData = {
                            coach_id: session.coach_id,
                            status: status || 'OK',
                            remarks: remarks || '',
                            reasons: Array.isArray(reason_ids) ? reason_ids : [],
                            photo_url: photo_url || null,
                            question_text_snapshot: qData?.text || 'Checkpointed Answer'
                        };
                    } else {
                        const compartment_id = ans.compartment_id || 'NA';
                        const subcategory_id = ans.subcategory_id || 0;
                        const activity_type = ans.activity_type || 'Major';

                        searchCriteria = {
                            session_id,
                            question_id,
                            compartment_id,
                            subcategory_id,
                            activity_type
                        };
                        defaultData = {
                            status: status || 'OK',
                            remarks: remarks || '',
                            reasons: Array.isArray(reason_ids) ? reason_ids : [],
                            photo_url: photo_url || null,
                            question_text_snapshot: qData?.text || 'Checkpointed Answer'
                        };
                    }

                    const [ansRecord, created] = await AnswerModel.findOrCreate({
                        where: searchCriteria,
                        defaults: defaultData,
                        transaction
                    });

                    if (!created) {
                        await ansRecord.update({
                            status: status || ansRecord.status,
                            remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                            reasons: Array.isArray(reason_ids) ? reason_ids : ansRecord.reasons,
                            photo_url: photo_url || ansRecord.photo_url
                        }, { transaction });
                    }
                }
                await transaction.commit();
            } catch (upsertErr) {
                await transaction.rollback();
                throw upsertErr;
            }
        }

        // 2. Update timestamp
        session.last_saved_at = new Date();
        await session.save();

        res.json({ success: true, message: 'Checkpoint saved with data' });

    } catch (err) {
        console.error('Save Checkpoint Error:', err.message, err.stack);
        res.status(500).json({ error: 'Checkpoint failed', details: err.message });
    }
};
