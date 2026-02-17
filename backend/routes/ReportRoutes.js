const express = require('express');
const router = express.Router();
const reportController = require('../controllers/ReportController');
const { verifyToken } = require('../middleware/auth');

// All report routes require authentication
router.get('/reports', verifyToken, reportController.getAllReports);
router.get('/report-filters', verifyToken, reportController.getFilterOptions);
router.get('/report-details', verifyToken, reportController.getReportDetails);

module.exports = router;
