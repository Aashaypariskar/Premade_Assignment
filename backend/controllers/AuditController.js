const {
    Train, Coach, Category, Activity, Question, InspectionAnswer,
    User, Role, CategoryMaster, LtrSchedule, AmenitySubcategory, sequelize
} = require('../models');

/**
 * AuditController - Upgraded for Enterprise RBAC
 * Implements Category-First flow and User Audit Trail
 */

// GET /user-categories (Dashboard)
exports.getUserCategories = async (req, res) => {
    try {
        console.log(`[DEBUG] Fetching categories for User ID: ${req.user?.id}`);
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Role }, { model: CategoryMaster, through: { attributes: [] } }]
        });

        if (!user) {
            console.error(`[DEBUG] User not found for ID: ${req.user?.id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        let categories = user.CategoryMasters || [];

        // Admin Fallback: If admin has no categories, show all master categories
        if (user.Role?.role_name === 'Admin' && categories.length === 0) {
            console.log('[DEBUG] Admin has no assigned categories. Returning all masters.');
            categories = await CategoryMaster.findAll();
        }

        console.log(`[DEBUG] Total Categories for response: ${categories.length}`);
        res.json(categories);
    } catch (err) {
        console.error('Dash Error:', err);
        res.status(500).json({ error: 'Failed to fetch assigned categories' });
    }
};

// GET /train-list?category_name=X
exports.getTrains = async (req, res) => {
    try {
        const { category_name } = req.query;
        // Logic: Return trains that have at least one coach with this category
        const trains = await Train.findAll({
            include: [{
                model: Coach,
                required: true,
                include: [{
                    model: Category,
                    where: category_name ? { name: category_name } : {},
                    required: true
                }]
            }],
            order: [['name', 'ASC']]
        });
        res.json(trains);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal server failure' });
    }
};

// GET /coach-list?train_id=X&category_name=Y
exports.getCoaches = async (req, res) => {
    try {
        const { train_id, category_name } = req.query;
        if (!train_id) return res.status(400).json({ error: 'Train ID is mandatory' });

        const coaches = await Coach.findAll({
            where: { train_id },
            include: [{
                model: Category,
                where: category_name ? { name: category_name } : {},
                required: true
            }]
        });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve coaches' });
    }
};

// GET /activity-types?category_name=X&coach_id=Y&subcategory_id=Z
exports.getActivities = async (req, res) => {
    try {
        const { category_name, coach_id, subcategory_id } = req.query;

        let where = {};
        if (subcategory_id) {
            // Rule #12: Fetch via subcategory_id ONLY
            where = { subcategory_id };
        } else {
            if (!category_name || !coach_id) return res.status(400).json({ error: 'Missing parameters' });
            const category = await Category.findOne({
                where: { name: category_name, coach_id }
            });
            if (!category) return res.status(404).json({ error: 'Category not found for this coach' });
            where.category_id = category.id;
        }

        const activities = await Activity.findAll({ where });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /ltr-schedules?category_name=Ltr to Railways&coach_id=Y
exports.getLtrSchedules = async (req, res) => {
    try {
        const { category_name, coach_id } = req.query;
        if (!category_name || !coach_id) return res.status(400).json({ error: 'coach_id and category_name required' });

        const category = await Category.findOne({ where: { name: category_name, coach_id } });
        if (!category) return res.status(404).json({ error: 'LTR Category not found for this coach' });

        const schedules = await LtrSchedule.findAll({ where: { category_id: category.id } });
        res.json(schedules);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /amenity-subcategories?category_name=Amenity&coach_id=Y
exports.getAmenitySubcategories = async (req, res) => {
    try {
        const { category_name, coach_id } = req.query;
        if (!category_name || !coach_id) return res.status(400).json({ error: 'coach_id and category_name required' });

        const category = await Category.findOne({ where: { name: category_name, coach_id } });
        if (!category) return res.status(404).json({ error: 'Amenity Category not found for this coach' });

        const subs = await AmenitySubcategory.findAll({ where: { category_id: category.id } });
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /checklist?activity_id=X&schedule_id=Y&subcategory_id=Z
exports.getQuestions = async (req, res) => {
    try {
        const { activity_id, schedule_id, subcategory_id } = req.query;

        let where = {};
        let categoryName = '';

        // Rule #14: Final Questions Fetch Logic
        if (schedule_id) {
            where.schedule_id = schedule_id;
            categoryName = 'Ltr to Railways';
        } else if (activity_id && subcategory_id) {
            where.activity_id = activity_id;
            where.subcategory_id = subcategory_id;
            categoryName = 'Amenity';
        } else if (activity_id) {
            // Standard
            where.activity_id = activity_id;
            where.subcategory_id = null; // Enforce standard
            const act = await Activity.findByPk(activity_id, { include: [Category] });
            categoryName = act?.Category?.name || 'Standard';
        } else {
            return res.status(400).json({ error: 'Ambiguous framework parameters' });
        }

        // RBAC Check
        const user = await User.findByPk(req.user.id, {
            include: [{ model: CategoryMaster, where: { name: categoryName } }]
        });
        if (!user && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const questions = await Question.findAll({ where });
        res.json(questions);
    } catch (err) {
        console.error('Checklist Error:', err);
        res.status(500).json({ error: 'Internal failure' });
    }
};

// POST /save-inspection
exports.submitInspection = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { train_id, coach_id, activity_id, schedule_id, subcategory_id, answers, submission_id } = req.body;
        console.log(`[SUBMIT] Attempting: ${submission_id} (Train: ${train_id}, Coach: ${coach_id}, Act: ${activity_id}, Sch: ${schedule_id}, Sub: ${subcategory_id})`);

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid submission format' });
        }

        const userId = req.user.id;
        const roleName = req.user.role;

        // 1. Fetch Master Data & Snapshots
        const [train, coach, activity, schedule, subcategory, currentUser] = await Promise.all([
            Train.findByPk(train_id),
            Coach.findByPk(coach_id),
            activity_id ? Activity.findByPk(activity_id, { include: [Category] }) : Promise.resolve(null),
            schedule_id ? LtrSchedule.findByPk(schedule_id) : Promise.resolve(null),
            subcategory_id ? AmenitySubcategory.findByPk(subcategory_id) : Promise.resolve(null),
            User.findByPk(req.user.id, { include: [Role] })
        ]);

        if (!train || !coach || !currentUser) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Context not found' });
        }

        // 2. Prepare Payload with Audit Trail
        const records = answers.map(ans => {
            if (ans.answer === 'NO') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasImage = !!ans.image_path;

                if (!hasReasons || !hasImage) {
                    const missing = [];
                    if (!hasReasons) missing.push('reasons');
                    if (!hasImage) missing.push('an image');
                    throw new Error(`Validation Failed: Question ID ${ans.question_id} requires ${missing.join(' and ')} for "NO" answers.`);
                }
            }
            return {
                answer: ans.answer,
                reasons: ans.reasons, // JSON array
                remarks: ans.remarks,
                image_path: ans.image_path,

                // Foreign Keys
                train_id,
                coach_id,
                activity_id,
                schedule_id,
                subcategory_id,
                question_id: ans.question_id,
                user_id: userId,

                // Snapshots
                submission_id: submission_id || `LEGACY-${Date.now()}`,
                train_number: train.train_number,
                coach_number: coach.coach_number,
                category_name: activity?.Category?.name || (schedule ? 'Ltr to Railways' : (subcategory ? 'Amenity' : 'Unknown')),
                subcategory_name: subcategory?.name || null,
                schedule_name: schedule?.name || null,
                activity_type: activity?.type || null,
                status: 'Completed',
                user_name: currentUser.name,
                role_snapshot: currentUser.Role?.role_name || roleName
            };
        });

        // 3. Insert
        const results = await InspectionAnswer.bulkCreate(records, { transaction });
        await transaction.commit();

        res.status(201).json({
            success: true,
            recordsSaved: results.length,
            audited_by: currentUser.name
        });

    } catch (err) {
        console.error('[SUBMIT] CRITICAL ERROR:', err);
        if (transaction) await transaction.rollback();
        res.status(err.message.includes('Validation') ? 400 : 500).json({ error: err.message });
    }
};
