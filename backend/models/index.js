const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Train = sequelize.define('Train', {
    name: { type: DataTypes.STRING, allowNull: false },
    train_number: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'trains', timestamps: false });

const Coach = sequelize.define('Coach', {
    coach_number: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'coaches', timestamps: false });

const Category = sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'categories', timestamps: false });

const Activity = sequelize.define('Activity', {
    type: { type: DataTypes.ENUM('Minor', 'Major'), allowNull: false }
}, { tableName: 'activities', timestamps: false });

const Question = sequelize.define('Question', {
    text: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'questions', timestamps: false });

const InspectionAnswer = sequelize.define('InspectionAnswer', {
    answer: { type: DataTypes.ENUM('YES', 'NO', 'NA'), allowNull: false },
    reasons: { type: DataTypes.JSON },
    remarks: { type: DataTypes.TEXT },
    image_path: { type: DataTypes.STRING }
}, { tableName: 'inspection_answers', updatedAt: false });

// Associations
Train.hasMany(Coach, { foreignKey: 'train_id' });
Coach.belongsTo(Train, { foreignKey: 'train_id' });

Category.hasMany(Activity, { foreignKey: 'category_id' });
Activity.belongsTo(Category, { foreignKey: 'category_id' });

Activity.hasMany(Question, { foreignKey: 'activity_id' });
Question.belongsTo(Activity, { foreignKey: 'activity_id' });

// Inspection Answer links
InspectionAnswer.belongsTo(Train, { foreignKey: 'train_id' });
InspectionAnswer.belongsTo(Coach, { foreignKey: 'coach_id' });
InspectionAnswer.belongsTo(Activity, { foreignKey: 'activity_id' });
InspectionAnswer.belongsTo(Question, { foreignKey: 'question_id' });

module.exports = { Train, Coach, Category, Activity, Question, InspectionAnswer };
