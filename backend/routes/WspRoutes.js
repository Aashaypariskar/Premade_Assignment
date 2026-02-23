const express = require('express');
const router = express.Router();
const controller = require('../controllers/WspController');
const { verifyToken } = require('../middleware/auth');

router.get('/session', verifyToken, controller.getOrCreateSession);
router.get('/schedules', verifyToken, controller.getSchedules);
router.get('/questions', verifyToken, controller.getQuestions);
router.post('/save', verifyToken, controller.saveAnswers);
router.get('/progress', verifyToken, controller.getProgress);

module.exports = router;
