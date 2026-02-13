const { Sequelize } = require('sequelize');

// Replace with your real MySQL credentials
const sequelize = new Sequelize('inspection_db', 'root', 'rootpassword', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

module.exports = sequelize;
