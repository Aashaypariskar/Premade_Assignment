const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommissionarySession = sequelize.define('CommissionarySession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        coach_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        inspection_date: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'COMPLETED'),
            defaultValue: 'DRAFT',
            allowNull: false
        },
        last_saved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'commissionary_sessions',
        timestamps: true
    });

    return CommissionarySession;
};
