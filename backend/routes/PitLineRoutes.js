const express = require('express');
const router = express.Router();
const controller = require('../controllers/PitLineController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/trains', verifyToken, controller.getTrains);
router.post('/trains/add', verifyToken, authorizeRoles('Admin'), controller.createTrain);
router.delete('/trains/:id', verifyToken, authorizeRoles('Admin'), controller.deleteTrain);

router.get('/coaches', verifyToken, controller.getCoaches);
router.post('/coaches/add', verifyToken, authorizeRoles('Admin'), controller.addCoach);
router.put('/coaches/:id', verifyToken, authorizeRoles('Admin'), controller.updateCoach);
router.delete('/coaches/:id', verifyToken, authorizeRoles('Admin'), controller.deleteCoach);


router.post('/session/start', verifyToken, controller.startSession);

module.exports = router;
