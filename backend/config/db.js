const { Sequelize } = require('sequelize');

// Replace with your real MySQL credentials
const sequelize = new Sequelize('inspection_db', 'root', 'root', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
    port: 3307
});

module.exports = sequelize;
