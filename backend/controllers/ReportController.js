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
        const { train_no, coach_no, inspection_type, start_date, end_date, activity_type, status, page = 1, limit = 10 } = req.query;
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
        if (activity_type) whereClause.activity_type = activity_type;
        if (status) whereClause.status = status; // Assuming status is added or using a placeholder
        if (start_date && end_date) {
            const start = new Date(start_date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt = { [Op.between]: [start, end] };
        }

        // Build dynamic WHERE clause for raw SQL
        let sqlWhere = '1=1';
        let replacements = { limit: parseInt(limit), offset: parseInt(offset) };

        if (train_no) { sqlWhere += ' AND train_number LIKE :train_no'; replacements.train_no = `%${train_no}%`; }
        if (coach_no) { sqlWhere += ' AND coach_number LIKE :coach_no'; replacements.coach_no = `%${coach_no}%`; }
        if (inspection_type) { sqlWhere += ' AND category_name = :inspection_type'; replacements.inspection_type = inspection_type; }
        if (activity_type) { sqlWhere += ' AND activity_type = :activity_type'; replacements.activity_type = activity_type; }
        if (whereClause.user_id) { sqlWhere += ' AND user_id = :user_id'; replacements.user_id = whereClause.user_id; }
        if (start_date && end_date) {
            sqlWhere += ' AND createdAt BETWEEN :start_date AND :end_date';
            const start = new Date(start_date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            replacements.start_date = start;
            replacements.end_date = end;
        }

        const sql = `
            SELECT 
                submission_id,
                MAX(train_number) as train_number,
                MAX(coach_number) as coach_number,
                MAX(user_name) as user_name,
                MAX(category_name) as category_name,
                MAX(subcategory_name) as subcategory_name,
                MAX(schedule_name) as schedule_name,
                MAX(activity_type) as severity,
                MAX(createdAt) as createdAt,
                MAX(user_id) as user_id,
                MAX(coach_id) as coach_id,
                MAX(subcategory_id) as subcategory_id,
                SUM(CASE WHEN answer = 'YES' THEN 1 ELSE 0 END) as yes_count,
                SUM(CASE WHEN answer = 'NO' THEN 1 ELSE 0 END) as no_count,
                SUM(CASE WHEN answer_type = 'VALUE' AND observed_value IS NOT NULL AND observed_value != '' THEN 1 ELSE 0 END) as value_count,
                ROUND((SUM(CASE WHEN answer = 'YES' THEN 1 ELSE 0 END) * 100.0) / NULLIF(SUM(CASE WHEN answer IN ('YES', 'NO') THEN 1 ELSE 0 END), 0), 1) as compliance_score
            FROM inspection_answers
            WHERE ${sqlWhere}
            GROUP BY submission_id
            ORDER BY MAX(createdAt) DESC
            LIMIT :limit OFFSET :offset
        `;

        const reports = await sequelize.query(sql, {
            replacements,
            type: sequelize.QueryTypes.SELECT
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
            statuses: statuses.map(s => s.status).filter(Boolean),
            activityTypes: ['Major', 'Minor']
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
                { model: Question, attributes: [['text', 'question_text'], 'specified_value', 'unit', 'answer_type'] },
                { model: require('../models').LtrSchedule, attributes: ['name'] },
                { model: require('../models').AmenitySubcategory, attributes: ['name'] }
            ],
            order: [['id', 'ASC']]
        });

        res.json(details);

    } catch (err) {
        console.error('REPORT DETAILS ERROR:', err.message);
        res.status(500).json({ error: 'Failed to fetch report details' });
    }
};
// GET /api/reports/combined
// Requirement: coach_id, subcategory_id, activity_type, date
exports.getCombinedReport = async (req, res) => {
    try {
        const { coach_id, subcategory_id, activity_type, date } = req.query;

        if (!coach_id || !subcategory_id || !activity_type || !date) {
            return res.status(400).json({ error: 'Missing mandatory parameters' });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Step 1: Find all submission IDs for this group, then filter for LATEST per compartment
        const allSubmissions = await InspectionAnswer.findAll({
            attributes: ['submission_id', 'subcategory_name', 'createdAt'],
            where: {
                coach_id,
                subcategory_id,
                activity_type,
                createdAt: { [Op.between]: [startOfDay, endOfDay] }
            },
            order: [['createdAt', 'DESC']]
        });

        if (allSubmissions.length === 0) {
            return res.status(404).json({ error: 'No reports found for this date' });
        }

        // Map to hold only the latest submission_id for each compartment
        const latestSubMap = new Map();
        allSubmissions.forEach(s => {
            const match = s.subcategory_name.match(/\[(.*?)\]/);
            const comp = match ? match[1] : 'Main';
            if (!latestSubMap.has(comp)) {
                latestSubMap.set(comp, s.submission_id);
            }
        });

        const submissionIds = Array.from(latestSubMap.values());

        if (submissionIds.length === 0) {
            return res.status(400).json({ error: 'Combined report not available' });
        }

        // Identify compartments from the latest submission list
        const compartments = [...new Set(allSubmissions
            .filter(s => submissionIds.includes(s.submission_id))
            .map(s => {
                const match = s.subcategory_name.match(/\[(.*?)\]/);
                return match ? match[1] : null;
            }).filter(Boolean))].sort();

        // Step 2 & 3: Fetch answers and build pivot matrix
        const answers = await InspectionAnswer.findAll({
            where: { submission_id: submissionIds },
            order: [['id', 'ASC']]
        });

        const questionsMap = new Map();
        const compStats = {};
        compartments.forEach(c => compStats[c] = { yes: 0, no: 0 });

        // Fetch subcategory once for comparison
        const subcategory = await require('../models').AmenitySubcategory.findByPk(subcategory_id);
        const targetBase = subcategory?.name?.split(' [')[0].toLowerCase();

        answers.forEach(ans => {
            const qText = ans.question_text_snapshot;
            const itemName = ans.item_name || 'General';
            const ansSubBase = ans.subcategory_name?.split(' [')[0].toLowerCase();

            // Only process if it belongs to this subcategory area (case-insensitive)
            if (ansSubBase !== targetBase) return;

            const match = ans.subcategory_name.match(/\[(.*?)\]/);
            const comp = match ? match[1] : 'Unknown';

            // UNIQUE KEY: ITEM + QUESTION
            const key = `${itemName}_${qText}`;

            if (!questionsMap.has(key)) {
                questionsMap.set(key, {
                    item: itemName,
                    question: qText,
                    answer_type: ans.answer_type,
                    unit: ans.unit || '',
                    values: {}
                });
            }

            const qEntry = questionsMap.get(key);

            // STRICT ANSWER HANDLING
            let finalAnswer = null;
            if (ans.answer === 'YES') finalAnswer = 'YES';
            else if (ans.answer === 'NO') finalAnswer = 'NO';
            else if (ans.answer === 'NA') finalAnswer = 'NA';

            if (comp === 'L3' && finalAnswer === 'NO') {
                console.log(`[DEBUG] Found NO answer for L3: ${qText}`);
            }

            // Structured data for each cell
            const existingCell = qEntry.values[comp];
            const newCell = {
                answer: finalAnswer,
                observed_value: ans.observed_value,
                unit: ans.unit || '',
                reasons: ans.reasons || [],
                remarks: ans.remarks || '',
                answer_type: ans.answer_type
            };

            // PRIORITIZE NO: If we already have a NO, don't let a YES/NA overwrite it
            if (!existingCell || (existingCell.answer !== 'NO' && finalAnswer === 'NO')) {
                qEntry.values[comp] = newCell;
            }

            // Step 4: Compliance logic (only count if not already counted for this question/comp)
            // Note: In an ideal world, we'd only have one submission per comp. 
            // If there are multiple, this logic counts the last one (since qEntry.values[comp] was just set).
            if (ans.answer_type === 'BOOLEAN' && compartments.includes(comp)) {
                // We'll calculate stats later from the final matrix to avoid double-counting
            }
        });

        // Convert Map to ordered array and fill missing values
        const matrix = Array.from(questionsMap.values()).map(q => {
            compartments.forEach(c => {
                if (!q.values[c]) q.values[c] = null;
            });
            return q;
        });

        // Calculate final percentages from the matrix (correct way)
        const perCompartmentCompliance = {};
        let totalYes = 0;
        let totalTotal = 0;

        matrix.forEach(row => {
            if (row.answer_type === 'BOOLEAN') {
                compartments.forEach(comp => {
                    const cell = row.values[comp];
                    if (cell) {
                        if (cell.answer === 'YES') {
                            compStats[comp].yes++;
                        } else if (cell.answer === 'NO') {
                            compStats[comp].no++;
                        }
                    }
                });
            }
        });

        compartments.forEach(c => {
            const { yes, no } = compStats[c];
            const sum = yes + no;
            perCompartmentCompliance[c] = sum > 0 ? Math.round((yes / sum) * 100) : null;
            totalYes += yes;
            totalTotal += sum;
        });

        const overallCompliance = totalTotal > 0 ? Math.round((totalYes / totalTotal) * 100) : 0;

        // Fetch metadata for header
        const coach = await Coach.findByPk(coach_id);

        res.json({
            coach: coach?.coach_number || 'N/A',
            subcategory: subcategory?.name || 'N/A',
            activity_type,
            date,
            compartments,
            matrix,
            compliance: {
                per_compartment: perCompartmentCompliance,
                overall: overallCompliance
            }
        });

    } catch (err) {
        console.error('COMBINED REPORT ERROR:', err);
        res.status(500).json({ error: 'Failed to generate combined report' });
    }
};
