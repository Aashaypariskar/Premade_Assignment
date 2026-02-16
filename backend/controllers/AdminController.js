const bcrypt = require('bcryptjs');
const { User, Role, CategoryMaster, UserCategory } = require('../models');

/**
 * 1. Create User API
 * POST /api/admin/create-user
 */
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role_id, category_ids } = req.body;

        if (!name || !email || !password || !role_id) {
            return res.status(400).json({ error: 'Missing required fields: name, email, password, role_id' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role_id
        });

        // Assign Categories
        if (Array.isArray(category_ids) && category_ids.length > 0) {
            const mappings = category_ids.map(catId => ({
                user_id: user.id,
                category_id: catId
            }));
            await UserCategory.bulkCreate(mappings);
        }

        // Fetch user with associations to return
        const createdUser = await User.findByPk(user.id, {
            include: [
                { model: Role },
                { model: CategoryMaster, through: { attributes: [] } }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: createdUser
        });
    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

/**
 * 2. Get All Users
 * GET /api/admin/users
 */
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'status', 'last_login', 'createdAt'],
            include: [
                { model: Role },
                { model: CategoryMaster, through: { attributes: [] } }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error('Get Users Error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * 3. Update User (Name & Role)
 * PUT /api/admin/user/:id
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role_id } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent admin from accidentally demoting themselves if they are the only one
        if (req.user.id == id && role_id && role_id !== user.role_id) {
            // We allow it, but we should be careful. For now, let's allow it as per request.
        }

        if (name) user.name = name;
        if (role_id) user.role_id = role_id;

        await user.save();

        res.json({ success: true, message: 'User updated successfully', user });
    } catch (err) {
        console.error('Update User Error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

/**
 * 4. Update User Categories
 * PUT /api/admin/user-categories/:user_id
 */
exports.updateUserCategories = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { category_ids } = req.body;

        if (!Array.isArray(category_ids)) {
            return res.status(400).json({ error: 'category_ids must be an array' });
        }

        // Delete old mappings
        await UserCategory.destroy({ where: { user_id } });

        // Insert new mappings
        if (category_ids.length > 0) {
            const mappings = category_ids.map(catId => ({
                user_id,
                category_id: catId
            }));
            await UserCategory.bulkCreate(mappings);
        }

        res.json({ success: true, message: 'User categories updated successfully' });
    } catch (err) {
        console.error('Update User Categories Error:', err);
        res.status(500).json({ error: 'Failed to update user categories' });
    }
};

/**
 * 4. Delete User
 * DELETE /api/admin/user/:id
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Optionally check if trying to delete self (prevent lockout)
        if (req.user.id == id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hard delete mappings and user
        await UserCategory.destroy({ where: { user_id: id } });
        await user.destroy();

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

/**
 * Helper to fetch Roles and Categories for the form
 */
exports.getFormMetadata = async (req, res) => {
    try {
        const roles = await Role.findAll();
        const categories = await CategoryMaster.findAll();
        res.json({ roles, categories });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch form metadata' });
    }
};
