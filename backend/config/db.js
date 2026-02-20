const { Sequelize } = require('sequelize');

// Replace with your real MySQL credentials
const sequelize = new Sequelize('inspection_db', 'railway_user', 'Railway@123', {
    host: '3.110.16.111',
    dialect: 'mysql',
    logging: false,
    port: 3307
});

module.exports = sequelize;
