const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommissionaryAnswer = sequelize.define('CommissionaryAnswer', {
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
            type: DataTypes.STRING, // L1, L2, D1, D2 etc.
            allowNull: false
        },
        subcategory_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        activity_type: {
            type: DataTypes.ENUM('Major', 'Minor'),
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
            allowNull: true // Allow null for legacy but logic will populate it
        },
        photo_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Defect Tracking
        resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
        after_photo_url: { type: DataTypes.TEXT, allowNull: true },
        resolution_remark: { type: DataTypes.TEXT, allowNull: true },
        resolved_at: { type: DataTypes.DATE, allowNull: true }
    }, {
        tableName: 'commissionary_answers',
        timestamps: true
    });

    return CommissionaryAnswer;
};
