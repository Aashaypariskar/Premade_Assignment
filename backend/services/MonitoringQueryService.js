const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * MonitoringQueryService - Handles complex UNION queries for multi-module monitoring
 */

/**
 * getUnifiedSessions
 * Normalizes all session tables into a single stream with dynamic filtering
 */
exports.getUnifiedSessions = async (page, limit, filters = {}) => {
    const offset = (page - 1) * limit;
    const subLimit = (page * limit) + 50;
    const replacements = { limit, offset, subLimit };

    const subQueries = [];
    const modules = [
        { name: 'WSP', table: 'wsp_sessions', dateCol: 'COALESCE(inspection_date, createdAt)', inspectorCol: 'created_by' },
        { name: 'SICKLINE', table: 'sickline_sessions', dateCol: 'COALESCE(inspection_date, createdAt)', inspectorCol: 'created_by' },
        { name: 'COMMISSIONARY', table: 'commissionary_sessions', dateCol: 'COALESCE(inspection_date, createdAt)', inspectorCol: 'created_by' },
        { name: 'CAI', table: 'cai_sessions', dateCol: 'createdAt', inspectorCol: 'inspector_id' },
        { name: 'PITLINE', table: 'pitline_sessions', dateCol: 'createdAt', inspectorCol: 'inspector_id' }
    ];

    const isSQLite = sequelize.options.dialect === 'sqlite';

    for (const mod of modules) {
        if (filters.module && filters.module !== mod.name) continue;

        let where = 'WHERE 1=1';
        if (filters.startDate && filters.endDate) {
            where += ` AND ${mod.dateCol} BETWEEN :startDate AND :endDate`;
            replacements.startDate = `${filters.startDate} 00:00:00`;
            replacements.endDate = `${filters.endDate} 23:59:59`;
        }
        if (filters.inspector) {
            where += ` AND ${mod.inspectorCol} = :inspector`;
            replacements.inspector = filters.inspector;
        }
        if (filters.status) {
            where += ` AND status = :status`;
            replacements.status = filters.status;
        }

        const dateExpr = isSQLite
            ? `datetime(${mod.dateCol === 'createdAt' ? 'createdAt' : `COALESCE(${mod.dateCol}, createdAt)`})`
            : `CAST(${mod.dateCol === 'createdAt' ? 'createdAt' : `COALESCE(${mod.dateCol}, createdAt)`} AS DATETIME)`;

        const selectFields = mod.name === 'WSP'
            ? `id AS session_id, 'WSP' AS module_type, coach_id, NULL AS train_id, created_by AS inspector_id, ${dateExpr} AS created_at, status`
            : mod.name === 'PITLINE'
                ? `id AS session_id, 'PITLINE' AS module_type, coach_id, train_id, inspector_id, ${isSQLite ? 'createdAt' : 'CAST(createdAt AS DATETIME)'} AS created_at, status`
                : `id AS session_id, '${mod.name}' AS module_type, coach_id, NULL AS train_id, ${mod.inspectorCol} AS inspector_id, ${dateExpr} AS created_at, status`;

        subQueries.push(`(SELECT ${selectFields} FROM ${mod.table} ${where} ORDER BY createdAt DESC LIMIT :subLimit)`);
    }

    if (subQueries.length === 0) return [];

    const query = `
        SELECT * FROM (
            ${subQueries.join('\n            UNION ALL\n            ')}
        ) AS unified_sessions
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    `;

    return await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });
};

/**
 * getUnifiedDefects
 * Normalizes all answer tables into a single stream of deficiencies with dynamic filtering
 */
exports.getUnifiedDefects = async (page, limit, filters = {}) => {
    const offset = (page - 1) * limit;
    const subLimit = (page * limit) + 50;
    const replacements = { limit, offset, subLimit };

    const subQueries = [];
    const answerModules = [
        { name: 'WSP', table: 'inspection_answers' },
        { name: 'SICKLINE', table: 'sickline_answers' },
        { name: 'COMMISSIONARY', table: 'commissionary_answers' },
        { name: 'CAI', table: 'cai_answers' }
    ];

    for (const mod of answerModules) {
        if (filters.module && filters.module !== mod.name) continue;

        let whereArr = ["status = 'DEFICIENCY'"];
        if (filters.startDate && filters.endDate) {
            whereArr.push(`createdAt BETWEEN :startDate AND :endDate`);
            replacements.startDate = `${filters.startDate} 00:00:00`;
            replacements.endDate = `${filters.endDate} 23:59:59`;
        }
        if (filters.status && (filters.status === '0' || filters.status === '1')) {
            whereArr.push(`resolved = :status`);
            replacements.status = filters.status;
        }
        if (filters.inspector) {
            whereArr.push(`user_id = :inspector`);
            replacements.inspector = filters.inspector;
        }

        const where = `WHERE ${whereArr.join(' AND ')}`;

        const photoFields = mod.name === 'CAI'
            ? '(before_photo_url IS NOT NULL) AS has_before_photo, (after_photo_url IS NOT NULL) AS has_after_photo'
            : '(photo_url IS NOT NULL) AS has_before_photo, (after_photo_url IS NOT NULL) AS has_after_photo';

        subQueries.push(`(SELECT id AS answer_id, session_id, '${mod.name}' AS module_type, createdAt AS created_at, status, resolved, ${photoFields} FROM ${mod.table} ${where} ORDER BY createdAt DESC LIMIT :subLimit)`);
    }

    if (subQueries.length === 0) return [];

    const query = `
        SELECT * FROM (
            ${subQueries.join('\n            UNION ALL\n            ')}
        ) AS unified_defects
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    `;

    return await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });
};

