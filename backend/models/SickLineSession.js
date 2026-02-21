const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SickLineSession = sequelize.define('SickLineSession', {
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
            type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED'),
            defaultValue: 'IN_PROGRESS',
            allowNull: false
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'sickline_sessions',
        timestamps: true
    });

    return SickLineSession;
};
