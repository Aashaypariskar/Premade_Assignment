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
// Returns a list of "Inspection Sessions" (grouped by Submission ID)
exports.getAllReports = async (req, res) => {
    try {
        console.log('--- FETCHING REPORTS (v4 - FORCED REFRESH) ---');
        const { role, id: userId } = req.user;

        let whereClause = {};

        // RBAC: If not Admin, only show own reports
        if (role !== 'Admin') {
            whereClause.user_id = userId;
        }

        const answers = await InspectionAnswer.findAll({
            where: whereClause,
            attributes: [
                'submission_id', 'train_number', 'coach_number', 'user_name', 'createdAt', 'user_id', 'id'
            ],
            include: [
                { model: Activity, attributes: ['type'], include: [{ model: Category, attributes: ['name'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Grouping Logic
        const reportsMap = new Map();

        answers.forEach(ans => {
            // Key: Submission ID (Fallback to old key if null)
            const dateStr = formatDate(ans.createdAt);
            const key = ans.submission_id || `${ans.train_number}-${ans.coach_number}-${ans.user_id}-${dateStr}`;

            if (!reportsMap.has(key)) {
                reportsMap.set(key, {
                    id: key, // Submission ID is the ID
                    train_number: ans.train_number,
                    coach_number: ans.coach_number,
                    user_name: ans.user_name,
                    category_name: ans.Activity?.Category?.name || 'Inspection',
                    date: dateStr,
                    timestamp: ans.createdAt, // Keep most recent
                    total_questions: 0,
                    user_id: ans.user_id
                });
            }
            reportsMap.get(key).total_questions++;
        });

        const reports = Array.from(reportsMap.values());
        res.json(reports);

    } catch (err) {
        console.error('Get Reports Error:', err);
        res.status(500).json({ error: 'Failed to fetch reports' });
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
