const express = require('express');
const router = express.Router();
const controller = require('../controllers/CommissionaryController');
const { verifyToken } = require('../middleware/auth');

router.get('/session', verifyToken, controller.getOrCreateSession);
router.get('/questions', verifyToken, controller.getQuestions);
router.post('/save', verifyToken, controller.saveAnswers);
router.get('/progress', verifyToken, controller.getProgress);
router.post('/complete', verifyToken, controller.completeSession);
router.get('/combined-report', verifyToken, controller.getCombinedReport);

module.exports = router;
