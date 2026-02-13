const express = require('express');
const router = express.Router();
const controller = require('../controllers/inspectionController');

router.get('/trains', controller.getTrains);
router.get('/coaches', controller.getCoaches);
router.get('/categories', controller.getCategories);
router.get('/questions', controller.getQuestions);
router.post('/submit', controller.submitInspection);

module.exports = router;
