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
    coach_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    coach_type: { type: DataTypes.STRING, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true } // Who created the coach (null for system coaches)
}, { tableName: 'coaches', timestamps: true });

const Category = sequelize.define('Category', {
    coach_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'categories', timestamps: false });

const Activity = sequelize.define('Activity', {
    type: { type: DataTypes.ENUM('Minor', 'Major'), allowNull: false },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: true } // New: for Amenity subcategories
}, { tableName: 'activities', timestamps: false });

const LtrSchedule = require('./LtrSchedule')(sequelize);
const LtrItem = require('./LtrItem')(sequelize); // New: LTR Hierarchy
const AmenitySubcategory = require('./AmenitySubcategory')(sequelize);
const CommissionarySession = require('./CommissionarySession')(sequelize);
const CommissionaryAnswer = require('./CommissionaryAnswer')(sequelize);

const AmenityItem = sequelize.define('AmenityItem', {
    name: { type: DataTypes.STRING, allowNull: false },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: false },
    activity_type: { type: DataTypes.ENUM('Minor', 'Major'), allowNull: false }
}, { tableName: 'amenity_items', timestamps: false });

const Question = sequelize.define('Question', {
    text: { type: DataTypes.TEXT, allowNull: false },
    activity_id: { type: DataTypes.INTEGER, allowNull: true },
    schedule_id: { type: DataTypes.INTEGER, allowNull: true },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true },
    item_id: { type: DataTypes.INTEGER, allowNull: true }, // Shared for Amenity & LTR Items
    specified_value: { type: DataTypes.STRING, allowNull: true },
    answer_type: { type: DataTypes.ENUM('BOOLEAN', 'VALUE'), defaultValue: 'BOOLEAN' },
    unit: { type: DataTypes.STRING(50) },
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 } // New: Strict Ordering
}, { tableName: 'questions', timestamps: false });

const Reason = require('./Reason')(sequelize, DataTypes);

const InspectionAnswer = sequelize.define('InspectionAnswer', {
    status: {
        type: DataTypes.ENUM('OK', 'DEFICIENCY', 'NA'),
        allowNull: false
    },
    answer_type: { type: DataTypes.ENUM('BOOLEAN', 'VALUE'), defaultValue: 'BOOLEAN' },
    observed_value: { type: DataTypes.TEXT },
    reasons: { type: DataTypes.JSON },
    remarks: { type: DataTypes.TEXT },
    image_path: { type: DataTypes.STRING },
    submission_id: { type: DataTypes.STRING(100), allowNull: true },
    train_number: { type: DataTypes.STRING(50) },
    coach_number: { type: DataTypes.STRING(50) },
    category_name: { type: DataTypes.STRING(100) },
    subcategory_name: { type: DataTypes.STRING(100) },
    schedule_name: { type: DataTypes.STRING(100) },
    item_name: { type: DataTypes.STRING(255) }, // Snapshot
    question_text_snapshot: { type: DataTypes.TEXT },
    activity_type: { type: DataTypes.ENUM('Minor', 'Major') },
    inspection_status: { type: DataTypes.STRING(50), defaultValue: 'Completed' },
    role_snapshot: { type: DataTypes.STRING(100) },
    user_name: { type: DataTypes.STRING(100) },
    user_id: { type: DataTypes.INTEGER }
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

// New Framework Associations
LtrSchedule.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(LtrSchedule, { foreignKey: 'category_id' });

// LTR Item Hierarchy
LtrSchedule.hasMany(LtrItem, { foreignKey: 'schedule_id' });
LtrItem.belongsTo(LtrSchedule, { foreignKey: 'schedule_id' });

LtrItem.hasMany(Question, { foreignKey: 'item_id' });
Question.belongsTo(LtrItem, { foreignKey: 'item_id' });

// Amenity Associations
AmenitySubcategory.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(AmenitySubcategory, { foreignKey: 'category_id' });

Activity.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(Activity, { foreignKey: 'subcategory_id' });

Question.belongsTo(LtrSchedule, { foreignKey: 'schedule_id' });
LtrSchedule.hasMany(Question, { foreignKey: 'schedule_id' });

Question.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(Question, { foreignKey: 'subcategory_id' });

Question.hasMany(Reason, { foreignKey: 'question_id' });
Reason.belongsTo(Question, { foreignKey: 'question_id' });

// Amenity Item Associations
AmenitySubcategory.hasMany(AmenityItem, { foreignKey: 'subcategory_id' });
AmenityItem.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });

AmenityItem.hasMany(Question, { foreignKey: 'item_id' });
Question.belongsTo(AmenityItem, { foreignKey: 'item_id' });

// Inspection Answer links
InspectionAnswer.belongsTo(Train, { foreignKey: 'train_id' });
InspectionAnswer.belongsTo(Coach, { foreignKey: 'coach_id' });
InspectionAnswer.belongsTo(Activity, { foreignKey: 'activity_id' });
InspectionAnswer.belongsTo(Question, { foreignKey: 'question_id' });
InspectionAnswer.belongsTo(User, { foreignKey: 'user_id' });
InspectionAnswer.belongsTo(LtrSchedule, { foreignKey: 'schedule_id' });
InspectionAnswer.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });

// Commissionary Associations
User.hasMany(CommissionarySession, { foreignKey: 'created_by' });
CommissionarySession.belongsTo(User, { foreignKey: 'created_by' });

Coach.hasMany(CommissionarySession, { foreignKey: 'coach_id' });
CommissionarySession.belongsTo(Coach, { foreignKey: 'coach_id' });

CommissionarySession.hasMany(CommissionaryAnswer, { foreignKey: 'session_id' });
CommissionaryAnswer.belongsTo(CommissionarySession, { foreignKey: 'session_id' });

CommissionaryAnswer.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(CommissionaryAnswer, { foreignKey: 'subcategory_id' });

CommissionaryAnswer.belongsTo(Question, { foreignKey: 'question_id' });
Question.hasMany(CommissionaryAnswer, { foreignKey: 'question_id' });

module.exports = {
    Train, Coach, Category, Activity, Question, Reason, InspectionAnswer,
    LtrSchedule, LtrItem, AmenitySubcategory, AmenityItem,
    User, Role, CategoryMaster, UserCategory,
    CommissionarySession, CommissionaryAnswer,
    sequelize
};
