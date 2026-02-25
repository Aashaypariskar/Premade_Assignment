const express = require('express');
const router = express.Router();
const controller = require('../controllers/PitLineController');
const { verifyToken } = require('../middleware/auth');

router.get('/trains', verifyToken, controller.getTrains);
router.post('/trains/add', verifyToken, controller.createTrain);
router.delete('/trains/:id', verifyToken, controller.deleteTrain);

router.get('/coaches', verifyToken, controller.getCoaches);
router.post('/coaches/add', verifyToken, controller.addCoach);
router.delete('/coaches/:id', verifyToken, controller.deleteCoach);

router.post('/session/start', verifyToken, controller.startSession);

module.exports = router;
