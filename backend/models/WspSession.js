const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('WspSession', {
        coach_id: { type: DataTypes.INTEGER, allowNull: false },
        coach_number: { type: DataTypes.STRING, allowNull: false },
        inspection_date: { type: DataTypes.DATEONLY, allowNull: false },
        created_by: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'COMPLETED'), defaultValue: 'DRAFT' },
        last_saved_at: { type: DataTypes.DATE, allowNull: true }
    }, { tableName: 'wsp_sessions', timestamps: true });
};
