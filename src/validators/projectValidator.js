import { body } from 'express-validator';

export const createProjectValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters'),
  body('deadline')
    .notEmpty().withMessage('Deadline is required')
    .isISO8601().withMessage('Invalid date format'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'archived']).withMessage('Invalid status'),
];

export const updateProjectValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters'),
  body('deadline')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'archived']).withMessage('Invalid status'),
];
