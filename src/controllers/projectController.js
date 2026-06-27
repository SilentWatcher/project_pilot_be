import asyncHandler from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../services/projectService.js';

const createProjectHandler = asyncHandler(async (req, res) => {
  const project = await createProject(req.body, req.user.id);
  sendResponse(res, 201, project, 'Project created successfully');
});

const getProjectsHandler = asyncHandler(async (req, res) => {
  const result = await getProjects(req.query, req.user.id);
  sendResponse(res, 200, result, 'Projects fetched successfully');
});

const getProjectHandler = asyncHandler(async (req, res) => {
  const project = await getProjectById(req.params.id, req.user.id, req.user.role);
  sendResponse(res, 200, project, 'Project fetched successfully');
});

const updateProjectHandler = asyncHandler(async (req, res) => {
  const project = await updateProject(req.params.id, req.body, req.user.id, req.user.role);
  sendResponse(res, 200, project, 'Project updated successfully');
});

const deleteProjectHandler = asyncHandler(async (req, res) => {
  await deleteProject(req.params.id, req.user.id, req.user.role);
  sendResponse(res, 200, null, 'Project deleted successfully');
});

export { createProjectHandler as createProject, getProjectsHandler as getProjects, getProjectHandler as getProject, updateProjectHandler as updateProject, deleteProjectHandler as deleteProject };
