import asyncHandler from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';
import { getStats, getCharts } from '../services/dashboardService.js';

const getStatsHandler = asyncHandler(async (req, res) => {
  const stats = await getStats(req.user.id);
  sendResponse(res, 200, stats, 'Dashboard stats fetched successfully');
});

const getChartsHandler = asyncHandler(async (req, res) => {
  const charts = await getCharts(req.user.id);
  sendResponse(res, 200, charts, 'Chart data fetched successfully');
});

export { getStatsHandler as getStats, getChartsHandler as getCharts };
