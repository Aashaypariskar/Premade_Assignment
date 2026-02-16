const bcrypt = require('bcryptjs');
const { User, Role, CategoryMaster, UserCategory } = require('../models');

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role_id, category_ids } = req.body;

        if (!name || !email || !password || !role_id) {
            return res.status(400).json({ error: 'Missing required fields' });
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
            for (const catId of category_ids) {
                await UserCategory.create({
                    user_id: user.id,
                    category_id: catId
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'status', 'last_login'],
            include: [
                { model: Role },
                { model: CategoryMaster, through: { attributes: [] } }
            ]
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
