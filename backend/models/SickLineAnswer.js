const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SickLineAnswer = sequelize.define('SickLineAnswer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        compartment_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        subcategory_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        activity_type: {
            type: DataTypes.ENUM('Major', 'Minor'),
            allowNull: true
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('OK', 'DEFICIENCY', 'NA'),
            allowNull: false
        },
        reasons: {
            type: DataTypes.JSON,
            allowNull: true
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        question_text_snapshot: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        photo_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Defect Tracking
        resolved: { type: DataTypes.INTEGER, defaultValue: 0 },
        after_photo_url: { type: DataTypes.TEXT, allowNull: true },
        resolution_remark: { type: DataTypes.TEXT, allowNull: true },
        resolved_at: { type: DataTypes.DATE, allowNull: true }
    }, {
        tableName: 'sickline_answers',
        timestamps: true
    });

    return SickLineAnswer;
};
