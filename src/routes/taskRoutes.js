import express from 'express';
const router = express.Router();
import {
  createTask,
  getTasks,
  getAllTasks,
  updateTask,
  deleteTask,
  updateTaskStatus,
} from '../controllers/taskController.js';
import {
  createTaskValidator,
  updateTaskValidator,
  statusValidator,
} from '../validators/taskValidator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

router.use(protect);

router.get('/tasks', getAllTasks);

router.route('/projects/:projectId/tasks')
  .post(createTaskValidator, validate, createTask)
  .get(getTasks);

router.route('/tasks/:id')
  .put(updateTaskValidator, validate, updateTask)
  .delete(deleteTask);

router.patch('/tasks/:id/status', statusValidator, validate, updateTaskStatus);

export default router;
