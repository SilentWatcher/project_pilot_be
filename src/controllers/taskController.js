import asyncHandler from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';
import { createTask, getTasks, getAllTasks, updateTask, deleteTask, updateTaskStatus } from '../services/taskService.js';

const createTaskHandler = asyncHandler(async (req, res) => {
  const task = await createTask(req.params.projectId, req.body, req.user.id);
  sendResponse(res, 201, task, 'Task created successfully');
});

const getTasksHandler = asyncHandler(async (req, res) => {
  const result = await getTasks(req.params.projectId, req.query, req.user.id);
  sendResponse(res, 200, result, 'Tasks fetched successfully');
});

const updateTaskHandler = asyncHandler(async (req, res) => {
  const task = await updateTask(req.params.id, req.body, req.user.id, req.user.role);
  sendResponse(res, 200, task, 'Task updated successfully');
});

const deleteTaskHandler = asyncHandler(async (req, res) => {
  await deleteTask(req.params.id, req.user.id, req.user.role);
  sendResponse(res, 200, null, 'Task deleted successfully');
});

const getAllTasksHandler = asyncHandler(async (req, res) => {
  const result = await getAllTasks(req.query, req.user.id);
  sendResponse(res, 200, result, 'Tasks fetched successfully');
});

const updateTaskStatusHandler = asyncHandler(async (req, res) => {
  const task = await updateTaskStatus(req.params.id, req.body.status, req.user.id, req.user.role);
  sendResponse(res, 200, task, 'Task status updated successfully');
});

export { createTaskHandler as createTask, getTasksHandler as getTasks, getAllTasksHandler as getAllTasks, updateTaskHandler as updateTask, deleteTaskHandler as deleteTask, updateTaskStatusHandler as updateTaskStatus };
