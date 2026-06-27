import { sendError } from '../utils/response.js';

const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to perform this action');
    }
    next();
  };
};

export { roleCheck };
