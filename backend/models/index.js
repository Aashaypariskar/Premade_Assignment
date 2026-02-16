const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * RBAC System Models
 */
const Role = sequelize.define('Role', {
    role_name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'roles', timestamps: false });

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
    last_login: { type: DataTypes.DATE }
}, { tableName: 'users' });

const CategoryMaster = sequelize.define('CategoryMaster', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'categories_master', timestamps: false });

const UserCategory = sequelize.define('UserCategory', {
    // Junction table for Many-to-Many between User and CategoryMaster
}, { tableName: 'user_categories', timestamps: false });

/**
 * Inspection Domain Models
 */
const Train = sequelize.define('Train', {
    name: { type: DataTypes.STRING, allowNull: false },
    train_number: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'trains', timestamps: false });

const Coach = sequelize.define('Coach', {
    coach_number: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'coaches', timestamps: false });

const Category = sequelize.define('Category', {
    coach_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'categories', timestamps: false });

const Activity = sequelize.define('Activity', {
    type: { type: DataTypes.ENUM('Minor', 'Major'), allowNull: false }
}, { tableName: 'activities', timestamps: false });

const Question = sequelize.define('Question', {
    text: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'questions', timestamps: false });

const Reason = require('./Reason')(sequelize, DataTypes);

const InspectionAnswer = sequelize.define('InspectionAnswer', {
    answer: { type: DataTypes.ENUM('YES', 'NO', 'NA'), allowNull: false },
    reasons: { type: DataTypes.JSON },
    remarks: { type: DataTypes.TEXT },
    image_path: { type: DataTypes.STRING },
    // Enterprise Snapshots & Audit Trail
    train_number: { type: DataTypes.STRING(50) },
    coach_number: { type: DataTypes.STRING(50) },
    category_name: { type: DataTypes.STRING(100) },
    activity_type: { type: DataTypes.ENUM('Minor', 'Major') },
    user_id: { type: DataTypes.INTEGER },
    user_name: { type: DataTypes.STRING(100) },
    role_snapshot: { type: DataTypes.STRING(50) }
}, { tableName: 'inspection_answers', updatedAt: false });

// Associations - RBAC
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

User.belongsToMany(CategoryMaster, { through: UserCategory, foreignKey: 'user_id' });
CategoryMaster.belongsToMany(User, { through: UserCategory, foreignKey: 'category_id' });

// Associations - Domain
Train.hasMany(Coach, { foreignKey: 'train_id' });
Coach.belongsTo(Train, { foreignKey: 'train_id' });

Coach.hasMany(Category, { foreignKey: 'coach_id' });
Category.belongsTo(Coach, { foreignKey: 'coach_id' });

Category.hasMany(Activity, { foreignKey: 'category_id' });
Activity.belongsTo(Category, { foreignKey: 'category_id' });

Activity.hasMany(Question, { foreignKey: 'activity_id' });
Question.belongsTo(Activity, { foreignKey: 'activity_id' });

Question.hasMany(Reason, { foreignKey: 'question_id' });
Reason.belongsTo(Question, { foreignKey: 'question_id' });

// Inspection Answer links
InspectionAnswer.belongsTo(Train, { foreignKey: 'train_id' });
InspectionAnswer.belongsTo(Coach, { foreignKey: 'coach_id' });
InspectionAnswer.belongsTo(Activity, { foreignKey: 'activity_id' });
InspectionAnswer.belongsTo(Question, { foreignKey: 'question_id' });
InspectionAnswer.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    Train, Coach, Category, Activity, Question, Reason, InspectionAnswer,
    User, Role, CategoryMaster, UserCategory,
    sequelize
};
