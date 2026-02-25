const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CaiAnswer = sequelize.define('CaiAnswer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reason_ids: {
            type: DataTypes.JSON, // Use JSON for reason_ids
            allowNull: true
        },
        before_photo_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolved: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        after_photo_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolution_remark: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        question_text_snapshot: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'cai_answers',
        timestamps: true
    });

    return CaiAnswer;
};