/**
 * getSummaryStats
 * Returns enhanced aggregated statistics for charts
 */
exports.getSummaryStats = async () => {
    const isSQLite = sequelize.options.dialect === 'sqlite';
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today} 00:00:00`;
    const todayEnd = `${today} 23:59:59`;

    const countsQuery = `
        SELECT
            (
                (SELECT COUNT(*) FROM wsp_sessions WHERE createdAt BETWEEN :todayStart AND :todayEnd) +
                (SELECT COUNT(*) FROM sickline_sessions WHERE createdAt BETWEEN :todayStart AND :todayEnd) +
                (SELECT COUNT(*) FROM commissionary_sessions WHERE createdAt BETWEEN :todayStart AND :todayEnd) +
                (SELECT COUNT(*) FROM cai_sessions WHERE createdAt BETWEEN :todayStart AND :todayEnd) +
                (SELECT COUNT(*) FROM pitline_sessions WHERE createdAt BETWEEN :todayStart AND :todayEnd)
            ) AS total_inspections_today,
            (
                (SELECT COUNT(*) FROM inspection_answers WHERE status = 'DEFICIENCY' AND resolved = 0) +
                (SELECT COUNT(*) FROM sickline_answers WHERE status = 'DEFICIENCY' AND resolved = 0) +
                (SELECT COUNT(*) FROM commissionary_answers WHERE status = 'DEFICIENCY' AND resolved = 0) +
                (SELECT COUNT(*) FROM cai_answers WHERE status = 'DEFICIENCY' AND resolved = 0)
            ) AS total_open_defects,
            (
                (SELECT COUNT(*) FROM inspection_answers WHERE status = 'DEFICIENCY' AND resolved = 1) +
                (SELECT COUNT(*) FROM sickline_answers WHERE status = 'DEFICIENCY' AND resolved = 1) +
                (SELECT COUNT(*) FROM commissionary_answers WHERE status = 'DEFICIENCY' AND resolved = 1) +
                (SELECT COUNT(*) FROM cai_answers WHERE status = 'DEFICIENCY' AND resolved = 1)
            ) AS total_resolved_defects,
            (
                (SELECT COUNT(*) FROM wsp_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS')) +
                (SELECT COUNT(*) FROM sickline_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS')) +
                (SELECT COUNT(*) FROM commissionary_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS')) +
                (SELECT COUNT(*) FROM cai_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS')) +
                (SELECT COUNT(*) FROM pitline_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS'))
            ) AS active_sessions_count
    `;

    const counts = await sequelize.query(countsQuery, {
        replacements: { todayStart, todayEnd },
        type: QueryTypes.SELECT
    });

    const perModuleQuery = `
        SELECT 'WSP' as module_type, COUNT(*) as count FROM wsp_sessions
        UNION ALL
        SELECT 'SICKLINE', COUNT(*) FROM sickline_sessions
        UNION ALL
        SELECT 'COMMISSIONARY', COUNT(*) FROM commissionary_sessions
        UNION ALL
        SELECT 'CAI', COUNT(*) FROM cai_sessions
        UNION ALL
        SELECT 'PITLINE', COUNT(*) FROM pitline_sessions
    `;
    const perModule = await sequelize.query(perModuleQuery, { type: QueryTypes.SELECT });

    // Last 7 Days Trend (Dialect Aware)
    let trendQuery;
    if (isSQLite) {
        trendQuery = `
            SELECT date, SUM(count) as count FROM (
                SELECT date(createdAt) as date, COUNT(*) as count FROM wsp_sessions WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM sickline_sessions WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM commissionary_sessions WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM cai_sessions WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM pitline_sessions WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt)
            ) as t
            GROUP BY date
            ORDER BY date ASC
        `;
    } else {
        trendQuery = `
            SELECT date, SUM(count) as count FROM (
                SELECT DATE(createdAt) as date, COUNT(*) as count FROM wsp_sessions WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM sickline_sessions WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM commissionary_sessions WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM cai_sessions WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM pitline_sessions WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(createdAt)
            ) as t
            GROUP BY date
            ORDER BY date ASC
        `;
    }

    const trend = await sequelize.query(trendQuery, { type: QueryTypes.SELECT });

    return {
        ...counts[0],
        module_distribution: perModule,
        defect_trend: trend,
        defect_status: [
            { name: 'Open', value: counts[0].total_open_defects },
            { name: 'Resolved', value: counts[0].total_resolved_defects }
        ]
    };
};
