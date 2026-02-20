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
            allowNull: false
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('OK', 'DEFICIENCY', 'NA'),
            allowNull: false
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        photo_url: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'commissionary_answers',
        timestamps: true
    });

    return CommissionaryAnswer;
};
