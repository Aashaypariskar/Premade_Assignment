const express = require('express');
const router = express.Router();
const caiController = require('../controllers/CaiController');
const { verifyToken } = require('../middleware/auth');
console.log('--- CAI ROUTES LOADED ---');

router.get('/questions', verifyToken, caiController.getQuestions);
router.get('/answers', verifyToken, caiController.getAnswers);
router.post('/session/start', verifyToken, caiController.startSession);
router.post('/submit', verifyToken, caiController.submitSession);

// Admin routes
router.post('/questions/add', verifyToken, caiController.addQuestion);
router.post('/questions/update', verifyToken, caiController.updateQuestion);

module.exports = router;
