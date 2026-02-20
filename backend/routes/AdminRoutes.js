const express = require('express');
const router = express.Router();
const adminController = require('../controllers/AdminController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// All routes here are protected and Admin-only
router.use(verifyToken);
router.use(authorizeRoles('Admin'));

router.post('/create-user', adminController.createUser);
router.get('/users', adminController.getUsers);
router.put('/user/:id', adminController.updateUser);
router.put('/user-categories/:user_id', adminController.updateUserCategories);
router.delete('/user/:id', adminController.deleteUser);
router.get('/metadata', adminController.getFormMetadata);

module.exports = router;
