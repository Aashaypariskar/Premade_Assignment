const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CaiSession = sequelize.define('CaiSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        inspector_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('DRAFT', 'SUBMITTED'),
            defaultValue: 'DRAFT',
            allowNull: false
        },
        last_saved_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'cai_sessions',
        timestamps: true
    });

    return CaiSession;
};
