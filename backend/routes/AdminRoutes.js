const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/create', verifyToken, authorizeRoles('Admin'), userController.createUser);
router.get('/list', verifyToken, authorizeRoles('Admin'), userController.getUsers);

module.exports = router;
