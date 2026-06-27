import express from 'express';
const router = express.Router();
import { getStats, getCharts } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

router.use(protect);

router.get('/stats', getStats);
router.get('/charts', getCharts);

export default router;
