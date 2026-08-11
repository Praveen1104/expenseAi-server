import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';

const router = Router();

// Reports API
router.post('/reports/generate', ReportController.generateReport);
router.get('/reports/history', ReportController.getHistory);
router.get('/reports/download/:id', ReportController.downloadReport);

// Audit Trail API
router.get('/audit', ReportController.getAuditLogs);

export default router;
