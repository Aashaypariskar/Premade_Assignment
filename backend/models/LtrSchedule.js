const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('LtrSchedule', {
        name: { type: DataTypes.STRING, allowNull: false },
        category_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'ltr_schedules', timestamps: false });
};
