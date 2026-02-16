const express = require('express');
const router = express.Router();
const controller = require('../controllers/AuditController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public/Shared (Verified) Routes
router.get('/user-categories', verifyToken, controller.getUserCategories);
router.get('/train-list', verifyToken, controller.getTrains);
router.get('/coach-list', verifyToken, controller.getCoaches);
router.get('/checklist', verifyToken, controller.getQuestions);
router.get('/activity-types', verifyToken, controller.getActivities);

// Restricted Routes
router.post('/save-inspection', verifyToken, authorizeRoles('Admin', 'Engineer', 'Field User'), controller.submitInspection);

module.exports = router;
