import { body } from 'express-validator';

export const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 100 }).withMessage('Title must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('assignedTo')
    .optional()
    .isString().withMessage('Invalid assigned user'),
];

export const updateTaskValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Title must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
];

export const statusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'in-progress', 'completed']).withMessage('Status must be pending, in-progress, or completed'),
];
