const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('PitLineSession', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        train_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'pitline_trains', key: 'id' }
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'pitline_coaches', key: 'id' }
        },
        inspector_id: { type: DataTypes.INTEGER },
        status: {
            type: DataTypes.ENUM('IN_PROGRESS', 'SUBMITTED'),
            defaultValue: 'IN_PROGRESS'
        },
        last_saved_at: { type: DataTypes.DATE }
    }, { tableName: 'pitline_sessions' });
};
