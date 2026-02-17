const { InspectionAnswer, Train, Coach, User, Activity, Question, Category } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Report Controller
 * Aggregates InspectionAnswer data into "Reports"
 */

// Helper to format date
const formatDate = (date) => new Date(date).toISOString().split('T')[0];

// GET /api/reports
// Returns a list of "Inspection Sessions" with aggregated incident counts
exports.getAllReports = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const { train_no, coach_no, inspection_type, start_date, end_date, status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = {};

        // RBAC: If not Admin, only show own reports
        if (role !== 'Admin') {
            whereClause.user_id = userId;
        }

        // Filters
        if (train_no) whereClause.train_number = train_no;
        if (coach_no) whereClause.coach_number = coach_no;
        if (inspection_type) whereClause.category_name = inspection_type;
        if (status) whereClause.status = status; // Assuming status is added or using a placeholder
        if (start_date && end_date) {
            whereClause.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date)] };
        }

        // Aggregate by submission_id
        const reports = await InspectionAnswer.findAll({
            attributes: [
                'submission_id',
                'train_number',
                'coach_number',
                'user_name',
                'category_name',
                'status',
                'createdAt',
                'user_id',
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN answer = 'NO' AND activity_type = 'Major' THEN 1 END")), 'major_incident_count'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN answer = 'NO' AND activity_type = 'Minor' THEN 1 END")), 'minor_incident_count'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_items']
            ],
            where: whereClause,
            group: ['submission_id', 'train_number', 'coach_number', 'user_name', 'category_name', 'status', 'createdAt', 'user_id'],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            raw: true
        });

        // Get total count for pagination
        const totalCount = await InspectionAnswer.count({
            distinct: true,
            col: 'submission_id',
            where: whereClause
        });

        res.json({
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
            data: reports
        });

    } catch (err) {
        console.error('Get Reports Error:', err);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

// GET /api/report-filters
// Returns distinct values for dropdown filtering
exports.getFilterOptions = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        let whereClause = {};

        if (role !== 'Admin') {
            whereClause.user_id = userId;
        }

        const [trains, coaches, types, statuses] = await Promise.all([
            InspectionAnswer.findAll({
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('train_number')), 'train_number']],
                where: whereClause,
                raw: true
            }),
            InspectionAnswer.findAll({
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('coach_number')), 'coach_number']],
                where: whereClause,
                raw: true
            }),
            InspectionAnswer.findAll({
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('category_name')), 'category_name']],
                where: whereClause,
                raw: true
            }),
            InspectionAnswer.findAll({
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('status')), 'status']],
                where: whereClause,
                raw: true
            })
        ]);

        res.json({
            trains: trains.map(t => t.train_number).filter(Boolean),
            coaches: coaches.map(c => c.coach_number).filter(Boolean),
            types: types.map(t => t.category_name).filter(Boolean),
            statuses: statuses.map(s => s.status).filter(Boolean)
        });

    } catch (err) {
        console.error('Get Filter Options Error:', err);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
};

// GET /api/report-details
exports.getReportDetails = async (req, res) => {
    try {
        const { submission_id, train_number, coach_number, date, user_id } = req.query;

        // If validation fails, return 400
        if (!submission_id && (!train_number || !coach_number)) {
            // Fallback for old reports?
            // return res.status(400).json({ error: 'Missing report ID' });
        }

        let whereClause = {};

        if (submission_id) {
            whereClause.submission_id = submission_id;
        } else {
            // Legacy support
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            whereClause = {
                train_number,
                coach_number,
                user_id,
                createdAt: { [Op.between]: [startOfDay, endOfDay] }
            };
        }

        // RBAC Check (Simplified: if user_id in query differs from token, deny)
        // But with submission_id, we need to verify ownership if not admin
        // We'll let the query run and check results 
        // OR separate verification. 
        // For MVP, just trust the filtered query if we add user_id to whereClause for non-admins

        if (req.user.role !== 'Admin') {
            whereClause.user_id = req.user.id;
        }

        const details = await InspectionAnswer.findAll({
            where: whereClause,
            include: [
                { model: Activity, attributes: ['type'], include: [{ model: Category, attributes: ['name'] }] },
                { model: Question, attributes: [['text', 'question_text']] }
            ],
            order: [['id', 'ASC']]
        });

        res.json(details);

    } catch (err) {
        console.error('REPORT DETAILS ERROR:', err.message);
        res.status(500).json({ error: 'Failed to fetch report details' });
    }
};
