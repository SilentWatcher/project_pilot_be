import express from 'express';
const router = express.Router();
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import {
  createProjectValidator,
  updateProjectValidator,
} from '../validators/projectValidator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

router.use(protect);

router.route('/')
  .post(createProjectValidator, validate, createProject)
  .get(getProjects);

router.route('/:id')
  .get(getProject)
  .put(updateProjectValidator, validate, updateProject)
  .delete(deleteProject);

export default router;
