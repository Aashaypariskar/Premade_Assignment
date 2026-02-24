const {
    InspectionAnswer,
    CommissionaryAnswer,
    SickLineAnswer
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

        let Model;
        if (type === 'COMMISSIONARY') {
            Model = CommissionaryAnswer;
        } else if (type === 'SICKLINE') {
            Model = SickLineAnswer;
        } else {
            Model = InspectionAnswer; // For Generic/Amenity/WSP
        }

        const answer = await Model.findByPk(answer_id);
        if (!answer) {
            return res.status(404).json({ error: 'Defect record not found' });
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
        console.error('Resolve Defect Error:', err);
        res.status(500).json({ error: 'Failed to resolve defect' });
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
        console.error('Get Defects Error:', err);
        res.status(500).json({ error: 'Failed to fetch defects' });
    }
};
