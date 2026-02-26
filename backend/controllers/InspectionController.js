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
    CaiQuestion,
    CaiSession,
    CaiAnswer,
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
        } else if (type === 'CAI') {
            Model = CaiAnswer;
            SessionModel = CaiSession;
        } else if (type === 'PITLINE') {
            Model = InspectionAnswer;
        } else {
            Model = InspectionAnswer; // For Generic/Amenity/WSP
            SessionModel = WspSession;
        }

        const answer = await Model.findByPk(answer_id);
        if (!answer) {
            return res.status(404).json({ error: 'Defect record not found' });
        }

        if (SessionModel) {
            const session = await SessionModel.findByPk(answer.session_id);
            if (session && (session.status === 'SUBMITTED' || session.status === 'COMPLETED')) {
                return res.status(403).json({ error: 'Cannot edit a submitted inspection' });
            }
        }

        // Update defect status
        if (type === 'CAI') {
            await CaiAnswer.update({
                resolved: 1, // Store as integer 1
                resolution_remark: resolution_remark,
                after_photo_url: after_photo_url,
                resolved_at: new Date()
            }, {
                where: { id: answer_id }
            });
        } else {
            // Standardize: Use integer 1 for resolved across ALL modules
            answer.resolved = 1;
            answer.resolution_remark = resolution_remark;
            answer.after_photo_url = after_photo_url;
            answer.resolved_at = new Date();
            await answer.save();
        }

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
        const { session_id, subcategory_id, type, schedule_id, mode, compartment_id, train_id, coach_id } = req.query;

        if (!type || (!session_id && !train_id && !coach_id)) {
            return res.status(400).json({ error: 'Missing session_id or type (or train/coach context for PitLine)' });
        }

        let Model;
        // Standardize: ALWAYS filter by status='DEFICIENCY' and resolved=0
        let where = { status: 'DEFICIENCY', resolved: 0 };
        if (session_id) where.session_id = session_id;
        if (train_id) where.train_id = train_id;
        if (coach_id) where.coach_id = coach_id;

        if (type === 'COMMISSIONARY') {
            Model = CommissionaryAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
            if (compartment_id) where.compartment_id = compartment_id;
        } else if (type === 'SICKLINE') {
            Model = SickLineAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
        } else if (type === 'CAI') {
            Model = CaiAnswer;
        } else if (type === 'WSP') {
            Model = InspectionAnswer;
            const subIdMatch = `WSP-${mode}-${session_id}-%`;
            where.submission_id = { [require('sequelize').Op.like]: subIdMatch };
            if (schedule_id) where.schedule_id = schedule_id;
        } else if (type === 'PITLINE') {
            Model = InspectionAnswer;
            where.module_type = 'PITLINE';
            where.train_id = train_id;
            where.coach_id = coach_id;
            // Strict PitLine validation
            if (!train_id || !coach_id) {
                return res.status(400).json({ error: 'Missing train_id or coach_id for PitLine context' });
            }
            // session_id is optional for cumulative coach defects
            if (session_id) where.session_id = session_id;
            // DO NOT filter by subcategory_id or compartment_id for PITLINE cumulative defects
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
        const {
            module_type,
            session_id,
            question_id,
            status,
            remarks,
            reason_ids,
            photo_url,
            train_id,
            coach_id
        } = req.body;
        const moduleType = (req.body.module_type || '').toUpperCase().trim();

        if (!module_type || !session_id || !question_id) {
            return res.status(400).json({ error: 'Missing module_type, session_id or question_id' });
        }

        console.log('[AUTOSAVE MODULE]', moduleType);

        // 1. Resolve Models and Session Locking
        let AnswerModel, SessionModel;
        switch (moduleType) {
            case 'COMMISSIONARY':
                AnswerModel = CommissionaryAnswer;
                SessionModel = CommissionarySession;
                break;
            case 'SICKLINE':
                AnswerModel = SickLineAnswer;
                SessionModel = SickLineSession;
                break;
            case 'CAI':
                AnswerModel = CaiAnswer;
                SessionModel = CaiSession;
                break;
            case 'WSP':
            case 'AMENITY':
                AnswerModel = InspectionAnswer;
                SessionModel = WspSession; // Generic for WSP/Amenity
                break;
            case 'PITLINE':
                AnswerModel = InspectionAnswer;
                SessionModel = PitLineSession;
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
        let qData;
        if (moduleType === 'CAI') {
            qData = await CaiQuestion.findByPk(question_id);
        } else {
            qData = await Question.findByPk(question_id);
        }
        if (!qData) return res.status(404).json({ error: 'Question not found' });

        // 3. Upsert Logic with Module Specialized Routing
        if (moduleType === 'CAI') {
            console.log('[AUTOSAVE CAI]', { session_id, coach_id: session.coach_id, question_id });

            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id
                },
                defaults: {
                    coach_id: session.coach_id,
                    status: status, // Saved exactly
                    remarks: remarks || '',
                    reason_ids: Array.isArray(reason_ids) ? reason_ids : [],
                    before_photo_url: photo_url || null,
                    question_text_snapshot: qData.question_text || qData.text
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status, // Saved exactly
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reason_ids: Array.isArray(reason_ids) ? reason_ids : ansRecord.reason_ids,
                    before_photo_url: photo_url || ansRecord.before_photo_url
                });
            }
        } else if (moduleType === 'COMMISSIONARY') {
            // Standardized reason handling to prevent crashes
            let finalReasons = [];
            if (reason_ids) {
                if (Array.isArray(reason_ids)) {
                    finalReasons = reason_ids;
                } else if (typeof reason_ids === 'string') {
                    try {
                        const parsed = JSON.parse(reason_ids);
                        finalReasons = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                        finalReasons = reason_ids.split(',').map(r => r.trim()).filter(Boolean);
                    }
                }
            }

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
                    reasons: finalReasons,
                    photo_url: photo_url || null,
                    question_text_snapshot: qData.text
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: finalReasons,
                    photo_url: photo_url || ansRecord.photo_url
                });
            }
        } else if (moduleType === 'SICKLINE') {
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
        } else if (moduleType === 'PITLINE') {
            const { train_id, coach_id, session_id, question_id, status, remarks, reason_ids, photo_url } = req.body;
            console.log('[AUTOSAVE PITLINE] Isolated block entered', { train_id, coach_id, session_id, question_id });

            if (!train_id || !coach_id || !session_id || !question_id) {
                return res.status(400).json({ error: 'train_id, coach_id, session_id and question_id required for PITLINE' });
            }

            // Standardized reason handling
            let finalReasons = [];
            if (reason_ids) {
                if (Array.isArray(reason_ids)) {
                    finalReasons = reason_ids;
                } else {
                    try {
                        const parsed = JSON.parse(reason_ids);
                        finalReasons = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                        finalReasons = reason_ids.toString().split(',').map(r => r.trim()).filter(Boolean);
                    }
                }
            }

            // STRICT lookup: session_id, train_id, coach_id, question_id
            const [ansRecord, created] = await InspectionAnswer.findOrCreate({
                where: {
                    session_id,
                    train_id,
                    coach_id,
                    question_id
                },
                defaults: {
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: finalReasons,
                    photo_url: photo_url || null,
                    module_type: 'PITLINE',
                    resolved: 0
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: finalReasons,
                    photo_url: photo_url || ansRecord.photo_url,
                    module_type: 'PITLINE'
                });
            }

            return res.json({ success: true, message: 'PitLine autosave successful' });
        } else if (moduleType === 'WSP') {
            console.log('[AUTOSAVE WSP BLOCK ENTERED]');
            const { coach_id } = session;
            const finalReasons = Array.isArray(reason_ids) ? JSON.stringify(reason_ids) : JSON.stringify([]);

            const [answer, created] = await InspectionAnswer.findOrCreate({
                where: { session_id, question_id },
                defaults: {
                    session_id,
                    question_id,
                    coach_id,
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: finalReasons,
                    photo_url: photo_url || null,
                    resolved: 0
                }
            });

            if (!created) {
                await InspectionAnswer.update({
                    status: status || answer.status,
                    remarks: remarks !== undefined ? remarks : answer.remarks,
                    reasons: finalReasons,
                    photo_url: photo_url || answer.photo_url
                }, {
                    where: { id: answer.id }
                });
            }
            return res.json({ success: true });
        } else {
            // EXISTING Amenity logic
            // Standardized reason handling to prevent crashes
            let finalReasons = [];
            if (reason_ids) {
                if (Array.isArray(reason_ids)) {
                    finalReasons = reason_ids;
                } else if (typeof reason_ids === 'string') {
                    try {
                        const parsed = JSON.parse(reason_ids);
                        finalReasons = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                        finalReasons = reason_ids.split(',').map(r => r.trim()).filter(Boolean);
                    }
                }
            }

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
                    reasons: finalReasons,
                    photo_url: photo_url || null,
                    question_text_snapshot: qData.text
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: finalReasons,
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
        const type = (module_type || '').toUpperCase();

        if (!module_type || !session_id) {
            return res.status(400).json({ error: 'Missing module_type or session_id' });
        }

        let SessionModel;
        switch (type) {
            case 'COMMISSIONARY': SessionModel = CommissionarySession; break;
            case 'SICKLINE': SessionModel = SickLineSession; break;
            case 'CAI': SessionModel = CaiSession; break;
            case 'WSP':
            case 'AMENITY':
            case 'PITLINE': SessionModel = WspSession; break;
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
                    switch (type) {
                        case 'COMMISSIONARY': AnswerModel = CommissionaryAnswer; break;
                        case 'SICKLINE': AnswerModel = SickLineAnswer; break;
                        case 'CAI': AnswerModel = CaiAnswer; break;
                        default: AnswerModel = InspectionAnswer; break;
                    }

                    let qData;
                    if (type === 'CAI') {
                        qData = await CaiQuestion.findByPk(question_id);
                    } else {
                        qData = await Question.findByPk(question_id);
                    }

                    // Robust reason handling for checkpointing
                    let finalReasons = [];
                    if (reason_ids) {
                        if (Array.isArray(reason_ids)) {
                            finalReasons = reason_ids;
                        } else if (typeof reason_ids === 'string') {
                            try {
                                const parsed = JSON.parse(reason_ids);
                                finalReasons = Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) {
                                finalReasons = reason_ids.split(',').map(r => r.trim()).filter(Boolean);
                            }
                        }
                    }

                    let searchCriteria, defaultData;

                    if (type === 'SICKLINE' || type === 'CAI') {
                        searchCriteria = { session_id, question_id };
                        defaultData = {
                            coach_id: session.coach_id,
                            status: status, // Saved exactly
                            remarks: remarks || '',
                            reasons: finalReasons,
                            reason_ids: finalReasons, // Map reasons -> reason_ids for CAI
                            photo_url: photo_url || null,
                            before_photo_url: photo_url || null, // Map photo_url -> before_photo_url for CAI
                            question_text_snapshot: qData?.question_text || qData?.text || 'Checkpointed Answer'
                        };
                    } else if (type === 'WSP') {
                        searchCriteria = { session_id, question_id };
                        defaultData = {
                            status: status || 'OK',
                            remarks: remarks || '',
                            reasons: Array.isArray(finalReasons) ? JSON.stringify(finalReasons) : finalReasons,
                            photo_url: photo_url || null,
                            question_text_snapshot: qData?.text || 'Checkpointed Answer',
                            resolved: 0
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
                            reasons: finalReasons,
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
                        let updateData = {
                            status: status, // Saved exactly
                            remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                        };

                        if (type === 'SICKLINE') {
                            updateData.reasons = Array.isArray(reason_ids) ? reason_ids : ansRecord.reasons;
                            updateData.photo_url = photo_url || ansRecord.photo_url;
                        } else if (type === 'CAI') {
                            updateData.reason_ids = Array.isArray(reason_ids) ? reason_ids : ansRecord.reason_ids;
                            updateData.before_photo_url = photo_url || ansRecord.before_photo_url;
                        } else if (type === 'WSP') {
                            updateData.reasons = Array.isArray(reason_ids) ? JSON.stringify(reason_ids) : ansRecord.reasons;
                            updateData.photo_url = photo_url || ansRecord.photo_url;
                        } else {
                            updateData.reasons = Array.isArray(reason_ids) ? reason_ids : ansRecord.reasons;
                            updateData.photo_url = photo_url || ansRecord.photo_url;
                        }

                        await ansRecord.update(updateData, { transaction });
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
