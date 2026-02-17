const {
    Train, Coach, Category, Activity, Question, InspectionAnswer,
    User, Role, CategoryMaster, sequelize
} = require('../models');

/**
 * AuditController - Upgraded for Enterprise RBAC
 * Implements Category-First flow and User Audit Trail
 */

// GET /user-categories (Dashboard)
exports.getUserCategories = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: CategoryMaster, through: { attributes: [] } }]
        });
        res.json(user.CategoryMasters);
    } catch (err) {
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

// GET /activity-types?category_name=X&coach_id=Y
exports.getActivities = async (req, res) => {
    try {
        const { category_name, coach_id } = req.query;
        if (!category_name || !coach_id) return res.status(400).json({ error: 'Missing parameters' });

        const category = await Category.findOne({
            where: { name: category_name, coach_id }
        });

        if (!category) return res.status(404).json({ error: 'Category not found for this coach' });

        const activities = await Activity.findAll({ where: { category_id: category.id } });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve activities' });
    }
};

// GET /checklist?activity_id=X
exports.getQuestions = async (req, res) => {
    try {
        const { activity_id } = req.query;
        if (!activity_id) return res.status(400).json({ error: 'Activity ID is mandatory' });

        // Security: Validate user has access to the category this activity belongs to
        const activity = await Activity.findByPk(activity_id, {
            include: [{ model: Category }]
        });

        if (!activity) return res.status(404).json({ error: 'Activity not found' });

        const user = await User.findByPk(req.user.id, {
            include: [{ model: CategoryMaster, where: { name: activity.Category.name } }]
        });

        if (!user && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied: You are not assigned to this category' });
        }

        const questions = await Question.findAll({ where: { activity_id } });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch checklist' });
    }
};

// POST /save-inspection
exports.submitInspection = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { train_id, coach_id, activity_id, answers, submission_id } = req.body;
        console.log(`[SUBMIT] Attempting: ${submission_id} (Train: ${train_id}, Coach: ${coach_id}, Activity: ${activity_id})`);
        console.log(`[SUBMIT] Answers count: ${answers?.length}`);

        if (!answers || !Array.isArray(answers)) {
            console.error('[SUBMIT] ERROR: Invalid answers format');
            return res.status(400).json({ error: 'Invalid submission format' });
        }

        const userId = req.user.id;
        const roleName = req.user.role;

        // 1. Fetch Master Data & Current User
        const [train, coach, activity, currentUser] = await Promise.all([
            Train.findByPk(train_id),
            Coach.findByPk(coach_id),
            Activity.findByPk(activity_id, { include: [Category] }),
            User.findByPk(req.user.id, { include: [Role] })
        ]);

        if (!train || !coach || !activity || !currentUser) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Train or Coach not found' });
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
                question_id: ans.question_id,
                user_id: userId,

                // Snapshots
                submission_id: submission_id || `LEGACY-${Date.now()}`,
                train_number: train.train_number,
                coach_number: coach.coach_number,
                category_name: activity.Category?.name || 'Unknown',
                activity_type: activity.type,
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
