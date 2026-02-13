const express = require('express');
const router = express.Router();
const controller = require('../controllers/AuditController');

router.get('/train-list', controller.getTrains);
router.get('/coach-list', controller.getCoaches);
router.get('/areas', controller.getCategories);
router.get('/checklist', controller.getQuestions);
router.get('/activity-types', controller.getActivities);
router.post('/save-inspection', controller.submitInspection);

module.exports = router;
